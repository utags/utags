import type { BookmarkTagsAndMetadata } from '../types/bookmarks.js'
import { sortMetaProperties } from './sort-meta-properties.js'

/**
 * Type guard to check if a value is a valid meta object
 * @param value - Value to check
 * @returns True if value is a valid meta object
 */
function isMetaObject(
  value: unknown
): value is BookmarkTagsAndMetadata['meta'] {
  return value !== null && typeof value === 'object'
}

/**
 * Type guard to check if a value is a BookmarkTagsAndMetadata object
 * @param value - Value to check
 * @returns True if value has the structure of BookmarkTagsAndMetadata
 */
function isBookmarkTagsAndMetadata(
  value: unknown
): value is BookmarkTagsAndMetadata {
  return (
    value !== null &&
    typeof value === 'object' &&
    'tags' in value &&
    Array.isArray((value as BookmarkTagsAndMetadata).tags)
  )
}

/**
 * Sort bookmark properties to ensure consistent structure
 * Places tags first, followed by other properties, with meta always at the end
 * @param value - Bookmark data with tags and metadata
 * @returns Sorted bookmark object with consistent property order
 */
function sortBookmarkProperties(
  value: BookmarkTagsAndMetadata
): BookmarkTagsAndMetadata {
  const { tags, meta, ...rest } = value
  return {
    tags,
    ...rest,
    meta,
  }
}

/**
 * Normalize bookmark data structure by standardizing meta object properties for consistent format
 * Recursively processes the data structure and ensures all meta objects have their properties
 * sorted alphabetically with 'created' property positioned at the end for export consistency
 * @param data - Bookmark data to normalize (can be any valid JSON value)
 * @returns Normalized data with standardized meta object structure
 */
export function normalizeBookmarkData<T>(data: T): T {
  // Handle null and undefined explicitly
  if (data === null || data === undefined) {
    return data
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => normalizeBookmarkData(item)) as T
  }

  // Handle objects (excluding null which is already handled)
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(data)) {
      result[key] =
        key === 'meta' && isMetaObject(value)
          ? sortMetaProperties(value)
          : normalizeBookmarkData(value)
    }

    if (isBookmarkTagsAndMetadata(result)) {
      return sortBookmarkProperties(result) as T
    }

    return result as T
  }

  // Handle primitives (string, number, boolean)
  return data
}
