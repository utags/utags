import { describe, it, expect, type Mock, vitest } from 'vitest'
import {
  extractValidRegexes,
  extractValidRegex,
  createRegexFromString,
  encodeRegex,
  decodeRegex,
  createRegexFromEncoded,
} from './regex-utils.js'

describe('regex-utils', () => {
  describe('extractValidRegexes', () => {
    it('should extract single regex from string', () => {
      const input = 'abc /test/ def'
      const result = extractValidRegexes(input)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ pattern: 'test', flags: '' })
    })

    it('should extract regex with flags from string', () => {
      const input = 'abc /test/gi def'
      const result = extractValidRegexes(input)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ pattern: 'test', flags: 'gi' })
    })

    it('should extract multiple regexes from string', () => {
      const input = 'abc /test1/i def /test2/g hij'
      const result = extractValidRegexes(input)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ pattern: 'test1', flags: 'i' })
      expect(result[1]).toEqual({ pattern: 'test2', flags: 'g' })
    })

    it('should handle regex with escaped slashes', () => {
      const input = 'abc /test\\/with\\/slashes and [\\,|\\/] patterns/i def'
      const result = extractValidRegexes(input)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        pattern: 'test\\/with\\/slashes and [\\,|\\/] patterns',
        flags: 'i',
      })
    })

    it('should handle regex with special characters', () => {
      const input = 'abc /^test\\d+[a-z]*$/im def'
      const result = extractValidRegexes(input)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ pattern: '^test\\d+[a-z]*$', flags: 'im' })
    })

    it('should handle URL regex pattern', () => {
      const input =
        "abc /^https?:\\/\\/[\\w\\.-]+(?:\\.[\\w\\.-]+)+[\\w\\-\\._~:\\/?#[\\]@!\\$&'\\(\\)\\*\\+,;=.]+$/g def"
      const result = extractValidRegexes(input)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        pattern:
          "^https?:\\/\\/[\\w\\.-]+(?:\\.[\\w\\.-]+)+[\\w\\-\\._~:\\/?#[\\]@!\\$&'\\(\\)\\*\\+,;=.]+$",
        flags: 'g',
      })
    })

    it('should skip invalid regex patterns', () => {
      // Mock console.warn to avoid noise in test output
      const originalWarn = console.warn
      console.warn = vitest.fn()

      const input = 'abc /test/ def /[unclosed/g hij'
      const result = extractValidRegexes(input)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ pattern: 'test', flags: '' })
      expect(console.warn).toHaveBeenCalled()

      // Restore original console.warn
      console.warn = originalWarn
    })

    it('should ignore invalid regex before valid one', () => {
      // Mock console.warn to avoid noise in test output
      const originalWarn = console.warn
      console.warn = vitest.fn()

      const input = 'abc /[unclosed def / valid/g hij'
      const result = extractValidRegexes(input)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ pattern: ' valid', flags: 'g' })
      expect(console.warn).toHaveBeenCalled()

      // Restore original console.warn
      console.warn = originalWarn
    })

    it('should return empty array when no regex found', () => {
      const input = 'abc def hij'
      const result = extractValidRegexes(input)

      expect(result).toHaveLength(0)
    })
  })

  describe('extractValidRegexes', () => {
    it('should handle different regex prefix and suffix correctly', () => {
      const testCases = [
        {
          input: ' /abc/i ', // 空格前缀和后缀
          expected: [{ pattern: 'abc', flags: 'i' }],
        },
        {
          input: '/abc/i ', // 行首前缀，空格后缀
          expected: [{ pattern: 'abc', flags: 'i' }],
        },
        {
          input: 'test:/abc/i ', // 冒号前缀，空格后缀
          expected: [{ pattern: 'abc', flags: 'i' }],
        },
        {
          input: 'test,/abc/i ', // 逗号前缀，空格后缀
          expected: [{ pattern: 'abc', flags: 'i' }],
        },
        {
          input: 'test!/abc/i ', // 叹号前缀，空格后缀
          expected: [{ pattern: 'abc', flags: 'i' }],
        },
        {
          input: 'test-/abc/i ', // 横线符前缀，空格后缀
          expected: [{ pattern: 'abc', flags: 'i' }],
        },
        {
          input: ' /abc/i', // 空格前缀，行尾后缀
          expected: [{ pattern: 'abc', flags: 'i' }],
        },
        {
          input: 'test/abc/i', // 无前缀，应该不匹配
          expected: [],
        },
        {
          input: ' /abc/idef', // 无后缀空格，应该不匹配
          expected: [],
        },
      ]

      for (const { input, expected } of testCases) {
        const result = extractValidRegexes(input)
        expect(result).toEqual(expected)
      }
    })
  })

  describe('extractValidRegexes', () => {
    it('should extract all valid regexes', () => {
      const input = 'text /abc/i more /xyz/g text'
      const result = extractValidRegexes(input)
      expect(result).toEqual([
        { pattern: 'abc', flags: 'i' },
        { pattern: 'xyz', flags: 'g' },
      ])
    })

    it('should skip invalid regex patterns', () => {
      const input = 'text /abc/i /[unclosed x more /valid/g'
      const result = extractValidRegexes(input)
      expect(result).toEqual([
        { pattern: 'abc', flags: 'i' },
        { pattern: 'valid', flags: 'g' },
      ])
    })

    it('should handle escaped characters', () => {
      const input = 'text /a\\/b/i more'
      const result = extractValidRegexes(input)
      expect(result).toEqual([{ pattern: 'a\\/b', flags: 'i' }])
    })
  })

  describe('extractValidRegex', () => {
    it('should extract pattern of first valid regex', () => {
      const input = 'abc /test1/i def /test2/g hij'
      const result = extractValidRegex(input)

      expect(result).toBe('test1')
    })

    it('should return empty string when no regex found', () => {
      const input = 'abc def hij'
      const result = extractValidRegex(input)

      expect(result).toBe('')
    })
  })

  describe('extractValidRegex', () => {
    it('should extract pattern of first valid regex', () => {
      const input = 'text /abc/i more /xyz/g'
      const result = extractValidRegex(input)
      expect(result).toBe('abc')
    })

    it('should return empty string when no valid regex found', () => {
      const input = 'text without regex'
      const result = extractValidRegex(input)
      expect(result).toBe('')
    })
  })

  describe('createRegexFromString', () => {
    it('should create RegExp object from string', () => {
      const input = 'abc /test/i def'
      const result = createRegexFromString(input)

      expect(result).toBeInstanceOf(RegExp)
      expect(result?.source).toBe('test')
      expect(result?.flags).toBe('i')
    })

    it('should return null when no regex found', () => {
      const input = 'abc def hij'
      const result = createRegexFromString(input)

      expect(result).toBeNull()
    })

    it('should handle complex regex patterns', () => {
      const input = 'abc /^\\d{3}-\\d{2}-\\d{4}$/g def'
      const result = createRegexFromString(input)

      expect(result).toBeInstanceOf(RegExp)
      expect(result?.source).toBe('^\\d{3}-\\d{2}-\\d{4}$')
      expect(result?.flags).toBe('g')

      // Verify regex functionality
      expect(result?.test('123-45-6789')).toBe(true)
      expect(result?.test('abc-12-defg')).toBe(false)
    })

    it('should handle error cases', () => {
      // Mock console.error to avoid noise in test output
      const originalError = console.error
      console.error = vitest.fn()

      // Save original RegExp constructor

      const OriginalRegExp = globalThis.RegExp

      // Mock RegExp constructor to throw error on second call
      let callCount = 0
      const regexpSpy = vitest.spyOn(globalThis, 'RegExp')
      regexpSpy.mockImplementation((...args) => {
        callCount++
        if (callCount === 1) {
          // First call returns normal RegExp object
          return new OriginalRegExp(...args)
        }

        // Second call throws error
        throw new Error('Mocked regex error')
      })

      const input = 'abc /test/i def'
      const result = createRegexFromString(input)

      expect(result).toBeNull()
      // Use more flexible assertion to accommodate console-tagger format
      expect(console.error).toHaveBeenCalled()

      // Or use more specific check that doesn't depend on exact argument order/format
      const errorCalls = (console.error as Mock).mock.calls
      const hasErrorMessage = errorCalls.some((call) =>
        call.some(
          (arg) =>
            typeof arg === 'string' && arg.includes('Failed to create RegExp')
        )
      )
      expect(hasErrorMessage).toBe(true)

      // Restore original functions and mocks
      console.error = originalError
      regexpSpy.mockRestore()
    })
  })

  describe('createRegexFromString', () => {
    it('should create RegExp object from string', () => {
      const input = 'text /abc/i more'
      const result = createRegexFromString(input)
      expect(result).toBeInstanceOf(RegExp)
      expect(result?.source).toBe('abc')
      expect(result?.flags).toBe('i')
    })

    it('should return null when no valid regex found', () => {
      const input = 'text without regex'
      const result = createRegexFromString(input)
      expect(result).toBeNull()
    })
  })

  describe('encodeRegex', () => {
    it('should encode simple regex correctly', () => {
      const input = '/abc/i'
      const result = encodeRegex(input)
      expect(result).toBe('re/abc/i')
    })

    it('should encode regex with special characters', () => {
      const input = '/a[b-c]D+/g'
      const result = encodeRegex(input)
      expect(result).toBe('re/a%5^bb-c%5^d^d%2^b/g')
    })

    it('should encode regex with uppercase letters', () => {
      const input = '/HelloWorld/i'
      const result = encodeRegex(input)
      expect(result).toBe('re/^hello^world/i')
    })

    it('should encode regex with Unicode characters', () => {
      const input = '/你好世界/i'
      const result = encodeRegex(input)
      expect(result).toBe(
        're/%^e4%^b^d%^a0%^e5%^a5%^b^d%^e4%^b8%96%^e7%95%8^c/i'
      )
    })

    it('should encode regex with spaces and commas', () => {
      const input = '/hello, world/i'
      const result = encodeRegex(input)
      expect(result).toBe('re/hello%2^c%20world/i')
    })

    it('should return empty string for invalid input', () => {
      const input = 'not a regex'
      const result = encodeRegex(input)
      expect(result).toBe('')
    })
  })

  describe('decodeRegex', () => {
    it('should decode simple regex correctly', () => {
      const original = '/abc/i'
      const encoded = encodeRegex(original)
      const result = decodeRegex(encoded)
      expect(result).toBe(original)
    })

    it('should decode regex with special characters', () => {
      const original = '/a[b-c]d+/g'
      const encoded = encodeRegex(original)
      const result = decodeRegex(encoded)
      expect(result).toBe(original)
    })

    it('should decode regex with uppercase letters', () => {
      const original = '/HelloWorld/i'
      const encoded = encodeRegex(original)
      const result = decodeRegex(encoded)
      expect(result).toBe(original)
    })

    it('should decode regex with Unicode characters', () => {
      const original = '/你好世界/i'
      const encoded = encodeRegex(original)
      const result = decodeRegex(encoded)
      expect(result).toBe(original)
    })

    it('should decode regex with spaces and commas', () => {
      const original = '/hello, world/i'
      const encoded = encodeRegex(original)
      const result = decodeRegex(encoded)
      expect(result).toBe(original)
    })

    it('should return empty string for invalid format', () => {
      const encoded = 'not-encoded'
      const result = decodeRegex(encoded)
      expect(result).toBe('')
    })

    it('should return empty string for decoding failure', () => {
      const encoded = 're/invalid%/i'
      const result = decodeRegex(encoded)
      expect(result).toBe('')
    })
  })

  describe('createRegexFromEncoded', () => {
    it('should create RegExp object from encoded string', () => {
      const encoded = 're/^a%5^b^b^c%5^d/i'
      const result = createRegexFromEncoded(encoded)
      expect(result).toBeInstanceOf(RegExp)
      expect(result?.source).toBe('A[BC]')
      expect(result?.flags).toBe('i')
    })

    it('should return null when input is invalid', () => {
      const encoded = 'not-encoded'
      const result = createRegexFromEncoded(encoded)
      expect(result).toBeNull()
    })

    it('should handle complete encoding-decoding-creating RegExp process', () => {
      const original = '/complex[pattern].{1,5}$/gim'
      const encoded = encodeRegex(original)
      const result = createRegexFromEncoded(encoded)

      // Create expected RegExp object for comparison
      // eslint-disable-next-line prefer-regex-literals
      const expected = new RegExp('complex[pattern].{1,5}$', 'gim')

      expect(result).toBeInstanceOf(RegExp)
      expect(result?.source).toBe(expected.source)
      expect(result?.flags).toBe(expected.flags)
    })
  })

  describe('Encoding-decoding cycle tests', () => {
    const testCases = [
      '/simple/g',
      '/a[b-c]d+/gi',
      '/\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}/g', // IP address regex
      "/^https?:\\/\\/[\\w\\.-]+(?:\\.[\\w\\.-]+)+[\\w\\-\\._~:\\/?#[\\]@!\\$&'\\(\\)\\*\\+,;=.]+$/g", // URL regex
      '/你好世界/i', // Chinese characters
      '/\\p{Script=Han}/u', // Unicode property
    ]

    for (const [index, testCase] of testCases.entries()) {
      it(`should correctly handle test case ${index + 1}: ${testCase}`, () => {
        const encoded = encodeRegex(testCase)
        const decoded = decodeRegex(encoded)
        expect(decoded).toBe(testCase)

        // Verify encoded result only contains lowercase letters, numbers and /
        const encodedPattern = encoded.slice(3, encoded.lastIndexOf('/'))
        expect(encodedPattern).toMatch(/^[a-z\d^%-_.~!]+$/)
      })
    }
  })
})
