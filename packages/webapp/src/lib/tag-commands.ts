import { splitTags } from 'utags-utils'
import type {
  BookmarkKeyValuePair,
  DeleteActionType,
} from '../types/bookmarks.js'
import { DELETED_BOOKMARK_TAG } from '../config/constants.js'
import {
  addTags,
  removeTags,
  filterBookmarksByUrls,
  isMarkedAsDeleted,
} from '../utils/bookmarks.js'

/**
 * Represents the original state of a bookmark's tags and deletion status before a command was executed.
 * This data is crucial for the undo operation, allowing the command to revert changes
 * specifically to the `tags` and `deletedMeta` properties of a bookmark, leaving other metadata (like `meta`)
 * untouched to preserve any modifications made after the command's execution.
 */
type OriginalBookmarkData = {
  /** The original array of tags associated with the bookmark before the command. */
  tags: string[]
  /**
   * The original deletion metadata if the bookmark was marked as deleted before the command.
   * This includes the timestamp of deletion and the type of action that led to the deletion.
   * If undefined, the bookmark was not in a deleted state prior to this command.
   */
  deletedMeta?: {
    /**
     * The timestamp of the deletion of the bookmark.
     */
    deleted: number
    /** The type of action that led to the deletion. */
    actionType: DeleteActionType
  }
}

/**
 * Represents the result of a command execution.
 * It includes the count of bookmarks affected by the command,
 * the count of bookmarks marked as deleted (if applicable),
 * and a map of the original states of the affected bookmarks for undo purposes.
 */
export type CommandExecutionResult = {
  /** The number of bookmarks directly modified by the command (e.g., tags added/removed/renamed). */
  affectedCount: number
  /** The number of bookmarks that were marked as deleted as part of this command's execution. */
  deletedCount: number
  /**
   * A map where keys are bookmark URLs (strings) and values are `OriginalBookmarkData` objects.
   * This map stores the state of each affected bookmark before the command was executed,
   * allowing for accurate restoration during an undo operation.
   */
  originalStates: Map<string, OriginalBookmarkData>
}

/**
 * Defines the interface for tag manipulation commands.
 * Each command encapsulates an operation (e.g., adding, removing, renaming tags) that can be
 * executed and undone. Commands operate on a list of bookmark URLs and expect the
 * actual bookmark data to be resolved and passed in during execution and undo phases.
 */
export type TagCommand = {
  /**
   * Executes the command's primary operation on the provided set of live bookmarks.
   * Implementations should modify the `tags` and potentially `deletedMeta` of the bookmarks
   * and store the necessary `OriginalBookmarkData` in `executionResult` for a potential undo.
   * The `bookmarks` parameter contains the current state of bookmarks (resolved by their URLs)
   * at the time of execution.
   * @param {BookmarkKeyValuePair[]} bookmarks - The live bookmark data (resolved by `CommandManager` using `bookmarkUrls`) to operate on.
   */
  execute(bookmarks: BookmarkKeyValuePair[]): void

  /**
   * Reverts the changes made by the `execute` method on the provided set of live bookmarks.
   * This method should restore only the `tags` and `deletedMeta` of the bookmarks to their state
   * before the command was executed, using the data stored in `executionResult.originalStates`.
   * Other bookmark properties (e.g., `meta`) should remain untouched to preserve subsequent changes.
   * The `bookmarks` parameter contains the current state of bookmarks (resolved by their URLs)
   * at the time of undo.
   * @param {BookmarkKeyValuePair[]} bookmarks - The live bookmark data (resolved by `CommandManager` using `bookmarkUrls`) to operate on.
   */
  undo(bookmarks: BookmarkKeyValuePair[]): void

  /**
   * Retrieves the result of the command's execution, which includes counts of affected
   * and deleted bookmarks, and the original states of modified bookmarks for undo purposes.
   * @returns {CommandExecutionResult | undefined} The execution result, or undefined if the command has not been executed or if execution failed.
   */
  getExecutionResult(): CommandExecutionResult | undefined

  /**
   * Clears the execution result of the command.
   * This method is typically called after a command has been executed but failed to run persisted.
   * Or called after undo has been performed.
   */
  clearExecutionResult(): void

  /**
   * Gets the type of the command.
   * @returns {'add' | 'remove' | 'rename'} The type of the command.
   */
  getType(): 'add' | 'remove' | 'rename'

  /**
   * Gets the source tags involved in the command.
   * For 'add' and 'remove' commands, these are the tags being added or removed.
   * For 'rename' commands, this is the tag being renamed from.
   * @returns {string[]} An array of source tag strings.
   */
  getSourceTags(): string[]

  /**
   * Gets the target tags involved in the command.
   * This is primarily relevant for 'rename' commands, representing the new tag name.
   * @returns {string[] | undefined} An array of target tag strings, or undefined if not applicable (e.g., for 'add' or 'remove' commands).
   */
  getTargetTags(): string[] | undefined

  /**
   * Gets the URLs of the bookmarks targeted by this command.
   * @returns {string[]} An array of bookmark URLs.
   */
  getBookmarkUrls(): string[]

  /**
   * Provides a human-readable description of the command, suitable for display in a UI (e.g., in an undo/redo history list).
   * @returns {string | undefined} A description string, or undefined if not applicable.
   */
  getDescription?(): string

  /**
   * Gets the timestamp of when the command instance was created.
   * @returns {number | undefined} The creation timestamp (milliseconds since epoch), or undefined if not applicable.
   */
  getTimestamp?(): number
}

/**
 * An abstract base class for tag commands, providing common functionality for commands
 * that operate on a set of bookmarks identified by their URLs.
 * It handles storing bookmark URLs, source tags, execution results, and a timestamp.
 * The `undo` method is implemented to revert changes to `tags` and `deletedMeta` only,
 * preserving other metadata changes.
 */
export abstract class BaseTagCommand implements TagCommand {
  protected bookmarkUrls: string[] // Stores the URLs of the bookmarks targeted by the command.
  protected sourceTags: string[]
  protected executionResult: CommandExecutionResult | undefined = undefined
  private readonly timestamp: number

  /**
   * Creates an instance of BaseTagCommand.
   * @param {string[]} bookmarkUrls - An array of URLs for the bookmarks to be affected by this command.
   * @param {string | string[]} sourceTags - The source tag(s) for the command (e.g., tag to add/remove, or old tag name for rename).
   *                                         Tags are normalized (trimmed, deduplicated).
   */
  constructor(bookmarkUrls: string[], sourceTags: string | string[]) {
    this.bookmarkUrls = [...bookmarkUrls]
    this.sourceTags = splitTags(sourceTags)
    this.timestamp = Date.now()
  }

  /**
   * Reverts the tag operation by restoring the original `tags` and `deletedMeta`
   * of the affected bookmarks, based on the `executionResult` captured during `execute`.
   * This method operates on the `resolvedBookmarks` (live bookmark data provided by `CommandManager`)
   * and ensures that other bookmark metadata (e.g., `meta.title`, `meta.desc`) remains unchanged,
   * preserving any modifications made to those fields after this command was executed.
   *
   * @param {BookmarkKeyValuePair[]} resolvedBookmarks - The live bookmark data, resolved by `CommandManager`
   *                                                 using the command's `bookmarkUrls`, upon which to perform the undo.
   */
  undo(resolvedBookmarks: BookmarkKeyValuePair[]): void {
    if (!this.executionResult) {
      console.error(
        'Cannot undo: execution result is missing. The command might not have been executed, failed, or undo has already been performed.'
      )
      return
    }

    const now = Date.now()
    // Filter resolvedBookmarks to only include those actually requested by the command,
    // as resolveBookmarksCallback might return more or less depending on its implementation.
    // This ensures the command operates on the exact set of bookmarks it was intended for.
    const targetBookmarks = filterBookmarksByUrls(
      resolvedBookmarks,
      this.bookmarkUrls
    )

    const { originalStates } = this.executionResult

    for (const bookmark of targetBookmarks) {
      const bookmarkUrl = bookmark[0]
      const bookmarkData = bookmark[1] // This is the live bookmark data object
      const originalState = originalStates.get(bookmarkUrl)

      if (originalState) {
        // Restore the original tags. Create a new array to ensure reactivity if needed.
        bookmarkData.tags = [...originalState.tags]
        bookmarkData.meta.updated2 = now

        // Restore deletedMeta if it was present in the original state.
        if (originalState.deletedMeta) {
          bookmarkData.deletedMeta = { ...originalState.deletedMeta } // Shallow copy deletedMeta
        } else if (
          bookmarkData.deletedMeta &&
          !isMarkedAsDeleted(originalState.tags)
        ) {
          // If originalState.deletedMeta is not set (bookmark wasn't deleted before),
          // but it currently exists on the bookmark (bookmarkData.deletedMeta is set),
          // and the restored tags do not include DELETED_BOOKMARK_TAG (meaning the bookmark shouldn't be marked as deleted after undo),
          // then the current deletedMeta must have been added by this command's execution.
          // In this case, it should be removed during undo.
          delete bookmarkData.deletedMeta
        }
        // IMPORTANT: bookmarkData.meta is NOT touched here to preserve its latest state.
      }
    }
  }

  /**
   * Retrieves the result of the command's execution.
   * @returns {CommandExecutionResult | undefined} The execution result, or undefined if the command has not been executed.
   */
  getExecutionResult(): CommandExecutionResult | undefined {
    return this.executionResult
  }

  clearExecutionResult(): void {
    // Clear the execution result. This is typically called:
    // 1. After a successful undo operation, to prevent re-accessing or re-using the result of an undone execution.
    // 2. If the command's execution was part of a larger operation (e.g., in CommandManager)
    //    that failed to persist, rendering this specific execution result invalid.
    this.executionResult = undefined
  }

  /**
   * Gets the source tags associated with this command.
   * @returns {string[]} A new array containing the source tags to prevent external modification.
   */
  getSourceTags(): string[] {
    return [...this.sourceTags] // Return a copy to prevent external modification
  }

  /**
   * Gets the target tags associated with this command.
   * Base implementation returns undefined; subclasses like RenameTagCommand should override this.
   * @returns {string[] | undefined} Always undefined in the base class.
   */
  getTargetTags(): string[] | undefined {
    return undefined
  }

  /**
   * Gets the URLs of the bookmarks targeted by this command.
   * @returns {string[]} A new array containing the bookmark URLs.
   */
  getBookmarkUrls(): string[] {
    return [...this.bookmarkUrls]
  }

  /**
   * Gets the timestamp when this command instance was created.
   * @returns {number} The creation timestamp in milliseconds since the epoch.
   */
  getTimestamp(): number {
    return this.timestamp
  }

  /**
   * Abstract method to execute the specific tag operation.
   * Subclasses must implement this to define their behavior and populate `this.executionResult`.
   * @param {BookmarkKeyValuePair[]} bookmarks - The live bookmark data to operate on.
   */
  abstract execute(bookmarks: BookmarkKeyValuePair[]): void

  /**
   * Abstract method to get the type of the command.
   * Subclasses must implement this to return their specific command type.
   * @returns {'add' | 'remove' | 'rename'} The type of the command.
   */
  abstract getType(): 'add' | 'remove' | 'rename'
}

/**
 * Represents a command to add one or more tags to a selection of bookmarks.
 * If the `DELETED_BOOKMARK_TAG` is among the tags being added, this command
 * will also populate the `deletedMeta` property of the affected bookmarks,
 * effectively marking them as deleted with a specific action type.
 */
export class AddTagCommand extends BaseTagCommand {
  private readonly actionType?: DeleteActionType

  /**
   * Initializes a new instance of the `AddTagCommand`.
   *
   * @param {string[]} bookmarkUrls - The URLs of the bookmarks to which the tags will be added.
   * @param {string | string[]} sourceTags - The tag or tags to add. This can be a single tag string
   *                                       (which might contain multiple tags separated by spaces/commas)
   *                                       or an array of tag strings. Tags are normalized and deduplicated by the base class.
   * @param {DeleteActionType} [actionType] - Optional. Specifies the context or reason for the deletion if
   *                                          `DELETED_BOOKMARK_TAG` is being added. This information is
   *                                          stored in `deletedMeta.actionType`.
   */
  constructor(
    bookmarkUrls: string[],
    sourceTags: string | string[],
    actionType?: DeleteActionType
  ) {
    super(bookmarkUrls, sourceTags)
    this.actionType = actionType
  }

  /**
   * Executes the command to add the specified tags to the bookmarks.
   * This method operates on the `resolvedBookmarks` provided by the CommandManager.
   * For each bookmark, it adds tags from `sourceTags` that are not already present.
   * If `DELETED_BOOKMARK_TAG` is added, it also sets the `deletedMeta` property
   * with the current timestamp and the specified or default `actionType`.
   * The method populates `this.executionResult` with the number of affected bookmarks,
   * the number of bookmarks marked as deleted, and their original states (tags and deletedMeta only) for undo purposes.
   * @param {BookmarkKeyValuePair[]} resolvedBookmarks - The live bookmark data, resolved by CommandManager, to operate on.
   */
  execute(resolvedBookmarks: BookmarkKeyValuePair[]): void {
    if (this.sourceTags.length === 0) {
      console.warn('AddTagCommand: No tags provided for adding.')
      this.executionResult = {
        affectedCount: 0,
        deletedCount: 0,
        originalStates: new Map(),
      }
      return
    }

    // Filter resolvedBookmarks to only include those actually requested by the command,
    // as resolveBookmarksCallback might return more or less depending on its implementation.
    // This ensures the command operates on the exact set of bookmarks it was intended for.
    const targetBookmarks = filterBookmarksByUrls(
      resolvedBookmarks,
      this.bookmarkUrls
    )

    const originalStates = new Map<string, OriginalBookmarkData>()
    let affectedCount = 0
    let deletedCount = 0
    const now = Date.now()
    const deletionTimestamp = this.getTimestamp() // Timestamp for deletion marking
    // Provide a default actionType if not specified during construction and DELETED_BOOKMARK_TAG is added
    const currentActionType = this.actionType || 'BATCH_DELETE_BOOKMARKS'

    for (const bookmark of targetBookmarks) {
      const bookmarkUrl = bookmark[0]
      const bookmarkData = bookmark[1]

      // Determine which of the sourceTags actually need to be added to this bookmark
      const tagsToAdd = this.sourceTags.filter(
        (tag) => !bookmarkData.tags.includes(tag)
      )

      if (tagsToAdd.length > 0) {
        // Store the original state (tags) for potential undo operation
        // No deletedMeta here, as it's not relevant for undo.
        originalStates.set(bookmarkUrl, {
          tags: [...bookmarkData.tags],
        })

        bookmarkData.tags = addTags(bookmarkData.tags, tagsToAdd)
        bookmarkData.meta.updated2 = now
        affectedCount++

        // If DELETED_BOOKMARK_TAG was one of the tags added,
        // populate the deletedMeta property.
        if (isMarkedAsDeleted(tagsToAdd)) {
          deletedCount++
          bookmarkData.deletedMeta = {
            deleted: deletionTimestamp,
            actionType: currentActionType,
          }
        }
      }
    }

    this.executionResult = { affectedCount, deletedCount, originalStates }
  }

  /**
   * Gets the type of this command.
   * @returns {'add'} The command type.
   */
  getType(): 'add' {
    return 'add'
  }

  /**
   * Gets a user-friendly description of the command.
   * This typically includes the action being performed and the tags involved.
   * @returns {string} A string describing the command, e.g., "Add tags: tag1, tag2".
   */
  getDescription(): string {
    // TODO: Consider localizing this string if the application supports multiple languages.
    return `Add tags: ${this.sourceTags.join(', ')}`
  }
}

/**
 * Represents a command to remove one or more tags from a selection of bookmarks.
 * This command has specific logic for handling the `DELETED_BOOKMARK_TAG`:
 *
 * 1.  **Tag Removal Condition**: The command removes `sourceTags` from a bookmark
 *     ONLY IF the bookmark currently possesses ALL of the specified `sourceTags`.
 *
 * 2.  **Marking as Deleted**: If, after removing the `sourceTags` (and the condition in point 1 is met),
 *     no other tags remain on the bookmark:
 *     - The bookmark's `tags` array is updated to include its original tags plus `DELETED_BOOKMARK_TAG`.
 *       It's crucial to retain the original tags for display purposes (e.g., on a deleted items page)
 *       and for potential restoration. The `DELETED_BOOKMARK_TAG` is added to this preserved set.
 *     - The `deletedMeta` property is populated with the current timestamp and the `actionType`
 *       (defaults to 'BATCH_REMOVE_TAGS' if not specified in the constructor).
 *     - If `DELETED_BOOKMARK_TAG` was part of the `sourceTags` being removed and the bookmark
 *       already had `deletedMeta` (i.e., it was already deleted), the existing `deletedMeta` is preserved.
 *       This effectively means the command re-confirms its deleted state without altering the original deletion metadata.
 *
 * 3.  **Clearing Deleted State (Undeletion)**: If `DELETED_BOOKMARK_TAG` is among the `sourceTags`
 *     being removed (and the condition in point 1 is met):
 *     - The bookmark's tags are updated to the new set (which will no longer include `DELETED_BOOKMARK_TAG`).
 *     - If the bookmark had `deletedMeta`, this property is cleared, effectively undeleting the bookmark.
 *
 * 4.  **Standard Tag Removal**: If tags remain on the bookmark after removing `sourceTags` (and `DELETED_BOOKMARK_TAG`
 *     was not part of the removal causing an undeletion as per point 3):
 *     - The bookmark's `tags` are updated to the new set of remaining tags.
 *
 * The `execute` method populates `this.executionResult` with the count of affected bookmarks,
 * the count of bookmarks newly marked as deleted, and a map of their original states for undo purposes.
 */
export class RemoveTagCommand extends BaseTagCommand {
  private readonly actionType?: DeleteActionType

  /**
   * Initializes a new instance of the `RemoveTagCommand`.
   *
   * @param {BookmarkKeyValuePair[]} bookmarks - An array of bookmark key-value pairs (`[url, bookmarkObject]`)
   *                                           from which the tags will be removed.
   * @param {string | string[]} sourceTags - The tag or tags to remove. This can be a single tag string or an array of strings.
   *                                       The command will only act on a bookmark if it contains ALL of these `sourceTags`.
   *                                       Tags are normalized (trimmed) and deduplicated by the base class constructor.
   * @param {DeleteActionType} [actionType] - Optional. Specifies the context for deletion if removing tags
   *                                          results in a bookmark being marked as deleted (e.g., when all user-defined tags are removed).
   *                                          This value is stored in `deletedMeta.actionType` if a bookmark becomes newly deleted.
   *                                          Defaults to 'BATCH_REMOVE_TAGS' if not provided and a bookmark is marked as deleted by this command.
   */
  constructor(
    bookmarkUrls: string[],
    sourceTags: string | string[],
    actionType?: DeleteActionType
  ) {
    super(bookmarkUrls, sourceTags)
    this.actionType = actionType
  }

  /**
   * Executes the command to remove the specified `sourceTags` from the bookmarks.
   * The behavior is detailed in the class-level JSDoc documentation.
   * Key aspects include:
   * - Conditional removal: Only if all `sourceTags` are present on a bookmark.
   * - Handling `DELETED_BOOKMARK_TAG`: Marking as deleted (preserving original tags) or clearing deleted state.
   * - Storing original states for undo.
   */
  execute(resolvedBookmarks: BookmarkKeyValuePair[]): void {
    if (this.sourceTags.length === 0) {
      console.warn('RemoveTagCommand: No tags provided for removal.')
      this.executionResult = {
        affectedCount: 0,
        deletedCount: 0,
        originalStates: new Map(),
      }
      return
    }

    // Filter resolvedBookmarks to only include those actually requested by the command,
    // as resolveBookmarksCallback might return more or less depending on its implementation.
    // This ensures the command operates on the exact set of bookmarks it was intended for.
    const targetBookmarks = filterBookmarksByUrls(
      resolvedBookmarks,
      this.bookmarkUrls
    )

    const originalStates = new Map<string, OriginalBookmarkData>()
    let affectedCount = 0
    let deletedCount = 0
    const now = Date.now()
    const deletionTimestamp = this.getTimestamp()
    const currentActionType = this.actionType || 'BATCH_REMOVE_TAGS'
    const tagsToRemove = this.sourceTags // Already normalized and deduplicated by base class
    const isRemovingDeletedBookmarkTag = isMarkedAsDeleted(tagsToRemove)

    for (const bookmark of targetBookmarks) {
      const bookmarkUrl = bookmark[0]
      const bookmarkData = bookmark[1]

      // Check if the bookmark contains ALL tags specified for removal.
      const allTagsToRemovePresent = tagsToRemove.every((tag) =>
        bookmarkData.tags.includes(tag)
      )

      if (allTagsToRemovePresent) {
        // Store the original state (tags, deletedMeta) for potential undo
        originalStates.set(bookmarkUrl, {
          tags: [...bookmarkData.tags], // Deep copy of original tags
          deletedMeta: bookmarkData.deletedMeta
            ? { ...bookmarkData.deletedMeta } // Deep copy of original deletedMeta
            : undefined,
        })

        const tagsAfterRemoval = removeTags(bookmarkData.tags, tagsToRemove)
        bookmarkData.meta.updated2 = now
        affectedCount++

        // Scenario 1: Undeleting a bookmark.
        // This occurs if all tags are removed AND the only tag being removed was DELETED_BOOKMARK_TAG.
        // This specific condition implies the bookmark was previously marked as deleted and is now being restored.
        if (
          tagsAfterRemoval.length === 0 &&
          tagsToRemove.length === 1 &&
          isRemovingDeletedBookmarkTag
        ) {
          bookmarkData.tags = [] // Bookmark now has no tags.

          // If DELETED_BOOKMARK_TAG was removed, it's an undelete operation.
          // Clear the deletedMeta to reflect its active status.
          if (bookmarkData.deletedMeta) {
            delete bookmarkData.deletedMeta
          }
        } else if (
          // Scenario 2: Marking a bookmark as deleted.
          // This occurs if either:
          //   a) No tags remain after the removal operation (tagsAfterRemoval is empty).
          //   b) The only tag remaining after removal is DELETED_BOOKMARK_TAG (e.g., other tags were removed from an already deleted item).
          tagsAfterRemoval.length === 0 ||
          (tagsAfterRemoval.length === 1 && isMarkedAsDeleted(tagsAfterRemoval))
        ) {
          // The bookmark is now considered deleted.
          // CRITICAL: Preserve the original tags (tags *before* this removal operation) for display purposes when viewing deleted items.
          // Then, add DELETED_BOOKMARK_TAG to this preserved set.
          // This ensures users can see what tags a bookmark had *before* it was deleted.
          // DO NOT use `tagsAfterRemoval` here if it's empty, as that would lose the original tag context.
          bookmarkData.tags = addTags(bookmarkData.tags, DELETED_BOOKMARK_TAG)

          if (bookmarkData.deletedMeta) {
            // The bookmark was already marked as deleted (e.g., DELETED_BOOKMARK_TAG was part of tagsToRemove
            // but other tags were also removed, resulting in an effectively empty set again, or it was already deleted and more tags are removed).
            // In this case, we keep its original deletedMeta to avoid overwriting the initial deletion context.
            console.warn(
              `Bookmark ${bookmarkUrl} is already deleted or being re-deleted, keeping original deletedMeta information.`
            )
          } else {
            // This is a new deletion event.
            deletedCount++
            bookmarkData.deletedMeta = {
              deleted: deletionTimestamp,
              actionType: currentActionType,
            }
          }
        } else {
          // Scenario 3: Standard tag removal (bookmark is not deleted or undeleted by this operation).
          // More than one tag remains, or one non-DELETED_BOOKMARK_TAG remains.
          bookmarkData.tags = tagsAfterRemoval

          // If DELETED_BOOKMARK_TAG was among those removed (effectively an undelete operation alongside other tag removals
          // or removing DELETED_BOOKMARK_TAG from an item that still has other tags),
          // clear the deletedMeta.
          if (isRemovingDeletedBookmarkTag && bookmarkData.deletedMeta) {
            delete bookmarkData.deletedMeta
          }
        }
      }
    }

    this.executionResult = { affectedCount, deletedCount, originalStates }
  }

  // Note: The `undo` method is inherited from BaseTagCommand and should correctly restore
  // tags, meta, and deletedMeta based on the `originalStates` populated by this `execute` method.

  /**
   * Gets the type of this command.
   * @returns {'remove'} The command type.
   */
  getType(): 'remove' {
    return 'remove'
  }

  /**
   * Gets a user-friendly description of the command.
   * This typically includes the action being performed and the tags involved.
   * @returns {string} A string describing the command, e.g., "Remove tags: tag1, tag2".
   */
  getDescription(): string {
    // TODO: Consider localizing this string if the application supports multiple languages.
    //       This can be done using a library like ParaglideJS, passing the message key and parameters.
    //       Example: m.commandDescriptionRemoveTags({ tags: this.sourceTags.join(', ') })
    return `Remove tags: ${this.sourceTags.join(', ')}`
  }
}

/**
 * Represents a command to rename one or more tags in a collection of bookmarks.
 * This command will replace all occurrences of specified source tags with target tags
 * in bookmarks (identified by their URLs) that contain *all* of the source tags.
 * The actual bookmark data is resolved by the CommandManager before execution.
 */
export class RenameTagCommand extends BaseTagCommand {
  private readonly targetTags: string[]

  /**
   * Creates an instance of RenameTagCommand.
   * @param {string[]} bookmarkUrls - The URLs of the bookmarks to operate on.
   * @param {string | string[]} sourceTags - The original tag name(s) to be renamed. Can be a single tag string or an array of tag strings.
   *                   These are the tags that will be looked for in the bookmarks.
   * @param {string | string[]} targetTags - The new tag name(s) to replace the source tags. Can be a single tag string or an array of tag strings.
   *                   These are the tags that will be added to the bookmarks after the source tags (if different) are removed.
   */
  constructor(
    bookmarkUrls: string[],
    sourceTags: string | string[],
    targetTags: string | string[]
  ) {
    super(bookmarkUrls, sourceTags)
    this.targetTags = splitTags(targetTags) // Normalize targetTags to an array of strings
  }

  /**
   * Executes the rename tag operation on the resolved bookmarks.
   * It iterates through the provided `resolvedBookmarks`. For each bookmark, if it contains all of the `sourceTags`,
   * those `sourceTags` (that are not also `targetTags`) are removed, and all `targetTags` are added.
   * The original state of modified bookmarks (their tags before renaming) is stored for potential undo operations.
   * The command will not execute if `sourceTags` or `targetTags` are empty, or if they include the `DELETED_BOOKMARK_TAG`,
   * logging an error in such cases.
   * Sets `this.executionResult` with the count of affected bookmarks and their original states (tags only).
   * @param {BookmarkKeyValuePair[]} resolvedBookmarks - The live bookmark data, resolved by CommandManager, to operate on.
   */
  execute(resolvedBookmarks: BookmarkKeyValuePair[]): void {
    // Prevent execution if source or target tags are invalid or empty.
    // The DELETED_BOOKMARK_TAG is a reserved tag and should not be part of rename operations.
    if (
      this.sourceTags.length === 0 ||
      this.targetTags.length === 0 ||
      isMarkedAsDeleted(this.sourceTags) ||
      isMarkedAsDeleted(this.targetTags)
    ) {
      console.error(
        'Invalid tag names provided for rename operation. Source/Target tags cannot be empty or include DELETED_BOOKMARK_TAG.'
      )
      // Initialize executionResult to indicate no operation was performed or to prevent errors if undo is called.
      this.executionResult = {
        affectedCount: 0,
        deletedCount: 0,
        originalStates: new Map<string, OriginalBookmarkData>(),
      }
      return
    }

    // Filter resolvedBookmarks to only include those actually requested by the command,
    // as resolveBookmarksCallback might return more or less depending on its implementation.
    // This ensures the command operates on the exact set of bookmarks it was intended for.
    const targetBookmarks = filterBookmarksByUrls(
      resolvedBookmarks,
      this.bookmarkUrls
    )

    const originalStates = new Map<string, OriginalBookmarkData>()
    let affectedCount = 0
    const now = Date.now()

    // Determine which of the source tags need to be explicitly removed.
    // This logic is crucial for maintaining the original order of tags after renaming.
    // For example, if original tags are [A, B, C] and we rename [A, B] to [A, D],
    // the desired result is [A, C, D].
    // Without this specific filtering for `tagsToRemove`, simply removing all sourceTags
    // and then adding all targetTags might result in an incorrect order like [C, A, D].
    // By identifying only the tags that are truly being removed (i.e., in sourceTags but not in targetTags),
    // we can preserve the relative order of other tags and correctly place the new/renamed tags.
    // Tags present in both sourceTags and targetTags are effectively kept (removed then re-added),
    // and this process also handles cases where a tag is 'renamed' to itself (e.g., 'A' to 'A') without unnecessary processing.
    const tagsToRemove = new Set(
      this.sourceTags.filter((tag) => !this.targetTags.includes(tag))
    )

    for (const bookmark of targetBookmarks) {
      const bookmarkUrl = bookmark[0]
      const bookmarkData = bookmark[1]

      // A bookmark is only processed if it contains ALL of the specified source tags.
      const hasAllSourceTags = this.sourceTags.every((tag) =>
        bookmarkData.tags.includes(tag)
      )

      if (hasAllSourceTags) {
        // Save the original state (tags) of the bookmark before modification for undo purposes.
        originalStates.set(bookmarkUrl, {
          tags: [...bookmarkData.tags], // Create a shallow copy of the tags array
        })

        // Remove the source tags that are not part of the target tags.
        const remainingTags = removeTags(bookmarkData.tags, [...tagsToRemove])

        // Add all target tags. The addTags utility handles duplicates, ensuring tags are unique.
        bookmarkData.tags = addTags(remainingTags, this.targetTags)
        bookmarkData.meta.updated2 = now
        affectedCount++
      }
    }

    this.executionResult = { affectedCount, deletedCount: 0, originalStates }
  }

  /**
   * Gets the type of this command.
   * @returns The command type, which is always 'rename' for this class.
   */
  getType(): 'rename' {
    return 'rename'
  }

  /**
   * Gets a copy of the target tags for this command.
   * @returns An array of strings representing the target tags.
   */
  override getTargetTags(): string[] {
    return [...this.targetTags] // Return a copy to prevent external modification
  }

  /**
   * Gets a human-readable description of the command.
   * This description can be used for display purposes, such as in an undo/redo history list.
   * @returns A string describing the rename operation.
   * @todo Consider localizing this string in the future.
   */
  getDescription(): string {
    // TODO: Localize this string
    return `Rename tags: ${this.sourceTags.join(', ')} -> ${this.targetTags.join(', ')}`
  }
}

/**
 * Composite Tag Command - Combines multiple {@link TagCommand} instances into a single logical command.
 * This allows for batching operations that can be executed and undone as a single unit.
 * The composite command delegates execution and undo operations to its constituent commands.
 * It aggregates the execution results from all sub-commands.
 */
export class CompositeTagCommand implements TagCommand {
  private readonly commands: TagCommand[]
  private readonly type: 'add' | 'remove' | 'rename'
  private readonly name: string
  private readonly timestamp: number
  private executionResult?: CommandExecutionResult

  /**
   * Create a composite tag command
   * @param commands Array of commands to combine
   * @param type Type of the composite command
   * @param name Optional name for the composite command
   */
  constructor(
    commands: TagCommand[],
    type: 'add' | 'remove' | 'rename',
    name = 'composite tag command'
  ) {
    this.commands = [...commands]
    this.type = type
    this.name = name
    this.timestamp = Date.now()
  }

  /**
   * Executes all contained commands in sequence on the provided `resolvedBookmarks`.
   * Each sub-command operates on a subset of `resolvedBookmarks` relevant to its `bookmarkUrls`.
   * Aggregates `affectedCount`, `deletedCount`, and `originalStates` from all sub-commands.
   * @param {BookmarkKeyValuePair[]} resolvedBookmarks - The live bookmark data, resolved by CommandManager, to operate on.
   */
  execute(resolvedBookmarks: BookmarkKeyValuePair[]): void {
    const compositeOriginalStates = new Map<string, OriginalBookmarkData>()
    let totalAffectedCount = 0
    let totalDeletedCount = 0

    for (const command of this.commands) {
      const bookmarkUrls = command.getBookmarkUrls()
      // Filter resolvedBookmarks to only include those actually requested by the command,
      // as resolveBookmarksCallback might return more or less depending on its implementation.
      // This ensures the command operates on the exact set of bookmarks it was intended for.
      const targetBookmarks = filterBookmarksByUrls(
        resolvedBookmarks,
        bookmarkUrls
      )
      command.execute(targetBookmarks)
      const result = command.getExecutionResult()
      if (!result) {
        console.error('Command execution result is missing.')
        continue
      }

      totalAffectedCount += result.affectedCount
      totalDeletedCount += result.deletedCount
      for (const [
        url,
        originalBookmarkData,
      ] of result.originalStates.entries()) {
        if (!compositeOriginalStates.has(url)) {
          compositeOriginalStates.set(url, originalBookmarkData)
        }
      }
    }

    this.executionResult = {
      affectedCount: compositeOriginalStates.size,
      deletedCount: totalDeletedCount,
      originalStates: compositeOriginalStates,
    }
  }

  /**
   * Undoes all contained commands in reverse sequence on the provided `resolvedBookmarks`.
   * Each sub-command's undo operation uses its own stored `executionResult` and operates on
   * a subset of `resolvedBookmarks` relevant to its `bookmarkUrls`.
   * @param {BookmarkKeyValuePair[]} resolvedBookmarks - The live bookmark data, resolved by CommandManager, to operate on.
   */
  undo(resolvedBookmarks: BookmarkKeyValuePair[]): void {
    // Undo commands in reverse order
    // Each sub-command will use its own stored executionResult for its undo logic
    for (let i = this.commands.length - 1; i >= 0; i--) {
      const bookmarkUrls = this.commands[i].getBookmarkUrls()
      // Filter resolvedBookmarks to only include those actually requested by the command,
      // as resolveBookmarksCallback might return more or less depending on its implementation.
      // This ensures the command operates on the exact set of bookmarks it was intended for.
      const targetBookmarks = filterBookmarksByUrls(
        resolvedBookmarks,
        bookmarkUrls
      )
      this.commands[i].undo(targetBookmarks)
    }
  }

  getExecutionResult(): CommandExecutionResult | undefined {
    return this.executionResult
  }

  clearExecutionResult(): void {
    this.executionResult = undefined
  }

  /**
   * Get command type
   */
  getType(): 'add' | 'remove' | 'rename' {
    return this.type
  }

  /**
   * Gets the URLs of the bookmarks targeted by this command.
   * @returns {string[]} A new array containing the bookmark URLs.
   */
  getBookmarkUrls(): string[] {
    const allUrls: string[] = []
    for (const command of this.commands) {
      allUrls.push(...command.getBookmarkUrls())
    }

    return [...new Set(allUrls)]
  }

  /**
   * Get source tags from all commands
   */
  getSourceTags(): string[] {
    const allTags: string[] = []

    for (const command of this.commands) {
      allTags.push(...command.getSourceTags())
    }

    return [...new Set(allTags)]
  }

  /**
   * Get target tags from all commands
   */
  getTargetTags(): string[] | undefined {
    if (this.type !== 'rename') {
      return undefined
    }

    const allTargetTags: string[] = []

    for (const command of this.commands) {
      const targetTags = command.getTargetTags()
      if (targetTags) {
        allTargetTags.push(...targetTags)
      }
    }

    return allTargetTags.length > 0 ? [...new Set(allTargetTags)] : undefined
  }

  /**
   * Get command name
   */
  getName(): string {
    return this.name
  }

  /**
   * Gets the timestamp when this command instance was created.
   * @returns {number} The creation timestamp in milliseconds since the epoch.
   */
  getTimestamp(): number {
    return this.timestamp
  }
}

// TODO: update 'updated2' value
