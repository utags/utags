<script lang="ts">
  import * as m from '../paraglide/messages'
  import { batchRemoveTagsFromBookmarks } from '../utils/bookmark-actions'
  import TagInput from './TagInput.svelte'
  import Modal from './Modal.svelte'

  // Props
  let {
    selectedBookmarkUrls = [],
    isOpen = false,
    onClose,
  }: {
    selectedBookmarkUrls: string[]
    isOpen: boolean
    onClose: () => void
  } = $props()

  // State
  let tagsToRemove = $state<string[]>([])
  let isProcessing = $state(false)
  let errorMessage = $state('')
  let successMessage = $state('')

  /**
   * Close the modal and reset state
   */
  function closeModal() {
    resetState()
    onClose()
  }

  /**
   * Reset the component state
   */
  function resetState() {
    tagsToRemove = []
    errorMessage = ''
    successMessage = ''
    isProcessing = false
  }

  /**
   * Remove tags from selected bookmarks using the extracted function
   */
  async function handleRemoveTagsFromBookmarks() {
    // Basic validation remains in the component for immediate UI feedback
    if (tagsToRemove.length === 0) {
      errorMessage = m.BATCH_TAG_REMOVE_MODAL_ERROR_NO_TAGS_SELECTED()
      return
    }

    if (selectedBookmarkUrls.length === 0) {
      errorMessage = m.BATCH_TAG_ADD_MODAL_ERROR_NO_BOOKMARKS_SELECTED()
      return
    }

    isProcessing = true
    errorMessage = ''
    successMessage = ''

    try {
      const result = await batchRemoveTagsFromBookmarks(
        selectedBookmarkUrls,
        tagsToRemove
      )

      if (!result) {
        throw new Error(
          m.BATCH_TAG_REMOVE_MODAL_ERROR_REMOVE_FAILED({
            errorDetails: 'Unkown error',
          })
        )
      }
      const { affectedCount, deletedCount } = result

      if (deletedCount > 0) {
        successMessage =
          m.BATCH_TAG_REMOVE_MODAL_SUCCESS_MESSAGE_WITH_DELETIONS({
            bookmarksCount: affectedCount,
            tagsCount: tagsToRemove.length,
            deletedBookmarksCount: deletedCount,
          })
      } else {
        successMessage = m.BATCH_TAG_REMOVE_MODAL_SUCCESS_MESSAGE({
          bookmarksCount: affectedCount,
          tagsCount: tagsToRemove.length,
        })
      }

      // Reset tags input after successful operation
      tagsToRemove = []

      // Close modal after a short delay to show success message
      setTimeout(() => {
        closeModal()
      }, 2000)
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error)
    } finally {
      isProcessing = false
    }
  }
</script>

<Modal
  title={m.BATCH_TAG_REMOVE_MODAL_TITLE()}
  {isOpen}
  onOpen={() => {
    document.getElementById('tags-to-remove')?.focus()
  }}
  onClose={closeModal}
  onConfirm={handleRemoveTagsFromBookmarks}
  disableConfirm={isProcessing || tagsToRemove.length === 0}
  confirmText={isProcessing
    ? m.PROCESSING_TEXT()
    : m.BOOKMARK_LIST_BATCH_REMOVE_TAGS()}>
  <div class="mb-4">
    <p class="mb-2 text-sm text-gray-600 dark:text-gray-400">
      {m.BATCH_TAG_ADD_MODAL_SELECTED_BOOKMARKS_COUNT({
        count: selectedBookmarkUrls.length,
      })}
    </p>
    <div class="mb-4">
      <label
        for="tags-to-remove"
        class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {m.BOOKMARK_LIST_BATCH_REMOVE_TAGS()}
      </label>
      <TagInput
        id="tags-to-remove"
        bind:tags={tagsToRemove}
        placeholder={m.BATCH_TAG_REMOVE_MODAL_TAG_INPUT_PLACEHOLDER()} />
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {m.BATCH_TAG_REMOVE_MODAL_TAG_INPUT_HINT()}
      </p>
    </div>
  </div>

  {#if errorMessage}
    <div
      class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
      {errorMessage}
    </div>
  {/if}

  {#if successMessage}
    <div
      class="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
      {successMessage}
    </div>
  {/if}
</Modal>
