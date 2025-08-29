import { describe, it, expect } from 'vitest'
import { createNoteCondition } from './note-filter.js'

describe('createNoteCondition', () => {
  const mockBookmarks = [
    {
      href: 'https://example.com/1',
      tags: ['tech'],
      meta: {
        note: 'This is a note',
        created: Date.parse('2023-01-15'),
        updated: Date.parse('2023-01-20'),
      },
    },
    {
      href: 'https://example.com/2',
      tags: ['news'],
      meta: {
        note: '   ',
        created: Date.parse('2023-01-15'),
        updated: Date.parse('2023-01-20'),
      }, // whitespace only
    },
    {
      href: 'https://example.com/3',
      tags: ['tech'],
      meta: {
        created: Date.parse('2023-01-15'),
        updated: Date.parse('2023-01-20'),
      }, // no note field
    },
  ]

  it('should return undefined when has_note param is not present', () => {
    const params = new URLSearchParams('')
    const condition = createNoteCondition(params)
    expect(condition).toBeUndefined()
  })

  it('should filter bookmarks with non-empty notes', () => {
    const params = new URLSearchParams('?has_note=true')
    const condition = createNoteCondition(params)
    expect(condition).toBeDefined()

    const filtered = mockBookmarks.filter((bookmark) =>
      condition!(bookmark.href, bookmark.tags, bookmark.meta)
    )
    expect(filtered.length).toBe(1)
    expect(filtered[0].href).toBe('https://example.com/1')
  })

  it('should exclude bookmarks with empty or whitespace-only notes', () => {
    const params = new URLSearchParams('?has_note=true')
    const condition = createNoteCondition(params)

    const testCases = [
      {
        meta: {
          note: 'Valid note',
          created: Date.parse('2023-01-15'),
          updated: Date.parse('2023-01-20'),
        },
        expected: true,
      },
      {
        meta: {
          note: '   ',
          created: Date.parse('2023-01-15'),
          updated: Date.parse('2023-01-20'),
        },
        expected: false,
      },
      {
        meta: {
          created: Date.parse('2023-01-15'),
          updated: Date.parse('2023-01-20'),
        },
        expected: false,
      },
      {
        meta: {
          note: '',
          created: Date.parse('2023-01-15'),
          updated: Date.parse('2023-01-20'),
        },
        expected: false,
      },
    ]

    for (const { meta, expected } of testCases) {
      const result = condition!('https://test.com', [], meta)
      expect(result).toBe(expected)
    }
  })
})
