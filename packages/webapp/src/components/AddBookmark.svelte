<script lang="ts">
  import { trimTitle } from 'utags-utils'
  import * as m from '../paraglide/messages'
  import { isMarkedAsDeleted } from '../utils/bookmarks.js'
  import {
    bookmarks,
    checkBookmarksDataReady,
    settings,
  } from '../stores/stores'
  import { saveMergedBookmark } from '../stores/merged-bookmarks'
  import Modal from './Modal.svelte'
  import InputField from './ui/InputField.svelte'
  import BaseInputField from './ui/BaseInputField.svelte'
  import TagInput from './TagInput.svelte'
  import type { BookmarkEntry } from '../types/bookmarks'

  interface Props {
    show: boolean
    initialData?: {
      href?: string
      title?: string
      tags?: string[]
      description?: string
      note?: string
      favicon?: string
      coverImage?: string
    }
  }

  let { show = $bindable(), initialData }: Props = $props()

  let url = $state<string>('')
  let title = $state<string>('')
  let title2 = $state<string>('')
  let tagsArray = $state<string[]>([])
  let tagsArray2 = $state<string[]>([])
  let error = $state<string>('')
  let tagError = $state<string>('')
  let lastUrl = $state<string | undefined>()
  let description = $state<string>('')
  let description2 = $state<string>('')
  let note = $state<string>('')
  let note2 = $state<string>('')
  let showAdvancedFields = $derived($settings.alwaysShowAdvancedFields)
  let favicon = $state<string>('')
  let favicon2 = $state<string>('')
  let coverImage = $state<string>('')
  let coverImage2 = $state<string>('')
  let faviconError = $state<string>('')
  let coverImageError = $state<string>('')
  let isMergeMode = $state<boolean>(false)
  let isEditMode2 = $derived<boolean>(!!initialData?.href)

  $effect(() => {
    if (show) {
      console.log(
        'show AddBookmark modal with initial data:',
        $state.snapshot(initialData)
      )
      if (initialData?.href) {
        url = initialData.href
        setTimeout(() => {
          validateUrl(true) // Validate URL when modal is shown with initial data
        })
      }
    } else {
      reset() // Reset form when modal is hidden
    }
  })

  /**
   * Checks if the modal is in edit mode.
   * @returns True if in edit mode, false otherwise.
   */
  function isEditMode(): boolean {
    return !!initialData?.href
  }

  /**
   * Validates the favicon URL.
   */
  function validateFavicon(): void {
    if (!favicon) {
      faviconError = ''
      return
    }
    try {
      new URL(favicon)
      faviconError = ''
    } catch {
      faviconError = m.BOOKMARK_FORM_URL_ERROR_INVALID()
    }
  }

  /**
   * Validates the cover image URL.
   */
  function validateCoverImage(): void {
    if (!coverImage) {
      coverImageError = ''
      return
    }
    try {
      new URL(coverImage)
      coverImageError = ''
    } catch {
      coverImageError = m.BOOKMARK_FORM_URL_ERROR_INVALID()
    }
  }

  /**
   * Validates the URL input.
   * - Checks for empty URL.
   * - Converts to valid URL format.
   * - Handles existing bookmarks in add/edit mode.
   * - Sets merge mode if URL conflict in edit mode.
   * @param {boolean} [isFirst=false] - Indicates if it's the first validation call (e.g., on modal open).
   * @returns {boolean} True if URL is valid, false otherwise.
   */
  function validateUrl(isFirst = false): boolean {
    if (!url) {
      return false
    }
    try {
      url = new URL(url).href
      error = ''
      if (url === lastUrl) {
        return true
      }

      const entry = $bookmarks.data[url]
      isMergeMode = false
      if (entry) {
        const isDeleted = isMarkedAsDeleted(entry)
        // If this is a marked as deleted bookmark, treat it as a new bookmark
        if (isDeleted) {
          // Do nothing, allow re-adding a deleted bookmark
          console.log(
            'Attempting to add/edit a previously deleted bookmark:',
            url
          )
        } else if (isEditMode() && !isFirst && url !== initialData?.href) {
          // Edit mode: URL changed to an existing, non-deleted bookmark
          console.log(
            'Edit mode conflict: URL changed to an existing bookmark:',
            url,
            entry
          )
          error = m.BOOKMARK_FORM_URL_ERROR_CONFLICT_EDIT_MODE()
          isMergeMode = true
          // Populate fields for the conflicting bookmark (target of merge)
          title2 = entry.meta.title || ''
          description2 = entry.meta.description || ''
          note2 = entry.meta.note || ''
          favicon2 = entry.meta.favicon || ''
          coverImage2 = entry.meta.coverImage || ''
          tagsArray2 = entry.tags
        } else {
          // Add mode or initial load in edit mode: Populate form with existing bookmark data
          if (entry && url !== lastUrl) {
            if (!isEditMode()) {
              error = m.BOOKMARK_FORM_URL_ERROR_CONFLICT_ADD_MODE()
            }
            title = entry.meta.title || ''
            description = entry.meta.description || ''
            note = entry.meta.note || ''
            favicon = entry.meta.favicon || ''
            coverImage = entry.meta.coverImage || ''
            tagsArray = entry.tags
            showAdvancedFields =
              $settings.alwaysShowAdvancedFields ||
              !!description ||
              !!note ||
              !!favicon ||
              !!coverImage
          }
        }
      } else {
        // Edit mode: Bookmark not found for the initial URL
        if (isEditMode() && isFirst) {
          error = m.BOOKMARK_FORM_URL_ERROR_NOT_FOUND_EDIT_MODE()
        }
      }

      lastUrl = url
      return true
    } catch {
      lastUrl = undefined
      error = m.BOOKMARK_FORM_URL_ERROR_INVALID()
      return false
    }
  }

  /**
   * Validates the tags input.
   * - Checks if tags array is empty.
   * @returns {boolean} True if tags are valid, false otherwise.
   */
  function validateTags(): boolean {
    if (tagsArray.length === 0) {
      tagError = m.BOOKMARK_FORM_TAGS_ERROR_EMPTY()
      return false
    }

    tagError = ''
    return true
  }

  /**
   * Adds or updates a bookmark.
   * - Validates URL and tags.
   * - Handles new bookmarks, updates to existing ones, and merging bookmarks.
   * - Saves changes to the bookmarks store and closes the modal.
   */
  function addBookmark(): void {
    checkBookmarksDataReady()
    title = trimTitle(title)
    if (!validateUrl() || !validateTags()) {
      return
    }

    const entry = $bookmarks.data[url]
    const isDeleted = isMarkedAsDeleted(entry)
    if (entry && !isDeleted) {
      const clonedEntry = structuredClone(entry)
      entry.tags = $state.snapshot(tagsArray)
      entry.meta = {
        ...entry.meta,
        title: title || undefined,
        description: description || undefined,
        note: note || undefined,
        favicon: favicon || undefined,
        coverImage: coverImage || undefined,
        updated: Date.now(),
      }

      if (isMergeMode) {
        const orgUrl = initialData?.href
        if (orgUrl) {
          const message = m.BOOKMARK_FORM_MERGE_CONFIRM({
            sourceUrl: orgUrl,
            targetUrl: url,
          })
          if (!confirm(message)) {
            return
          }

          saveMergedBookmark(
            { key: orgUrl, entry: $bookmarks.data[orgUrl] }, // Source bookmark to be deleted
            { key: url, entry: clonedEntry }, // Original state of the target bookmark (before merge)
            { key: url, entry: entry }, // Merged state of the target bookmark
            { actionType: 'edit' }
          )

          delete $bookmarks.data[orgUrl] // Delete the original bookmark after merging
        }
      }
    } else {
      // Add a new bookmark or update a previously deleted one
      const newEntry: BookmarkEntry = {
        tags: $state.snapshot(tagsArray),
        meta: {
          title: title || undefined,
          description: description || undefined,
          note: note || undefined,
          favicon: favicon || undefined,
          coverImage: coverImage || undefined,
          updated: Date.now(),
          created: Date.now(),
        },
      }
      $bookmarks.data[url] = newEntry

      // Handle URL change: preserve creation time and remove old entry
      const orgUrl = initialData?.href
      if (orgUrl && orgUrl !== url) {
        const originalEntry = $bookmarks.data[orgUrl]
        if (originalEntry?.meta?.created) {
          // Preserve the original creation timestamp
          newEntry.meta.created = originalEntry.meta.created
        }
        // Remove the old bookmark entry to avoid duplicates
        delete $bookmarks.data[orgUrl]
      }
    }
    $bookmarks.meta.updated = Date.now()
    console.log('addBookmark/updateBookmark', $bookmarks.data[url])
    bookmarks.set($bookmarks)
    close()
    // TODO: Consider whether to show all bookmarks or stay in the current filter.
    // Showing all bookmarks might reset the current filter criteria.
    // A modal prompt could ask the user if they want to see all bookmarks
    // to view the newly added/modified one, or stay with the current filter.
    // location.hash = '#'
  }

  /**
   * Resets all form fields and state variables to their initial values.
   */
  function reset(): void {
    url =
      title =
      title2 =
      description =
      description2 =
      note =
      note2 =
      favicon =
      favicon2 =
      coverImage =
      coverImage2 =
      error =
      tagError =
      faviconError =
      coverImageError =
        ''

    showAdvancedFields = $settings.alwaysShowAdvancedFields
    lastUrl = undefined
    initialData = undefined
    isMergeMode = false
    tagsArray = []
    tagsArray2 = []
  }

  /**
   * Closes the modal and resets the form after a short delay.
   * The delay is to ensure onBlur validation events complete before reset.
   */
  function close(): void {
    show = false

    // Delay reset because onblur events trigger validation
    setTimeout(reset)
    setTimeout(reset, 300) // Additional safety timeout
  }
</script>

<Modal
  title={isEditMode2
    ? m.EDIT_BOOKMARK_MODAL_TITLE()
    : m.ADD_BOOKMARK_MODAL_TITLE()}
  isOpen={show}
  onOpen={() => {
    document.getElementById('url-input')?.focus()
  }}
  onClose={close}
  onInputEnter={addBookmark}
  onConfirm={addBookmark}
  disableConfirm={!url || tagsArray.length === 0}
  confirmText={m.SAVE_BUTTON_TEXT()}>
  <InputField
    id="url-input"
    bind:value={url}
    classNames={isMergeMode ? 'merge-mode-input-element' : ''}
    placeholder="https://example.com"
    {error}
    onBlur={() => setTimeout(validateUrl)}>
    URL:
  </InputField>
  <div class="mb-4">
    <label
      for="tags-input"
      class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {m.FIELD_TAGS()}{m.ZZ_P_COLON()}
    </label>
    <TagInput id="tags-input" bind:tags={tagsArray} disabled={!url} />
    {#if tagError && tagsArray.length === 0}
      <p class="mt-1 text-sm text-red-600 dark:text-red-400">{tagError}</p>
    {/if}
  </div>
  {#if isMergeMode}
    <div class="mb-4">
      <TagInput
        id="tags-input-2"
        bind:tags={tagsArray2}
        placeholder=""
        class="merge-mode-input-element !cursor-default !opacity-70"
        disabled />
    </div>
  {/if}

  <BaseInputField
    id="title-input"
    bind:value={title}
    disabled={!url}
    placeholder={m.BOOKMARK_FORM_TITLE_PLACEHOLDER()}>
    {m.FIELD_TITLE()}{m.ZZ_P_COLON()}
  </BaseInputField>
  <BaseInputField
    show={isMergeMode}
    id="title-input-2"
    bind:value={title2}
    classNames="merge-mode-input-element"
    disabled
    placeholder="">
  </BaseInputField>

  <div class="mt-4 flex items-center justify-between">
    <button
      type="button"
      class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      onclick={() => (showAdvancedFields = !showAdvancedFields)}>
      {showAdvancedFields
        ? m.BOOKMARK_FORM_HIDE_ADVANCED_OPTIONS_BUTTON()
        : m.BOOKMARK_FORM_SHOW_ADVANCED_OPTIONS_BUTTON()}
    </button>

    <label
      class="flex items-center text-sm text-gray-500 select-none dark:text-gray-400">
      <input
        type="checkbox"
        class="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-indigo-600"
        bind:checked={$settings.alwaysShowAdvancedFields} />
      {m.BOOKMARK_FORM_ALWAYS_SHOW_ADVANCED_LABEL()}
    </label>
  </div>

  {#if showAdvancedFields}
    <BaseInputField
      id="description-input"
      bind:value={description}
      disabled={!url}
      placeholder={m.BOOKMARK_FORM_DESCRIPTION_PLACEHOLDER()}
      type="textarea"
      rows={3}>
      {m.FIELD_DESCRIPTION()}{m.ZZ_P_COLON()}
    </BaseInputField>
    <BaseInputField
      show={isMergeMode}
      id="description-input-2"
      bind:value={description2}
      classNames="merge-mode-input-element"
      disabled
      placeholder=""
      type="textarea"
      rows={3}>
    </BaseInputField>
    <BaseInputField
      id="note-input"
      bind:value={note}
      disabled={!url}
      placeholder={m.BOOKMARK_FORM_NOTE_PLACEHOLDER()}
      type="textarea"
      rows={3}>
      {m.FIELD_NOTE()}{m.ZZ_P_COLON()}
    </BaseInputField>
    <BaseInputField
      show={isMergeMode}
      id="note-input-2"
      bind:value={note2}
      classNames="merge-mode-input-element"
      disabled
      placeholder=""
      type="textarea"
      rows={3}>
    </BaseInputField>
  {/if}

  {#if showAdvancedFields}
    <InputField
      id="favicon-input"
      bind:value={favicon}
      disabled={!url}
      placeholder={m.BOOKMARK_FORM_FAVICON_URL_PLACEHOLDER()}
      error={faviconError}
      onBlur={validateFavicon}>
      Favicon URL:
    </InputField>
    {#if favicon}
      <div class="mt-1 flex items-center">
        <img
          src={favicon}
          alt={m.BOOKMARK_FORM_FAVICON_PREVIEW_ALT()}
          class="h-6 w-6"
          onerror={() =>
            (faviconError = m.BOOKMARK_FORM_FAVICON_LOAD_ERROR())} />
      </div>
    {/if}
    <BaseInputField
      show={isMergeMode}
      id="favicon-input-2"
      bind:value={favicon2}
      classNames="merge-mode-input-element"
      disabled
      placeholder="">
    </BaseInputField>
    {#if favicon2}
      <div class="mt-1 flex items-center">
        <img
          src={favicon2}
          alt={m.BOOKMARK_FORM_FAVICON_PREVIEW_ALT()}
          class="h-6 w-6" />
      </div>
    {/if}

    <InputField
      id="cover-image-input"
      bind:value={coverImage}
      disabled={!url}
      placeholder={m.BOOKMARK_FORM_COVER_IMAGE_URL_PLACEHOLDER()}
      error={coverImageError}
      onBlur={validateCoverImage}>
      {m.BOOKMARK_FORM_COVER_IMAGE_URL_LABEL()}
    </InputField>
    {#if coverImage}
      <div class="mt-1">
        <img
          src={coverImage}
          alt={m.BOOKMARK_FORM_COVER_IMAGE_PREVIEW_ALT()}
          class="h-32 w-full object-cover"
          onerror={() =>
            (coverImageError = m.BOOKMARK_FORM_COVER_IMAGE_LOAD_ERROR())} />
      </div>
    {/if}
    <BaseInputField
      show={isMergeMode}
      id="cover-image-input-2"
      bind:value={coverImage2}
      classNames="merge-mode-input-element"
      disabled
      placeholder="">
    </BaseInputField>
    {#if coverImage2}
      <div class="mt-1">
        <img
          src={coverImage2}
          alt={m.BOOKMARK_FORM_COVER_IMAGE_PREVIEW_ALT()}
          class="h-32 w-full object-cover" />
      </div>
    {/if}
  {/if}
</Modal>
