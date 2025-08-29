import { describe, it, expect } from 'vitest'
import type { BookmarkKeyValuePair } from '../types/bookmarks.js'
import {
  calculateBookmarkStats,
  calculateBookmarkStatsFromData,
} from './bookmark-stats.js'

describe('bookmark-stats', () => {
  describe('calculateBookmarkStats', () => {
    it('should return zero stats for empty array', () => {
      const result = calculateBookmarkStats([])
      expect(result).toEqual({
        bookmarksCount: 0,
        tagsCount: 0,
        totalTagsCount: 0,
        domainsCount: 0,
      })
    })

    it('should calculate correct stats for single bookmark', () => {
      const bookmarks: BookmarkKeyValuePair[] = [
        [
          'https://example.com',
          {
            tags: ['web', 'demo'],
            meta: {
              title: 'Example Site',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        ],
      ]

      const result = calculateBookmarkStats(bookmarks)
      expect(result).toEqual({
        bookmarksCount: 1,
        tagsCount: 2,
        totalTagsCount: 2,
        domainsCount: 1,
      })
    })

    it('should calculate correct stats for multiple bookmarks', () => {
      const bookmarks: BookmarkKeyValuePair[] = [
        [
          'https://example.com',
          {
            tags: ['web', 'demo'],
            meta: {
              title: 'Example Site',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        ],
        [
          'https://test.com',
          {
            tags: ['web', 'testing'],
            meta: {
              title: 'Test Site',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        ],
        [
          'https://example.com/page2',
          {
            tags: ['demo', 'tutorial'],
            meta: {
              title: 'Example Page 2',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        ],
      ]

      const result = calculateBookmarkStats(bookmarks)
      expect(result).toEqual({
        bookmarksCount: 3,
        tagsCount: 4, // web, demo, testing, tutorial
        totalTagsCount: 6, // web, demo, web, testing, demo, tutorial
        domainsCount: 2, // example.com, test.com
      })
    })

    it('should handle bookmarks with no tags', () => {
      const bookmarks: BookmarkKeyValuePair[] = [
        [
          'https://example.com',
          {
            tags: [],
            meta: {
              title: 'Example Site',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        ],
        [
          'https://test.com',
          {
            tags: ['web'],
            meta: {
              title: 'Test Site',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        ],
      ]

      const result = calculateBookmarkStats(bookmarks)
      expect(result).toEqual({
        bookmarksCount: 2,
        tagsCount: 1,
        totalTagsCount: 1,
        domainsCount: 2,
      })
    })

    it('should handle bookmarks with undefined tags', () => {
      const bookmarks: BookmarkKeyValuePair[] = [
        [
          'https://example.com',
          {
            tags: undefined as any,
            meta: {
              title: 'Example Site',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        ],
      ]

      const result = calculateBookmarkStats(bookmarks)
      expect(result).toEqual({
        bookmarksCount: 1,
        tagsCount: 0,
        totalTagsCount: 0,
        domainsCount: 1,
      })
    })

    it('should handle special URL protocols', () => {
      const bookmarks: BookmarkKeyValuePair[] = [
        [
          'file:///path/to/file.txt',
          {
            tags: ['local'],
            meta: {
              title: 'Local File',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        ],
        [
          'mailto:user@example.com',
          {
            tags: ['email'],
            meta: {
              title: 'Email Contact',
              created: Date.now(),
              updated: Date.now(),
            },
          },
        ],
      ]

      const result = calculateBookmarkStats(bookmarks)
      expect(result).toEqual({
        bookmarksCount: 2,
        tagsCount: 2,
        totalTagsCount: 2,
        domainsCount: 2, // file:, mailto:
      })
    })
  })

  describe('calculateBookmarkStatsFromData', () => {
    it('should return zero stats for empty object', () => {
      const result = calculateBookmarkStatsFromData({})
      expect(result).toEqual({
        bookmarksCount: 0,
        tagsCount: 0,
        totalTagsCount: 0,
        domainsCount: 0,
      })
    })

    it('should return zero stats for null input', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = calculateBookmarkStatsFromData(null as any)
      expect(result).toEqual({
        bookmarksCount: 0,
        tagsCount: 0,
        totalTagsCount: 0,
        domainsCount: 0,
      })
    })

    it('should return zero stats for undefined input', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = calculateBookmarkStatsFromData(undefined as any)
      expect(result).toEqual({
        bookmarksCount: 0,
        tagsCount: 0,
        totalTagsCount: 0,
        domainsCount: 0,
      })
    })

    it('should calculate correct stats from bookmarks data object', () => {
      const bookmarksData = {
        'https://example.com': {
          tags: ['web', 'demo'],
          meta: {
            title: 'Example Site',
            created: Date.now(),
            updated: Date.now(),
          },
        },
        'https://test.com': {
          tags: ['web', 'testing'],
          meta: {
            title: 'Test Site',
            created: Date.now(),
            updated: Date.now(),
          },
        },
      }

      const result = calculateBookmarkStatsFromData(bookmarksData)
      expect(result).toEqual({
        bookmarksCount: 2,
        tagsCount: 3, // web, demo, testing
        totalTagsCount: 4, // web, demo, web, testing
        domainsCount: 2, // example.com, test.com
      })
    })
  })
})
