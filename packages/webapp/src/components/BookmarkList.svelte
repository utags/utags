<script lang="ts">
  import { getContext, untrack } from 'svelte'
  import VirtualList from 'svelte-virtual-list'
  import * as m from '../paraglide/messages'
  import appConfig from '../config/app-config.js'
  import type { BookmarkKeyValuePair } from '../types/bookmarks'
  import type { SharedStatus } from '../types/shared-status.js'
  import BookmarkListItem from './BookmarkListItem.svelte'

  let {
    filteredBookmarks = [],
    viewMode = 'list',
    selectionMode = false,
    onSelectionChange = (urls: string[]) => {},
    onBatchAddTag = (urls: string[]) => {},
    onBatchRemoveTag = (urls: string[]) => {},
    onBatchDeleteBookmarks = (urls: string[]) => {},
    onBatchRestoreBookmarks = (urls: string[]) => {},
  }: {
    filteredBookmarks: BookmarkKeyValuePair[]
    viewMode: string
    selectionMode: boolean
    onSelectionChange?: (urls: string[]) => void
    onBatchAddTag?: (urls: string[]) => void
    onBatchRemoveTag?: (urls: string[]) => void
    onBatchDeleteBookmarks?: (urls: string[]) => void
    onBatchRestoreBookmarks?: (urls: string[]) => void
  } = $props()

  // State
  let selectedBookmarkUrls = $state<string[]>([])
  let lastSelectedIndex = $state<number | null>(null)
  let fullList = $state(false)
  let scrollTop = $state(0)
  // Shared status from context
  const sharedStatus = $state(getContext('sharedStatus') as SharedStatus)
  const isViewingDeleted = $derived(sharedStatus.isViewingDeleted)
  const isViewingSharedCollection = $derived(
    sharedStatus.isViewingSharedCollection
  )

  $effect(() => {
    const scrollTopValue = scrollTop
    setTimeout(() => {
      const element = document.querySelector('.bookmark-list > *')
      if (element) {
        element.scrollTo(0, scrollTopValue)
      }
    })
  })

  // Derived values
  let slicedBookmarks = $derived(
    fullList
      ? filteredBookmarks
      : filteredBookmarks.slice(0, appConfig.maxBookmarksPerPage)
  )
  let selectedCount = $derived(selectedBookmarkUrls.length)
  let allSelected = $derived(
    selectedBookmarkUrls.length === filteredBookmarks.length &&
      filteredBookmarks.length > 0
  )

  function getScrollTop() {
    const element = document.querySelector('.bookmark-list')
    if (element) {
      return element.scrollTop
    }
    return 0
  }

  function handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement
    const item = target.closest('.bookmark-item-wrapper')
    if (item) {
      if (target.nodeName !== 'INPUT') {
        event.preventDefault()
      }
      event.stopPropagation()
      event.stopImmediatePropagation()

      const url = item.getAttribute('data-url')
      let index = parseInt(item.getAttribute('data-index') || '-1', 10)
      if (url && index !== -1) {
        if (index === -999) {
          index = getIndexOfBookmark(url)
        }
        toggleSelection(url, index, event)
      }
    }
  }

  $effect(() => {
    if (selectionMode) {
      document.addEventListener('click', handleClick, true)
    } else {
      document.removeEventListener('click', handleClick, true)
    }

    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  })

  /**
   * Toggle selection of a single bookmark
   * @param bookmark - The bookmark to toggle
   * @param index - The index of the bookmark in the list
   * @param event - The mouse event
   */
  function toggleSelection(
    bookmarkUrl: string,
    index: number,
    event: MouseEvent
  ) {
    if (!selectionMode) return

    const isSelected = selectedBookmarkUrls.some((b) => b === bookmarkUrl)

    // Handle Shift+Click for range selection
    if (
      event.shiftKey &&
      lastSelectedIndex !== null &&
      lastSelectedIndex !== index
    ) {
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)

      const rangeBookmarks = filteredBookmarks.slice(start, end + 1)

      // If we're deselecting, remove all in range
      if (isSelected) {
        selectedBookmarkUrls = selectedBookmarkUrls.filter(
          (b) => !rangeBookmarks.some((rb) => rb[0] === b)
        )
      }
      // Otherwise add all in range that aren't already selected
      else {
        const newSelections = rangeBookmarks.map((b) => b[0])
        selectedBookmarkUrls = [
          ...new Set([...selectedBookmarkUrls, ...newSelections]),
        ]
      }
    }
    // Normal single selection toggle
    else {
      if (isSelected) {
        selectedBookmarkUrls = selectedBookmarkUrls.filter(
          (b) => b !== bookmarkUrl
        )
      } else {
        selectedBookmarkUrls = [...selectedBookmarkUrls, bookmarkUrl]
      }
    }

    lastSelectedIndex = index

    onSelectionChange(selectedBookmarkUrls)
  }

  /**
   * Toggle selection of all bookmarks
   */
  function toggleSelectAll() {
    if (allSelected) {
      selectedBookmarkUrls = []
    } else {
      selectedBookmarkUrls = [...filteredBookmarks.map((b) => b[0])]
    }

    onSelectionChange(selectedBookmarkUrls)
  }

  /**
   * Start batch tag editing for selected bookmarks
   */
  function startBatchTagEdit() {
    if (selectedBookmarkUrls.length === 0) return

    alert(m.FEATURE_COMING_SOON_ALERT())
    // onBatchEditTag(selectedBookmarkUrls)
  }

  /**
   * Start batch tag adding for selected bookmarks
   * Dispatches an event to parent component to open tag add modal
   */
  function startBatchAddTag() {
    if (selectedBookmarkUrls.length === 0) return

    onBatchAddTag(selectedBookmarkUrls)
  }

  /**
   * Start batch tag removing for selected bookmarks
   * Dispatches an event to parent component to open tag remove modal
   */
  function startBatchRemoveTag() {
    if (selectedBookmarkUrls.length === 0) return

    onBatchRemoveTag(selectedBookmarkUrls)
  }

  /**
   * Start batch bookmark deletion for selected bookmarks
   * Dispatches an event to parent component to handle deletion
   */
  function startBatchDeleteBookmarks() {
    if (selectedBookmarkUrls.length === 0) return

    onBatchDeleteBookmarks(selectedBookmarkUrls)
  }

  /**
   * Start batch bookmark restoration for selected bookmarks.
   * Dispatches an event to the parent component to handle restoration.
   */
  function startBatchRestoreBookmarks() {
    if (selectedBookmarkUrls.length === 0) return
    onBatchRestoreBookmarks(selectedBookmarkUrls)
  }

  /**
   * Start batch bookmark permanent deletion for selected bookmarks.
   * Dispatches an event to the parent component to handle permanent deletion.
   */
  function startBatchPermanentDeleteBookmarks() {
    if (selectedBookmarkUrls.length === 0) return
    alert(m.FEATURE_COMING_SOON_ALERT())
    // onBatchPermanentDeleteBookmarks(selectedBookmarkUrls)
  }

  /**
   * Start batch copying selected shared bookmarks to user's bookmarks.
   * Dispatches an event to the parent component to handle copying.
   */
  function startBatchCopyToMyBookmarks() {
    if (selectedBookmarkUrls.length === 0) return

    // For now, display a "feature coming soon" alert, similar to other new batch actions.
    alert(m.FEATURE_COMING_SOON_ALERT())
    // onBatchCopyToMyBookmarks(selectedBookmarkUrls)
  }

  // Reset selection when filtered bookmarks change
  $effect(() => {
    console.log('reset selection when filtered bookmarks change')
    if (filteredBookmarks) {
      // Keep only selected bookmarks that still exist in the filtered list
      selectedBookmarkUrls = untrack(() => selectedBookmarkUrls).filter(
        (selected) =>
          filteredBookmarks.some((filtered) => filtered[0] === selected)
      )
      lastSelectedIndex = null
      fullList = false
      scrollTop = 0
    }
  })

  // due to can't get index from VirtualList(svelte-virtual-list), so we need to get it manually
  function getIndexOfBookmark(bookmarkUrl: string) {
    return filteredBookmarks.findIndex((b) => b[0] === bookmarkUrl)
  }
</script>

<div
  class="bookmark-list-container flex flex-grow-1 flex-col overflow-hidden"
  class:select-mode={selectionMode}>
  {#if selectionMode}
    <div
      class="selection-toolbar sticky top-0 z-2 flex items-center justify-between border-b border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
      <div class="flex items-center">
        <label class="inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            class="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
            checked={allSelected}
            onclick={toggleSelectAll} />
          <span class="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >{m.BOOKMARK_LIST_SELECT_ALL()}</span>
        </label>
        <span class="ml-4 text-sm text-gray-600 dark:text-gray-400">
          {m.BOOKMARK_LIST_SELECTED_COUNT({ selectedCount })}
        </span>
      </div>

      <div class="flex gap-2">
        {#if isViewingDeleted}
          <button
            class="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
            disabled={selectedCount === 0}
            onclick={startBatchRestoreBookmarks}>
            {m.BOOKMARK_LIST_RESTORE_BOOKMARKS()}
          </button>
          <button
            class="rounded-md bg-red-700 px-3 py-1 text-sm text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-800 dark:hover:bg-red-700"
            disabled={selectedCount === 0}
            onclick={startBatchPermanentDeleteBookmarks}>
            {m.BOOKMARK_LIST_PERMANENTLY_DELETE_BOOKMARKS()}
          </button>
        {:else if isViewingSharedCollection}
          <button
            class="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
            disabled={selectedCount === 0}
            onclick={startBatchCopyToMyBookmarks}>
            {m.BOOKMARK_LIST_COPY_TO_MY_BOOKMARKS()}
          </button>
        {:else}
          <button
            class="rounded-md bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600"
            disabled={selectedCount === 0}
            onclick={startBatchAddTag}>
            {m.BOOKMARK_LIST_BATCH_ADD_TAGS()}
          </button>
          <button
            class="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
            disabled={selectedCount === 0}
            onclick={startBatchRemoveTag}>
            {m.BOOKMARK_LIST_BATCH_REMOVE_TAGS()}
          </button>
          <button
            class="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-700 dark:hover:bg-indigo-600"
            disabled={selectedCount === 0}
            onclick={startBatchTagEdit}>
            {m.BOOKMARK_LIST_BATCH_EDIT_TAGS()}
          </button>
          <button
            class="rounded-md bg-red-700 px-3 py-1 text-sm text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-800 dark:hover:bg-red-700"
            disabled={selectedCount === 0}
            onclick={startBatchDeleteBookmarks}>
            {m.BOOKMARK_LIST_DELETE_BOOKMARKS()}
          </button>
        {/if}
      </div>
    </div>
  {/if}
  <div class="bookmark-list">
    {#if slicedBookmarks.length > 500}
      <VirtualList id="test" items={slicedBookmarks} let:item>
        <BookmarkListItem
          index={-999}
          {item}
          {viewMode}
          {selectionMode}
          selected={selectedBookmarkUrls.some((b) => b === item[0])} />
      </VirtualList>
    {:else}
      <ul class="">
        {#each slicedBookmarks as item, index}
          <li>
            <BookmarkListItem
              {index}
              {item}
              {viewMode}
              {selectionMode}
              selected={selectedBookmarkUrls.some((b) => b === item[0])} />
          </li>
        {/each}
      </ul>
    {/if}

    {#if filteredBookmarks.length === 0}
      <div class="empty-state p-8 text-center text-gray-500 dark:text-gray-400">
        {m.BOOKMARK_LIST_NO_MATCHING_BOOKMARKS()}
      </div>
    {/if}
    {#if filteredBookmarks.length > appConfig.maxBookmarksPerPage && !fullList}
      <div
        class="flex items-center justify-center border-t-1 border-(color:--seperator-line-color) bg-white/90 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div class="text-center">
          <span
            class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {m.BOOKMARK_LIST_LOAD_INFO_MAIN({
              count: appConfig.maxBookmarksPerPage,
            })}<br />
            <span class="text-xs text-gray-500 dark:text-gray-400"
              >{m.BOOKMARK_LIST_LOAD_INFO_HINT_FILTER()}</span
            ><br />
            <span class="text-xs text-gray-500 dark:text-gray-400"
              >{m.BOOKMARK_LIST_LOAD_INFO_HINT_EXPAND()}</span>
          </span>
        </div>
        <button
          class="ml-4 flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          onclick={() => {
            scrollTop = getScrollTop()
            fullList = true
          }}>
          {m.EXPAND_ALL_BUTTON_TEXT()}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .bookmark-list {
    overflow-y: auto;
    overflow-x: hidden;
    height: 100%;
    margin-right: var(--bookmark-list-margin-right);
  }

  .bookmark-list > :global(*) {
    padding-top: 10px;
    padding-bottom: 10px;
  }

  .select-mode .bookmark-list > :global(*) {
    padding-top: 0;
    padding-bottom: 0;
  }

  .cursor-pointer {
    cursor: pointer;
  }

  :global(svelte-virtual-list-row) {
    overflow: unset !important;
  }
</style>
