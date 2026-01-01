import { getBookmark } from '../storage/bookmarks'

/**
 * Interface for bookmark metadata
 */
type BookmarkMetadata = {
  href: string
  title?: string
  description?: string
}

/**
 * Star tag constant
 */

const STAR_TAG = '★'

/**
 * Validates bookmark metadata
 * @param metadata - The bookmark metadata to validate
 * @returns True if metadata is valid
 */
function validateBookmarkMetadata(metadata: BookmarkMetadata): boolean {
  return (
    typeof metadata.href === 'string' &&
    metadata.href.trim().length > 0 &&
    (metadata.title === undefined || typeof metadata.title === 'string') &&
    (metadata.description === undefined ||
      typeof metadata.description === 'string')
  )
}

/**
 * Creates options object for the star toggle prompt
 * @param metadata - The bookmark metadata
 * @returns Options object with non-empty values only
 */
function createPromptOptions(metadata: BookmarkMetadata): Record<string, any> {
  const options: Record<string, any> = {
    href: metadata.href,
  }

  // Only add title if it has a value
  if (metadata.title && metadata.title.trim()) {
    options.title = metadata.title.trim()
  }

  // Only add description if it has a value
  if (metadata.description && metadata.description.trim()) {
    options.description = metadata.description.trim()
  }

  return options
}

/**
 * Reference to the showCurrentPageLinkUtagsPrompt function
 * This will be set by the content script during initialization
 */
let showCurrentPageLinkUtagsPrompt: (
  tag?: string,
  remove?: boolean,
  options?: Record<string, any>
) => void

/**
 * Initializes the star handler with the required dependencies
 * This should be called once during application startup
 * @param promptFunction - The function to show the utags prompt
 */
export function initStarHandler(
  promptFunction: (
    tag?: string,
    remove?: boolean,
    options?: Record<string, any>
  ) => void
): void {
  showCurrentPageLinkUtagsPrompt = promptFunction
}

export function hasStarTag(href: string): boolean {
  const bookmark = getBookmark(href)
  const tags = bookmark?.tags || []
  return tags.includes(STAR_TAG)
}

/**
 * Handles toggling star tag for a bookmark
 * @param href - The URL of the bookmark
 * @param title - Optional title for the bookmark
 * @param description - Optional description for the bookmark
 */
export function toggleStarHandler(
  href: string,
  title?: string,
  description?: string
): void {
  // Check if the handler has been initialized
  if (!showCurrentPageLinkUtagsPrompt) {
    console.error('Star handler not initialized. Call initStarHandler() first.')
    return
  }

  // Validate input parameters
  const metadata: BookmarkMetadata = { href, title, description }
  if (!validateBookmarkMetadata(metadata)) {
    console.error('Invalid bookmark metadata provided to toggleStarHandler')
    return
  }

  try {
    // Get current bookmark data
    const bookmark = getBookmark(href)
    const currentTags = bookmark?.tags || []

    // Check if star tag is currently present
    const hasStarTag = currentTags.includes(STAR_TAG)

    // Create options object with only non-empty values
    const options = createPromptOptions(metadata)

    console.log(
      'toggleStarHandler',
      hasStarTag,
      href,
      title,
      description,
      options
    )

    // Show the star toggle prompt
    showCurrentPageLinkUtagsPrompt(STAR_TAG, hasStarTag, options)
  } catch (error) {
    console.error('Error in toggleStarHandler:', error)
  }
}

/**
 * Export the star tag constant for external use
 */
export { STAR_TAG }

/**
 * Export types for external use
 */
export type { BookmarkMetadata }
