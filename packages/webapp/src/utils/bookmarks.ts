import { splitTags } from 'utags-utils'
import type {
  BookmarkKeyValuePair,
  BookmarkTagsAndMetadata,
  TagHierarchyItem,
} from '../types/bookmarks.js'
import { DELETED_BOOKMARK_TAG } from '../config/constants.js'
import { getHostName } from './url-utils.js'

/**
 * Calculates the count of each tag from a list of bookmark entries.
 *
 * @param bookmarkEntries - An array of bookmark key-value pairs.
 * @returns A Map where keys are tag names and values are their counts.
 */
export function getTagCounts(
  bookmarkEntries: BookmarkKeyValuePair[]
): Map<string, number> {
  return new Map(
    bookmarkEntries
      .flatMap((entry) => entry[1].tags)
      // eslint-disable-next-line unicorn/no-array-reduce
      .reduce((acc, tag) => {
        acc.set(tag, (acc.get(tag) || 0) + 1)
        return acc
      }, new Map<string, number>())
  )
}

/**
 * Calculates the count of each domain from a list of bookmark entries.
 *
 * @param bookmarkEntries - An array of bookmark key-value pairs.
 * @returns A Map where keys are domain names and values are their counts.
 */
export function getDomainCounts(
  bookmarkEntries: BookmarkKeyValuePair[]
): Map<string, number> {
  return new Map(
    bookmarkEntries
      .map((entry) => getHostName(entry[0]))
      // eslint-disable-next-line unicorn/no-array-reduce
      .reduce((acc, domain) => {
        acc.set(domain, (acc.get(domain) || 0) + 1)
        return acc
      }, new Map<string, number>())
  )
}

/**
 * Normalizes a hierarchical path string.
 * This function removes leading slashes and spaces, collapses multiple slashes with surrounding spaces into a single slash,
 * and trims leading/trailing whitespace. Trailing slashes are preserved because browser bookmarks can represent empty folders.
 *
 * @param path - The path string to normalize.
 * @returns The normalized path string.
 */
export function normalizeHierachyPath(path: string) {
  // Note: Trailing slashes are preserved. This is because browser bookmarks support empty folders,
  // so trailing slashes need to be retained.
  return path
    .replaceAll(/^[/\s]+/g, '') // Remove leading slashes and spaces
    .replaceAll(/\s*\/\s*/g, '/') // Remove spaces around slashes
    .trim() // Remove leading and trailing spaces
}

/**
 * Converts a hierarchical path string into a tag query string for searching.
 * It escapes special regex characters in the path and formats it as a regex tag query.
 *
 * @param path - The hierarchical path string (e.g., "/folder/subfolder").
 * @returns A tag query string (e.g., "tag:/^\\/?folder\\s*\\/\\s*subfolder$/").
 */
function convertPathToQuery(path: string) {
  // Escape special regular expression characters
  const escapedPath = path.slice(1).replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return `tag:/^\\/?${escapedPath.replaceAll('/', '\\s*\\/\\s*')}$/`
}

/**
 * Generates a hierarchical tag structure from a list of bookmark entries.
 * It processes tags containing '/', normalizes them, and builds a tree structure.
 *
 * @param bookmarkEntries - An array of bookmark key-value pairs.
 * @returns An array of TagHierarchyItem objects representing the root of the tag hierarchy.
 */
export function getHierachyTags(
  bookmarkEntries: BookmarkKeyValuePair[]
): TagHierarchyItem[] {
  // First, get all tags and their counts
  const tagCounts = getTagCounts(bookmarkEntries)

  const tags = Array.from(
    new Set(
      [...tagCounts.keys()]
        .filter((tag) => tag.includes('/'))
        .map((tag) => normalizeHierachyPath(tag))
    )
  ).sort((a, b) => {
    return a.localeCompare(b, 'zh-CN', {
      sensitivity: 'base',
      ignorePunctuation: true,
      numeric: false,
    })
  })

  if (tags.length === 0) return []

  const root: TagHierarchyItem[] = []
  const pathMap = new Map<string, TagHierarchyItem>()

  for (const tag of tags) {
    const parts = tag.split('/')
    // .filter(Boolean)
    let currentPath = ''
    let parent: TagHierarchyItem | undefined

    for (const part of parts) {
      currentPath += `/${part.trim()}`
      if (!pathMap.has(currentPath)) {
        // Calculate the number of bookmarks that exactly match the current path, handling four path formats.
        // Needs to include '/aaa/bbb', '/aaa/bbb/', 'aaa/bbb', 'aaa/bbb/'.
        // FIXME: There's a minor issue with the current count. If a bookmark has multiple tags matching the same path,
        // the count will be higher than actual. For example, '/aaa/bbb' and 'aaa/bbb' both match 'aaa/bbb'.
        // However, users are unlikely to add such tags intentionally.
        const normalizedCurrentPath = normalizeHierachyPath(currentPath)
        const count = Array.from(tagCounts.entries())
          .filter(([t]) => normalizeHierachyPath(t) === normalizedCurrentPath)
          .reduce((sum, [, cnt]) => sum + cnt, 0)
        // console.log('Current path:', currentPath, 'Exact match count:', count) // Keep or remove logging as needed

        const newItem: TagHierarchyItem = {
          name: part,
          path: currentPath,
          query: convertPathToQuery(currentPath),
          count,
          children: [],
          expanded: false,
        }

        if (parent) {
          parent.children.push(newItem)
        } else {
          root.push(newItem)
        }

        pathMap.set(currentPath, newItem)
      }

      parent = pathMap.get(currentPath)
    }
  }

  return root
}

/**
 * Checks if the input is an array of BookmarkKeyValuePair.
 *
 * @param input - The input to check.
 * @returns True if the input is an array of BookmarkKeyValuePair, false otherwise.
 */
export function isBookmarkKeyValuePairArray(
  input: BookmarkKeyValuePair | BookmarkKeyValuePair[]
): input is BookmarkKeyValuePair[] {
  // Type predicate for better type inference
  return Array.isArray(input) && (input.length === 0 || Array.isArray(input[0]))
}

/**
 * Adds new tags to an existing list of tags, ensuring no duplicates.
 *
 * @param orgTags - The original array of tags. Can be undefined or null, treated as an empty array.
 * @param tagsToAdd - A single tag string or an array of tag strings to add.
 * @returns A new array of strings containing all unique tags.
 */
export function addTags(
  // eslint-disable-next-line @typescript-eslint/ban-types
  orgTags: string[] | undefined | null, // Allow undefined or null for orgTags
  tagsToAdd: string | string[]
): string[] {
  const tags = orgTags || [] // Initialize with empty array if orgTags is null/undefined

  // Normalize to string if tagsToAdd is an array
  const tagsToAddString = Array.isArray(tagsToAdd)
    ? tagsToAdd.join(',')
    : tagsToAdd

  return splitTags(tags.join(',') + ',' + tagsToAddString)
}

/**
 * Removes specified tags from an existing list of tags.
 *
 * @param orgTags - The original array of tags. Can be undefined or null, treated as an empty array.
 * @param tagsToRemove - A single tag string or an array of tag strings to remove.
 * @returns A new array of strings with the specified tags removed.
 */
export function removeTags(
  // eslint-disable-next-line @typescript-eslint/ban-types
  orgTags: string[] | undefined | null, // Allow undefined or null for orgTags
  tagsToRemove: string | string[]
): string[] {
  const tags = new Set(orgTags || []) // Initialize with empty array if orgTags is null/undefined

  if (tags.size === 0) {
    return []
  }

  const tagsToRemoveArray = Array.isArray(tagsToRemove)
    ? tagsToRemove
    : [tagsToRemove] // Normalize to array

  for (const tag of tagsToRemoveArray) {
    if (tag && typeof tag === 'string') {
      // Ensure tag is a string before deleting
      tags.delete(tag)
    }
  }

  return splitTags(tags)
}

/**
 * Filters an array of bookmark key-value pairs by a given list of URLs.
 *
 * @param bookmarks - An array of BookmarkKeyValuePair, where each element is a tuple containing the bookmark URL and its data.
 * @param urls - An array of strings representing the URLs to filter by.
 * @returns A new array of BookmarkKeyValuePair containing only the bookmarks whose URLs are included in the `urls` array.
 */
export function filterBookmarksByUrls(
  bookmarks: BookmarkKeyValuePair[],
  urls: string[]
): BookmarkKeyValuePair[] {
  return bookmarks.filter(([url]) => urls.includes(url))
}

/**
 * Checks if a bookmark is marked as deleted.
 * A bookmark is considered deleted if its tags array includes the 'DELETED_BOOKMARK_TAG'.
 * @param {BookmarkTagsAndMetadata | string[] | undefined | null} data - The bookmark data or tags array to check.
 * @returns {boolean} True if the bookmark is marked as deleted, false otherwise.
 */
export function isMarkedAsDeleted(
  // eslint-disable-next-line @typescript-eslint/ban-types
  data: BookmarkTagsAndMetadata | string[] | undefined | null
): boolean {
  if (!data) {
    return false
  }

  // Check if data is an array of strings (tags array)
  if (Array.isArray(data)) {
    return data.includes(DELETED_BOOKMARK_TAG)
  }

  // Check if data is BookmarkTagsAndMetadata and has a tags property
  if (typeof data === 'object' && Array.isArray(data.tags)) {
    return data.tags.includes(DELETED_BOOKMARK_TAG)
  }

  return false
}
