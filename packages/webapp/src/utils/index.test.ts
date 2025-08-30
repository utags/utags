import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defaultFavicons } from '../config/constants.js'
import {
  formatDatetime,
  getFaviconUrl,
  normalizeAndDeduplicateStrings,
  deduplicateArrays,
  isNonNullObject,
} from './index.js'

// Define a type for our mock location
type MockLocation = {
  href: string
  origin: string
  assign?: (url: string) => void // For fallback navigation spy
}
let mockLocation: MockLocation

describe('formatDatetime', () => {
  /**
   * Store the original Date object to restore it after tests
   */
  const originalDate = globalThis.Date

  /**
   * Setup before each test
   */
  beforeEach(() => {
    // Mock the Date object to properly handle timestamp parameters
    const mockDate = vi.fn(function (timestamp: string | number | Date) {
      // If timestamp is provided, use it; otherwise use the fixed date
      if (arguments.length === 0) {
        // eslint-disable-next-line new-cap
        return new originalDate('2023-05-15T14:30:45.000Z')
      }

      // eslint-disable-next-line new-cap
      return new originalDate(timestamp)
    })

    // @ts-expect-error - Mocking Date constructor
    mockDate.UTC = originalDate.UTC
    // @ts-expect-error - Mocking Date constructor
    mockDate.parse = originalDate.parse
    // @ts-expect-error - Mocking Date constructor
    mockDate.now = vi.fn(() => 1_684_161_045_000) // 2023-05-15T14:30:45.000Z in milliseconds

    // @ts-expect-error - Mocking Date constructor
    globalThis.Date = mockDate
  })

  /**
   * Cleanup after each test
   */
  afterEach(() => {
    // Restore the original Date object
    globalThis.Date = originalDate

    // Clear all mocks
    vi.clearAllMocks()
  })

  /**
   * Test formatting with date only (full=false)
   */
  it('should format date without time when full is false', () => {
    // Test with a specific timestamp (2023-01-15)
    const timestamp = 1_673_798_400_000 // 2023-01-15T12:00:00.000Z

    // Format the date
    const result = formatDatetime(timestamp, false)

    // Verify the result format (should be date only)
    // Due to timezone differences, the date might be 15 or 16
    expect(result).toMatch(/01\/(15|16)\/2023/)
  })

  /**
   * Test formatting with date and time (full=true)
   */
  it('should format date with time when full is true', () => {
    // Test with a specific timestamp (2023-01-15 14:30:45)
    const timestamp = 1_673_793_045_000 // 2023-01-15T14:30:45.000Z

    // Format the date with time
    const result = formatDatetime(timestamp, true)

    // Verify the result format (should include time)
    // Due to timezone differences, the hour might vary, but minutes and seconds should remain consistent
    expect(result).toMatch(/01\/(15|16)\/2023, \d{2}:30:45/)
  })

  /**
   * Test with default parameter (full=false)
   */
  it('should use default parameter value (full=false) when not provided', () => {
    // Test with a specific timestamp
    const timestamp = 1_673_798_400_000 // 2023-01-15T12:00:00.000Z

    // Format the date without specifying the full parameter
    const result = formatDatetime(timestamp)

    // Verify the result (should be date only)
    // Due to timezone differences, the date might be 15 or 16
    expect(result).toMatch(/01\/(15|16)\/2023/)
  })

  /**
   * Test with current timestamp
   */
  it('should correctly format current date', () => {
    // Get current timestamp from mocked Date.now()
    const now = Date.now()

    // Format current date without time
    const dateOnly = formatDatetime(now, false)

    // Format current date with time
    const dateWithTime = formatDatetime(now, true)

    // Verify results
    // Using regex pattern matching to allow for small date variations
    expect(dateOnly).toMatch(/05\/(15|16)\/2023/)
    expect(dateWithTime).toMatch(/05\/(15|16)\/2023, \d{2}:30:45/)
  })

  /**
   * Test with different timezones
   * Note: This test may behave differently depending on the timezone of the test environment
   */
  it('should handle different timezone offsets correctly', () => {
    // Create a specific date with timezone consideration
    // This is midnight UTC on January 1, 2023
    const timestamp = 1_672_531_200_000 // 2023-01-01T00:00:00.000Z

    // Format the date
    const result = formatDatetime(timestamp, true)

    // The expected result will depend on the timezone of the test environment
    // For this test, we're just verifying the format is correct
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/)
  })

  /**
   * Test with historical date
   */
  it('should correctly format historical dates', () => {
    // Test with a historical date (1990-01-01)
    const timestamp = 631_152_000_000 // 1990-01-01T00:00:00.000Z

    // Format the historical date
    const result = formatDatetime(timestamp, false)

    // Verify the result
    // Due to timezone differences, the date might be 12/31 or 01/01
    expect(result).toMatch(/(12\/31\/1989|01\/01\/1990)/)
  })

  /**
   * Test with future date
   */
  it('should correctly format future dates', () => {
    // Test with a future date (2050-12-31)
    const timestamp = 2_556_057_600_000 // 2050-12-31T00:00:00.000Z

    // Format the future date
    const result = formatDatetime(timestamp, false)

    // Verify the result
    // Due to timezone differences, the date might be 12/30, 12/31, or 01/01
    expect(result).toMatch(/(12\/(30|31)\/2050|01\/01\/2051)/)
  })

  /**
   * Test with invalid input
   */
  it('should handle invalid date input gracefully', () => {
    // Test with an invalid timestamp (NaN)
    const result = formatDatetime(Number.NaN, false)

    // The result should be "Invalid Date" or similar
    expect(result).toContain('Invalid')
  })
})

describe('getFaviconUrl', () => {
  beforeEach(() => {
    mockLocation = {
      href: 'http://localhost:3000/current-page',
      origin: 'http://localhost:3000',
      assign: vi.fn(), // Mock for location.assign for fallback
    }

    // Stub global objects. Vitest's `vi.stubGlobal` is preferred.
    vi.stubGlobal('location', mockLocation)
    // `window.location` should also point to `mockLocation`
    vi.stubGlobal('window', {
      location: mockLocation,
    })
  })
  /**
   * Test with default size parameter (16px)
   */
  it('should generate favicon URL with default size (16px)', () => {
    // Test with a simple URL
    const url = 'https://example.com'

    // Get favicon URL with default size
    const result = getFaviconUrl(url)

    // Verify the result contains the correct domain
    expect(result).toContain('example.com')

    // Verify the result contains the correct size parameter
    expect(result).toContain(encodeURIComponent('size=16'))

    // Verify the result uses the Google favicon service
    expect(result).toContain(encodeURIComponent('t3.gstatic.com/faviconV2'))

    // Verify the result is wrapped with wsrv.nl service
    expect(result).toContain('wsrv.nl')

    // Verify the wsrv.nl parameters
    expect(result).toContain('w=16')
    expect(result).toContain('h=16')

    // Verify the default favicon is included
    expect(result).toContain('default=')
  })

  /**
   * Test with explicit size parameter (32px)
   */
  it('should generate favicon URL with specified size (32px)', () => {
    // Test with a simple URL
    const url = 'https://example.com'

    // Get favicon URL with 32px size
    const result = getFaviconUrl(url, 32)

    // Verify the result contains the correct size parameter
    expect(result).toContain(encodeURIComponent('size=32'))

    // Verify the wsrv.nl parameters match the size
    expect(result).toContain('w=32')
    expect(result).toContain('h=32')

    // Verify the default favicon is included and uses the correct size
    expect(result).toContain('default=')
  })

  /**
   * Test with explicit size parameter (64px)
   */
  it('should generate favicon URL with specified size (64px)', () => {
    // Test with a simple URL
    const url = 'https://example.com'

    // Get favicon URL with 64px size
    const result = getFaviconUrl(url, 64)

    // Verify the result contains the correct size parameter
    expect(result).toContain(encodeURIComponent('size=64'))

    // Verify the wsrv.nl parameters match the size
    expect(result).toContain('w=64')
    expect(result).toContain('h=64')
  })

  /**
   * Test with URL containing query parameters
   */
  it('should handle URLs with query parameters correctly', () => {
    // Test with a URL containing query parameters
    const url = 'https://example.com/page?param=value&another=123'

    // Get favicon URL
    const result = getFaviconUrl(url)

    // Verify the result extracts only the origin part
    expect(result).toContain('example.com')
    expect(result).not.toContain('page?param')
  })

  /**
   * Test with URL containing path
   */
  it('should handle URLs with paths correctly', () => {
    // Test with a URL containing a path
    const url = 'https://example.com/some/deep/path'

    // Get favicon URL
    const result = getFaviconUrl(url)

    // Verify the result extracts only the origin part
    expect(result).toContain('example.com')
    expect(result).not.toContain('some/deep/path')
  })

  /**
   * Test with URL containing port
   */
  it('should handle URLs with ports correctly', () => {
    // Test with a URL containing a port
    const url = 'https://example.com:8080'

    // Get favicon URL
    const result = getFaviconUrl(url)

    // Verify the result includes the port in the origin
    expect(result).toContain(encodeURIComponent('example.com:8080'))
  })

  /**
   * Test with URL containing authentication
   */
  it('should handle URLs with authentication correctly', () => {
    // Test with a URL containing authentication
    const url = 'https://user:pass@example.com'

    // Get favicon URL
    const result = getFaviconUrl(url)

    // Verify the result excludes authentication info
    expect(result).toContain('example.com')
    expect(result).not.toContain('user:pass')
  })

  /**
   * Test with URL containing hash
   */
  it('should handle URLs with hash fragments correctly', () => {
    // Test with a URL containing a hash fragment
    const url = 'https://example.com/page#section'

    // Get favicon URL
    const result = getFaviconUrl(url)

    // Verify the result excludes the hash fragment
    expect(result).toContain('example.com')
    expect(result).not.toContain('page#section')
  })

  /**
   * Test with different protocols
   */
  it('should handle different URL protocols correctly', () => {
    // Test with HTTP protocol
    const httpUrl = 'http://example.com'
    const httpResult = getFaviconUrl(httpUrl)

    // Test with HTTPS protocol
    const httpsUrl = 'https://example.com'
    const httpsResult = getFaviconUrl(httpsUrl)

    // Verify both results contain the same domain
    expect(httpResult).toContain('example.com')
    expect(httpsResult).toContain('example.com')

    // Verify the URL encoding works correctly
    expect(httpResult).toContain(encodeURIComponent('http://example.com'))
    expect(httpsResult).toContain(encodeURIComponent('https://example.com'))
  })

  /**
   * Test with special characters in URL
   */
  it('should handle URLs with special characters correctly', () => {
    // Test with a URL containing special characters
    const url = 'https://例子.测试'

    // Get favicon URL
    const result = getFaviconUrl(url)

    // Verify the result contains the encoded domain
    expect(result).toContain(
      encodeURIComponent(new URL('https://例子.测试').origin)
    )
  })

  /**
   * Test that proper URL encoding is applied
   */
  it('should properly encode URLs for the wrapper service', () => {
    // Test with a URL that needs encoding
    const url = 'https://example.com/path with spaces'

    // Get favicon URL
    const result = getFaviconUrl(url)

    // The inner URL should be encoded
    const googleFaviconUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://example.com&size=16`

    // Verify the result contains the properly encoded URL
    expect(result).toContain(encodeURIComponent(googleFaviconUrl))
  })

  /**
   * Test that the default favicon is included
   */
  it('should include the correct default favicon based on size', () => {
    // Test with different sizes
    const url = 'https://example.com'

    // Get favicon URLs for different sizes
    const result16 = getFaviconUrl(url, 16)
    const result32 = getFaviconUrl(url, 32)
    const result64 = getFaviconUrl(url, 64)

    // Verify each result includes the correct default favicon
    expect(result16).toContain(`default=${defaultFavicons[16]}`)
    expect(result32).toContain(`default=${defaultFavicons[32]}`)
    expect(result64).toContain(`default=${defaultFavicons[64]}`)
  })
})

describe('normalizeAndDeduplicateStrings', () => {
  /**
   * Test with basic string array containing duplicates
   */
  it('should remove duplicate strings', () => {
    // Test with an array containing duplicates
    const input = ['tag1', 'tag2', 'tag1', 'tag3', 'tag2']

    // Process the array
    const result = normalizeAndDeduplicateStrings(input)

    // Verify duplicates are removed
    expect(result).toEqual(['tag1', 'tag2', 'tag3'])

    // Verify the result is a new array
    expect(result).not.toBe(input)
  })

  /**
   * Test with strings containing whitespace
   */
  it('should trim whitespace from strings', () => {
    // Test with strings containing leading and trailing whitespace
    const input = [' tag1', 'tag2 ', ' tag3 ', '\ttag4\t', '\ntag5\n']

    // Process the array
    const result = normalizeAndDeduplicateStrings(input)

    // Verify whitespace is trimmed
    expect(result).toEqual(['tag1', 'tag2', 'tag3', 'tag4', 'tag5'])
  })

  /**
   * Test with empty strings and whitespace-only strings
   */
  it('should filter out empty strings and whitespace-only strings', () => {
    // Test with empty strings and whitespace-only strings
    const input = ['tag1', '', 'tag2', '   ', '\t', '\n', 'tag3']

    // Process the array
    const result = normalizeAndDeduplicateStrings(input)

    // Verify empty strings and whitespace-only strings are filtered out
    expect(result).toEqual(['tag1', 'tag2', 'tag3'])
  })

  /**
   * Test with case-sensitive duplicates
   */
  it('should preserve case sensitivity when removing duplicates', () => {
    // Test with case variations of the same string
    const input = ['tag', 'Tag', 'TAG', 'tAg']

    // Process the array
    const result = normalizeAndDeduplicateStrings(input)

    // Verify case-sensitive duplicates are preserved
    expect(result).toEqual(['tag', 'Tag', 'TAG', 'tAg'])
  })

  /**
   * Test with combination of all cases
   */
  it('should handle combination of trimming, filtering, and deduplication', () => {
    // Test with a complex array
    const input = [
      'tag1',
      ' tag1',
      'tag1 ',
      ' tag1 ',
      '',
      '   ',
      'tag2',
      'tag2',
      ' tag3',
      'tag3 ',
    ]

    // Process the array
    const result = normalizeAndDeduplicateStrings(input)

    // Verify the result handles all cases correctly
    expect(result).toEqual(['tag1', 'tag2', 'tag3'])
  })

  /**
   * Test with empty array
   */
  it('should return empty array when input is empty', () => {
    // Test with an empty array
    const input: string[] = []

    // Process the array
    const result = normalizeAndDeduplicateStrings(input)

    // Verify the result is an empty array
    expect(result).toEqual([])

    // Verify the result is a new array
    expect(result).not.toBe(input)
  })

  /**
   * Test with special characters
   */
  it('should handle strings with special characters', () => {
    // Test with strings containing special characters
    const input = ['tag-1', 'tag_2', 'tag.3', 'tag@4', 'tag#5']

    // Process the array
    const result = normalizeAndDeduplicateStrings(input)

    // Verify special characters are preserved
    expect(result).toEqual(['tag-1', 'tag_2', 'tag.3', 'tag@4', 'tag#5'])
  })

  /**
   * Test with non-ASCII characters
   */
  it('should handle strings with non-ASCII characters', () => {
    // Test with strings containing non-ASCII characters
    const input = ['标签1', '标签2', ' 标签1 ', '标签2']

    // Process the array
    const result = normalizeAndDeduplicateStrings(input)

    // Verify non-ASCII characters are handled correctly
    expect(result).toEqual(['标签1', '标签2'])
  })

  /**
   * Test with very long strings
   */
  it('should handle very long strings', () => {
    // Test with very long strings
    const longString1 = 'a'.repeat(1000)
    const longString2 = 'b'.repeat(1000)
    const input = [longString1, longString2, ` ${longString1} `]

    // Process the array
    const result = normalizeAndDeduplicateStrings(input)

    // Verify long strings are handled correctly
    expect(result).toEqual([longString1, longString2])
  })

  /**
   * Test order preservation
   */
  it('should preserve the order of unique strings', () => {
    // Test with an array where order matters
    const input = ['tag3', 'tag1', 'tag2', 'tag4']

    // Process the array
    const result = normalizeAndDeduplicateStrings(input)

    // Verify the order is preserved for unique strings
    expect(result).toEqual(['tag3', 'tag1', 'tag2', 'tag4'])
  })

  /**
   * Test with first occurrence preservation for duplicates
   */
  it('should keep the first occurrence of duplicate strings', () => {
    // Test with duplicates at different positions
    const input = ['tag1', 'tag2', 'tag3', 'tag1', 'tag2']

    // Process the array
    const result = normalizeAndDeduplicateStrings(input)

    // Verify the first occurrences are kept
    expect(result).toEqual(['tag1', 'tag2', 'tag3'])

    // Verify the order matches the first occurrences
    expect(result.indexOf('tag1')).toBe(0)
    expect(result.indexOf('tag2')).toBe(1)
    expect(result.indexOf('tag3')).toBe(2)
  })
})

describe('deduplicateArrays', () => {
  /**
   * Test with basic array containing duplicates
   */
  it('should remove duplicate arrays', () => {
    // Test with an array containing duplicates
    const input = [
      [1, 2],
      [3, 4],
      [1, 2],
      [5, 6],
      [3, 4],
    ]

    // Process the array
    const result = deduplicateArrays(input)

    // Verify duplicates are removed
    expect(result).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ])

    // Verify the result is a new array
    expect(result).not.toBe(input)
  })

  /**
   * Test with ignoreOrder=false (default)
   */
  it('should consider arrays with different order as different when ignoreOrder=false', () => {
    // Test with arrays having same elements but different order
    const input = [
      [1, 2],
      [2, 1],
      [3, 4],
      [4, 3],
    ]

    // Process the array with default ignoreOrder (false)
    const result = deduplicateArrays(input)

    // Verify arrays with different order are preserved
    expect(result).toEqual([
      [1, 2],
      [2, 1],
      [3, 4],
      [4, 3],
    ])
  })

  /**
   * Test with ignoreOrder=true
   */
  it('should consider arrays with different order as same when ignoreOrder=true', () => {
    // Test with arrays having same elements but different order
    const input = [
      [1, 2],
      [2, 1],
      [3, 4],
      [4, 3],
    ]

    // Process the array with ignoreOrder=true
    const result = deduplicateArrays(input, true)

    // Verify arrays with different order are considered duplicates
    // Note: The first occurrence of each unique array is kept
    expect(result).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  /**
   * Test with string elements
   */
  it('should handle arrays with string elements', () => {
    // Test with string elements
    const input = [
      ['a', 'b'],
      ['c', 'd'],
      ['a', 'b'],
      ['b', 'a'],
    ]

    // Process the array with default ignoreOrder (false)
    const resultWithoutIgnoreOrder = deduplicateArrays(input)

    // Verify duplicates are removed but different order is preserved
    expect(resultWithoutIgnoreOrder).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      ['b', 'a'],
    ])

    // Process the array with ignoreOrder=true
    const resultWithIgnoreOrder = deduplicateArrays(input, true)

    // Verify arrays with different order are considered duplicates
    expect(resultWithIgnoreOrder).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  /**
   * Test with mixed type elements
   */
  it('should handle arrays with mixed type elements', () => {
    // Test with mixed type elements
    const input = [
      [1, 'a'],
      ['a', 1],
      [1, 'a'],
      [2, 'b'],
    ]

    // Process the array with default ignoreOrder (false)
    const resultWithoutIgnoreOrder = deduplicateArrays(input)

    // Verify duplicates are removed but different order is preserved
    expect(resultWithoutIgnoreOrder).toEqual([
      [1, 'a'],
      ['a', 1],
      [2, 'b'],
    ])

    // Process the array with ignoreOrder=true
    const resultWithIgnoreOrder = deduplicateArrays(input, true)

    // Verify arrays with different order are considered duplicates
    // Note: When comparing different types, string representation is used
    expect(resultWithIgnoreOrder).toEqual([
      [1, 'a'],
      [2, 'b'],
    ])
  })

  /**
   * Test with empty arrays
   */
  it('should handle empty arrays correctly', () => {
    // Test with empty arrays
    const input = [[], [1, 2], [], [3, 4]]

    // Process the array
    const result = deduplicateArrays(input)

    // Verify empty arrays are deduplicated
    expect(result).toEqual([[], [1, 2], [3, 4]])
  })

  /**
   * Test with empty input
   */
  it('should return empty array when input is empty', () => {
    // Test with an empty array
    const input: number[][] = []

    // Process the array
    const result = deduplicateArrays(input)

    // Verify the result is an empty array
    expect(result).toEqual([])

    // Verify the result is a new array
    expect(result).not.toBe(input)
  })

  /**
   * Test with nested arrays
   */
  it('should handle nested arrays correctly', () => {
    // Test with nested arrays
    const input = [
      [[1, 2], 3],
      [[1, 2], 3],
      [[2, 1], 3],
      [4, [5, 6]],
    ]

    // Process the array with default ignoreOrder (false)
    const resultWithoutIgnoreOrder = deduplicateArrays(input)

    // Verify duplicates are removed
    expect(resultWithoutIgnoreOrder).toEqual([
      [[1, 2], 3],
      [[2, 1], 3],
      [4, [5, 6]],
    ])

    // Process the array with ignoreOrder=true
    // Note: ignoreOrder only affects the top-level array comparison
    const resultWithIgnoreOrder = deduplicateArrays(input, true)

    // Verify arrays are compared by their string representation
    expect(resultWithIgnoreOrder).toEqual([
      [[1, 2], 3],
      [[2, 1], 3],
      [4, [5, 6]],
    ])
  })

  /**
   * Test with arrays containing objects
   */
  it('should handle arrays containing objects', () => {
    // Test with arrays containing objects
    const input = [
      [{ id: 1 }, { id: 2 }],
      [{ id: 1 }, { id: 2 }],
      [{ id: 2 }, { id: 1 }],
      [{ id: 3 }, { id: 4 }],
    ]

    // Process the array with default ignoreOrder (false)
    const resultWithoutIgnoreOrder = deduplicateArrays(input)

    // Verify duplicates are removed based on string representation
    expect(resultWithoutIgnoreOrder).toEqual([
      [{ id: 1 }, { id: 2 }],
      [{ id: 2 }, { id: 1 }],
      [{ id: 3 }, { id: 4 }],
    ])

    // Process the array with ignoreOrder=true
    const resultWithIgnoreOrder = deduplicateArrays(input, true)

    // Verify arrays are compared by their sorted string representation
    // Objects are compared by their string representation
    expect(resultWithIgnoreOrder).toEqual([
      [{ id: 1 }, { id: 2 }],
      [{ id: 3 }, { id: 4 }],
    ])
  })

  /**
   * Test with large arrays
   */
  it('should handle large arrays efficiently', () => {
    // Create a large array with duplicates
    const largeArray = Array.from({ length: 100 })
      .fill(0)
      .map((_, i) => [i % 10, i % 5])

    // Process the array
    const result = deduplicateArrays(largeArray)

    // Verify the result has the expected length (10 * 5 unique combinations)
    expect(result.length).toBeLessThanOrEqual(10 * 5)

    // Verify all arrays in the result are unique
    const uniqueKeys = new Set(result.map((arr) => JSON.stringify(arr)))
    expect(uniqueKeys.size).toBe(result.length)
  })

  /**
   * Test order preservation
   */
  it('should preserve the order of first occurrence', () => {
    // Test with an array where order matters
    const input = [
      [3, 4],
      [1, 2],
      [5, 6],
      [1, 2],
      [3, 4],
    ]

    // Process the array
    const result = deduplicateArrays(input)

    // Verify the order of first occurrences is preserved
    expect(result).toEqual([
      [3, 4],
      [1, 2],
      [5, 6],
    ])
  })

  /**
   * Test with arrays containing null or undefined
   */
  it('should handle arrays with null or undefined values', () => {
    // Test with arrays containing null or undefined
    const input = [
      [null, 1],
      [undefined, 2],
      [null, 1],
      [1, null],
      [2, undefined],
    ]

    // Process the array with default ignoreOrder (false)
    const resultWithoutIgnoreOrder = deduplicateArrays(input)

    // Verify duplicates are removed but different order is preserved
    expect(resultWithoutIgnoreOrder).toEqual([
      [null, 1],
      [undefined, 2],
      [1, null],
      [2, undefined],
    ])

    // Process the array with ignoreOrder=true
    const resultWithIgnoreOrder = deduplicateArrays(input, true)

    // Verify arrays with different order are considered duplicates
    expect(resultWithIgnoreOrder).toEqual([
      [null, 1],
      [undefined, 2],
    ])
  })
})

describe('isNonNullObject', () => {
  /**
   * Test with plain objects
   */
  it('should return true for plain objects', () => {
    // Test with empty object
    expect(isNonNullObject({})).toBe(true)

    // Test with object containing properties
    expect(isNonNullObject({ a: 1, b: 2 })).toBe(true)

    // Test with nested objects
    expect(isNonNullObject({ a: { b: 1 } })).toBe(true)
  })

  /**
   * Test with null and undefined
   */
  it('should return false for null and undefined', () => {
    // Test with null
    expect(isNonNullObject(null)).toBe(false)

    // Test with undefined
    expect(isNonNullObject(undefined)).toBe(false)
  })

  /**
   * Test with arrays
   */
  it('should return false for arrays', () => {
    // Test with empty array
    expect(isNonNullObject([])).toBe(false)

    // Test with array containing elements
    expect(isNonNullObject([1, 2, 3])).toBe(false)

    // Test with array containing objects
    expect(isNonNullObject([{ a: 1 }])).toBe(false)
  })

  /**
   * Test with primitive types
   */
  it('should return false for primitive types', () => {
    // Test with string
    expect(isNonNullObject('string')).toBe(false)

    // Test with number
    expect(isNonNullObject(123)).toBe(false)

    // Test with boolean
    expect(isNonNullObject(true)).toBe(false)

    // Test with symbol
    expect(isNonNullObject(Symbol('symbol'))).toBe(false)

    // Test with bigint
    expect(isNonNullObject(BigInt(123))).toBe(false)
  })

  /**
   * Test with built-in objects
   */
  it('should return true for built-in object instances', () => {
    // Test with Date object
    expect(isNonNullObject(new Date())).toBe(true)

    // Test with RegExp object
    expect(isNonNullObject(/regex/)).toBe(true)

    // Test with Map object
    expect(isNonNullObject(new Map())).toBe(true)

    // Test with Set object
    expect(isNonNullObject(new Set())).toBe(true)

    // Test with WeakMap object
    expect(isNonNullObject(new WeakMap())).toBe(true)

    // Test with WeakSet object
    expect(isNonNullObject(new WeakSet())).toBe(true)
  })

  /**
   * Test with custom class instances
   */
  it('should return true for custom class instances', () => {
    // Define a custom class
    class TestClass {
      property = 'value'
    }

    // Test with instance of custom class
    expect(isNonNullObject(new TestClass())).toBe(true)
  })

  /**
   * Test with functions
   */
  it('should return false for functions', () => {
    // Test with function declaration
    function testFunction() {
      return true
    }

    expect(isNonNullObject(testFunction)).toBe(false)

    // Test with arrow function
    const arrowFunction = () => true
    expect(isNonNullObject(arrowFunction)).toBe(false)

    // Test with function constructor
    // eslint-disable-next-line no-new-func
    const constructorFunction = new Function('return true')
    expect(isNonNullObject(constructorFunction)).toBe(false)
  })

  /**
   * Test with edge cases
   */
  it('should handle edge cases correctly', () => {
    // Test with object created with Object.create(null)
    // This creates an object with no prototype

    const noProtoObject = Object.create(null)
    expect(isNonNullObject(noProtoObject)).toBe(true)

    // Test with object that has Array in its prototype chain but isn't an array
    const fakeArray = { length: 0 }
    Object.setPrototypeOf(fakeArray, Array.prototype)
    // This should still return true because Array.isArray checks internal [[Class]]
    expect(isNonNullObject(fakeArray)).toBe(true)
  })
})
