import { describe, it, expect } from 'vitest'
import type { BookmarkTagsAndMetadata } from '../types/bookmarks.js'
import { normalizeBookmarkData } from './normalize-bookmark-data.js'

// Helper function to create a basic bookmark for testing
function createTestBookmark(
  overrides: Partial<BookmarkTagsAndMetadata> = {}
): BookmarkTagsAndMetadata {
  const now = Date.now()
  return {
    tags: ['test'],
    meta: {
      created: now,
      updated: now,
      title: 'Test Bookmark',
      url: 'https://example.com',
    },
    ...overrides,
  } as BookmarkTagsAndMetadata
}

describe('sortBookmarkProperties (tested through normalizeBookmarkData)', () => {
  describe('normal cases', () => {
    it('should maintain tags as first property', () => {
      const bookmark = createTestBookmark({
        meta: {
          created: 1000,
          updated: 2000,
          title: 'Test',
          url: 'https://example.com',
        },
        tags: ['tag1', 'tag2'],
        hilights: [
          {
            created: 1000,
            updated: 1000,
            text: 'highlight text',
          },
        ],
      })

      const result = normalizeBookmarkData({ bookmark })
      const keys = Object.keys(result.bookmark)

      expect(keys[0]).toBe('tags')
      expect(keys[2]).toBe('meta')
    })

    it('should place meta as last property', () => {
      const bookmark = createTestBookmark({
        meta: {
          created: 1000,
          updated: 2000,
          title: 'Test',
        },
        hilights: [
          {
            created: 1000,
            updated: 1000,
            text: 'highlight text',
          },
        ],
        tags: ['tag1'],
      })

      const result = normalizeBookmarkData({ bookmark })
      const keys = Object.keys(result.bookmark)

      expect(keys[0]).toBe('tags')
      expect(keys[1]).toBe('hilights')
      expect(keys[2]).toBe('meta')
    })

    it('should sort meta properties correctly', () => {
      const bookmark = createTestBookmark({
        tags: ['test'],
        meta: {
          url: 'https://example.com',
          title: 'Test Title',
          description: 'Test description',
          created: 1000,
          updated: 2000,
        },
      })

      const result = normalizeBookmarkData({ bookmark })
      const metaKeys = Object.keys(result.bookmark.meta)

      // Check that 'created' is at the end
      expect(metaKeys.at(-1)).toBe('created')

      // Check that other properties are sorted alphabetically
      const otherKeys = metaKeys.slice(0, -1)
      const sortedOtherKeys = [...otherKeys].sort()
      expect(otherKeys).toEqual(sortedOtherKeys)
    })

    it('should preserve all bookmark properties', () => {
      const bookmark = createTestBookmark({
        tags: ['tag1', 'tag2'],
        meta: {
          created: 1000,
          updated: 2000,
          title: 'Test',
          url: 'https://example.com',
        },
        hilights: [
          {
            created: 1000,
            updated: 1000,
            text: 'highlight text',
          },
        ],
        deletedMeta: {
          deleted: 3000,
          actionType: 'DELETE',
        },
      })

      const result = normalizeBookmarkData({ bookmark })

      expect(result.bookmark.tags).toEqual(['tag1', 'tag2'])
      expect(result.bookmark.meta.title).toBe('Test')
      expect(result.bookmark.hilights).toBeDefined()
      expect(result.bookmark.deletedMeta).toBeDefined()
    })

    it('should handle bookmarks with minimal properties', () => {
      const bookmark: BookmarkTagsAndMetadata = {
        tags: [],
        meta: {
          created: 1000,
          updated: 1000,
        },
      }

      const result = normalizeBookmarkData({ bookmark })
      const keys = Object.keys(result.bookmark)

      expect(keys[0]).toBe('tags')
      expect(keys[1]).toBe('meta')
      expect(result.bookmark.tags).toEqual([])
    })

    it('should handle bookmarks with many additional properties', () => {
      const bookmark = createTestBookmark({
        tags: ['test'],
        meta: {
          created: 1000,
          updated: 2000,
          title: 'Test',
        },
        hilights: [
          {
            created: 1000,
            updated: 1000,
            text: 'highlight',
          },
        ],
        deletedMeta: {
          deleted: 3000,
          actionType: 'DELETE',
        },
        importedMeta: {
          imported: 4000,
          source: 'test',
          type: 'manual',
        },
      })

      const result = normalizeBookmarkData({ bookmark })
      const keys = Object.keys(result.bookmark)

      expect(keys[0]).toBe('tags')
      expect(keys[4]).toBe('meta')
      expect(keys.length).toBe(5) // tags, hilights, deletedMeta, importedMeta, meta
    })
  })

  describe('edge cases', () => {
    it('should handle empty tags array', () => {
      const bookmark = createTestBookmark({
        tags: [],
        meta: {
          created: 1000,
          updated: 1000,
          title: 'Test',
        },
      })

      const result = normalizeBookmarkData({ bookmark })

      expect(result.bookmark.tags).toEqual([])
      expect(Object.keys(result.bookmark)[0]).toBe('tags')
    })

    it('should handle meta with only required properties', () => {
      const bookmark: BookmarkTagsAndMetadata = {
        tags: ['test'],
        meta: {
          created: 1000,
          updated: 1000,
        },
      }

      const result = normalizeBookmarkData({ bookmark })

      expect(result.bookmark.meta.created).toBe(1000)
      expect(result.bookmark.meta.updated).toBe(1000)
      expect(Object.keys(result.bookmark.meta)).toEqual(['updated', 'created'])
    })

    it('should handle meta with custom properties', () => {
      const bookmark = createTestBookmark({
        tags: ['test'],
        meta: {
          created: 1000,
          updated: 2000,
          customField: 'custom value',
          anotherField: 123,
          zLastField: 'should be before created',
        } as any,
      })

      const result = normalizeBookmarkData({ bookmark })
      const metaKeys = Object.keys(result.bookmark.meta)

      // 'created' should be last
      expect(metaKeys.at(-1)).toBe('created')

      // Custom fields should be sorted alphabetically before 'created'
      expect(metaKeys).toContain('customField')
      expect(metaKeys).toContain('anotherField')
      expect(metaKeys).toContain('zLastField')
    })

    it('should not modify the original bookmark object', () => {
      const originalBookmark = createTestBookmark({
        tags: ['original'],
        meta: {
          created: 1000,
          updated: 2000,
          title: 'Original Title',
        },
      })

      const originalKeys = Object.keys(originalBookmark)
      const originalMetaKeys = Object.keys(originalBookmark.meta)

      normalizeBookmarkData({ bookmark: originalBookmark })

      // Original object should remain unchanged
      expect(Object.keys(originalBookmark)).toEqual(originalKeys)
      expect(Object.keys(originalBookmark.meta)).toEqual(originalMetaKeys)
      expect(originalBookmark.tags).toEqual(['original'])
    })

    it('should handle hilights array correctly', () => {
      const bookmark = createTestBookmark({
        tags: ['test'],
        meta: {
          created: 1000,
          updated: 2000,
        },
        hilights: [
          {
            created: 1000,
            updated: 1000,
            text: 'first highlight',
            color: 'yellow',
          },
        ],
      })

      const result = normalizeBookmarkData({ bookmark })

      expect(result.bookmark.hilights).toHaveLength(1)
      expect(result.bookmark.hilights![0].text).toBe('first highlight')
      expect(result.bookmark.hilights![0].color).toBe('yellow')
    })
  })

  describe('property ordering consistency', () => {
    it('should maintain consistent property order across multiple calls', () => {
      const bookmark = createTestBookmark({
        tags: ['test'],
        meta: {
          url: 'https://example.com',
          title: 'Test',
          description: 'Description',
          created: 1000,
          updated: 2000,
        },
        hilights: [
          {
            created: 1000,
            updated: 1000,
            text: 'highlight',
          },
        ],
      })

      const result1 = normalizeBookmarkData({ bookmark })
      const result2 = normalizeBookmarkData({ bookmark })

      expect(Object.keys(result1.bookmark)).toEqual(
        Object.keys(result2.bookmark)
      )
      expect(Object.keys(result1.bookmark.meta)).toEqual(
        Object.keys(result2.bookmark.meta)
      )
    })

    it('should handle different property insertion orders consistently', () => {
      // Create bookmark with properties in different order
      const bookmark1: BookmarkTagsAndMetadata = {
        hilights: [
          {
            created: 1000,
            updated: 1000,
            text: 'highlight',
          },
        ],
        meta: {
          title: 'Test',
          created: 1000,
          updated: 2000,
          url: 'https://example.com',
        },
        tags: ['test'],
      }

      const bookmark2: BookmarkTagsAndMetadata = {
        tags: ['test'],
        meta: {
          created: 1000,
          url: 'https://example.com',
          updated: 2000,
          title: 'Test',
        },
        hilights: [
          {
            created: 1000,
            updated: 1000,
            text: 'highlight',
          },
        ],
      }

      const result1 = normalizeBookmarkData({ bookmark: bookmark1 })
      const result2 = normalizeBookmarkData({ bookmark: bookmark2 })

      // Both should have the same property order
      expect(Object.keys(result1.bookmark)).toEqual(
        Object.keys(result2.bookmark)
      )
      expect(Object.keys(result1.bookmark.meta)).toEqual(
        Object.keys(result2.bookmark.meta)
      )
    })
  })

  describe('integration with complex data structures', () => {
    it('should handle nested bookmark data in arrays', () => {
      const bookmarks = [
        createTestBookmark({
          tags: ['tag1'],
          meta: {
            created: 1000,
            updated: 2000,
            title: 'First',
          },
        }),
        createTestBookmark({
          tags: ['tag2'],
          meta: {
            created: 3000,
            updated: 4000,
            title: 'Second',
          },
        }),
      ]

      const result = normalizeBookmarkData(bookmarks)

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
      expect(Object.keys(result[0])[0]).toBe('tags')
      expect(Object.keys(result[1])[0]).toBe('tags')
    })

    it('should handle bookmark data in nested objects', () => {
      const data = {
        bookmarks: {
          'https://example.com': createTestBookmark({
            tags: ['test'],
            meta: {
              created: 1000,
              updated: 2000,
              title: 'Test',
            },
          }),
        },
        metadata: {
          version: 1,
          created: 1000,
        },
      }

      const result = normalizeBookmarkData(data)

      expect(result.bookmarks['https://example.com']).toBeDefined()
      expect(Object.keys(result.bookmarks['https://example.com'])[0]).toBe(
        'tags'
      )
      expect(result.metadata.version).toBe(1)
    })
  })
})
