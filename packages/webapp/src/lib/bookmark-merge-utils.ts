import { normalizeCreated, normalizeUpdated } from 'utags-utils'
import {
  type BookmarkTagsAndMetadata,
  type BookmarksData,
} from '../types/bookmarks.js'
import { DEFAULT_DATE } from '../config/constants.js'
import {
  type MergeMetaStrategy,
  type MergeTagsStrategy,
} from '../config/merge-options.js'
import { isValidDate } from '../utils/date.js'
import { areArraysEqual, areObjectsEqual } from '../utils/index.js'
import { isMarkedAsDeleted } from '../utils/bookmarks.js'
import { processInBatches } from './batch-processor.js'

/**
 * Defines the strategy for merging bookmarks from local and remote sources.
 */
export type MergeStrategy = {
  /** Strategy for merging titles. default is 'merge' */
  meta: MergeMetaStrategy
  /** Strategy for merging tags. default is 'union' or 'merge' */
  tags: MergeTagsStrategy
  /** Default date to use if created/updated timestamps are invalid. Must be a timestamp number. */
  defaultDate: number
  /**
   * Determines if the oldest 'created' timestamp should be preferred during merge.
   * Defaults to true (prefer oldest).
   */
  preferOldestCreated?: boolean
  /**
   * Determines if the newest 'updated' timestamp should be preferred during merge.
   * Defaults to true (prefer newest).
   */
  preferNewestUpdated?: boolean
  /** If true, skips merging existing bookmarks. Defaults to false. (Currently not implemented) */
  skipExisting?: boolean
  /** If true, an update operation will take precedence over a delete operation. Defaults to true. (Currently not implemented) */
  updateOverDelete?: boolean
  /** If true, local deleted bookmarks can be overwritten by remote non-deleted versions. (Currently not implemented) */
  overwriteLocalDeleted?: boolean
  /** If true, remote deleted bookmarks can be overwritten by local non-deleted versions. (Reserved for future use, currently not implemented) */
  overwriteRemoteDeleted?: boolean
}

/**
 * Options for synchronization operations.
 */
export type SyncOption = {
  /** The timestamp when the current synchronization operation started. Used to timestamp items processed in this sync cycle. */
  currentSyncTime: number
  /** The timestamp of the last successful synchronization. Items modified after this time are considered for the current sync. */
  lastSyncTime: number
}

/**
 * Represents the outcome of a merge operation for a single bookmark.
 * - `data`: The resulting bookmark data after the merge.
 * - `mergeTarget`: Indicates how the merged data should be applied or the nature of the merge.
 *   - 0: Conflict, no changes on either side, or no operation needed (e.g., both deleted or identical and no update required).
 *   - 1: Remote is the source of truth or more up-to-date; local should be updated from remote (Merge into Local).
 *   - 2: Local is the source of truth or more up-to-date; remote should be updated from local (Merge into Remote).
 *   - 3: Both local and remote were updated and a merge was performed; the result in `data` should update both sides.
 */
export type MergeDecision = {
  data: BookmarkTagsAndMetadata
  mergeTarget: 0 | 1 | 2 | 3 // 0: Conflict/NoOp, 1: Remote wins (update local), 2: Local wins (update remote), 3: Both updated (merged)
}

/**
 * Normalizes the metadata of a bookmark, ensuring 'created' and 'updated' timestamps are valid.
 * If 'created' is invalid, both 'created' and 'updated' are set to 'defaultDate'.
 * If 'updated' is invalid but 'created' is valid, 'updated' is set to 'created'.
 * This function directly modifies the 'meta' object of the provided bookmark data.
 * It does not explicitly handle 'updated2' and 'updated3' as their validity is usually tied to specific operations like batch modifications (updated2) or sync/import/merge operations (updated3).
 * @param {BookmarkTagsAndMetadata | undefined} data - The bookmark data to normalize. Can be undefined.
 * @param {number} defaultDate - The default timestamp to use if 'created' is invalid.
 */
function normalizeBookmark(
  data: BookmarkTagsAndMetadata | undefined,
  defaultDate: number
): void {
  if (!data || !data.meta) {
    // Log or handle the case where data or data.meta is undefined, if necessary
    // console.warn('normalizeBookmark: Received undefined data or meta.');
    return // Early return if data or meta is not present
  }

  const meta = data.meta
  const { created, updated } = meta

  if (!isValidDate(created) || updated < created) {
    meta.created = normalizeCreated(
      created,
      updated,
      defaultDate || DEFAULT_DATE
    )
  }

  if (!isValidDate(updated) || updated < meta.created) {
    meta.updated = meta.created
  }

  // Ensure updated2 and updated3 are not earlier than updated or created if they exist
  // if (meta.updated2 && meta.updated2 < Math.max(meta.created, meta.updated)) {
  //   // This case might indicate an inconsistency. Depending on the desired behavior,
  //   // it could be logged, or updated2 could be adjusted.
  //   // For now, we assume updated2 is managed correctly by the calling process (e.g., batch operations)
  // }
  // if (meta.updated3 && meta.updated3 < Math.max(meta.created, meta.updated)) {
  //   // Similar handling for updated3 which is managed by sync/import/merge operations
  // }
}

/**
 * Gets the most recent update timestamp from a bookmark's metadata.
 * It considers 'created' (creation time), 'updated' (manual user edit time),
 * 'updated2' (timestamp for batch modification operations), and 'updated3' (timestamp for sync/import/merge operations).
 * This function is crucial for determining the effective last modification time for synchronization logic
 * and conflict resolution, ensuring all relevant updates are considered.
 * @param {BookmarkTagsAndMetadata['meta']} meta - The metadata object of a bookmark.
 * @param {boolean} excludeSyncTimestamp - When true, excludes 'updated3' (sync/import/merge timestamp) from consideration.
 *   This is useful for determining if a bookmark has actual content modifications (user edits or batch operations)
 *   versus sync-only operations. Used in merge logic to distinguish between real content changes and sync metadata updates.
 * @returns {number} The latest timestamp among meta.created, meta.updated, meta.updated2, and optionally meta.updated3 (defaults to 0 if not present).
 */
function getUpdated(
  meta: BookmarkTagsAndMetadata['meta'],
  excludeSyncTimestamp = false
): number {
  return Math.max(
    meta.created,
    meta.updated,
    meta.updated2 || 0,
    excludeSyncTimestamp ? 0 : meta.updated3 || 0
  )
}

/**
 * Checks if a bookmark is considered valid for synchronization based on its last effective update time.
 * A bookmark is deemed valid if it exists (has data and metadata) and its most recent update timestamp
 * (obtained via getUpdated, which considers created, updated, updated2, and optionally updated3)
 * is strictly greater than the 'lastSyncTime'. This implies the bookmark has been modified
 * since the last successful synchronization finished.
 *
 * Note: The use of '>' (strictly greater than) means items whose last update timestamp
 * is equal to 'lastSyncTime' will not be considered valid. This behavior should align with
 * the precise definition of 'lastSyncTime' in the synchronization protocol (e.g., if lastSyncTime
 * is the exact end timestamp of the previous sync, then '>' is appropriate for new changes).
 * @param {BookmarkTagsAndMetadata | undefined} data - The bookmark data to check. Can be undefined if the bookmark doesn't exist on one side.
 * @param {number} lastSyncTime - The timestamp marking the completion of the last successful synchronization. Changes after this point are considered new.
 * @param {boolean} excludeSyncTimestamp - When true, excludes 'updated3' (sync/import/merge timestamp) from validation.
 *   This allows checking for actual content modifications (user edits or batch operations) versus sync-only operations.
 *   Used in merge logic to determine if a bookmark has real changes that warrant propagation or deletion handling.
 * @returns {boolean} True if the bookmark is valid for sync (i.e., modified after lastSyncTime), false otherwise.
 */
function isValid(
  data: BookmarkTagsAndMetadata | undefined,
  lastSyncTime: number,
  excludeSyncTimestamp = false
): data is BookmarkTagsAndMetadata {
  // Type predicate to narrow down type
  if (!data || !data.meta) {
    return false
  }

  return getUpdated(data.meta, excludeSyncTimestamp) > lastSyncTime
}

/**
 * Merges local and remote bookmark data based on the provided strategy and synchronization options.
 * This function orchestrates the entire merge process for all bookmarks across local and remote sources.
 * It iterates through all unique bookmark URLs present in either local or remote data.
 * For each bookmark, it performs the following steps:
 *   1. Normalizes bookmark data (e.g., timestamps) to ensure consistency.
 *   2. Checks if the local or remote version of the bookmark has been modified since the last synchronization (`isValid` check).
 *   3. If the bookmark exists in both sources, it calls `mergeBothSources` to determine the preliminary merged data based on validity and strategy.
 *   4. If the bookmark exists only in one source, it determines if it should be propagated to the other source or marked for deletion based on its validity.
 *   5. Merges 'created' and 'updated' timestamps according to the specified strategy (e.g., prefer oldest created, newest updated).
 *   6. Determines the `mergeTarget`, which indicates how the merged data should be applied (e.g., update local, update remote, update both, or no operation).
 *   7. Sets the `updated3` timestamp on the merged data to mark it as processed in the current sync cycle if an update is to occur.
 *   8. Accumulates changes into `updatesForLocal`, `updatesForRemote`, `localDeletions`, and `remoteDeletions` lists.
 * The function processes bookmarks in batches for improved performance and responsiveness.
 *
 * @param localDataInput - The current local bookmarks data. This input object will not be modified directly; a clone is used internally.
 * @param remoteDataInput - The current remote bookmarks data. This input object will not be modified directly; a clone is used internally.
 * @param strategy - The merge strategy defining how to handle conflicts for metadata (e.g., title) and tags.
 * @param syncOption - Options for the synchronization process, including `lastSyncTime` (timestamp of the last successful sync)
 *                     and `currentSyncTime` (timestamp for the current sync operation).
 * @param onProgress - Optional callback function to report merge progress.
 * @returns A Promise that resolves to an object containing the results of the merge operation:
 *   - `updatesForLocal`: BookmarksData to be created or updated in the local store.
 *   - `updatesForRemote`: BookmarksData to be created or updated in the remote store.
 *   - `localDeletions`: An array of URLs for bookmarks to be deleted from the local store.
 *   - `remoteDeletions`: An array of URLs for bookmarks to be deleted from the remote store.
 *   - `finalLocalData`: The complete local bookmarks data after applying all deletions and updates from this merge operation.
 *   - `finalRemoteData`: The complete remote bookmarks data after applying all deletions and updates from this merge operation.
 */
export async function mergeBookmarks(
  localDataInput: BookmarksData | undefined,
  remoteDataInput: BookmarksData | undefined,
  strategy: MergeStrategy,
  syncOption: SyncOption,
  onProgress?: (progress: {
    processedItems: number
    totalItems: number
    processedBatches: number
    totalBatches: number
  }) => void
): Promise<{
  updatesForLocal: BookmarksData
  updatesForRemote: BookmarksData
  localDeletions: string[]
  remoteDeletions: string[]
  finalLocalData: BookmarksData
  finalRemoteData: BookmarksData
}> {
  // Basic error handling for input data
  if (!localDataInput || !remoteDataInput) {
    console.error(
      'mergeBookmarks: Invalid input data. LocalData or RemoteData is undefined.'
    )
    return {
      updatesForLocal: {},
      updatesForRemote: {},
      localDeletions: [],
      remoteDeletions: [],
      finalLocalData: localDataInput || {},
      finalRemoteData: remoteDataInput || {},
    }
  }

  // Clone data to prevent modification of original objects during the merge process.
  const localData = structuredClone(localDataInput)
  const remoteData = structuredClone(remoteDataInput)

  let defaultDate = new Date(strategy.defaultDate).getTime()
  if (!isValidDate(defaultDate)) {
    defaultDate = DEFAULT_DATE
  }

  let { lastSyncTime = 0, currentSyncTime = Date.now() } = syncOption
  if (!isValidDate(lastSyncTime)) {
    lastSyncTime = 0
  }

  if (!isValidDate(currentSyncTime)) {
    currentSyncTime = Date.now()
  }

  // Accumulators for changes to be applied
  const updatesForLocal: BookmarksData = {} // Bookmarks to be created or updated locally
  const updatesForRemote: BookmarksData = {} // Bookmarks to be created or updated remotely
  const localDeletions: string[] = [] // URLs of bookmarks to be deleted locally
  const remoteDeletions: string[] = [] // URLs of bookmarks to be deleted remotely

  // Collect all unique URLs from both local and remote sources to ensure all items are processed.
  const allUrls = Array.from(
    new Set([...Object.keys(localData), ...Object.keys(remoteData)])
  ).filter((url) => {
    // Filter out invalid URLs to ensure data integrity.
    try {
      // eslint-disable-next-line no-new
      new URL(url)
      return true
    } catch {
      console.warn(`Invalid URL found and skipped: ${url}`)
      return false
    }
  })

  const batchSize = 100 // Process URLs in batches to avoid blocking and allow for progress reporting.

  await processInBatches(
    allUrls,
    async (batchUrls) => {
      for (const url of batchUrls) {
        const local = localData[url]
        const remote = remoteData[url]

        // Normalize timestamps before comparison
        // TODO: add modified after normalized items to merged items
        normalizeBookmark(local, defaultDate)
        normalizeBookmark(remote, defaultDate)

        // Determine if the local or remote version has been modified since the last sync.
        // A bookmark is 'valid' if it has been modified after lastSyncTime.
        // localValid/remoteValid: Check for actual content modifications (excludes sync-only operations)
        // localValid2/remoteValid2: Check for any modifications including sync operations
        // const localValid = isValid(local, lastSyncTime, true)
        // const remoteValid = isValid(remote, lastSyncTime, true)
        const localValid2 = isValid(local, lastSyncTime, false)
        const remoteValid2 = isValid(remote, lastSyncTime, false)

        if (local && remote) {
          // Case 1: Bookmark exists in both local and remote sources.
          const data = mergeBothSources(
            local,
            localValid2,
            remote,
            remoteValid2,
            strategy
          )

          // If mergeBothSources returns undefined, it means both versions were invalid (not updated
          // since lastSyncTime) and no merge action is taken. The item is effectively ignored for updates.
          // This aligns with the expected behavior: when both sides exist but are invalid, data is preserved and not updated.
          if (!data) {
            continue
          }

          // After `mergeBothSources` provides the core merged content (tags, meta excluding created/updated),
          // we now specifically update the 'created' and 'updated' timestamps based on the strategy.
          // This ensures that the `determinMergeTarget` function below uses data with the final, correct timestamps.
          // The `preferOldestCreated` and `preferNewestUpdated` flags in the strategy guide this process.
          // If `preferOldestCreated` is not explicitly false, the oldest 'created' time is chosen.
          // If `preferNewestUpdated` is not explicitly false, the newest 'updated' time is chosen.
          if (strategy.preferOldestCreated !== false) {
            data.meta.created = Math.min(
              local.meta.created,
              remote.meta.created
            )
          }

          if (strategy.preferNewestUpdated !== false) {
            data.meta.updated = Math.max(
              local.meta.updated,
              remote.meta.updated
            )

            data.meta.updated2 =
              local.meta.updated2 && remote.meta.updated2
                ? Math.max(local.meta.updated2, remote.meta.updated2)
                : local.meta.updated2 || remote.meta.updated2
          }

          // Determine the merge target based on the merged data and original local/remote versions.
          // mergeTarget === 0 can occur in several scenarios:
          //   1. Conflict: Local and remote versions have conflicting changes that cannot be automatically resolved by the current strategy.
          //   2. No effective change: Although both local and remote might have been 'valid' (modified since last sync),
          //      the merge process resulted in data identical to both original local and remote versions (e.g., both sides made the exact same change, including timestamps).
          //   3. Identical and no update needed: Both local and remote are identical, and neither was 'valid' (no changes since last sync).
          //   4. Both marked for deletion and strategy aligns with this (though deletion is handled earlier, this is a conceptual possibility for mergeTarget=0).
          // In these cases (mergeTarget === 0), no update action is taken for this item. It's skipped, and 'updated3' is not set.
          // The calling context might have specific rules for logging or handling conflicts if desired.
          const mergeTarget = determinMergeTarget(data, local, remote)
          if (mergeTarget === 0) {
            // If there's a conflict or no action needed (mergeTarget === 0), skip this item.
            // No updates will be queued for local or remote, and updated3 will not be set here.
            continue
          }

          // Ensure 'updated3' reflects this merge operation and is the most recent timestamp.
          // This is only calculated if mergeTarget indicates an update is needed (i.e., not 0).
          // Using currentSyncTime here helps handle edge cases, such as when a bookmark was just updated
          // (updated === currentSyncTime) or if the user's local clock was modified, making currentSyncTime
          // potentially less than a pre-existing 'updated' timestamp from a future-dated manual edit.
          // Adding 1 to existing getUpdated values ensures updated3 is strictly newer if based on those.
          data.meta.updated3 = Math.max(
            getUpdated(local.meta) + 1,
            getUpdated(remote.meta) + 1,
            currentSyncTime
          )

          // Based on mergeTarget, add the merged data to the appropriate update list.
          // mergeTarget = 1: Remote is truth, update local.
          // mergeTarget = 2: Local is truth, update remote.
          // mergeTarget = 3: Both were updated and merged, update both.
          if (mergeTarget === 1 || mergeTarget === 3) {
            updatesForLocal[url] = data
          }

          if (mergeTarget === 2 || mergeTarget === 3) {
            updatesForRemote[url] = data
          }
        } else if (local && !remote) {
          // Case 2: Bookmark exists only locally.
          if (localValid2) {
            // Local version is newer or new; it should be propagated to remote.
            // Update 'updated3' to mark it as processed in this sync cycle.
            // Using currentSyncTime ensures 'updated3' reflects this sync operation, handling cases
            // like recent local updates or local clock adjustments.
            const clone = structuredClone(local)
            clone.meta.updated3 = Math.max(
              getUpdated(local.meta) + 1,
              currentSyncTime
            )
            updatesForRemote[url] = clone
          } else {
            // Local version is old (not updated since lastSyncTime); it's presumed deleted on remote.
            // This is the expected behavior: if one side exists but is invalid (older than lastSyncTime)
            // and the other side doesn't exist, it's added to the respective deletion list.
            localDeletions.push(url)
          }
        } else if (!local && remote) {
          // Case 3: Bookmark exists only remotely.
          if (remoteValid2) {
            // Remote version is newer or new; it should be propagated to local.
            // Update 'updated3' to mark it as processed in this sync cycle.
            // Using currentSyncTime ensures 'updated3' reflects this sync operation, handling cases
            // like recent remote updates or clock adjustments on the remote source if applicable.
            const clone = structuredClone(remote)
            clone.meta.updated3 = Math.max(
              getUpdated(remote.meta) + 1,
              currentSyncTime
            )
            updatesForLocal[url] = clone
          } else {
            // Remote version is old (not updated since lastSyncTime); it's presumed deleted on local.
            // This is the expected behavior: if one side exists but is invalid (older than lastSyncTime)
            // and the other side doesn't exist, it's added to the respective deletion list.
            remoteDeletions.push(url)
          }
        }
        //  else {
        // Case 4: Bookmark exists in neither local nor remote data.
        // This should ideally not happen if allUrls is correctly derived from localData and remoteData keys.
        // console.warn(`Bookmark with URL ${url} found in neither local nor remote data during merge.`)
        // }
      }
    },
    {
      batchSize,
      onProgress(progress) {
        if (onProgress) {
          onProgress(progress)
        } else {
          console.log(
            `Processed URLs ${Math.max(progress.processedItems - batchSize, 0) + 1} to ${progress.processedItems} of ${progress.totalItems}`
          )
        }
      },
    }
  )

  // Filter out localDeletions from localData before merging with updatesForLocal
  const filteredLocalData = Object.fromEntries(
    Object.entries(localData).filter(([key]) => !localDeletions.includes(key))
  )
  const finalLocalData = {
    ...filteredLocalData,
    ...updatesForLocal,
  }
  // Filter out remoteDeletions from remoteData before merging with updatesForRemote
  const filteredRemoteData = Object.fromEntries(
    Object.entries(remoteData).filter(([key]) => !remoteDeletions.includes(key))
  )
  const finalRemoteData = {
    ...filteredRemoteData,
    ...updatesForRemote,
  }
  return {
    updatesForLocal,
    updatesForRemote,
    localDeletions,
    remoteDeletions,
    finalLocalData,
    finalRemoteData,
  }
}

/**
 * Merges bookmark data when it exists in both local and remote sources.
 * This function decides the preliminary merged data based on the validity (recency of updates) of local and remote versions.
 * - If both are invalid (not updated since last sync), returns `undefined` (no action needed).
 * - If one is valid and the other is not, returns a clone of the valid version.
 * - If both are valid, calls `mergeUpdates` to perform a content-level merge (tags and metadata, excluding created/updated initially).
 * The `mergeStrategy` is passed to `mergeUpdates` if needed.
 * The final `created` and `updated` timestamps, and the `mergeTarget`, are determined later in the `mergeBookmarks` function.
 * @param {BookmarkTagsAndMetadata} local - The local version of the bookmark.
 * @param {boolean} localValid - Whether the local version is valid (updated since last sync).
 * @param {BookmarkTagsAndMetadata} remote - The remote version of the bookmark.
 * @param {boolean} remoteValid - Whether the remote version is valid (updated since last sync).
 * @param {MergeStrategy} mergeStrategy - The overall merge strategy configuration.
 * @returns {BookmarkTagsAndMetadata | undefined} The preliminarily merged bookmark data (tags and meta, created/updated might be intermediate), or undefined if no action based on validity.
 */
// eslint-disable-next-line max-params
function mergeBothSources(
  local: BookmarkTagsAndMetadata,
  localValid: boolean,
  remote: BookmarkTagsAndMetadata,
  remoteValid: boolean,
  mergeStrategy: MergeStrategy
): BookmarkTagsAndMetadata | undefined {
  // Ignore if both local and remote versions are outdated (not valid).
  // This means if !localValid && !remoteValid, the function returns undefined.
  // The main mergeBookmarks loop will then 'continue', preserving these items without update or deletion,
  // which is the confirmed expected behavior.
  if (!localValid && !remoteValid) {
    return undefined
  }

  // If only remote is valid, take remote
  if (!localValid && remoteValid) {
    return structuredClone(remote)
  }

  // If only local is valid, take local
  if (localValid && !remoteValid) {
    return structuredClone(local)
  }

  // If both are valid, merge them based on strategy
  // Both localValid and remoteValid are true at this point
  return mergeUpdates(local, remote, mergeStrategy)
}

/**
 * Merges the content (tags and metadata) of local and remote bookmarks when both versions
 * are considered 'valid' (i.e., have been modified since the last synchronization cycle).
 * This function focuses on resolving differences in tags and user-editable metadata fields
 * (like title, description) based on the provided `mergeStrategy`.
 *
 * Key aspects:
 * - It determines timestamp precedence (`localHasTimestampPrecedence`) to guide 'newer' or 'merge' strategies.
 * - It calls specialized functions `mergeTags`, `mergeMeta`, and `mergeDeletedMeta` to handle specific parts of the bookmark.
 * - Importantly, this function *does not* finalize the `created` and `updated` timestamps of the `mergedData`.
 *   These are handled by `mergeCreatedAndUpdated` at a later stage in the `mergeBookmarks` orchestrator function.
 * - The `mergeTarget` (determining if local, remote, or both should be updated) is also decided later by `determinMergeTarget`
 *   after all merging, including timestamps, is complete.
 *
 * @param {BookmarkTagsAndMetadata} local - The local bookmark data, confirmed to be valid for merging.
 * @param {BookmarkTagsAndMetadata} remote - The remote bookmark data, confirmed to be valid for merging.
 * @param {MergeStrategy} mergeStrategy - The strategy object defining how to merge tags and metadata fields.
 *                                      It includes `tags` (e.g., 'union', 'local', 'remote', 'newer') and
 *                                      `meta` (e.g., 'merge', 'local', 'remote', 'newer') strategies.
 * @returns {BookmarkTagsAndMetadata} A new bookmark data object containing the merged tags and metadata.
 *                                    The `created` and `updated` fields in the returned `meta` are typically
 *                                    the ones from the version that had timestamp precedence for metadata, or a mix if 'merge' was used,
 *                                    but are subject to finalization by `mergeCreatedAndUpdated`.
 */
function mergeUpdates(
  local: BookmarkTagsAndMetadata,
  remote: BookmarkTagsAndMetadata,
  mergeStrategy: MergeStrategy
): BookmarkTagsAndMetadata {
  const mergeTagsStrategy = mergeStrategy.tags || 'union'
  const mergeMetaStrategy = mergeStrategy.meta || 'merge'

  // Calculate timestamp precedence once. This determines which version's tags/meta are preferred in case of 'newer' or 'merge' strategies.
  // If timestamps are equal, local is preferred.
  const localHasTimestampPrecedence = local.meta.updated >= remote.meta.updated

  // Perform the merge of tags and metadata based on the chosen strategies.
  // Merge tags using the specified strategy and the calculated timestamp precedence.
  const mergedTags = mergeTags(
    local,
    remote,
    mergeTagsStrategy,
    localHasTimestampPrecedence
  )
  // Merge metadata (excluding created/updated, which are handled separately) using the specified strategy and timestamp precedence.
  const mergedMeta = mergeMeta(
    local,
    remote,
    mergeMetaStrategy,
    localHasTimestampPrecedence
  )
  // If the merged bookmark is marked as deleted, merge the 'deletedMeta' information.
  const mergedDeletedMeta = isMarkedAsDeleted(mergedTags)
    ? mergeDeletedMeta(
        local,
        remote,
        mergeMetaStrategy, // Uses the same meta strategy for deletedMeta
        localHasTimestampPrecedence
      )
    : undefined

  // Create the base for the merged bookmark data.
  const mergedData: BookmarkTagsAndMetadata = {
    tags: mergedTags,
    meta: mergedMeta,
  }
  if (mergedDeletedMeta) {
    mergedData.deletedMeta = mergedDeletedMeta
  }

  return structuredClone(mergedData)
}

/**
 * Merges tags from local and remote bookmarks based on the specified strategy.
 * Assumes both local and remote bookmarks are valid for merging at this stage.
 * @param {BookmarkTagsAndMetadata} local - The local bookmark data.
 * @param {BookmarkTagsAndMetadata} remote - The remote bookmark data.
 * @param {MergeTagsStrategy} mergeTagsStrategy - The strategy for merging tags ('local', 'remote', 'newer', 'union').
 * @param {boolean} localHasTimestampPrecedence - True if the local version is considered to have precedence based on its timestamp.
 * @returns {string[]} An array of merged tags.
 */
function mergeTags(
  local: BookmarkTagsAndMetadata,
  remote: BookmarkTagsAndMetadata,
  mergeTagsStrategy: MergeTagsStrategy,
  localHasTimestampPrecedence: boolean
): string[] {
  switch (mergeTagsStrategy) {
    case 'local': {
      return local.tags
    }

    case 'remote': {
      return remote.tags
    }

    case 'newer': {
      // If 'newer' strategy, choose tags from the bookmark with the more recent 'updated' timestamp.
      return localHasTimestampPrecedence ? local.tags : remote.tags
    }

    default: {
      // Default to 'union' (or 'merge', which behaves like union for tags)
      // Combine tags from both, ensuring uniqueness.
      return Array.from(new Set([...local.tags, ...remote.tags]))
    }
  }
}

/**
 * Merges metadata (title, created, updated timestamps) from local and remote bookmarks.
 * Assumes both local and remote bookmarks are valid for merging at this stage.
 * @param {BookmarkTagsAndMetadata} local - The local bookmark data.
 * @param {BookmarkTagsAndMetadata} remote - The remote bookmark data.
 * @param {MergeMetaStrategy} mergeMetaStrategy - The strategy for merging metadata ('local', 'remote', 'newer', 'merge').
 * @param {boolean} localHasTimestampPrecedence - True if the local version is considered to have precedence based on its timestamp.
 * @returns {BookmarkTagsAndMetadata['meta']} The merged metadata object.
 */
function mergeMeta(
  local: BookmarkTagsAndMetadata,
  remote: BookmarkTagsAndMetadata,
  mergeMetaStrategy: MergeMetaStrategy,
  localHasTimestampPrecedence: boolean
): BookmarkTagsAndMetadata['meta'] {
  switch (mergeMetaStrategy) {
    case 'local': {
      return local.meta
    }

    case 'remote': {
      return remote.meta
    }

    case 'newer': {
      // If 'newer' strategy, choose metadata from the bookmark with the more recent 'updated' timestamp.
      return localHasTimestampPrecedence ? local.meta : remote.meta
    }

    default: {
      // Default to 'merge' strategy.
      // Prioritize the newer item's metadata, but overlay it onto the older one to preserve fields like 'created' if not present in newer.
      // A more robust merge might involve field-by-field comparison if specific fields have different merge rules.
      // For simplicity here, if 'local' is newer, its 'meta' takes precedence. If 'remote' is newer, its 'meta' takes precedence.
      // The spread operator order ensures this.
      return localHasTimestampPrecedence
        ? { ...remote.meta, ...local.meta } // Local overwrites remote where keys overlap
        : { ...local.meta, ...remote.meta } // Remote overwrites local where keys overlap
    }
  }
}

/**
 * Merges the 'deletedMeta' field from local and remote bookmarks if a bookmark is marked as deleted.
 * Assumes both local and remote bookmarks are valid for merging at this stage.
 * The 'deletedMeta' typically stores information about the bookmark at the time of deletion.
 * @param {BookmarkTagsAndMetadata} local - The local bookmark data.
 * @param {BookmarkTagsAndMetadata} remote - The remote bookmark data.
 * @param {MergeMetaStrategy} mergeMetaStrategy - The strategy for merging metadata, also applied to 'deletedMeta'.
 * @param {boolean} localHasTimestampPrecedence - True if the local version is considered to have precedence based on its timestamp.
 * @returns {BookmarkTagsAndMetadata['deletedMeta'] | undefined} The merged 'deletedMeta' object, or undefined if neither has it.
 */
function mergeDeletedMeta(
  local: BookmarkTagsAndMetadata,
  remote: BookmarkTagsAndMetadata,
  mergeMetaStrategy: MergeMetaStrategy, // Reusing MergeMetaStrategy for deletedMeta consistency
  localHasTimestampPrecedence: boolean
): BookmarkTagsAndMetadata['deletedMeta'] | undefined {
  const localDeletedMeta = local.deletedMeta
  const remoteDeletedMeta = remote.deletedMeta

  // If neither has deletedMeta, return undefined.
  if (!localDeletedMeta && !remoteDeletedMeta) {
    return undefined
  }

  // If only one has deletedMeta, return that one.
  if (!localDeletedMeta) {
    return remoteDeletedMeta
  }

  if (!remoteDeletedMeta) {
    return localDeletedMeta
  }

  // If both have deletedMeta, merge them based on the strategy.
  // This reuses the mergeMeta logic, assuming timestamps within deletedMeta (like original 'updated') guide the merge.
  switch (mergeMetaStrategy) {
    case 'local': {
      return localDeletedMeta
    }

    case 'remote': {
      return remoteDeletedMeta
    }

    case 'newer': {
      // Compare based on the 'updated' timestamp within the deletedMeta, if available and relevant.
      // Or, fall back to the main bookmark's update time if deletedMeta doesn't have its own comparable timestamp.
      // For simplicity, we'll use the main getUpdated, assuming deletion is an update.
      return localHasTimestampPrecedence ? localDeletedMeta : remoteDeletedMeta
    }

    default: {
      // 'merge' strategy for deletedMeta
      return localHasTimestampPrecedence
        ? { ...remoteDeletedMeta, ...localDeletedMeta }
        : { ...localDeletedMeta, ...remoteDeletedMeta }
    }
  }
}

/**
 * Determines the merge target by comparing the content of the merged bookmark data
 * with the original local and remote bookmark data. Content comparison excludes operational
 * timestamps like 'updated2' and 'updated3' to focus on user-editable data (tags, title, description, etc.).
 *
 * The merge target indicates how the merged data should be applied:
 * - `0`: NoOp / Conflict (Content-wise). The merged content is identical to both original local and remote content,
 *          or there's a conflict that the current strategies couldn't resolve into a change for either side.
 *          No update action is taken based on content.
 * - `1`: Update Local. The merged content differs from the local original but matches the remote original.
 *          This implies the remote version's content was preferred or changes from remote/merge should be applied to local.
 * - `2`: Update Remote. The merged content differs from the remote original but matches the local original.
 *          This implies the local version's content was preferred or changes from local/merge should be applied to remote.
 * - `3`: Update Both. The merged content differs from both original local and remote content.
 *          This indicates a true merge where both sides receive the consolidated changes.
 *
 * @param {BookmarkTagsAndMetadata} mergedData - The bookmark data resulting from the merge logic (e.g., from `mergeUpdates` or chosen from local/remote).
 * @param {BookmarkTagsAndMetadata} local - The original local bookmark data.
 * @param {BookmarkTagsAndMetadata} remote - The original remote bookmark data.
 * @returns {0 | 1 | 2 | 3} The calculated merge target, indicating the direction of the update based on content differences.
 */
function determinMergeTarget(
  mergedData: BookmarkTagsAndMetadata,
  local: BookmarkTagsAndMetadata,
  remote: BookmarkTagsAndMetadata
) {
  // Determine if the content (tags, meta excluding 'updated2', and deletedMeta)
  // of the local or remote bookmark differs from the merged result.
  // This helps decide the mergeTarget by focusing on user-editable content changes.
  // Timestamps ('updated2' and 'updated3') are excluded from this specific content comparison
  // because their merging is handled by mergeCreatedAndUpdated and the overall timestamp logic,
  // and they don't solely define a content conflict that requires a specific mergeTarget direction (1, 2, or 3) here.
  // The 'updated2' field is for batch operations and 'updated3' field is for sync/import/merge operations, both are operational timestamps and not user content.
  const ignoredMetaKeys = ['updated2', 'updated3']

  const localContentChanged =
    !areArraysEqual(mergedData.tags, local.tags) ||
    !areObjectsEqual(mergedData.meta, local.meta, ignoredMetaKeys) ||
    !areObjectsEqual(mergedData.deletedMeta, local.deletedMeta, []) // Compare deletedMeta if present

  const remoteContentChanged =
    !areArraysEqual(mergedData.tags, remote.tags) ||
    !areObjectsEqual(mergedData.meta, remote.meta, ignoredMetaKeys) ||
    !areObjectsEqual(mergedData.deletedMeta, remote.deletedMeta, []) // Compare deletedMeta if present

  // Determine the mergeTarget based on whether the merged content differs from the original local and remote content.
  let mergeTarget: 0 | 1 | 2 | 3 = 0 // Default to NoOp/Conflict (content-wise)

  if (localContentChanged && remoteContentChanged) {
    // If both original sources' content differs from the merged result, it's a true merge affecting both.
    mergeTarget = 3 // Both need update
  } else if (localContentChanged && !remoteContentChanged) {
    // Merged content matches remote's original content but differs from local's.
    // This implies remote was the effective source or local needed the changes from remote/merge.
    mergeTarget = 1 // Update Local (as if remote was source of truth for content)
  } else if (!localContentChanged && remoteContentChanged) {
    // Merged content matches local's original content but differs from remote's.
    // This implies local was the effective source or remote needed the changes from local/merge.
    mergeTarget = 2 // Update Remote (as if local was source of truth for content)
  } else {
    // !localContentChanged && !remoteContentChanged
    // Merged content matches both local and remote original content. No content change needed for either.
    // This can happen if, for example, only timestamps differed but content was identical, or merge strategy resulted in no change.
    mergeTarget = 0 // NoOp / Conflict (content-wise)
  }

  return mergeTarget
}
