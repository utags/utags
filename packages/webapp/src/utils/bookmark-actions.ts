import * as m from '../paraglide/messages.js'
import { type DeleteActionType } from '../types/bookmarks.js'
import { DELETED_BOOKMARK_TAG } from '../config/constants.js'
import { commandManager } from '../stores/command-store.js'
import {
  AddTagCommand,
  RemoveTagCommand,
  type CommandExecutionResult,
} from '../lib/tag-commands.js'

/**
 * Batch adds tags to selected bookmarks.
 * @param selectedBookmarkUrls An array of URLs of the bookmarks to update.
 * @param tagsToAdd An array of tags to add.
 * @returns A promise that resolves to the number of bookmarks actually affected.
 * @throws Error if no tags are provided or no bookmarks are selected, or if adding tags fails.
 */
export async function batchAddTagsToBookmarks(
  selectedBookmarkUrls: string[],
  tagsToAdd: string[]
): Promise<CommandExecutionResult | undefined> {
  if (tagsToAdd.length === 0) {
    throw new Error(m.BOOKMARK_FORM_TAGS_ERROR_EMPTY())
  }

  if (selectedBookmarkUrls.length === 0) {
    throw new Error(m.BATCH_TAG_ADD_MODAL_ERROR_NO_BOOKMARKS_SELECTED())
  }

  try {
    const addTagCommand = new AddTagCommand(selectedBookmarkUrls, tagsToAdd)
    await commandManager.executeCommand(addTagCommand)
    return addTagCommand.getExecutionResult()
  } catch (error) {
    throw new Error(
      m.BATCH_TAG_ADD_MODAL_ERROR_ADD_FAILED({
        errorDetails: error instanceof Error ? error.message : String(error),
      })
    )
  }
}

/**
 * Batch removes tags from selected bookmarks.
 * @param selectedBookmarkUrls An array of URLs of the bookmarks to update.
 * @param tagsToRemove An array of tags to remove.
 * @returns A promise that resolves to the number of bookmarks actually affected.
 * @throws Error if no tags are provided or no bookmarks are selected, or if removing tags fails.
 */
export async function batchRemoveTagsFromBookmarks(
  selectedBookmarkUrls: string[],
  tagsToRemove: string[]
): Promise<CommandExecutionResult | undefined> {
  if (tagsToRemove.length === 0) {
    throw new Error(m.BATCH_TAG_REMOVE_MODAL_ERROR_NO_TAGS_SELECTED())
  }

  if (selectedBookmarkUrls.length === 0) {
    throw new Error(m.BATCH_TAG_ADD_MODAL_ERROR_NO_BOOKMARKS_SELECTED())
  }

  try {
    const removeTagCommand = new RemoveTagCommand(
      selectedBookmarkUrls,
      tagsToRemove
    )
    await commandManager.executeCommand(removeTagCommand)
    return removeTagCommand.getExecutionResult()
  } catch (error) {
    throw new Error(
      m.BATCH_TAG_REMOVE_MODAL_ERROR_REMOVE_FAILED({
        errorDetails: error instanceof Error ? error.message : String(error),
      })
    )
  }
}

/**
 * Batches the deletion of bookmarks by marking them with a DELETED_BOOKMARK_TAG.
 * This is a "soft delete" operation. The bookmarks are not removed from the store
 * but are tagged as deleted and associated metadata is added.
 *
 * @param bookmarkUrls - A single URL string or an array of URL strings for the bookmarks to be "deleted".
 * @param options - Optional parameters for the operation.
 * @param options.skipConfirmation - If true, skips the confirmation dialog. Defaults to false.
 * @param options.actionType - Describes the context of the deletion (e.g., 'DELETE', 'SYNC', 'BATCH_DELETE_BOOKMARKS'). Defaults to 'DELETE'.
 * @param options.onSuccess - Callback function executed on successful "deletion".
 *                            Receives an undo function and the count of "deleted" bookmarks.
 * @param options.onError - Callback function executed if an error occurs.
 * @returns A promise that resolves with an object containing the success status,
 *          an optional undo function, the count of "deleted" bookmarks, and an optional error.
 *
 * @example
 * ```typescript
 * await batchDeleteBookmarks('https://example.com/bookmark1');
 *
 * await batchDeleteBookmarks(['https://example.com/bookmark1', 'https://example.com/bookmark2'], {
 *   skipConfirmation: true,
 *   onSuccess: (undo, count) => {
 *     console.log(`${count} bookmarks marked as deleted.`);
 *     // Optionally, provide a way to call undo()
 *   },
 *   onError: (error) => {
 *     console.error('Failed to mark bookmarks as deleted:', error);
 *   }
 * });
 * ```
 */
export async function batchDeleteBookmarks(
  bookmarkUrls: string | string[],
  options: {
    skipConfirmation?: boolean
    actionType?: DeleteActionType
    onSuccess?: (undoFn: (() => void) | undefined, deletedCount: number) => void
    onError?: (error: Error) => void
  } = {}
): Promise<{
  success: boolean
  // TODO: 不返回 undoFunction，使用 commandManager.undo() 全局控制撤销功能
  undo?: () => Promise<void>
  deletedCount: number
  error?: Error
}> {
  const urlsArray = Array.isArray(bookmarkUrls) ? bookmarkUrls : [bookmarkUrls]
  const {
    skipConfirmation = false,
    actionType = 'DELETE',
    onSuccess,
    onError,
  } = options

  if (urlsArray.length === 0) {
    onSuccess?.(undefined, 0)
    return { success: true, deletedCount: 0 }
  }

  if (!skipConfirmation) {
    const confirmMessage =
      urlsArray.length === 1
        ? 'Are you sure you want to delete this bookmark?'
        : `Are you sure you want to delete these ${urlsArray.length} bookmarks?`
    // eslint-disable-next-line no-alert
    if (!confirm(confirmMessage)) {
      return { success: false, deletedCount: 0 }
    }
  }

  try {
    const addTagCommand = new AddTagCommand(
      urlsArray,
      DELETED_BOOKMARK_TAG,
      actionType
    )
    await commandManager.executeCommand(addTagCommand)
    const executionResult = addTagCommand.getExecutionResult()

    if (executionResult?.deletedCount === 0) {
      onSuccess?.(undefined, 0)
      return { success: true, deletedCount: 0 }
    }

    let undoExecuted = false
    const undoFunction = async () => {
      if (undoExecuted) {
        return
      }

      await commandManager.undo()

      undoExecuted = true
    }

    const deletedCount = executionResult?.deletedCount || 0
    onSuccess?.(undoFunction, deletedCount)
    return { success: true, undo: undoFunction, deletedCount }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    onError?.(err)
    console.error(`Error occurred while marking bookmarks as deleted:`, err)
    return {
      success: false,
      deletedCount: 0,
      error: err,
    }
  }
}

export async function handleBookmarkDelete(href: string) {
  const result = await batchDeleteBookmarks(href)
  console.log('handleBookmarkDelete', result)
  if (result.success && result.undo) {
    // Show undo button
    // TODO: Show undo button
  }
}

export function handleBookmarkEdit(href: string) {
  const event = new CustomEvent('editBookmark', {
    detail: { href },
    bubbles: true,
  })
  globalThis.dispatchEvent(event)
}

/**
 * Handle AI summary request for the bookmark
 * Opens a new window with the LinkSumm service to summarize the URL
 *
 * @param {string} url - The URL to summarize
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export function handleAISummary(url: string) {
  // Construct the LinkSumm URL with the target URL as a parameter
  const summaryUrl = `https://linksumm.aimerge.cc/?url=${encodeURIComponent(url)}`

  // Open the summary URL in a new window/tab
  window.open(summaryUrl, '_blank', 'noopener,noreferrer')
}

// TODO: add copy url action
// TODO: add show QR code action

export async function batchRestoreBookmarks(selectedBookmarkUrls: string[]) {
  return batchRemoveTagsFromBookmarks(selectedBookmarkUrls, [
    DELETED_BOOKMARK_TAG,
  ])
}
