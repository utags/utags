import { URLSearchParams } from 'node:url'
import { describe, it, expect } from 'vitest'
import { createTagFilterCondition } from './tag-filter.js'

describe('tag-filter', () => {
  const testMeta = {
    title: 'test',
    description: '',
    image: '',
    created: 0,
    updated: 0,
  }

  describe('createTagFilterCondition', () => {
    it('should return undefined when no t param', () => {
      const params = new URLSearchParams()
      const condition = createTagFilterCondition(params)
      expect(condition).toBeUndefined()
    })

    describe('AND conditions (single tags)', () => {
      it('should match when all required tags exist', () => {
        const params = new URLSearchParams('t=tag1&t=tag2')
        const condition = createTagFilterCondition(params)!
        expect(condition('', ['tag1', 'tag2', 'tag3'], testMeta)).toBe(true)
      })

      it('should not match when missing any required tag', () => {
        const params = new URLSearchParams('t=tag1&t=tag2')
        const condition = createTagFilterCondition(params)!
        expect(condition('', ['tag1', 'tag3'], testMeta)).toBe(false)
      })

      it('should ignore empty tags', () => {
        const params = new URLSearchParams('t=&t=tag1&t=  ')
        const condition = createTagFilterCondition(params)!
        expect(condition('', ['tag1'], testMeta)).toBe(true)
      })

      it('should trim whitespace', () => {
        const params = new URLSearchParams('t= tag1 &t=tag2 ')
        const condition = createTagFilterCondition(params)!
        expect(condition('', ['tag1', 'tag2'], testMeta)).toBe(true)
      })

      it('should deduplicate same tags', () => {
        const params = new URLSearchParams('t=tag1&t=tag1&t=tag2')
        const condition = createTagFilterCondition(params)!
        expect(condition('', ['tag1', 'tag2'], testMeta)).toBe(true)
      })
    })

    describe('Mixed AND/OR conditions (comma-separated)', () => {
      it('should match when all groups have at least one matching tag', () => {
        const params = new URLSearchParams('t=tag1,tag2&t=tag3,tag4')
        const condition = createTagFilterCondition(params)!
        expect(condition('', ['tag1', 'tag3'], testMeta)).toBe(true)
        expect(condition('', ['tag2', 'tag4'], testMeta)).toBe(true)
      })

      it('should not match when any group has no matching tags', () => {
        const params = new URLSearchParams('t=tag1,tag2&t=tag3,tag4')
        const condition = createTagFilterCondition(params)!
        expect(condition('', ['tag1', 'tag5'], testMeta)).toBe(false)
      })

      it('should deduplicate same tag groups', () => {
        const params = new URLSearchParams('t=tag1,tag2&t=tag2,tag1')
        const condition = createTagFilterCondition(params)!
        expect(condition('', ['tag1'], testMeta)).toBe(true)
      })

      it('should handle mixed single and multi-tag groups', () => {
        const params = new URLSearchParams('t=tag1&t=tag2,tag3')
        const condition = createTagFilterCondition(params)!
        expect(condition('', ['tag1', 'tag2'], testMeta)).toBe(true)
        expect(condition('', ['tag1', 'tag3'], testMeta)).toBe(true)
        expect(condition('', ['tag2', 'tag3'], testMeta)).toBe(false)
      })

      it('should ignore empty groups', () => {
        const params = new URLSearchParams('t=tag1,,&t=,tag2,')
        const condition = createTagFilterCondition(params)!
        expect(condition('', ['tag1', 'tag2'], testMeta)).toBe(true)
      })
    })

    describe('Edge cases', () => {
      it('should handle all empty tags', () => {
        const params = new URLSearchParams('t=&t=  ')
        const condition = createTagFilterCondition(params)
        expect(condition).toBeUndefined()
      })

      it('should handle all empty groups', () => {
        const params = new URLSearchParams('t=,,&t= , , ')
        const condition = createTagFilterCondition(params)
        expect(condition).toBeUndefined()
      })

      it('should handle mixed empty and valid tags', () => {
        const params = new URLSearchParams('t=&t=tag1&t=  &t=tag2')
        const condition = createTagFilterCondition(params)!
        expect(condition('', ['tag1', 'tag2'], testMeta)).toBe(true)
      })
    })
  })
})
