import type { BookmarkMetadata } from '../../types/bookmarks.js'

/**
 * Creates a condition function to filter bookmarks with notes
 * @param params - URL search parameters containing filter conditions
 * @returns Filter condition function or undefined if 'has_note' param not present
 */
export function createNoteCondition(params: URLSearchParams) {
  // Return undefined if 'has_note' parameter is not specified
  if (!params.has('has_note')) return undefined

  /**
   * Filter function that checks if bookmark has a non-empty note
   * @param href - Bookmark URL (unused in this filter)
   * @param tags - Bookmark tags (unused in this filter)
   * @param meta - Bookmark metadata containing the note field
   * @returns true if note exists and is not empty
   */
  return (href: string, tags: string[], meta: BookmarkMetadata) =>
    // Check if note exists and is not just whitespace
    Boolean(meta.note?.trim())
}
