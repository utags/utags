import { describe, it, expect } from 'vitest'
import type { BookmarkTagsAndMetadata } from '../types/bookmarks.js'
import type { SortOption } from '../config/sort-options.js'
import { sortBookmarks } from './sort-bookmarks.js'

type BookmarkItem = [string, BookmarkTagsAndMetadata]

describe('sortBookmarks', () => {
  // Sample bookmark data for testing
  const createBookmark = (
    url: string,
    title: string,
    created: number,
    updated: number
  ): BookmarkItem => [
    url,
    {
      tags: ['test'],
      meta: {
        title,
        created,
        updated,
      },
    },
  ]

  const sampleBookmarks: BookmarkItem[] = [
    createBookmark('https://example.com', 'Example Site', 1000, 2000),
    createBookmark('https://github.com', 'GitHub', 1500, 1800),
    createBookmark('https://stackoverflow.com', 'Stack Overflow', 800, 2500),
    createBookmark('https://developer.mozilla.org', 'MDN Web Docs', 1200, 1600),
  ]

  describe('updatedDesc sorting', () => {
    it('should sort bookmarks by updated date in descending order', () => {
      const result = sortBookmarks(sampleBookmarks, 'updatedDesc')

      expect(result[0][0]).toBe('https://stackoverflow.com') // updated: 2500
      expect(result[1][0]).toBe('https://example.com') // updated: 2000
      expect(result[2][0]).toBe('https://github.com') // updated: 1800
      expect(result[3][0]).toBe('https://developer.mozilla.org') // updated: 1600
    })

    it('should use URL as secondary sort when updated dates are equal', () => {
      const bookmarksWithSameUpdated: BookmarkItem[] = [
        createBookmark('https://z-site.com', 'Z Site', 1000, 2000),
        createBookmark('https://a-site.com', 'A Site', 1000, 2000),
        createBookmark('https://m-site.com', 'M Site', 1000, 2000),
      ]

      const result = sortBookmarks(bookmarksWithSameUpdated, 'updatedDesc')

      expect(result[0][0]).toBe('https://a-site.com')
      expect(result[1][0]).toBe('https://m-site.com')
      expect(result[2][0]).toBe('https://z-site.com')
    })
  })

  describe('updatedAsc sorting', () => {
    it('should sort bookmarks by updated date in ascending order', () => {
      const result = sortBookmarks(sampleBookmarks, 'updatedAsc')

      expect(result[0][0]).toBe('https://developer.mozilla.org') // updated: 1600
      expect(result[1][0]).toBe('https://github.com') // updated: 1800
      expect(result[2][0]).toBe('https://example.com') // updated: 2000
      expect(result[3][0]).toBe('https://stackoverflow.com') // updated: 2500
    })

    it('should use URL as secondary sort when updated dates are equal', () => {
      const bookmarksWithSameUpdated: BookmarkItem[] = [
        createBookmark('https://z-site.com', 'Z Site', 1000, 1500),
        createBookmark('https://a-site.com', 'A Site', 1000, 1500),
        createBookmark('https://m-site.com', 'M Site', 1000, 1500),
      ]

      const result = sortBookmarks(bookmarksWithSameUpdated, 'updatedAsc')

      expect(result[0][0]).toBe('https://a-site.com')
      expect(result[1][0]).toBe('https://m-site.com')
      expect(result[2][0]).toBe('https://z-site.com')
    })
  })

  describe('createdDesc sorting', () => {
    it('should sort bookmarks by created date in descending order', () => {
      const result = sortBookmarks(sampleBookmarks, 'createdDesc')

      expect(result[0][0]).toBe('https://github.com') // created: 1500
      expect(result[1][0]).toBe('https://developer.mozilla.org') // created: 1200
      expect(result[2][0]).toBe('https://example.com') // created: 1000
      expect(result[3][0]).toBe('https://stackoverflow.com') // created: 800
    })

    it('should use URL as secondary sort when created dates are equal', () => {
      const bookmarksWithSameCreated: BookmarkItem[] = [
        createBookmark('https://z-site.com', 'Z Site', 1000, 1500),
        createBookmark('https://a-site.com', 'A Site', 1000, 1600),
        createBookmark('https://m-site.com', 'M Site', 1000, 1700),
      ]

      const result = sortBookmarks(bookmarksWithSameCreated, 'createdDesc')

      expect(result[0][0]).toBe('https://a-site.com')
      expect(result[1][0]).toBe('https://m-site.com')
      expect(result[2][0]).toBe('https://z-site.com')
    })
  })

  describe('createdAsc sorting', () => {
    it('should sort bookmarks by created date in ascending order', () => {
      const result = sortBookmarks(sampleBookmarks, 'createdAsc')

      expect(result[0][0]).toBe('https://stackoverflow.com') // created: 800
      expect(result[1][0]).toBe('https://example.com') // created: 1000
      expect(result[2][0]).toBe('https://developer.mozilla.org') // created: 1200
      expect(result[3][0]).toBe('https://github.com') // created: 1500
    })

    it('should use URL as secondary sort when created dates are equal', () => {
      const bookmarksWithSameCreated: BookmarkItem[] = [
        createBookmark('https://z-site.com', 'Z Site', 1000, 1500),
        createBookmark('https://a-site.com', 'A Site', 1000, 1600),
        createBookmark('https://m-site.com', 'M Site', 1000, 1700),
      ]

      const result = sortBookmarks(bookmarksWithSameCreated, 'createdAsc')

      expect(result[0][0]).toBe('https://a-site.com')
      expect(result[1][0]).toBe('https://m-site.com')
      expect(result[2][0]).toBe('https://z-site.com')
    })
  })

  describe('titleAsc sorting', () => {
    it('should sort bookmarks by title in ascending order', () => {
      const result = sortBookmarks(sampleBookmarks, 'titleAsc')

      expect(result[0][0]).toBe('https://example.com') // title: 'Example Site'
      expect(result[1][0]).toBe('https://github.com') // title: 'GitHub'
      expect(result[2][0]).toBe('https://developer.mozilla.org') // title: 'MDN Web Docs'
      expect(result[3][0]).toBe('https://stackoverflow.com') // title: 'Stack Overflow'
    })

    it('should use URL as fallback when title is missing', () => {
      const bookmarksWithMissingTitles: BookmarkItem[] = [
        [
          'https://z-site.com',
          { tags: ['test'], meta: { created: 1000, updated: 1500 } },
        ],
        [
          'https://a-site.com',
          {
            tags: ['test'],
            meta: { title: 'A Site', created: 1000, updated: 1500 },
          },
        ],
        [
          'https://m-site.com',
          { tags: ['test'], meta: { created: 1000, updated: 1500 } },
        ],
      ]

      const result = sortBookmarks(bookmarksWithMissingTitles, 'titleAsc')

      expect(result[0][0]).toBe('https://a-site.com') // has title
      expect(result[1][0]).toBe('https://m-site.com') // URL fallback
      expect(result[2][0]).toBe('https://z-site.com') // URL fallback
    })

    it('should use URL as secondary sort when titles are equal', () => {
      const bookmarksWithSameTitles: BookmarkItem[] = [
        createBookmark('https://z-site.com', 'Same Title', 1000, 1500),
        createBookmark('https://a-site.com', 'Same Title', 1000, 1600),
        createBookmark('https://m-site.com', 'Same Title', 1000, 1700),
      ]

      const result = sortBookmarks(bookmarksWithSameTitles, 'titleAsc')

      expect(result[0][0]).toBe('https://a-site.com')
      expect(result[1][0]).toBe('https://m-site.com')
      expect(result[2][0]).toBe('https://z-site.com')
    })

    it('should handle different languages correctly', () => {
      const chineseBookmarks: BookmarkItem[] = [
        createBookmark('https://example1.com', '中文网站', 1000, 1500),
        createBookmark('https://example2.com', '英文网站', 1000, 1600),
        createBookmark('https://example3.com', '测试网站', 1000, 1700),
      ]

      const result = sortBookmarks(chineseBookmarks, 'titleAsc', 'zh-CN')

      // Chinese sorting should work correctly
      expect(result.length).toBe(3)
      expect(result[0][1].meta.title).toBe('测试网站')
      expect(result[1][1].meta.title).toBe('英文网站')
      expect(result[2][1].meta.title).toBe('中文网站')
    })

    it('should ignore punctuation and case sensitivity', () => {
      const bookmarksWithPunctuation: BookmarkItem[] = [
        createBookmark('https://example1.com', 'A-Site!', 1000, 1500),
        createBookmark('https://example2.com', 'a site', 1000, 1600),
        createBookmark('https://example3.com', 'A.Site', 1000, 1700),
      ]

      const result = sortBookmarks(bookmarksWithPunctuation, 'titleAsc')

      // All should be treated as similar due to ignorePunctuation and case insensitivity
      // Secondary sort by URL should apply
      expect(result[0][0]).toBe('https://example1.com')
      expect(result[1][0]).toBe('https://example2.com')
      expect(result[2][0]).toBe('https://example3.com')
    })
  })

  describe('titleDesc sorting', () => {
    it('should sort bookmarks by title in descending order', () => {
      const result = sortBookmarks(sampleBookmarks, 'titleDesc')

      expect(result[0][0]).toBe('https://stackoverflow.com') // title: 'Stack Overflow'
      expect(result[1][0]).toBe('https://developer.mozilla.org') // title: 'MDN Web Docs'
      expect(result[2][0]).toBe('https://github.com') // title: 'GitHub'
      expect(result[3][0]).toBe('https://example.com') // title: 'Example Site'
    })

    it('should use URL as fallback when title is missing', () => {
      const bookmarksWithMissingTitles: BookmarkItem[] = [
        [
          'https://a-site.com',
          { tags: ['test'], meta: { created: 1000, updated: 1500 } },
        ],
        [
          'https://z-site.com',
          {
            tags: ['test'],
            meta: { title: 'Z Site', created: 1000, updated: 1500 },
          },
        ],
        [
          'https://m-site.com',
          { tags: ['test'], meta: { created: 1000, updated: 1500 } },
        ],
      ]

      const result = sortBookmarks(bookmarksWithMissingTitles, 'titleDesc')

      expect(result[0][0]).toBe('https://z-site.com') // has title 'Z Site'
      expect(result[1][0]).toBe('https://m-site.com') // URL fallback (m comes after a in desc)
      expect(result[2][0]).toBe('https://a-site.com') // URL fallback
    })

    it('should use URL as secondary sort when titles are equal', () => {
      const bookmarksWithSameTitles: BookmarkItem[] = [
        createBookmark('https://z-site.com', 'Same Title', 1000, 1500),
        createBookmark('https://a-site.com', 'Same Title', 1000, 1600),
        createBookmark('https://m-site.com', 'Same Title', 1000, 1700),
      ]

      const result = sortBookmarks(bookmarksWithSameTitles, 'titleDesc')

      expect(result[0][0]).toBe('https://a-site.com')
      expect(result[1][0]).toBe('https://m-site.com')
      expect(result[2][0]).toBe('https://z-site.com')
    })
  })

  describe('edge cases', () => {
    it('should handle empty array', () => {
      const result = sortBookmarks([], 'updatedDesc')
      expect(result).toEqual([])
    })

    it('should handle single bookmark', () => {
      const singleBookmark = [
        createBookmark('https://example.com', 'Example', 1000, 1500),
      ]
      const result = sortBookmarks(singleBookmark, 'titleAsc')
      expect(result).toEqual(singleBookmark)
    })

    it('should not mutate original array', () => {
      const originalBookmarks = [...sampleBookmarks]
      const result = sortBookmarks(sampleBookmarks, 'updatedDesc')

      expect(sampleBookmarks).toEqual(originalBookmarks)
      expect(result).not.toBe(sampleBookmarks)
    })

    it('should handle bookmarks with same timestamps', () => {
      const sameTimestampBookmarks: BookmarkItem[] = [
        createBookmark('https://z-site.com', 'Z Site', 1000, 1000),
        createBookmark('https://a-site.com', 'A Site', 1000, 1000),
        createBookmark('https://m-site.com', 'M Site', 1000, 1000),
      ]

      const result = sortBookmarks(sameTimestampBookmarks, 'updatedDesc')

      // Should be sorted by URL as secondary sort
      expect(result[0][0]).toBe('https://a-site.com')
      expect(result[1][0]).toBe('https://m-site.com')
      expect(result[2][0]).toBe('https://z-site.com')
    })

    it('should handle bookmarks with undefined titles', () => {
      const bookmarksWithUndefinedTitles: BookmarkItem[] = [
        [
          'https://z-site.com',
          {
            tags: ['test'],
            meta: { title: undefined, created: 1000, updated: 1500 },
          },
        ],
        [
          'https://a-site.com',
          {
            tags: ['test'],
            meta: { title: undefined, created: 1000, updated: 1600 },
          },
        ],
      ]

      const result = sortBookmarks(bookmarksWithUndefinedTitles, 'titleAsc')

      // Should fall back to URL sorting
      expect(result[0][0]).toBe('https://a-site.com')
      expect(result[1][0]).toBe('https://z-site.com')
    })

    it('should handle mixed title and no-title bookmarks', () => {
      const mixedBookmarks: BookmarkItem[] = [
        createBookmark('https://z-titled.com', 'Z Title', 1000, 1500),
        [
          'https://a-notitle.com',
          { tags: ['test'], meta: { created: 1000, updated: 1600 } },
        ],
        createBookmark('https://m-titled.com', 'A Title', 1000, 1700),
      ]

      const result = sortBookmarks(mixedBookmarks, 'titleAsc')

      // When comparing title vs URL, URL is used as fallback for missing titles
      // 'A Title' < 'https://a-notitle.com' < 'Z Title'
      expect(result[0][0]).toBe('https://m-titled.com') // 'A Title'
      expect(result[1][0]).toBe('https://a-notitle.com') // URL fallback
      expect(result[2][0]).toBe('https://z-titled.com') // 'Z Title'
    })

    it('should handle invalid sort option gracefully', () => {
      const result = sortBookmarks(
        sampleBookmarks,
        'invalidOption' as SortOption
      )

      // Should return bookmarks in original order when sort option is invalid
      expect(result).toEqual(sampleBookmarks)
    })
  })

  describe('performance and stability', () => {
    it('should be stable sort (preserve relative order of equal elements)', () => {
      const bookmarksWithSameValues: BookmarkItem[] = [
        createBookmark('https://first.com', 'Same Title', 1000, 1500),
        createBookmark('https://second.com', 'Same Title', 1000, 1500),
        createBookmark('https://third.com', 'Same Title', 1000, 1500),
      ]

      const result = sortBookmarks(bookmarksWithSameValues, 'updatedDesc')

      // With URL as secondary sort, order should be alphabetical by URL
      expect(result[0][0]).toBe('https://first.com')
      expect(result[1][0]).toBe('https://second.com')
      expect(result[2][0]).toBe('https://third.com')
    })

    it('should handle large datasets efficiently', () => {
      const largeDataset: BookmarkItem[] = Array.from(
        { length: 1000 },
        (_, i) =>
          createBookmark(`https://example${i}.com`, `Title ${i}`, i, i + 1000)
      )

      const startTime = performance.now()
      const result = sortBookmarks(largeDataset, 'titleAsc')
      const endTime = performance.now()

      expect(result).toHaveLength(1000)
      expect(endTime - startTime).toBeLessThan(100) // Should complete within 100ms
    })
  })
})
