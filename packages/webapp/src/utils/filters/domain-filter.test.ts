import { URLSearchParams } from 'node:url'
import { describe, it, expect } from 'vitest'
import { type FilterCondition, rejectAllCondition } from '../filter-registry.js'
import { createDomainFilterCondition } from './domain-filter.js'

describe('createDomainFilterCondition', () => {
  const testMeta = {
    title: 'test',
    description: '',
    image: '',
    created: 0,
    updated: 0,
  }

  it('should return undefined when no d param', () => {
    const params = new URLSearchParams()
    const condition = createDomainFilterCondition(params)
    expect(condition).toBeUndefined()
  })

  describe('single domain cases', () => {
    it('should match exact domain', () => {
      const params = new URLSearchParams('d=example.com')
      const condition: FilterCondition = createDomainFilterCondition(params)!
      expect(condition('http://example.com', [], testMeta)).toBe(true)
      expect(condition('http://sub.example.com', [], testMeta)).toBe(false)
      expect(condition('http://other.com', [], testMeta)).toBe(false)
    })

    it('should handle multiple same domains', () => {
      const params = new URLSearchParams('d=example.com&d=example.com')
      const condition = createDomainFilterCondition(params)!
      expect(condition('http://example.com', [], testMeta)).toBe(true)
    })

    it('should reject when multiple different domains', () => {
      const params = new URLSearchParams('d=example.com&d=test.com')
      const condition = createDomainFilterCondition(params)!
      expect(condition('http://example.com', [], testMeta)).toBe(false)
      expect(condition('http://test.com', [], testMeta)).toBe(false)
    })

    it('should ignore empty domains', () => {
      const params = new URLSearchParams('d=&d=example.com&d=  ')
      const condition = createDomainFilterCondition(params)!
      expect(condition('http://example.com', [], testMeta)).toBe(true)
    })
  })

  describe('comma-separated domains', () => {
    it('should match any domain in single group', () => {
      const params = new URLSearchParams('d=example.com,test.com')
      const condition = createDomainFilterCondition(params)!
      expect(condition('http://example.com', [], testMeta)).toBe(true)
      expect(condition('http://test.com', [], testMeta)).toBe(true)
      expect(condition('http://other.com', [], testMeta)).toBe(false)
    })

    it('should find intersection across multiple groups', () => {
      const params = new URLSearchParams(
        'd=example.com,test.com&d=example.com,other.com'
      )
      const condition = createDomainFilterCondition(params)!
      expect(condition('http://example.com', [], testMeta)).toBe(true)
      expect(condition('http://test.com', [], testMeta)).toBe(false)
      expect(condition('http://other.com', [], testMeta)).toBe(false)
    })

    it('should reject when no common domains', () => {
      const params = new URLSearchParams('d=example.com&d=test.com')
      const condition = createDomainFilterCondition(params)!
      expect(condition('http://example.com', [], testMeta)).toBe(false)
    })

    it('should handle empty groups', () => {
      const params = new URLSearchParams('d=example.com,,&d=,test.com,')
      const condition = createDomainFilterCondition(params)!
      expect(condition('http://example.com', [], testMeta)).toBe(false)
      expect(condition('http://test.com', [], testMeta)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle all empty domains', () => {
      const params = new URLSearchParams('d=&d=  ')
      const condition = createDomainFilterCondition(params)
      expect(condition).toBeUndefined()
    })

    it('should handle mixed empty and valid domains', () => {
      const params = new URLSearchParams('d=&d=example.com&d=  &d=test.com')
      const condition = createDomainFilterCondition(params)!
      expect(condition('http://example.com', [], testMeta)).toBe(false)
    })

    it('should handle subdomains correctly', () => {
      const params = new URLSearchParams('d=sub.example.com')
      const condition = createDomainFilterCondition(params)!
      expect(condition('http://sub.example.com', [], testMeta)).toBe(true)
      expect(condition('http://example.com', [], testMeta)).toBe(false)
    })
  })
})
