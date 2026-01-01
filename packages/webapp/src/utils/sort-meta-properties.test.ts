import { describe, it, expect } from 'vitest'
import type { BookmarkTagsAndMetadata } from '../types/bookmarks.js'
import { sortMetaProperties } from './sort-meta-properties.js'

describe('sortMetaProperties', () => {
  describe('normal cases', () => {
    it('should sort meta properties alphabetically with created at the end', () => {
      const meta: BookmarkTagsAndMetadata['meta'] = {
        updated: 1_234_567_890,
        title: 'Example Title',
        created: 1_234_567_800,
        note: 'Some note',
        description: 'A description',
      }

      const result = sortMetaProperties(meta)

      const keys = Object.keys(result)
      expect(keys).toEqual([
        'description',
        'note',
        'title',
        'updated',
        'created',
      ])
      expect(result.created).toBe(1_234_567_800)
      expect(result.updated).toBe(1_234_567_890)
      expect(result.title).toBe('Example Title')
    })

    it('should handle meta object without created property', () => {
      const meta = {
        updated: 1_234_567_890,
        title: 'Example Title',
        note: 'Some note',
      } as BookmarkTagsAndMetadata['meta']

      const result = sortMetaProperties(meta)

      const keys = Object.keys(result)
      expect(keys).toEqual(['note', 'title', 'updated'])
      expect(result.updated).toBe(1_234_567_890)
      expect(result.title).toBe('Example Title')
      expect(result.note).toBe('Some note')
    })

    it('should handle meta object with only created property', () => {
      const meta = {
        created: 1_234_567_800,
      } as BookmarkTagsAndMetadata['meta']

      const result = sortMetaProperties(meta)

      const keys = Object.keys(result)
      expect(keys).toEqual(['created'])
      expect(result.created).toBe(1_234_567_800)
    })

    it('should preserve all property values correctly', () => {
      const meta = {
        zebra: 'last alphabetically',
        alpha: 'first alphabetically',
        created: 1_234_567_800,
        beta: 42,
        gamma: true,
        delta: null,
        epsilon: undefined,
      } as unknown as BookmarkTagsAndMetadata['meta']

      const result = sortMetaProperties(meta)

      expect(result.zebra).toBe('last alphabetically')
      expect(result.alpha).toBe('first alphabetically')
      expect(result.created).toBe(1_234_567_800)
      expect(result.beta).toBe(42)
      expect(result.gamma).toBe(true)
      expect(result.delta).toBe(null)
      expect(result.epsilon).toBe(undefined)
    })

    it('should handle complex nested objects and arrays', () => {
      const meta = {
        created: 1_234_567_800,
        complexObject: {
          nested: {
            value: 'deep',
          },
          array: [1, 2, 3],
        },
        simpleArray: ['a', 'b', 'c'],
        title: 'Test Title',
      } as unknown as BookmarkTagsAndMetadata['meta']

      const result = sortMetaProperties(meta)

      const keys = Object.keys(result)
      expect(keys).toEqual(['complexObject', 'simpleArray', 'title', 'created'])
      expect(result.complexObject).toEqual({
        nested: {
          value: 'deep',
        },
        array: [1, 2, 3],
      })
      expect(result.simpleArray).toEqual(['a', 'b', 'c'])
    })

    it('should handle properties with special characters in names', () => {
      const meta = {
        'property-with-dash': 'value1',
        property_with_underscore: 'value2',
        'property.with.dots': 'value3',
        'property with spaces': 'value4',
        created: 1_234_567_800,
      } as unknown as BookmarkTagsAndMetadata['meta']

      const result = sortMetaProperties(meta)

      const keys = Object.keys(result)
      expect(keys).toEqual([
        'property with spaces',
        'property_with_underscore',
        'property-with-dash',
        'property.with.dots',
        'created',
      ])
    })

    it('should handle numeric property names correctly', () => {
      const meta = {
        '3': 'third',
        '1': 'first',
        '10': 'tenth',
        '2': 'second',
        created: 1_234_567_800,
      } as unknown as BookmarkTagsAndMetadata['meta']

      const result = sortMetaProperties(meta)

      const keys = Object.keys(result)
      // String sorting: '1', '2', '3', '10' (lexicographic order)
      expect(keys).toEqual(['1', '2', '3', '10', 'created'])
    })
  })

  describe('edge cases', () => {
    it('should handle empty meta object', () => {
      const meta = {} as BookmarkTagsAndMetadata['meta']

      const result = sortMetaProperties(meta)

      expect(result).toEqual({})
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('should handle null input', () => {
      const result = sortMetaProperties(null as any)

      expect(result).toBe(null)
    })

    it('should handle undefined input', () => {
      const result = sortMetaProperties(undefined as any)

      expect(result).toBe(undefined)
    })

    it('should handle non-object input', () => {
      const stringInput = 'not an object' as any
      const numberInput = 123 as any
      const booleanInput = true as any
      const arrayInput = [1, 2, 3] as any

      expect(sortMetaProperties(stringInput)).toBe(stringInput)

      expect(sortMetaProperties(numberInput)).toBe(numberInput)

      expect(sortMetaProperties(booleanInput)).toBe(booleanInput)
      // Arrays are objects in JavaScript, so they get processed

      expect(sortMetaProperties(arrayInput)).toEqual({ '0': 1, '1': 2, '2': 3 })
    })

    it('should not mutate the original object', () => {
      const originalMeta: BookmarkTagsAndMetadata['meta'] = {
        updated: 1_234_567_890,
        title: 'Example Title',
        created: 1_234_567_800,
        note: 'Some note',
      }

      const originalKeys = Object.keys(originalMeta)
      const result = sortMetaProperties(originalMeta)

      // Original object should remain unchanged
      expect(Object.keys(originalMeta)).toEqual(originalKeys)
      expect(originalMeta).toEqual({
        updated: 1_234_567_890,
        title: 'Example Title',
        created: 1_234_567_800,
        note: 'Some note',
      })

      // Result should be different object
      expect(result).not.toBe(originalMeta)
    })

    it('should handle meta with created property having different data types', () => {
      const metaWithStringCreated: BookmarkTagsAndMetadata['meta'] = {
        title: 'Test',
        created: '1234567800' as any,
        updated: 1_234_567_890,
      }

      const result = sortMetaProperties(metaWithStringCreated)
      const keys = Object.keys(result)
      expect(keys).toEqual(['title', 'updated', 'created'])
      expect(result.created).toBe('1234567800')
    })

    it('should handle meta with multiple created-like properties', () => {
      const meta = {
        createdAt: 1_234_567_800,
        created: 1_234_567_900,
        createdBy: 'user',
        title: 'Test',
      } as unknown as BookmarkTagsAndMetadata['meta']

      const result = sortMetaProperties(meta)
      const keys = Object.keys(result)
      // Only 'created' should be moved to the end
      expect(keys).toEqual(['createdAt', 'createdBy', 'title', 'created'])
    })
  })

  describe('performance and stability', () => {
    it('should handle large objects efficiently', () => {
      const largeMeta = {
        created: 1_234_567_800,
      } as BookmarkTagsAndMetadata['meta']

      // Add many properties
      for (let i = 0; i < 1000; i++) {
        largeMeta[`property_${i.toString().padStart(4, '0')}`] = `value_${i}`
      }

      const startTime = performance.now()
      const result = sortMetaProperties(largeMeta)
      const endTime = performance.now()

      expect(Object.keys(result)).toHaveLength(1001) // 1000 + created
      expect(Object.keys(result)[Object.keys(result).length - 1]).toBe(
        'created'
      )
      expect(endTime - startTime).toBeLessThan(100) // Should complete within 100ms
    })

    it('should be stable sort (preserve relative order of equal elements)', () => {
      // Since we're sorting by string comparison, this tests the stability of Object.entries
      const meta = {
        a1: 'first a',
        b1: 'first b',
        a2: 'second a',
        b2: 'second b',
        created: 1_234_567_800,
      } as unknown as BookmarkTagsAndMetadata['meta']

      const result = sortMetaProperties(meta)
      const keys = Object.keys(result)

      // Should maintain relative order for same-prefix keys
      expect(keys.indexOf('a1')).toBeLessThan(keys.indexOf('a2'))
      expect(keys.indexOf('b1')).toBeLessThan(keys.indexOf('b2'))
      expect(keys.at(-1)).toBe('created')
    })

    it('should handle repeated calls with same input consistently', () => {
      const meta = {
        zebra: 'z',
        alpha: 'a',
        created: 1_234_567_800,
        beta: 'b',
      } as unknown as BookmarkTagsAndMetadata['meta']

      const result1 = sortMetaProperties(meta)
      const result2 = sortMetaProperties(meta)
      const result3 = sortMetaProperties(result1) // Sort already sorted

      expect(Object.keys(result1)).toEqual(Object.keys(result2))
      expect(Object.keys(result2)).toEqual(Object.keys(result3))
      expect(result1).toEqual(result2)
      expect(result2).toEqual(result3)
    })
  })

  describe('type safety', () => {
    it('should maintain type information for known meta properties', () => {
      const meta: BookmarkTagsAndMetadata['meta'] = {
        title: 'Test Title',
        created: 1_234_567_800,
        updated: 1_234_567_890,
        note: 'Test note',
      }

      const result = sortMetaProperties(meta)

      // TypeScript should infer correct types
      expect(typeof result.title).toBe('string')
      expect(typeof result.created).toBe('number')
      expect(typeof result.updated).toBe('number')
      expect(typeof result.note).toBe('string')
    })

    it('should handle optional properties correctly', () => {
      const metaWithOptionals = {
        created: 1_234_567_800,
        title: 'Required title',
        // note and other optional properties are missing
      } as BookmarkTagsAndMetadata['meta']

      const result = sortMetaProperties(metaWithOptionals)

      expect(result.title).toBe('Required title')
      expect(result.created).toBe(1_234_567_800)
      expect('note' in result).toBe(false)
    })
  })
})
