import type {
  BookmarkKeyValuePair,
  BookmarksData,
  BookmarkStats,
} from '../types/bookmarks.js'
import { getHostName } from './url-utils.js'

/**
 * Calculates comprehensive statistics for bookmark data
 *
 * @param bookmarkEntries - Array of bookmark key-value pairs to analyze
 * @returns BookmarkStats object containing counts for bookmarks, tags, and domains
 *
 * @example
 * ```typescript
 * const bookmarks = [
 *   ['https://example.com', { title: 'Example', tags: ['web', 'demo'] }],
 *   ['https://test.com', { title: 'Test', tags: ['web', 'testing'] }]
 * ]
 * const stats = calculateBookmarkStats(bookmarks)
 * // Returns: { bookmarksCount: 2, tagsCount: 3, totalTagsCount: 4, domainsCount: 2 }
 * ```
 */
export function calculateBookmarkStats(
  bookmarkEntries: BookmarkKeyValuePair[]
): BookmarkStats {
  if (!bookmarkEntries || bookmarkEntries.length === 0) {
    return {
      bookmarksCount: 0,
      tagsCount: 0,
      totalTagsCount: 0,
      domainsCount: 0,
    }
  }

  // Calculate all tags (including duplicates)
  const allTags = bookmarkEntries.flatMap(([_, entry]) => entry.tags || [])

  // Calculate unique tags
  const uniqueTags = new Set(allTags)

  // Calculate unique domains
  const uniqueDomains = new Set(
    bookmarkEntries.map(([url, _]) => getHostName(url))
  )

  return {
    bookmarksCount: bookmarkEntries.length,
    tagsCount: uniqueTags.size,
    totalTagsCount: allTags.length,
    domainsCount: uniqueDomains.size,
  }
}

/**
 * Calculates statistics for bookmark data from a bookmarks object
 *
 * @param bookmarksData - Object with URL keys and bookmark metadata values
 * @returns BookmarkStats object containing counts for bookmarks, tags, and domains
 *
 * @example
 * ```typescript
 * const bookmarksData = {
 *   'https://example.com': { title: 'Example', tags: ['web', 'demo'] },
 *   'https://test.com': { title: 'Test', tags: ['web', 'testing'] }
 * }
 * const stats = calculateBookmarkStatsFromData(bookmarksData)
 * // Returns: { bookmarksCount: 2, tagsCount: 3, totalTagsCount: 4, domainsCount: 2 }
 * ```
 */
export function calculateBookmarkStatsFromData(
  bookmarksData: BookmarksData
): BookmarkStats {
  if (!bookmarksData || typeof bookmarksData !== 'object') {
    return {
      bookmarksCount: 0,
      tagsCount: 0,
      totalTagsCount: 0,
      domainsCount: 0,
    }
  }

  const bookmarkEntries: BookmarkKeyValuePair[] = Object.entries(bookmarksData)
  return calculateBookmarkStats(bookmarkEntries)
}
