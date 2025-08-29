import type { BookmarkTagsAndMetadata } from '../types/bookmarks.js'

/**
 * Sort meta object properties with created at the end for consistent export format
 * @param meta - Meta object to sort
 * @returns Sorted meta object with created property at the end
 */
export function sortMetaProperties(
  meta: BookmarkTagsAndMetadata['meta']
): BookmarkTagsAndMetadata['meta'] {
  if (!meta || typeof meta !== 'object') {
    return meta
  }

  // Use Record type for better type safety
  const sortedMeta: Record<string, unknown> = {}
  const entries = Object.entries(meta)

  // Separate created from other properties for more efficient processing
  const createdEntry = entries.find(([key]) => key === 'created')
  const otherEntries = entries
    .filter(([key]) => key !== 'created')
    .sort(([a], [b]) => a.localeCompare(b))

  // Add sorted properties first
  for (const [key, value] of otherEntries) {
    sortedMeta[key] = value
  }

  // Add created property at the end if it exists
  if (createdEntry) {
    sortedMeta[createdEntry[0]] = createdEntry[1]
  }

  return sortedMeta as BookmarkTagsAndMetadata['meta']
}
