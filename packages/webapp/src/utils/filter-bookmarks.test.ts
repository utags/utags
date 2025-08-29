import { vi, describe, it, expect, afterEach } from 'vitest'
import type { BookmarkKeyValuePair } from '../types/bookmarks.js'
import { filterBookmarksByUrlParams } from './filter-bookmarks.js'

describe('filterBookmarksByUrlParams', () => {
  const mockBookmarks: BookmarkKeyValuePair[] = [
    [
      'https://example.com/1',
      {
        tags: ['tech'],
        meta: {
          title: 'Example 1',
          created: Date.parse('2023-01-15'),
          updated: Date.parse('2023-01-20'),
        },
      },
    ],
    [
      'https://example.com/2',
      {
        tags: ['news'],
        meta: {
          title: 'Example 2',
          created: Date.parse('2023-02-10'),
          updated: Date.parse('2023-02-15'),
        },
      },
    ],
    [
      'https://example.com/3',
      {
        tags: ['tech'],
        meta: {
          title: 'Example 3',
          created: Date.parse('2023-03-05'),
          updated: Date.parse('2023-03-10'),
        },
      },
    ],
  ]

  it('should return all bookmarks when no time filter is provided', () => {
    const result = filterBookmarksByUrlParams(mockBookmarks, '')
    expect(result.length).toBe(3)
  })

  it('should filter by created date with period (7d)', () => {
    const mockDate = new Date('2023-03-12')
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    const result = filterBookmarksByUrlParams(
      mockBookmarks,
      '?time=created&period=7d'
    )
    expect(result.length).toBe(1)
    expect(result[0][1].meta.title).toBe('Example 3')

    vi.useRealTimers()
  })

  it('should filter by updated date with period (30d)', () => {
    const mockDate = new Date('2023-03-12')
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    const result = filterBookmarksByUrlParams(
      mockBookmarks,
      '?time=updated&period=30d'
    )
    expect(result.length).toBe(2)
    expect(result.map((b) => b[1].meta.title)).toEqual([
      'Example 2',
      'Example 3',
    ])

    vi.useRealTimers()
  })

  it('should filter by created date with start and end dates', () => {
    const result = filterBookmarksByUrlParams(
      mockBookmarks,
      '?time=created&start=2023-02-01&end=2023-02-28'
    )
    expect(result.length).toBe(1)
    expect(result[0][1].meta.title).toBe('Example 2')
  })

  it('should filter by updated date with start date only', () => {
    const result = filterBookmarksByUrlParams(
      mockBookmarks,
      '?time=updated&start=2023-03-01'
    )
    expect(result.length).toBe(1)
    expect(result[0][1].meta.title).toBe('Example 3')
  })

  it('should filter by created date with end date only', () => {
    const result = filterBookmarksByUrlParams(
      mockBookmarks,
      '?time=created&end=2023-02-01'
    )
    expect(result.length).toBe(1)
    expect(result[0][1].meta.title).toBe('Example 1')
  })

  it('should handle month (m) unit correctly', () => {
    const mockDate = new Date('2023-03-15')
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    const result = filterBookmarksByUrlParams(
      mockBookmarks,
      '?time=created&period=1m'
    )
    expect(result.length).toBe(1)
    expect(result[0][1].meta.title).toBe('Example 3')

    vi.useRealTimers()
  })

  it('should handle year (y) unit correctly', () => {
    const mockDate = new Date('2023-03-12')
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    const result = filterBookmarksByUrlParams(
      mockBookmarks,
      '?time=created&period=1y'
    )
    expect(result.length).toBe(3)

    vi.useRealTimers()
  })

  it('should handle period without unit (default to days)', () => {
    const mockDate = new Date('2023-03-12')
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    const result = filterBookmarksByUrlParams(
      mockBookmarks,
      '?time=created&period=7' // No unit specified, defaults to days
    )
    expect(result.length).toBe(1)
    expect(result[0][1].meta.title).toBe('Example 3')

    vi.useRealTimers()
  })

  it('should handle empty period value (fallback to start/end dates)', () => {
    const mockDate = new Date('2023-03-12')
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    const result = filterBookmarksByUrlParams(
      mockBookmarks,
      '?time=created&period=&start=2023-01-01' // Empty period value
    )
    expect(result.length).toBe(3) // Should ignore empty period and use start date filter

    vi.useRealTimers()
  })

  it('should handle empty period value with no dates (return all)', () => {
    const result = filterBookmarksByUrlParams(
      mockBookmarks,
      '?time=created&period=' // Empty period value with no date range
    )
    expect(result.length).toBe(3) // Should return all bookmarks
  })

  it('should return empty array when no bookmarks match the filter', () => {
    const result = filterBookmarksByUrlParams(
      mockBookmarks,
      '?time=created&start=2024-01-01'
    )
    expect(result.length).toBe(0)
  })

  it('should ignore invalid timeType', () => {
    const result = filterBookmarksByUrlParams(mockBookmarks, '?time=invalid')
    expect(result.length).toBe(3)
  })

  // 添加 note filter 测试用例
  it('should filter bookmarks with notes when has_note param is present', () => {
    const bookmarksWithNotes: BookmarkKeyValuePair[] = [
      ...mockBookmarks,
      [
        'https://example.com/4',
        {
          tags: ['docs'],
          meta: {
            title: 'Example 4',
            note: 'Important note',
            created: Date.parse('2023-03-01'),
            updated: Date.parse('2023-03-01'),
          },
        },
      ],
    ]

    const result = filterBookmarksByUrlParams(
      bookmarksWithNotes,
      '?has_note=true'
    )
    expect(result.length).toBe(1)
    expect(result[0][1].meta.title).toBe('Example 4')
  })

  it('should return empty array when no bookmarks have notes', () => {
    const result = filterBookmarksByUrlParams(mockBookmarks, '?has_note=true')
    expect(result.length).toBe(0)
  })

  // 添加组合过滤测试用例
  it('should combine time and note filters', () => {
    const combinedBookmarks: BookmarkKeyValuePair[] = [
      ...mockBookmarks,
      [
        'https://example.com/4',
        {
          tags: ['docs'],
          meta: {
            title: 'Example 4',
            note: 'Recent note',
            created: Date.parse('2023-03-08'),
            updated: Date.parse('2023-03-08'),
          },
        },
      ],
      [
        'https://example.com/5',
        {
          tags: ['docs'],
          meta: {
            title: 'Example 5',
            note: 'Old note',
            created: Date.parse('2023-01-08'),
            updated: Date.parse('2023-01-08'),
          },
        },
      ],
    ]

    const mockDate = new Date('2023-03-12')
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    const result = filterBookmarksByUrlParams(
      combinedBookmarks,
      '?has_note=true&time=created&period=7d'
    )
    expect(result.length).toBe(1)
    expect(result[0][1].meta.title).toBe('Example 4')

    vi.useRealTimers()
  })

  it('should handle multiple filters with empty results', () => {
    const result = filterBookmarksByUrlParams(
      mockBookmarks,
      '?has_note=true&time=created&period=1d'
    )
    expect(result.length).toBe(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
})
