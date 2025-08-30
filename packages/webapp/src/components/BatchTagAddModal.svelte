<script lang="ts">
  import * as m from '../paraglide/messages'
  import { batchAddTagsToBookmarks } from '../utils/bookmark-actions'
  import TagInput from './TagInput.svelte'
  import Modal from './Modal.svelte'

  // Props
  let {
    selectedBookmarkUrls = [],
    isOpen = false,
    onClose = () => {},
  }: {
    selectedBookmarkUrls: string[]
    isOpen: boolean
    onClose: () => void
  } = $props()

  // State
  let tagsToAdd = $state<string[]>([])
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
    tagsToAdd = []
    errorMessage = ''
    successMessage = ''
    isProcessing = false
  }

  /**
   * Add tags to selected bookmarks using the extracted function
   */
  async function handleAddTagsToBookmarks() {
    // Basic validation remains in the component for immediate UI feedback
    if (tagsToAdd.length === 0) {
      errorMessage = m.BOOKMARK_FORM_TAGS_ERROR_EMPTY()
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
      const result = await batchAddTagsToBookmarks(
        selectedBookmarkUrls,
        tagsToAdd
      )

      if (!result) {
        throw new Error(
          m.BATCH_TAG_ADD_MODAL_ERROR_ADD_FAILED({
            errorDetails: 'Unkown error',
          })
        )
      }
      const { affectedCount } = result

      successMessage = m.BATCH_TAG_ADD_MODAL_SUCCESS_MESSAGE({
        bookmarksCount: affectedCount,
        tagsCount: tagsToAdd.length,
      })

      tagsToAdd = []

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
  title={m.BATCH_TAG_ADD_MODAL_TITLE()}
  {isOpen}
  onOpen={() => {
    try {
      document.getElementById('tags')?.focus()
    } catch (error) {
      console.error('Failed to focus on tags input:', error)
    }
  }}
  onClose={closeModal}
  onConfirm={handleAddTagsToBookmarks}
  disableConfirm={isProcessing || tagsToAdd.length === 0}
  confirmText={isProcessing
    ? m.PROCESSING_TEXT()
    : m.BOOKMARK_LIST_BATCH_ADD_TAGS()}>
  <div class="mb-4">
    <p class="mb-2 text-sm text-gray-600 dark:text-gray-400">
      {m.BATCH_TAG_ADD_MODAL_SELECTED_BOOKMARKS_COUNT({
        count: selectedBookmarkUrls.length,
      })}
    </p>
    <div class="mb-4">
      <label
        for="tags"
        class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {m.BOOKMARK_LIST_BATCH_ADD_TAGS()}
      </label>
      <TagInput id="tags" bind:tags={tagsToAdd} />
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {m.TAG_INPUT_HINT_ENTER_COMMA_SEPARATOR()}
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
