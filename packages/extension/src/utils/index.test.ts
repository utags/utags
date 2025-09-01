/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'

import type { BookmarkTagsAndMetadata } from '../types/bookmarks.js'
import {
  containsStarRatingTag,
  normalizeBookmarkData,
  removeStarRatingTags,
  sortBookmarks,
  sortTags,
} from './index.js'

type BookmarkItem = [string, BookmarkTagsAndMetadata]

describe('sortBookmarks', () => {
  it('should sort bookmarks by created date in descending order', () => {
    const bookmarks: BookmarkItem[] = [
      [
        'https://example1.com',
        {
          tags: ['tag1'],
          meta: {
            title: 'Example 1',
            created: 1000,
            updated: 1000,
          },
        },
      ],
      [
        'https://example2.com',
        {
          tags: ['tag2'],
          meta: {
            title: 'Example 2',
            created: 3000,
            updated: 3000,
          },
        },
      ],
      [
        'https://example3.com',
        {
          tags: ['tag3'],
          meta: {
            title: 'Example 3',
            created: 2000,
            updated: 2000,
          },
        },
      ],
    ]

    const sorted = sortBookmarks(bookmarks)

    expect(sorted).toEqual([
      [
        'https://example2.com',
        {
          tags: ['tag2'],
          meta: {
            title: 'Example 2',
            created: 3000,
            updated: 3000,
          },
        },
      ],
      [
        'https://example3.com',
        {
          tags: ['tag3'],
          meta: {
            title: 'Example 3',
            created: 2000,
            updated: 2000,
          },
        },
      ],
      [
        'https://example1.com',
        {
          tags: ['tag1'],
          meta: {
            title: 'Example 1',
            created: 1000,
            updated: 1000,
          },
        },
      ],
    ])
  })

  it('should sort by URL alphabetically when created dates are equal', () => {
    const bookmarks: BookmarkItem[] = [
      [
        'https://zebra.com',
        {
          tags: ['animal'],
          meta: {
            title: 'Zebra',
            created: 1000,
            updated: 1000,
          },
        },
      ],
      [
        'https://apple.com',
        {
          tags: ['fruit'],
          meta: {
            title: 'Apple',
            created: 1000,
            updated: 1000,
          },
        },
      ],
      [
        'https://banana.com',
        {
          tags: ['fruit'],
          meta: {
            title: 'Banana',
            created: 1000,
            updated: 1000,
          },
        },
      ],
    ]

    const sorted = sortBookmarks(bookmarks)

    expect(sorted).toEqual([
      [
        'https://apple.com',
        {
          tags: ['fruit'],
          meta: {
            title: 'Apple',
            created: 1000,
            updated: 1000,
          },
        },
      ],
      [
        'https://banana.com',
        {
          tags: ['fruit'],
          meta: {
            title: 'Banana',
            created: 1000,
            updated: 1000,
          },
        },
      ],
      [
        'https://zebra.com',
        {
          tags: ['animal'],
          meta: {
            title: 'Zebra',
            created: 1000,
            updated: 1000,
          },
        },
      ],
    ])
  })

  it('should handle empty array', () => {
    const bookmarks: BookmarkItem[] = []
    const sorted = sortBookmarks(bookmarks)
    expect(sorted).toEqual([])
  })

  it('should handle single bookmark', () => {
    const bookmarks: BookmarkItem[] = [
      [
        'https://single.com',
        {
          tags: ['single'],
          meta: {
            title: 'Single',
            created: 1000,
            updated: 1000,
          },
        },
      ],
    ]

    const sorted = sortBookmarks(bookmarks)
    expect(sorted).toEqual(bookmarks)
  })

  it('should not mutate the original array', () => {
    const bookmarks: BookmarkItem[] = [
      [
        'https://example1.com',
        {
          tags: ['tag1'],
          meta: {
            title: 'Example 1',
            created: 1000,
            updated: 1000,
          },
        },
      ],
      [
        'https://example2.com',
        {
          tags: ['tag2'],
          meta: {
            title: 'Example 2',
            created: 2000,
            updated: 2000,
          },
        },
      ],
    ]

    const originalOrder = [...bookmarks]
    const sorted = sortBookmarks(bookmarks)

    // Original array should remain unchanged
    expect(bookmarks).toEqual(originalOrder)
    // Sorted array should be different
    expect(sorted).not.toBe(bookmarks)
    expect(sorted[0][0]).toBe('https://example2.com')
  })

  it('should handle zero timestamps', () => {
    const bookmarks: BookmarkItem[] = [
      [
        'https://zero1.com',
        {
          tags: ['zero'],
          meta: {
            title: 'Zero 1',
            created: 0,
            updated: 0,
          },
        },
      ],
      [
        'https://zero2.com',
        {
          tags: ['zero'],
          meta: {
            title: 'Zero 2',
            created: 0,
            updated: 0,
          },
        },
      ],
      [
        'https://nonzero.com',
        {
          tags: ['nonzero'],
          meta: {
            title: 'Non Zero',
            created: 1000,
            updated: 1000,
          },
        },
      ],
    ]

    const sorted = sortBookmarks(bookmarks)

    // Non-zero timestamp should come first
    expect(sorted[0][0]).toBe('https://nonzero.com')
    // Zero timestamps should be sorted alphabetically by URL
    expect(sorted[1][0]).toBe('https://zero1.com')
    expect(sorted[2][0]).toBe('https://zero2.com')
  })

  it('should handle negative timestamps', () => {
    const bookmarks: BookmarkItem[] = [
      [
        'https://negative.com',
        {
          tags: ['negative'],
          meta: {
            title: 'Negative',
            created: -1000,
            updated: -1000,
          },
        },
      ],
      [
        'https://positive.com',
        {
          tags: ['positive'],
          meta: {
            title: 'Positive',
            created: 1000,
            updated: 1000,
          },
        },
      ],
      [
        'https://zero.com',
        {
          tags: ['zero'],
          meta: {
            title: 'Zero',
            created: 0,
            updated: 0,
          },
        },
      ],
    ]

    const sorted = sortBookmarks(bookmarks)

    // Should be sorted in descending order: positive > zero > negative
    expect(sorted[0][0]).toBe('https://positive.com')
    expect(sorted[1][0]).toBe('https://zero.com')
    expect(sorted[2][0]).toBe('https://negative.com')
  })

  it('should handle large timestamp values', () => {
    const bookmarks: BookmarkItem[] = [
      [
        'https://large1.com',
        {
          tags: ['large'],
          meta: {
            title: 'Large 1',
            created: Number.MAX_SAFE_INTEGER,
            updated: Number.MAX_SAFE_INTEGER,
          },
        },
      ],
      [
        'https://large2.com',
        {
          tags: ['large'],
          meta: {
            title: 'Large 2',
            created: Number.MAX_SAFE_INTEGER - 1,
            updated: Number.MAX_SAFE_INTEGER - 1,
          },
        },
      ],
    ]

    const sorted = sortBookmarks(bookmarks)

    // Larger timestamp should come first
    expect(sorted[0][0]).toBe('https://large1.com')
    expect(sorted[1][0]).toBe('https://large2.com')
  })

  it('should handle complex URL sorting with special characters', () => {
    const bookmarks: BookmarkItem[] = [
      [
        'https://example.com/path?param=value',
        {
          tags: ['complex'],
          meta: {
            title: 'Complex URL',
            created: 1000,
            updated: 1000,
          },
        },
      ],
      [
        'https://example.com/path',
        {
          tags: ['simple'],
          meta: {
            title: 'Simple URL',
            created: 1000,
            updated: 1000,
          },
        },
      ],
      [
        'https://example.com/path-with-dashes',
        {
          tags: ['dashes'],
          meta: {
            title: 'Dashes URL',
            created: 1000,
            updated: 1000,
          },
        },
      ],
    ]

    const sorted = sortBookmarks(bookmarks)

    // Should be sorted alphabetically by URL when timestamps are equal
    expect(sorted[0][0]).toBe('https://example.com/path')
    expect(sorted[1][0]).toBe('https://example.com/path-with-dashes')
    expect(sorted[2][0]).toBe('https://example.com/path?param=value')
  })

  it('should handle bookmarks with different metadata structures', () => {
    const bookmarks: BookmarkItem[] = [
      [
        'https://minimal.com',
        {
          tags: ['minimal'],
          meta: {
            created: 2000,
            updated: 2000,
          },
        },
      ],
      [
        'https://full.com',
        {
          tags: ['full', 'complete'],
          meta: {
            title: 'Full Metadata',
            description: 'Complete bookmark with all fields',
            created: 1000,
            updated: 1500,
            favicon: 'https://full.com/favicon.ico',
          },
        },
      ],
    ]

    const sorted = sortBookmarks(bookmarks)

    // Should sort by created timestamp regardless of other metadata
    expect(sorted[0][0]).toBe('https://minimal.com')
    expect(sorted[1][0]).toBe('https://full.com')
  })
})

describe('normalizeBookmarkData', () => {
  describe('primitive values', () => {
    it('should return null as is', () => {
      expect(normalizeBookmarkData(null)).toBe(null)
    })

    it('should return undefined as is', () => {
      // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      expect(normalizeBookmarkData(undefined)).toBe(undefined)
    })

    it('should return string as is', () => {
      const str = 'test string'
      expect(normalizeBookmarkData(str)).toBe(str)
    })

    it('should return number as is', () => {
      const num = 42
      expect(normalizeBookmarkData(num)).toBe(num)
    })

    it('should return boolean as is', () => {
      expect(normalizeBookmarkData(true)).toBe(true)
      expect(normalizeBookmarkData(false)).toBe(false)
    })
  })

  describe('arrays', () => {
    it('should handle empty array', () => {
      expect(normalizeBookmarkData([])).toEqual([])
    })

    it('should process array of primitives', () => {
      const arr = [1, 'test', true, null]
      expect(normalizeBookmarkData(arr)).toEqual([1, 'test', true, null])
    })

    it('should recursively process nested arrays', () => {
      const nestedArr = [1, [2, [3, 4]], 5]
      expect(normalizeBookmarkData(nestedArr)).toEqual([1, [2, [3, 4]], 5])
    })

    it('should process array containing objects with meta', () => {
      const arr = [
        {
          meta: {
            title: 'Test',
            created: 1_234_567_890,
            description: 'A test bookmark',
          },
        },
      ]
      const expected = [
        {
          meta: {
            description: 'A test bookmark',
            title: 'Test',
            created: 1_234_567_890,
          },
        },
      ]
      expect(JSON.stringify(normalizeBookmarkData(arr))).toBe(
        JSON.stringify(expected)
      )
    })
  })

  describe('objects without meta', () => {
    it('should handle empty object', () => {
      expect(normalizeBookmarkData({})).toEqual({})
    })

    it('should preserve object structure without meta property', () => {
      const obj = {
        name: 'test',
        value: 123,
        nested: {
          prop: 'value',
        },
      }
      expect(normalizeBookmarkData(obj)).toEqual(obj)
    })

    it('should recursively process nested objects', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              meta: {
                created: 1_234_567_890,
                title: 'Deep nested',
              },
            },
          },
        },
      }
      const expected = {
        level1: {
          level2: {
            level3: {
              meta: {
                title: 'Deep nested',
                created: 1_234_567_890,
              },
            },
          },
        },
      }
      expect(JSON.stringify(normalizeBookmarkData(obj))).toBe(
        JSON.stringify(expected)
      )
    })
  })

  describe('objects with meta property', () => {
    it('should sort meta properties with created at the end', () => {
      const obj = {
        meta: {
          created: 1_234_567_890,
          updated: 1_234_567_890,
          title: 'Test Bookmark',
          description: 'A test bookmark',
          author: 'Test Author',
        },
      }
      const expected = {
        meta: {
          author: 'Test Author',
          description: 'A test bookmark',
          title: 'Test Bookmark',
          updated: 1_234_567_890,
          created: 1_234_567_890,
        },
      }
      expect(JSON.stringify(normalizeBookmarkData(obj))).toBe(
        JSON.stringify(expected)
      )
    })

    it('should handle meta with only created property', () => {
      const obj = {
        meta: {
          created: 1_234_567_890,
        },
      }
      const expected = {
        meta: {
          created: 1_234_567_890,
        },
      }
      expect(JSON.stringify(normalizeBookmarkData(obj))).toBe(
        JSON.stringify(expected)
      )
    })

    it('should handle meta without created property', () => {
      const obj = {
        meta: {
          title: 'Test',
          description: 'Description',
          author: 'Author',
        },
      }
      const expected = {
        meta: {
          author: 'Author',
          description: 'Description',
          title: 'Test',
        },
      }
      expect(JSON.stringify(normalizeBookmarkData(obj))).toBe(
        JSON.stringify(expected)
      )
    })

    it('should handle meta with special characters in property names', () => {
      const obj = {
        meta: {
          'special-prop': 'value1',
          another_prop: 'value2',
          '123numeric': 'value3',
          created: 1_234_567_890,
          updated: 1_234_567_890,
        },
      }
      const expected = {
        meta: {
          '123numeric': 'value3',
          another_prop: 'value2',
          'special-prop': 'value1',
          updated: 1_234_567_890,
          created: 1_234_567_890,
        },
      }
      expect(JSON.stringify(normalizeBookmarkData(obj))).toBe(
        JSON.stringify(expected)
      )
    })

    it('should handle meta with nested objects and arrays', () => {
      const obj = {
        meta: {
          tags: ['tag1', 'tag2'],
          nested: {
            prop: 'value',
          },
          created: 1_234_567_890,
          updated: 1_234_567_890,
          title: 'Complex Meta',
        },
      }
      const expected = {
        meta: {
          nested: {
            prop: 'value',
          },
          tags: ['tag1', 'tag2'],
          title: 'Complex Meta',
          updated: 1_234_567_890,
          created: 1_234_567_890,
        },
      }
      expect(JSON.stringify(normalizeBookmarkData(obj))).toBe(
        JSON.stringify(expected)
      )
    })
  })

  describe('edge cases for meta property', () => {
    it('should handle null meta', () => {
      const obj = {
        meta: null,
      }
      expect(normalizeBookmarkData(obj)).toEqual({ meta: null })
    })

    it('should handle undefined meta', () => {
      const obj = {
        meta: undefined,
      }
      expect(normalizeBookmarkData(obj)).toEqual({ meta: undefined })
    })

    it('should handle non-object meta', () => {
      const obj = {
        meta: 'not an object',
      }
      expect(normalizeBookmarkData(obj)).toEqual({ meta: 'not an object' })
    })

    it('should handle empty meta object', () => {
      const obj = {
        meta: {},
      }
      expect(normalizeBookmarkData(obj)).toEqual({ meta: {} })
    })
  })

  describe('complex bookmark data structures', () => {
    it('should handle typical bookmark entry format', () => {
      const bookmarkEntry: [string, BookmarkTagsAndMetadata] = [
        'https://example.com',
        {
          tags: ['web', 'example'],
          meta: {
            title: 'Example Website',
            created: 1_234_567_890,
            updated: 1_234_567_890,
            description: 'An example website',
            author: 'Example Author',
          },
        },
      ]

      const expected: [string, BookmarkTagsAndMetadata] = [
        'https://example.com',
        {
          tags: ['web', 'example'],
          meta: {
            author: 'Example Author',
            description: 'An example website',
            title: 'Example Website',
            updated: 1_234_567_890,
            created: 1_234_567_890,
          },
        },
      ]

      expect(JSON.stringify(normalizeBookmarkData(bookmarkEntry))).toBe(
        JSON.stringify(expected)
      )
    })

    it('should handle bookmark map structure', () => {
      const bookmarkMap = {
        'https://example1.com': {
          tags: ['tag1'],
          meta: {
            created: 1_234_567_890,
            updated: 1_234_567_890,
            title: 'Example 1',
          },
        },
        'https://example2.com': {
          tags: ['tag2'],
          meta: {
            title: 'Example 2',
            created: 1_234_567_891,
            updated: 1_234_567_891,
            description: 'Second example',
          },
        },
      }

      const expected = {
        'https://example1.com': {
          tags: ['tag1'],
          meta: {
            title: 'Example 1',
            updated: 1_234_567_890,
            created: 1_234_567_890,
          },
        },
        'https://example2.com': {
          tags: ['tag2'],
          meta: {
            description: 'Second example',
            title: 'Example 2',
            updated: 1_234_567_891,
            created: 1_234_567_891,
          },
        },
      }

      expect(JSON.stringify(normalizeBookmarkData(bookmarkMap))).toBe(
        JSON.stringify(expected)
      )
    })

    it('should handle deeply nested bookmark structures', () => {
      const complexStructure = {
        bookmarks: {
          folder1: {
            items: [
              {
                url: 'https://example.com',
                data: {
                  meta: {
                    created: 1_234_567_890,
                    updated: 1_234_567_890,
                    title: 'Nested Example',
                    category: 'test',
                  },
                },
              },
            ],
          },
        },
      }

      const expected = {
        bookmarks: {
          folder1: {
            items: [
              {
                url: 'https://example.com',
                data: {
                  meta: {
                    category: 'test',
                    title: 'Nested Example',
                    updated: 1_234_567_890,
                    created: 1_234_567_890,
                  },
                },
              },
            ],
          },
        },
      }

      expect(JSON.stringify(normalizeBookmarkData(complexStructure))).toBe(
        JSON.stringify(expected)
      )
    })
  })

  describe('data immutability', () => {
    it('should not mutate the original data', () => {
      const original = {
        meta: {
          created: 1_234_567_890,
          updated: 1_234_567_890,
          title: 'Original',
          description: 'Original description',
        },
        other: 'property',
      }

      const originalCopy = structuredClone(original)
      const result = normalizeBookmarkData(original)

      // Original should remain unchanged
      expect(original).toEqual(originalCopy)

      // Result should be different (sorted)
      expect(result).not.toBe(original)
      expect(result.meta).not.toBe(original.meta)
    })

    it('should not mutate nested arrays', () => {
      const original = {
        items: [
          {
            meta: {
              created: 1_234_567_890,
              updated: 1_234_567_890,
              title: 'Item 1',
            },
          },
        ],
      }

      const originalCopy = structuredClone(original)
      const result = normalizeBookmarkData(original)

      expect(original).toEqual(originalCopy)
      expect(result.items).not.toBe(original.items)
      expect(result.items[0]).not.toBe(original.items[0])
    })
  })

  describe('performance considerations', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = {
        bookmarks: Array.from({ length: 1000 }, (_, i) => ({
          url: `https://example${i}.com`,
          meta: {
            created: 1_234_567_890 + i,
            updated: 1_234_567_890 + i,
            title: `Bookmark ${i}`,
            description: `Description for bookmark ${i}`,
            category: `category${i % 10}`,
          },
        })),
      }

      const start = performance.now()
      const result = normalizeBookmarkData(largeDataset)
      const end = performance.now()

      // Should complete within reasonable time (less than 100ms for 1000 items)
      expect(end - start).toBeLessThan(100)

      // Verify first and last items are properly sorted
      expect(result.bookmarks[0].meta.category).toBe('category0')
      expect(result.bookmarks[0].meta.created).toBe(1_234_567_890)
      expect(result.bookmarks[0].meta.updated).toBe(1_234_567_890)
      expect(result.bookmarks[999].meta.category).toBe('category9')
      expect(result.bookmarks[999].meta.created).toBe(1_234_568_889)
      expect(result.bookmarks[999].meta.updated).toBe(1_234_568_889)
    })
  })
})

describe('sortTags', () => {
  describe('Star tags priority', () => {
    it('should prioritize star tags in correct order', () => {
      const tags = ['regular', '★', '★★★', '☆', '★★', '☆☆☆', '☆☆']
      const privilegedTags: string[] = []
      const result = sortTags(tags, privilegedTags)

      expect(result).toEqual(['★★★', '★★', '★', '☆☆☆', '☆☆', '☆', 'regular'])
    })

    it('should handle only star tags', () => {
      const tags = ['☆', '★★', '☆☆☆', '★★★', '★', '☆☆']
      const privilegedTags: string[] = []
      const result = sortTags(tags, privilegedTags)

      expect(result).toEqual(['★★★', '★★', '★', '☆☆☆', '☆☆', '☆'])
    })

    it('should handle duplicate star tags', () => {
      const tags = ['★', '★★', '★', '☆', '★★']
      const privilegedTags: string[] = []
      const result = sortTags(tags, privilegedTags)

      expect(result).toEqual(['★★', '★★', '★', '★', '☆'])
    })

    it('should not match partial star patterns', () => {
      const tags = ['★★★extra', 'prefix★★', '★ ★', '☆☆☆text', 'text☆']
      const privilegedTags: string[] = []
      const result = sortTags(tags, privilegedTags)

      // All should be treated as regular tags and maintain original order
      expect(result).toEqual([
        '★★★extra',
        'prefix★★',
        '★ ★',
        '☆☆☆text',
        'text☆',
      ])
    })
  })

  describe('Privileged tags priority', () => {
    it('should prioritize privileged tags after star tags', () => {
      const tags = ['regular1', 'privileged1', '★', 'privileged2', 'regular2']
      const privilegedTags = ['privileged1', 'privileged2']
      const result = sortTags(tags, privilegedTags)

      expect(result).toEqual([
        '★',
        'privileged1',
        'privileged2',
        'regular1',
        'regular2',
      ])
    })

    it('should maintain order within privileged tags', () => {
      const tags = ['privileged3', 'privileged1', 'privileged2']
      const privilegedTags = ['privileged1', 'privileged2', 'privileged3']
      const result = sortTags(tags, privilegedTags)

      expect(result).toEqual(['privileged3', 'privileged1', 'privileged2'])
    })

    it('should handle privileged tags that are also star tags', () => {
      const tags = ['★★', 'privileged1', '★', 'regular']
      const privilegedTags = ['★★', 'privileged1']
      const result = sortTags(tags, privilegedTags)

      // Star tags should still have highest priority, even if they're in privilegedTags
      expect(result).toEqual(['★★', '★', 'privileged1', 'regular'])
    })

    it('should handle empty privileged tags array', () => {
      const tags = ['regular1', '★', 'regular2']
      const privilegedTags: string[] = []
      const result = sortTags(tags, privilegedTags)

      expect(result).toEqual(['★', 'regular1', 'regular2'])
    })
  })

  describe('Regular tags', () => {
    it('should maintain original order for regular tags', () => {
      const tags = ['zebra', 'apple', 'banana']
      const privilegedTags: string[] = []
      const result = sortTags(tags, privilegedTags)

      expect(result).toEqual(['zebra', 'apple', 'banana'])
    })

    it('should place regular tags after star and privileged tags', () => {
      const tags = ['regular1', '★', 'privileged1', 'regular2']
      const privilegedTags = ['privileged1']
      const result = sortTags(tags, privilegedTags)

      expect(result).toEqual(['★', 'privileged1', 'regular1', 'regular2'])
    })
  })

  describe('Edge cases', () => {
    it('should handle empty tags array', () => {
      const tags: string[] = []
      const privilegedTags: string[] = []
      const result = sortTags(tags, privilegedTags)

      expect(result).toEqual([])
    })

    it('should handle single tag', () => {
      const tags = ['single']
      const privilegedTags: string[] = []
      const result = sortTags(tags, privilegedTags)

      expect(result).toEqual(['single'])
    })

    it('should handle privileged tags not in tags array', () => {
      const tags = ['tag1', 'tag2']
      const privilegedTags = ['nonexistent1', 'nonexistent2']
      const result = sortTags(tags, privilegedTags)

      expect(result).toEqual(['tag1', 'tag2'])
    })

    it('should handle tags with special characters', () => {
      const tags = ['tag@#$', '★★', 'tag with spaces', 'tag-with-dashes']
      const privilegedTags = ['tag with spaces']
      const result = sortTags(tags, privilegedTags)

      expect(result).toEqual([
        '★★',
        'tag with spaces',
        'tag@#$',
        'tag-with-dashes',
      ])
    })

    it('should handle unicode characters', () => {
      const tags = ['标签1', '★', '🏷️', 'тег']
      const privilegedTags = ['🏷️']
      const result = sortTags(tags, privilegedTags)

      expect(result).toEqual(['★', '🏷️', '标签1', 'тег'])
    })
  })

  describe('Complex scenarios', () => {
    it('should handle all three priority levels together', () => {
      const tags = [
        'regular3',
        '☆☆',
        'privileged2',
        '★★★',
        'regular1',
        'privileged1',
        '★',
        'regular2',
        '☆☆☆',
      ]
      const privilegedTags = ['privileged1', 'privileged2']
      const result = sortTags(tags, privilegedTags)

      expect(result).toEqual([
        '★★★',
        '★',
        '☆☆☆',
        '☆☆',
        'privileged2',
        'privileged1',
        'regular3',
        'regular1',
        'regular2',
      ])
    })

    it('should handle large number of tags', () => {
      const tags = [
        ...Array.from({ length: 50 }, (_, i) => `regular${i}`),
        '★★★',
        '★★',
        '★',
        '☆☆☆',
        '☆☆',
        '☆',
        'privileged1',
        'privileged2',
      ]
      const privilegedTags = ['privileged1', 'privileged2']
      const result = sortTags(tags, privilegedTags)

      // Check that star tags come first
      expect(result.slice(0, 6)).toEqual(['★★★', '★★', '★', '☆☆☆', '☆☆', '☆'])
      // Check that privileged tags come next
      expect(result.slice(6, 8)).toEqual(['privileged1', 'privileged2'])
      // Check that regular tags come last and maintain order
      expect(result.slice(8)).toEqual(
        Array.from({ length: 50 }, (_, i) => `regular${i}`)
      )
    })

    it('should be stable sort (maintain relative order for equal priority items)', () => {
      const tags = ['b', 'a', 'c']
      const privilegedTags: string[] = []
      const result = sortTags(tags, privilegedTags)

      // Should maintain original order since all are regular tags
      expect(result).toEqual(['b', 'a', 'c'])
    })

    it('should handle mixed case and whitespace in star tags', () => {
      const tags = [' ★★★ ', '★★★', 'STAR', '★ ★★']
      const privilegedTags: string[] = []
      const result = sortTags(tags, privilegedTags)

      // Only exact match '★★★' should be treated as star tag
      expect(result).toEqual(['★★★', ' ★★★ ', 'STAR', '★ ★★'])
    })
  })

  describe('containsStarRatingTag', () => {
    it('should return true when tags contain three-star rating', () => {
      const tags = ['javascript', '★★★', 'tutorial']
      const result = containsStarRatingTag(tags)
      expect(result).toBe(true)
    })

    it('should return true when tags contain two-star rating', () => {
      const tags = ['react', '★★', 'frontend']
      const result = containsStarRatingTag(tags)
      expect(result).toBe(true)
    })

    it('should return true when tags contain one-star rating', () => {
      const tags = ['vue', '★', 'component']
      const result = containsStarRatingTag(tags)
      expect(result).toBe(true)
    })

    it('should return true when tags contain three-hollow-star rating', () => {
      const tags = ['angular', '☆☆☆', 'framework']
      const result = containsStarRatingTag(tags)
      expect(result).toBe(true)
    })

    it('should return true when tags contain two-hollow-star rating', () => {
      const tags = ['svelte', '☆☆', 'modern']
      const result = containsStarRatingTag(tags)
      expect(result).toBe(true)
    })

    it('should return true when tags contain one-hollow-star rating', () => {
      const tags = ['nodejs', '☆', 'backend']
      const result = containsStarRatingTag(tags)
      expect(result).toBe(true)
    })

    it('should return true when tags contain multiple star ratings', () => {
      const tags = ['project', '★★★', '☆☆', 'important']
      const result = containsStarRatingTag(tags)
      expect(result).toBe(true)
    })

    it('should return false when tags contain no star ratings', () => {
      const tags = ['javascript', 'tutorial', 'beginner']
      const result = containsStarRatingTag(tags)
      expect(result).toBe(false)
    })

    it('should return false when tags array is empty', () => {
      const tags: string[] = []
      const result = containsStarRatingTag(tags)
      expect(result).toBe(false)
    })

    it('should return false when tags contain star-like but not exact star symbols', () => {
      const tags = ['star', 'STAR', '★ ★★', ' ★★★ ', '★★★★']
      const result = containsStarRatingTag(tags)
      expect(result).toBe(false)
    })

    it('should handle case sensitivity correctly', () => {
      const tags = ['★★★', 'STAR', 'Star']
      const result = containsStarRatingTag(tags)
      expect(result).toBe(true)
    })
  })

  describe('removeStarRatingTags', () => {
    it('should remove three-star rating from tags', () => {
      const tags = ['javascript', '★★★', 'tutorial']
      const result = removeStarRatingTags(tags)
      expect(result).toEqual(['javascript', 'tutorial'])
    })

    it('should remove two-star rating from tags', () => {
      const tags = ['react', '★★', 'frontend']
      const result = removeStarRatingTags(tags)
      expect(result).toEqual(['react', 'frontend'])
    })

    it('should remove one-star rating from tags', () => {
      const tags = ['vue', '★', 'component']
      const result = removeStarRatingTags(tags)
      expect(result).toEqual(['vue', 'component'])
    })

    it('should remove three-hollow-star rating from tags', () => {
      const tags = ['angular', '☆☆☆', 'framework']
      const result = removeStarRatingTags(tags)
      expect(result).toEqual(['angular', 'framework'])
    })

    it('should remove two-hollow-star rating from tags', () => {
      const tags = ['svelte', '☆☆', 'modern']
      const result = removeStarRatingTags(tags)
      expect(result).toEqual(['svelte', 'modern'])
    })

    it('should remove one-hollow-star rating from tags', () => {
      const tags = ['nodejs', '☆', 'backend']
      const result = removeStarRatingTags(tags)
      expect(result).toEqual(['nodejs', 'backend'])
    })

    it('should remove multiple star ratings from tags', () => {
      const tags = ['project', '★★★', '☆☆', 'important', '★', 'work']
      const result = removeStarRatingTags(tags)
      expect(result).toEqual(['project', 'important', 'work'])
    })

    it('should remove all star ratings when tags contain only star ratings', () => {
      const tags = ['★★★', '★★', '★', '☆☆☆', '☆☆', '☆']
      const result = removeStarRatingTags(tags)
      expect(result).toEqual([])
    })

    it('should return same array when no star ratings present', () => {
      const tags = ['javascript', 'tutorial', 'beginner']
      const result = removeStarRatingTags(tags)
      expect(result).toEqual(['javascript', 'tutorial', 'beginner'])
    })

    it('should return empty array when input is empty', () => {
      const tags: string[] = []
      const result = removeStarRatingTags(tags)
      expect(result).toEqual([])
    })

    it('should preserve non-star tags that look similar to star ratings', () => {
      const tags = ['star', 'STAR', '★ ★★', ' ★★★ ', '★★★★', '★★★']
      const result = removeStarRatingTags(tags)
      expect(result).toEqual(['star', 'STAR', '★ ★★', ' ★★★ ', '★★★★'])
    })

    it('should preserve original array order for non-star tags', () => {
      const tags = ['z-tag', '★★★', 'a-tag', '☆☆', 'b-tag', '★', 'c-tag']
      const result = removeStarRatingTags(tags)
      expect(result).toEqual(['z-tag', 'a-tag', 'b-tag', 'c-tag'])
    })

    it('should handle duplicate star ratings', () => {
      const tags = ['project', '★★★', 'important', '★★★', 'work']
      const result = removeStarRatingTags(tags)
      expect(result).toEqual(['project', 'important', 'work'])
    })

    it('should not mutate the original array', () => {
      const originalTags = ['javascript', '★★★', 'tutorial']
      const tagsCopy = [...originalTags]
      const result = removeStarRatingTags(originalTags)

      expect(originalTags).toEqual(tagsCopy)
      expect(result).not.toBe(originalTags)
      expect(result).toEqual(['javascript', 'tutorial'])
    })
  })
})
