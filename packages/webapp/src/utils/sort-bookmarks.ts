import type { BookmarkTagsAndMetadata } from '../types/bookmarks.js'
import type { SortOption } from '../config/sort-options.js'

type BookmarkItem = [string, BookmarkTagsAndMetadata]

/**
 * Sort an array of bookmarks by specified field
 * @param bookmarks Array of bookmarks in format [[url, entry], ...]
 * @param sortOption Sorting option, supports 'updatedDesc'/'updatedAsc'/'createdDesc'/'createdAsc'/'titleAsc'/'titleDesc'
 * @param language Language/locale for title sorting
 * @returns Sorted array of bookmarks
 */
export function sortBookmarks(
  bookmarks: BookmarkItem[],
  sortOption: SortOption,
  language = 'zh-CN'
): BookmarkItem[] {
  return [...bookmarks].sort((a, b) => {
    const [urlA, entryA] = a
    const [urlB, entryB] = b

    switch (sortOption) {
      case 'updatedDesc': {
        const updatedDiff = entryB.meta.updated - entryA.meta.updated
        return updatedDiff === 0 ? urlA.localeCompare(urlB) : updatedDiff
      }

      case 'updatedAsc': {
        const updatedDiff = entryA.meta.updated - entryB.meta.updated
        return updatedDiff === 0 ? urlA.localeCompare(urlB) : updatedDiff
      }

      case 'createdDesc': {
        const createdDiff = entryB.meta.created - entryA.meta.created
        return createdDiff === 0 ? urlA.localeCompare(urlB) : createdDiff
      }

      case 'createdAsc': {
        const createdDiff = entryA.meta.created - entryB.meta.created
        return createdDiff === 0 ? urlA.localeCompare(urlB) : createdDiff
      }

      case 'titleAsc': {
        const titleComparison = (entryA.meta.title || urlA).localeCompare(
          entryB.meta.title || urlB,
          language,
          {
            sensitivity: 'base',
            ignorePunctuation: true,
            numeric: false,
          }
        )
        return titleComparison === 0
          ? urlA.localeCompare(urlB)
          : titleComparison
      }

      case 'titleDesc': {
        const titleComparison = (entryB.meta.title || urlB).localeCompare(
          entryA.meta.title || urlA,
          language,
          {
            sensitivity: 'base',
            ignorePunctuation: true,
            numeric: false,
          }
        )
        return titleComparison === 0
          ? urlA.localeCompare(urlB)
          : titleComparison
      }

      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
      default: {
        return 0
      }
    }
  })
}
