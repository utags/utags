import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FILTER_DELIMITER, DELETED_BOOKMARK_TAG } from '../config/constants.js'
import appConfig from '../config/app-config.js'
import {
  getHostName,
  humanizeUrl,
  cleanFilterString,
  parseFilterString,
  convertToFilterString,
  parseHashFiltersToSearchParams,
  mergeHashFiltersIntoSearchParams,
  transformCollectionPathToQueryParams,
  convertCollectionToFilterParams,
  appendSearchParams,
  removeSearchParams,
  buildTimeQuerySearchParams,
  buildCollectionPath,
  isRunningInDedicatedDomain,
} from './url-utils.js'

// Import appConfig to allow modification in tests

// Mock appConfig before importing url-utils or appConfig itself
vi.mock('../config/app-config.js', () => ({
  __esModule: true, // Important for ES modules
  default: {
    preferQueryString: false, // Default mock value, can be changed per test
    base: '/',
  },
}))

// Define a type for our mock location
type MockLocation = {
  href: string
  origin: string
  assign?: (url: string) => void // For fallback navigation spy
}
let mockLocation: MockLocation

/**
 * Tests for getHostName function
 */
describe('getHostName', () => {
  /**
   * Test with standard HTTP URLs
   */
  it('should extract hostname from standard HTTP URLs', () => {
    // Test with basic HTTP URL
    expect(getHostName('http://example.com')).toBe('example.com')

    // Test with subdomain
    expect(getHostName('http://sub.example.com')).toBe('sub.example.com')

    // Test with port
    expect(getHostName('http://example.com:8080')).toBe('example.com')

    // Test with path
    expect(getHostName('http://example.com/path/to/resource')).toBe(
      'example.com'
    )

    // Test with query parameters
    expect(getHostName('http://example.com?param=value')).toBe('example.com')

    // Test with hash fragment
    expect(getHostName('http://example.com#section')).toBe('example.com')
  })

  /**
   * Test with HTTPS URLs
   */
  it('should extract hostname from HTTPS URLs', () => {
    // Test with basic HTTPS URL
    expect(getHostName('https://example.com')).toBe('example.com')

    // Test with complex HTTPS URL
    expect(
      getHostName('https://sub.domain.example.co.uk:443/path?query=value#hash')
    ).toBe('sub.domain.example.co.uk')
  })

  /**
   * Test with FTP URLs
   */
  it('should extract hostname from FTP URLs', () => {
    // Test with basic FTP URL
    expect(getHostName('ftp://files.example.com')).toBe('files.example.com')

    // Test with authentication
    expect(getHostName('ftp://user:pass@ftp.example.com')).toBe(
      'ftp.example.com'
    )
  })

  /**
   * Test with non-standard protocols
   */
  it('should return protocol for non-standard URL protocols', () => {
    // Test with file protocol
    expect(getHostName('file:///path/to/file.txt')).toBe('file:')

    // Test with mailto protocol
    expect(getHostName('mailto:user@example.com')).toBe('mailto:')

    // Test with data URI
    expect(getHostName('data:text/plain;base64,SGVsbG8gV29ybGQ=')).toBe('data:')

    // Test with custom protocol
    expect(getHostName('custom-protocol://resource')).toBe('custom-protocol:')
  })

  /**
   * Test with international domain names
   */
  it('should handle international domain names correctly', () => {
    // Test with Chinese domain
    expect(getHostName('https://例子.测试')).toBe('xn--fsqu00a.xn--0zwm56d')

    // Test with Cyrillic domain
    expect(getHostName('https://пример.рф')).toBe('xn--e1afmkfd.xn--p1ai')
  })

  /**
   * Test with invalid inputs
   */
  it('should handle invalid inputs gracefully', () => {
    // Test with empty string
    expect(getHostName('')).toBe('')

    // Test with undefined
    expect(getHostName(undefined as unknown as string)).toBe('')

    // Test with invalid URL
    expect(getHostName('not-a-url')).toBe('')

    // Test with malformed URL
    expect(getHostName('http//example.com')).toBe('')
  })

  /**
   * Test with URLs containing authentication
   */
  it('should handle URLs with authentication correctly', () => {
    // Test with basic authentication
    expect(getHostName('https://user:password@example.com')).toBe('example.com')

    // Test with special characters in authentication
    expect(getHostName('https://user@name:p@ssw0rd@example.com')).toBe(
      'example.com'
    )
  })
})

describe('humanizeUrl', () => {
  it('should correctly handle URLs with tracking parameters', () => {
    const url =
      'https://www.example.com/path1/path2/path3?utm_source=test&valid=1#section'
    expect(humanizeUrl(url)).toBe('example.com/path1/.../path3?valid=1#section')
  })

  it('should preserve valid query parameters', () => {
    const url = 'http://example.com?foo=bar&gclid=123&valid=true'
    expect(humanizeUrl(url)).toBe('example.com/?foo=bar&valid=true')
  })

  it('should simplify long paths keeping first and last segments', () => {
    const url = 'https://example.com/a/b/c/d/e'
    expect(humanizeUrl(url)).toBe('example.com/a/.../e')
  })

  it('should preserve hash fragments', () => {
    const url = 'https://example.com#anchor'
    expect(humanizeUrl(url)).toBe('example.com/#anchor')
  })

  it('should return original value for invalid URLs', () => {
    const url = 'invalid-url'
    expect(humanizeUrl(url)).toBe('invalid-url')
  })

  it('should remove trailing slashes', () => {
    const url = 'https://example.com/path/'
    expect(humanizeUrl(url)).toBe('example.com/path')
  })
})

describe('cleanFilterString', () => {
  it('should trim trailing spaces and slashes', () => {
    expect(cleanFilterString('a,b,c/a.com/  ')).toBe('a,b,c/a.com')
  })

  it('should clean pure space endings', () => {
    expect(cleanFilterString('test/   ')).toBe('test')
  })

  it('should handle empty input returning empty string', () => {
    expect(cleanFilterString(undefined)).toBe('')
    expect(cleanFilterString('')).toBe('')
  })

  it('should preserve valid path slashes', () => {
    expect(cleanFilterString('a/b/c')).toBe('a/b/c')
  })

  it('should clean mixed ending delimiters', () => {
    expect(cleanFilterString('  x, y, z  /  /  ')).toBe('x, y, z')
    expect(cleanFilterString('  /  /  ')).toBe('')
  })
})

describe('parseFilterString', () => {
  it('should correctly parse complete parameters', () => {
    const result = parseFilterString(
      'tag1%2Ctag2/example.com%2Ctest.com/keyword%20test'
    )
    expect(result).toEqual({
      searchKeyword: 'keyword test',
      selectedTags: new Set(['tag1', 'tag2']),
      selectedDomains: new Set(['example.com', 'test.com']),
    })
  })

  it('should handle missing tag section', () => {
    const result = parseFilterString('/domain.com/ keyword   test ')
    expect(result).toEqual({
      searchKeyword: 'keyword test',
      selectedTags: new Set([]),
      selectedDomains: new Set(['domain.com']),
    })
  })

  it('should handle missing domain section', () => {
    const result = parseFilterString('tagA%2CtagB//domain.com')
    expect(result).toEqual({
      searchKeyword: 'domain.com',
      selectedTags: new Set(['tagA', 'tagB']),
      selectedDomains: new Set([]),
    })
  })

  it('should handle missing keyword section', () => {
    const result = parseFilterString('tagA%2CtagB/domain.com/')
    expect(result?.searchKeyword).toBe('')
  })

  it('should handle empty string input', () => {
    expect(parseFilterString('')).toBeUndefined()
  })

  it('should decode special characters', () => {
    const result = parseFilterString(
      '%E4%B8%AD%E6%96%87%20tag%2F%ED%95%9C%EA%B5%AD%EC%96%B4%20tag/%E4%B8%AD%E6%96%87.com/key'
    )
    expect(result).toEqual({
      searchKeyword: 'key',
      selectedTags: new Set(['中文 tag/한국어 tag']),
      selectedDomains: new Set(['中文.com']),
    })
  })

  it('should handle invalid URI encoding', () => {
    expect(parseFilterString('invalid%2/example.com/key')).toBeUndefined()
  })

  it('should return undefined when parsing fails', () => {
    expect(parseFilterString('invalid//@#$%^&*()')).toBeUndefined()
  })
})

describe('convertToFilterString', () => {
  it('should handle empty sets and empty keyword', () => {
    expect(convertToFilterString(new Set(), new Set(), '')).toBe('')
  })

  it('should handle tags only', () => {
    expect(
      convertToFilterString(new Set(['tag1', 'tag2']), new Set(), '')
    ).toBe(
      `tag1%2Ctag2${FILTER_DELIMITER}${FILTER_DELIMITER}`.replace(/[/#]+$/, '')
    )
  })

  it('should handle combination of tags and domains', () => {
    expect(
      convertToFilterString(
        new Set(['前端', 'bug']),
        new Set(['example.com', 'test.com']),
        ''
      )
    ).toBe(`%E5%89%8D%E7%AB%AF%2Cbug${FILTER_DELIMITER}example.com%2Ctest.com`)
  })

  it('should handle complete parameters with special characters', () => {
    // Normally tags shouldn't contain ',' or '/' characters
    expect(
      convertToFilterString(
        new Set(['tag,1', 'tag/2']),
        new Set(['domain.com', 'sub.domain']),
        'search keyword'
      )
    ).toBe(
      `tag%2C1%2Ctag%2F2${FILTER_DELIMITER}domain.com%2Csub.domain${FILTER_DELIMITER}search%20keyword`
    )
  })

  it('should trim trailing delimiters', () => {
    expect(convertToFilterString(new Set(), new Set(), '')).toBe('')
    expect(convertToFilterString(new Set(['tag']), new Set(), '')).toBe(`tag`)
  })

  it('should handle mixed empty parameters', () => {
    expect(
      convertToFilterString(new Set(), new Set(['domain']), 'keyword')
    ).toBe(`${FILTER_DELIMITER}domain${FILTER_DELIMITER}keyword`)
  })
})

describe('parseHashFiltersToSearchParams', () => {
  it('should return empty URLSearchParams for empty hash', () => {
    const result = parseHashFiltersToSearchParams('')
    expect(result.toString()).toBe('')
  })

  it('should return empty URLSearchParams for undefined hash', () => {
    const result = parseHashFiltersToSearchParams(undefined)
    expect(result.toString()).toBe('')
  })

  it('should parse single filter string correctly', () => {
    const result = parseHashFiltersToSearchParams(
      'tag1%2Ctag2/example.com/keyword'
    )
    expect(result.get('t')).toBe('tag1,tag2')
    expect(result.get('d')).toBe('example.com')
    expect(result.get('q')).toBe('keyword')
  })

  it('should handle multiple filter strings separated by hash delimiter', () => {
    const result = parseHashFiltersToSearchParams(
      'tag1%2Ctag2/example.com/keyword#tag3/example2.com/keyword2'
    )
    expect(result.getAll('t')).toEqual(['tag1,tag2', 'tag3'])
    expect(result.getAll('d')).toEqual(['example.com', 'example2.com'])
    expect(result.getAll('q')).toEqual(['keyword', 'keyword2'])
  })

  // Test case for Chinese tags and keywords
  it('should handle Chinese tags and keywords', () => {
    const result = parseHashFiltersToSearchParams(
      '%E5%89%8D%E7%AB%AF%2C%E6%B5%8B%E8%AF%95/example.com/%E4%B8%AD%E6%96%87%E5%85%B3%E9%94%AE%E5%AD%97#%E5%90%8E%E7%AB%AF/example.cn/%E6%90%9C%E7%B4%A2'
    )
    expect(result.getAll('t')).toEqual(['前端,测试', '后端'])
    expect(result.getAll('d')).toEqual(['example.com', 'example.cn'])
    expect(result.getAll('q')).toEqual(['中文关键字', '搜索'])
  })

  // Test case for mixed language tags
  it('should handle mixed language tags', () => {
    const result = parseHashFiltersToSearchParams(
      '前端%2Cbug%2C%E3%83%86%E3%82%B9%E3%83%88/example.com/keyword#%ED%95%9C%EA%B8%80/example.co.kr/%ED%82%A4%EC%9B%8C%EB%93%9C'
    )
    expect(result.getAll('t')).toEqual(['前端,bug,テスト', '한글'])
    expect(result.getAll('d')).toEqual(['example.com', 'example.co.kr'])
    expect(result.getAll('q')).toEqual(['keyword', '키워드'])
  })

  it('should handle missing tags section', () => {
    const result = parseHashFiltersToSearchParams('/example.com/keyword')
    expect(result.get('t')).toBeNull()
    expect(result.get('d')).toBe('example.com')
    expect(result.get('q')).toBe('keyword')
  })

  it('should handle missing domains section', () => {
    const result = parseHashFiltersToSearchParams('tag1%2Ctag2//keyword')
    expect(result.get('t')).toBe('tag1,tag2')
    expect(result.get('d')).toBeNull()
    expect(result.get('q')).toBe('keyword')
  })

  it('should handle missing keyword section', () => {
    const result = parseHashFiltersToSearchParams('tag1%2Ctag2/example.com/')
    expect(result.get('t')).toBe('tag1,tag2')
    expect(result.get('d')).toBe('example.com')
    expect(result.get('q')).toBeNull()
  })

  it('should handle empty sections', () => {
    const result = parseHashFiltersToSearchParams('//')
    expect(result.get('t')).toBeNull()
    expect(result.get('d')).toBeNull()
    expect(result.get('q')).toBeNull()
  })

  it('should handle whitespace-only hash', () => {
    const result = parseHashFiltersToSearchParams('   ')
    expect(result.toString()).toBe('')
  })

  it('should handle malformed filter strings', () => {
    const result = parseHashFiltersToSearchParams('///invalid-filter-string')
    expect(result.toString()).toBe('')
  })
})

/**
 * Tests for mergeHashFiltersIntoSearchParams function
 */
describe('mergeHashFiltersIntoSearchParams', () => {
  /**
   * Test with URL having no existing search parameters
   */
  it('should merge hash filters into empty search parameters', () => {
    // Test URL with hash filters but no search parameters
    const url = 'https://example.com#tag1%2Ctag2/example.com/keyword'

    // Get merged search parameters
    const result = mergeHashFiltersIntoSearchParams(url)

    // Verify the result contains the hash filters
    expect(result.get('t')).toBe('tag1,tag2')
    expect(result.get('d')).toBe('example.com')
    expect(result.get('q')).toBe('keyword')
  })

  /**
   * Test with URL having existing search parameters
   */
  it('should merge hash filters with existing search parameters', () => {
    // Test URL with both search parameters and hash filters
    const url =
      'https://example.com?existing=param#tag1%2Ctag2/example.com/keyword'

    // Get merged search parameters
    const result = mergeHashFiltersIntoSearchParams(url)

    // Verify the result contains both existing parameters and hash filters
    expect(result.get('existing')).toBe('param')
    expect(result.get('t')).toBe('tag1,tag2')
    expect(result.get('d')).toBe('example.com')
    expect(result.get('q')).toBe('keyword')
  })

  /**
   * Test with URL having multiple hash filters
   */
  it('should handle multiple hash filters separated by hash delimiter', () => {
    // Test URL with multiple hash filters
    const url =
      'https://example.com#tag1%2Ctag2/example.com/keyword1#tag3%2Ctag4/example.org/keyword2'

    // Get merged search parameters
    const result = mergeHashFiltersIntoSearchParams(url)

    // Verify the result contains all hash filters
    expect(result.getAll('t')).toEqual(['tag1,tag2', 'tag3,tag4'])
    expect(result.getAll('d')).toEqual(['example.com', 'example.org'])
    expect(result.getAll('q')).toEqual(['keyword1', 'keyword2'])
  })

  /**
   * Test with URL having both existing search parameters and multiple hash filters
   */
  it('should merge multiple hash filters with existing search parameters', () => {
    // Test URL with both search parameters and multiple hash filters
    const url =
      'https://example.com?existing=param&t=existing_tag#tag1%2Ctag2/example.com/keyword1#tag3%2Ctag4/example.org/keyword2'

    // Get merged search parameters
    const result = mergeHashFiltersIntoSearchParams(url)

    // Verify the result contains both existing parameters and all hash filters
    expect(result.get('existing')).toBe('param')
    expect(result.getAll('t')).toEqual([
      'existing_tag',
      'tag1,tag2',
      'tag3,tag4',
    ])
    expect(result.getAll('d')).toEqual(['example.com', 'example.org'])
    expect(result.getAll('q')).toEqual(['keyword1', 'keyword2'])
  })

  /**
   * Test with URL having no hash part
   */
  it('should return original search parameters when URL has no hash', () => {
    // Test URL with search parameters but no hash
    const url = 'https://example.com?param1=value1&param2=value2'

    // Get merged search parameters
    const result = mergeHashFiltersIntoSearchParams(url)

    // Verify the result contains only the original search parameters
    expect(result.get('param1')).toBe('value1')
    expect(result.get('param2')).toBe('value2')
    expect(result.has('t')).toBe(false)
    expect(result.has('d')).toBe(false)
    expect(result.has('q')).toBe(false)
  })

  /**
   * Test with URL having empty hash
   */
  it('should handle URL with empty hash', () => {
    // Test URL with empty hash
    const url = 'https://example.com?param=value#'

    // Get merged search parameters
    const result = mergeHashFiltersIntoSearchParams(url)

    // Verify the result contains only the original search parameters
    expect(result.get('param')).toBe('value')
    expect(result.has('t')).toBe(false)
    expect(result.has('d')).toBe(false)
    expect(result.has('q')).toBe(false)
  })

  /**
   * Test with URL having invalid hash filters
   */
  it('should handle URL with invalid hash filters', () => {
    // Test URL with invalid hash filters
    const url = 'https://example.com?param=value#///invalid-filter-format'

    // Get merged search parameters
    const result = mergeHashFiltersIntoSearchParams(url)

    // Verify the result contains only the original search parameters
    expect(result.get('param')).toBe('value')
    expect(result.has('t')).toBe(false)
    expect(result.has('d')).toBe(false)
    expect(result.has('q')).toBe(false)
  })

  /**
   * Test with URL having international characters in hash filters
   */
  it('should handle URL with international characters in hash filters', () => {
    // Test URL with international characters in hash filters
    const url =
      'https://example.com#%E6%B5%8B%E8%AF%95%2C%E6%A0%87%E7%AD%BE/%E4%BE%8B%E5%AD%90.%E6%B5%8B%E8%AF%95/%E5%85%B3%E9%94%AE%E8%AF%8D'

    // Get merged search parameters
    const result = mergeHashFiltersIntoSearchParams(url)

    // Verify the result contains the correctly decoded hash filters
    expect(result.get('t')).toBe('测试,标签')
    expect(result.get('d')).toBe('例子.测试')
    expect(result.get('q')).toBe('关键词')
  })

  /**
   * Test with URL having partial hash filters
   */
  it('should handle URL with partial hash filters', () => {
    // Test URL with only tags in hash filters
    const url1 = 'https://example.com#tag1%2Ctag2//'
    const result1 = mergeHashFiltersIntoSearchParams(url1)
    expect(result1.get('t')).toBe('tag1,tag2')
    expect(result1.has('d')).toBe(false)
    expect(result1.has('q')).toBe(false)

    // Test URL with only domains in hash filters
    const url2 = 'https://example.com#/example.com/'
    const result2 = mergeHashFiltersIntoSearchParams(url2)
    expect(result2.has('t')).toBe(false)
    expect(result2.get('d')).toBe('example.com')
    expect(result2.has('q')).toBe(false)

    // Test URL with only keyword in hash filters
    const url3 = 'https://example.com#//keyword'
    const result3 = mergeHashFiltersIntoSearchParams(url3)
    expect(result3.has('t')).toBe(false)
    expect(result3.has('d')).toBe(false)
    expect(result3.get('q')).toBe('keyword')
  })

  /**
   * Test with complex URL scenario
   */
  it('should handle complex URL scenario with multiple parameters and filters', () => {
    // Test complex URL with multiple search parameters and hash filters
    const url =
      'https://example.com/path?param1=value1&t=existing_tag&d=existing_domain&q=existing_keyword#tag1%2Ctag2/domain1%2Cdomain2/keyword1#tag3/domain3/keyword2'

    // Get merged search parameters
    const result = mergeHashFiltersIntoSearchParams(url)

    // Verify the result contains all parameters correctly merged
    expect(result.get('param1')).toBe('value1')
    expect(result.getAll('t')).toEqual(['existing_tag', 'tag1,tag2', 'tag3'])
    expect(result.getAll('d')).toEqual([
      'existing_domain',
      'domain1,domain2',
      'domain3',
    ])
    expect(result.getAll('q')).toEqual([
      'existing_keyword',
      'keyword1',
      'keyword2',
    ])
  })
})

describe('transformCollectionPathToQueryParams', () => {
  /**
   * Tests for basic collection URL patterns
   */
  describe('Basic collection URL patterns', () => {
    it('should transform /collections/{collection-id} to ?collection={collection-id}', () => {
      const input = 'https://example.com/collections/my-collection'
      const expected = 'https://example.com/?collection=my-collection'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })

    it('should transform /c/{collection-id} to ?collection={collection-id}', () => {
      const input = 'https://example.com/c/my-collection'
      const expected = 'https://example.com/?collection=my-collection'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })

    it('should handle collection with special characters', () => {
      const input =
        'https://example.com/collections/my-collection%20with%20spaces'
      const expected =
        'https://example.com/?collection=my-collection20with20spaces'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })
  })

  /**
   * Tests for visibility collection URL patterns
   */
  describe('Visibility collection URL patterns', () => {
    it('should transform /collections/shared/{collection-id} to ?collection={collection-id}&v=shared', () => {
      const input = 'https://example.com/collections/shared/shared-collection'
      const expected =
        'https://example.com/?collection=shared-collection&v=shared'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })

    it('should transform /c/shared/{collection-id} to ?collection={collection-id}&v=shared', () => {
      const input = 'https://example.com/c/shared/shared-collection'
      const expected =
        'https://example.com/?collection=shared-collection&v=shared'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })

    it('should transform /collections/public/{collection-id} to ?collection={collection-id}&v=public', () => {
      const input = 'https://example.com/collections/public/public-collection'
      const expected =
        'https://example.com/?collection=public-collection&v=public'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })

    it('should transform /c/public/{collection-id} to ?collection={collection-id}&v=public', () => {
      const input = 'https://example.com/c/public/public-collection'
      const expected =
        'https://example.com/?collection=public-collection&v=public'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })

    it('should transform /collections/private/{collection-id} to ?collection={collection-id}&v=private', () => {
      const input = 'https://example.com/collections/private/private-collection'
      const expected =
        'https://example.com/?collection=private-collection&v=private'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })

    it('should transform /c/private/{collection-id} to ?collection={collection-id}&v=private', () => {
      const input = 'https://example.com/c/private/private-collection'
      const expected =
        'https://example.com/?collection=private-collection&v=private'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })
  })

  /**
   * Tests for URLs with existing query parameters
   */
  describe('URLs with existing query parameters', () => {
    it('should preserve existing query parameters', () => {
      const input =
        'https://example.com/collections/my-collection?sort=name&order=asc'
      const expected =
        'https://example.com/?collection=my-collection&sort=name&order=asc'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })

    it('should place collection and shared parameters before existing parameters', () => {
      const input =
        'https://example.com/c/shared/shared-collection?sort=name&order=asc'
      const expected =
        'https://example.com/?collection=shared-collection&v=shared&sort=name&order=asc'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })
  })

  /**
   * Tests for URLs with remaining path segments
   */
  describe('URLs with remaining path segments', () => {
    it('should preserve remaining path segments', () => {
      const input = 'https://example.com/collections/my-collection/extra/path'
      const expected = 'https://example.com/extra/path?collection=my-collection'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })

    it('should handle shared collections with remaining path segments', () => {
      const input = 'https://example.com/c/shared/shared-collection/extra/path'
      const expected =
        'https://example.com/extra/path?collection=shared-collection&v=shared'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })

    it('should handle remaining path segments with existing query parameters', () => {
      const input =
        'https://example.com/collections/my-collection/extra/path?sort=name'
      const expected =
        'https://example.com/extra/path?collection=my-collection&sort=name'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })
  })

  /**
   * Tests for edge cases and non-matching URLs
   */
  describe('Edge cases and non-matching URLs', () => {
    it('should return original URL for non-matching paths', () => {
      const input = 'https://example.com/some/other/path'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(input)
    })

    it('should handle URLs with hash fragments', () => {
      const input = 'https://example.com/collections/my-collection#section1'
      const expected = 'https://example.com/?collection=my-collection#section1'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })

    /**
     * Tests for URLs with both query parameters and hash fragments
     */
    describe('URLs with both query parameters and hash fragments', () => {
      it('should handle URLs with both query parameters and hash fragments', () => {
        const input =
          'https://example.com/c/shared/shared-collection?sort=name#section1'
        const expected =
          'https://example.com/?collection=shared-collection&v=shared&sort=name#section1'

        const result = transformCollectionPathToQueryParams(input)

        expect(result).toBe(expected)
      })

      it('should handle URLs with public visibility, query parameters and hash fragments', () => {
        const input =
          'https://example.com/collections/public/public-collection?sort=name#section1'
        const expected =
          'https://example.com/?collection=public-collection&v=public&sort=name#section1'

        const result = transformCollectionPathToQueryParams(input)

        expect(result).toBe(expected)
      })
    })

    it('should handle URLs with empty collection IDs', () => {
      const input = 'https://example.com/collections/'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(input)
    })

    it('should handle URLs with collection parameter in singular form', () => {
      const input = 'https://example.com/collection/my-collection'
      const expected = 'https://example.com/?collection=my-collection'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })
  })

  /**
   * Tests for protocol and domain variations
   */
  describe('Protocol and domain variations', () => {
    it('should work with different protocols', () => {
      const input = 'http://example.com/collections/my-collection'
      const expected = 'http://example.com/?collection=my-collection'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })

    it('should work with different domains', () => {
      const input = 'https://sub.domain.example.com/collections/my-collection'
      const expected =
        'https://sub.domain.example.com/?collection=my-collection'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })

    it('should work with URLs that have ports', () => {
      const input = 'https://example.com:8080/collections/my-collection'
      const expected = 'https://example.com:8080/?collection=my-collection'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })
  })

  /**
   * Tests for complex scenarios
   */
  describe('Complex scenarios', () => {
    it('should handle complex collection IDs with special characters', () => {
      const input =
        'https://example.com/collections/my-collection+with@special_chars'
      const expected =
        'https://example.com/?collection=my-collectionwithspecial_chars'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })

    it('should handle URLs with multiple path segments after collection ID', () => {
      const input =
        'https://example.com/collections/my-collection/segment1/segment2/segment3'
      const expected =
        'https://example.com/segment1/segment2/segment3?collection=my-collection'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })

    it('should handle URLs with multiple query parameters and complex values', () => {
      const input =
        'https://example.com/c/shared/my-collection?param1=value1&param2=value2&param3=value3'
      const expected =
        'https://example.com/?collection=my-collection&v=shared&param1=value1&param2=value2&param3=value3'

      const result = transformCollectionPathToQueryParams(input)

      expect(result).toBe(expected)
    })
  })
})

/**
 * Tests for convertCollectionToFilterParams function
 */
describe('convertCollectionToFilterParams', () => {
  // Mock the collections module
  vi.mock('../stores/collections', () => ({
    getFilterStringByPathname(collectionId: string) {
      if (collectionId === 'my-collection') {
        return 't=tag1,tag2&d=example.com&q=keyword'
      }

      if (collectionId === 'empty-collection') {
        return 'foo=bar'
      }

      return null // Collection doesn't exist
    },
  }))

  /**
   * Test with existing collection
   */
  it('should convert collection parameter to filter parameters when collection exists', () => {
    // Create search params with collection parameter
    const searchParams = new URLSearchParams('collection=my-collection')

    // Convert collection to filter parameters
    const result = convertCollectionToFilterParams(searchParams)

    // Verify filter parameters
    expect(result.get('t')).toBe('tag1,tag2')
    expect(result.get('d')).toBe('example.com')
    expect(result.get('q')).toBe('keyword')
    expect(result.has('collection')).toBe(false)
  })

  /**
   * Test with non-existent collection
   */
  it('should handle non-existent collection by adding special domain filters', () => {
    // Create search params with non-existent collection
    const searchParams = new URLSearchParams('collection=non-existent')

    // Convert collection to filter parameters
    const result = convertCollectionToFilterParams(searchParams)

    // Verify special domain filters are added
    expect(result.getAll('d')).toEqual([
      'unexisted-collection.com',
      'unexisted-collection.org',
    ])
    expect(result.has('collection')).toBe(false)
  })

  it('should not process filter string when collection is "deleted"', () => {
    const searchParams = new URLSearchParams('collection=deleted')

    // Convert collection to filter parameters
    const result = convertCollectionToFilterParams(searchParams)

    // Verify no filter parameters are added
    expect(result.get('t')).toBe(DELETED_BOOKMARK_TAG)
    expect(result.has('d')).toBe(false)
    expect(result.has('q')).toBe(false)
    expect(result.has('c')).toBe(false)
    expect(result.has('collection')).toBe(false)
  })

  /**
   * Test with empty collection filter string
   */
  it('should handle empty collection filter string', () => {
    // Create search params with collection that returns empty filter string
    const searchParams = new URLSearchParams('collection=empty-collection')

    // Convert collection to filter parameters
    const result = convertCollectionToFilterParams(searchParams)

    // Verify no filter parameters are added
    expect(result.has('t')).toBe(false)
    expect(result.has('d')).toBe(false)
    expect(result.has('q')).toBe(false)
    expect(result.has('collection')).toBe(false)
  })

  /**
   * Test with shared collection
   */
  it('should preserve shared parameter when processing collection', () => {
    // Create search params with collection and shared parameters
    const searchParams = new URLSearchParams(
      'collection=my-collection&v=shared'
    )

    // Convert collection to filter parameters
    const result = convertCollectionToFilterParams(searchParams)

    // Verify filter parameters and shared parameter
    // expect(result.get('t')).toBe('tag1,tag2')
    // expect(result.get('d')).toBe('example.com')
    // expect(result.get('q')).toBe('keyword')
    expect(result.get('c')).toBe('my-collection')
    expect(result.get('v')).toBe('shared')
    expect(result.has('collection')).toBe(false)
  })

  /**
   * Test with additional parameters
   */
  it('should preserve additional parameters when processing collection', () => {
    // Create search params with collection and additional parameters
    const searchParams = new URLSearchParams(
      'collection=my-collection&param1=value1&param2=value2'
    )

    // Convert collection to filter parameters
    const result = convertCollectionToFilterParams(searchParams)

    // Verify filter parameters and additional parameters
    expect(result.get('t')).toBe('tag1,tag2')
    expect(result.get('d')).toBe('example.com')
    expect(result.get('q')).toBe('keyword')
    expect(result.get('param1')).toBe('value1')
    expect(result.get('param2')).toBe('value2')
    expect(result.has('collection')).toBe(false)

    // Verify parameter order
    expect(Array.from(result.keys())).toEqual([
      't',
      'd',
      'q',
      'param1',
      'param2',
    ])
  })

  it('should handle empty collection parameter', () => {
    const searchParams = new URLSearchParams('collection=')
    const result = convertCollectionToFilterParams(searchParams)

    expect(result.has('t')).toBe(false)
    expect(result.has('d')).toBe(false)
    expect(result.has('q')).toBe(false)
    expect(result.has('collection')).toBe(false)
  })

  /**
   * Test with no collection parameter
   */
  it('should return empty URLSearchParams when no collection parameter is provided', () => {
    // Create search params without collection parameter
    const searchParams = new URLSearchParams('param=value')

    // Convert collection to filter parameters
    const result = convertCollectionToFilterParams(searchParams)

    // Verify original parameters are preserved
    expect(result.get('param')).toBe('value')
    expect(result.has('collection')).toBe(false)
  })

  /**
   * Test with empty URLSearchParams
   */
  it('should handle empty URLSearchParams', () => {
    // Create empty search params
    const searchParams = new URLSearchParams()

    // Convert collection to filter parameters
    const result = convertCollectionToFilterParams(searchParams)

    // Verify result is empty
    expect(Array.from(result.entries()).length).toBe(0)
  })
})

/**
 * Tests for appendSearchParams function
 */
describe('appendSearchParams', () => {
  // Test case 1: Appending a string to URLSearchParams
  it('should append string params to URLSearchParams', () => {
    const original = new URLSearchParams('a=1&b=2')
    const newParams = 'c=3&a=4' // 'a' is a duplicate key
    const result = appendSearchParams(original, newParams)
    expect(result.toString()).toBe('a=1&b=2&c=3&a=4')
    expect(result.getAll('a')).toEqual(['1', '4'])
  })

  // Test case 2: Appending a record (object) to a string
  it('should append record params to a string', () => {
    const originalStr = 'x=10'
    const newRecord = { y: '20', z: '30' }
    const result = appendSearchParams(originalStr, newRecord)
    expect(result.toString()).toBe('x=10&y=20&z=30')
  })

  // Test case 3: Appending URLSearchParams to URLSearchParams
  it('should append URLSearchParams to URLSearchParams', () => {
    const params1 = new URLSearchParams('foo=bar')
    const params2 = new URLSearchParams('baz=qux&foo=another') // 'foo' is a duplicate key
    const result = appendSearchParams(params1, params2)
    expect(result.toString()).toBe('foo=bar&baz=qux&foo=another')
    expect(result.getAll('foo')).toEqual(['bar', 'another'])
  })

  // Test case 4: Appending to empty original URLSearchParams
  it('should append to empty original URLSearchParams', () => {
    const original = new URLSearchParams()
    const newParams = 'a=1&b=2'
    const result = appendSearchParams(original, newParams)
    expect(result.toString()).toBe('a=1&b=2')
  })

  // Test case 5: Appending to empty original string
  it('should append to empty original string params', () => {
    const originalStr = ''
    const newParams = { a: '1', b: '2' }
    const result = appendSearchParams(originalStr, newParams)
    expect(result.toString()).toBe('a=1&b=2')
  })

  // Test case 6: Appending empty new URLSearchParams
  it('should return original when appending empty new URLSearchParams', () => {
    const original = new URLSearchParams('a=1')
    const newParams = new URLSearchParams()
    const result = appendSearchParams(original, newParams)
    expect(result.toString()).toBe('a=1')
  })

  // Test case 7: Appending empty new string params
  it('should return original when appending empty new string params', () => {
    const original = new URLSearchParams('a=1')
    const newParams = ''
    const result = appendSearchParams(original, newParams)
    expect(result.toString()).toBe('a=1')
  })

  // Test case 8: Appending empty new record params
  it('should return original when appending empty new record params', () => {
    const original = new URLSearchParams('a=1')
    const newParams = {}
    const result = appendSearchParams(original, newParams)
    expect(result.toString()).toBe('a=1')
  })

  // Test case 9: Appending params with special characters
  it('should handle special characters in keys and values', () => {
    const original = new URLSearchParams('name=John Doe')
    const newParams = {
      email: 'john.doe@example.com',
      tags: 'tag1,tag2 with space',
    }
    const result = appendSearchParams(original, newParams)
    expect(result.get('name')).toBe('John Doe')
    expect(result.get('email')).toBe('john.doe@example.com')
    expect(result.get('tags')).toBe('tag1,tag2 with space')
    // URLSearchParams automatically encodes spaces to '+' or %20 depending on context,
    // toString() usually uses '+', but direct comparison is fine.
    expect(result.toString()).toBe(
      'name=John+Doe&email=john.doe%40example.com&tags=tag1%2Ctag2+with+space'
    )
  })

  // Test case 10: All inputs are empty
  it('should return empty when all inputs are empty', () => {
    const result1 = appendSearchParams('', '')
    expect(result1.toString()).toBe('')

    const result2 = appendSearchParams(new URLSearchParams(), {})
    expect(result2.toString()).toBe('')
  })

  // Test case 11: Original params is a Record
  it('should handle original params as a Record', () => {
    const originalRecord = { a: '1', b: '2' }
    const newParams = 'c=3&d=4'
    const result = appendSearchParams(originalRecord, newParams)
    expect(result.toString()).toBe('a=1&b=2&c=3&d=4')
  })

  // Test case 12: New params is a Record, original is URLSearchParams
  it('should handle new params as a Record with original as URLSearchParams', () => {
    const original = new URLSearchParams('a=1')
    const newRecord = { b: '2', c: '3' }
    const result = appendSearchParams(original, newRecord)
    expect(result.toString()).toBe('a=1&b=2&c=3')
  })
})

/**
 * Tests for removeSearchParams function
 */
describe('removeSearchParams', () => {
  // Test case 1: Removing keys from URLSearchParams (Example 1 from JSDoc)
  it('should remove specified keys from URLSearchParams', () => {
    const original = new URLSearchParams('a=1&b=2&c=3&b=4')
    const keysToRemove = ['b', 'd'] // 'd' does not exist, will be ignored
    const result = removeSearchParams(original, keysToRemove)
    expect(result.toString()).toBe('a=1&c=3')
  })

  // Test case 2: Removing keys from a string (Example 2 from JSDoc)
  it('should remove specified keys from a query string', () => {
    const originalStr = 'x=10&y=20&z=30'
    const keysToRemove = ['y']
    const result = removeSearchParams(originalStr, keysToRemove)
    expect(result.toString()).toBe('x=10&z=30')
  })

  // Test case 3: Removing keys from a Record (Example 3 from JSDoc)
  it('should remove specified keys from a Record', () => {
    const originalRecord = { foo: 'bar', baz: 'qux', key: 'value' }
    const keysToRemove = ['baz', 'nonExistentKey']
    const result = removeSearchParams(originalRecord, keysToRemove)
    expect(result.toString()).toBe('foo=bar&key=value')
  })

  // Test case 4: Removing all keys (Example 4 from JSDoc)
  it('should remove all keys if specified', () => {
    const original = new URLSearchParams('a=1&b=2')
    const keysToRemove = ['a', 'b']
    const result = removeSearchParams(original, keysToRemove)
    expect(result.toString()).toBe('')
  })

  // Test case 5: Empty keysToRemove array (Example 5 from JSDoc)
  it('should return original params if keysToRemove is empty', () => {
    const original = new URLSearchParams('a=1&b=2')
    const keysToRemove: string[] = []
    const result = removeSearchParams(original, keysToRemove)
    expect(result.toString()).toBe('a=1&b=2')
  })

  // Test case 6: Removing non-existent keys
  it('should handle removal of non-existent keys gracefully', () => {
    const original = new URLSearchParams('a=1&b=2')
    const keysToRemove = ['c', 'd']
    const result = removeSearchParams(original, keysToRemove)
    expect(result.toString()).toBe('a=1&b=2')
  })

  // Test case 7: Removing keys from empty URLSearchParams
  it('should return empty if original URLSearchParams is empty', () => {
    const original = new URLSearchParams()
    const keysToRemove = ['a']
    const result = removeSearchParams(original, keysToRemove)
    expect(result.toString()).toBe('')
  })

  // Test case 8: Removing keys when orgSearchParams is an empty string
  it('should return empty if original params string is empty', () => {
    const originalStr = ''
    const keysToRemove = ['a']
    const result = removeSearchParams(originalStr, keysToRemove)
    expect(result.toString()).toBe('')
  })

  // Test case 9: Removing keys when orgSearchParams is an empty Record
  it('should return empty if original params Record is empty', () => {
    const originalRecord = {}
    const keysToRemove = ['a']
    const result = removeSearchParams(originalRecord, keysToRemove)
    expect(result.toString()).toBe('')
  })

  // Test case 10: Removing a key that has multiple values
  it('should remove all instances of a key with multiple values', () => {
    const original = new URLSearchParams('a=1&b=2&a=3&c=4&a=5')
    const keysToRemove = ['a']
    const result = removeSearchParams(original, keysToRemove)
    expect(result.toString()).toBe('b=2&c=4')
    expect(result.has('a')).toBe(false)
  })

  // Test case 11: Removing multiple keys, some with multiple values
  it('should remove multiple keys, some having multiple values', () => {
    const original = new URLSearchParams('a=1&b=2&a=3&c=4&b=5&d=6')
    const keysToRemove = ['a', 'b']
    const result = removeSearchParams(original, keysToRemove)
    expect(result.toString()).toBe('c=4&d=6')
    expect(result.has('a')).toBe(false)
    expect(result.has('b')).toBe(false)
  })

  // Test case 12: Ensure original URLSearchParams object is not modified
  it('should not modify the original URLSearchParams object', () => {
    const original = new URLSearchParams('a=1&b=2')
    const keysToRemove = ['b']
    removeSearchParams(original, keysToRemove) // Call the function
    // Check if the original object remains unchanged
    expect(original.toString()).toBe('a=1&b=2')
  })

  // Test case 13: Ensure original Record object is not modified (though it's passed by value for primitives, objects are by reference)
  // URLSearchParams constructor creates a new object, so original record is safe.
  it('should not modify the original Record object', () => {
    const originalRecord = { a: '1', b: '2' }
    const keysToRemove = ['b']
    removeSearchParams(originalRecord, keysToRemove) // Call the function
    // Check if the original record remains unchanged
    expect(originalRecord).toEqual({ a: '1', b: '2' })
  })
})

/**
 * Tests for buildTimeQuerySearchParams function
 */
describe('buildTimeQuerySearchParams', () => {
  // Test case 1: Adding time filters to existing params (Example 1 from JSDoc)
  it('should add time and period to existing URLSearchParams', () => {
    const original = new URLSearchParams('filter=active')
    const result = buildTimeQuerySearchParams(original, 'created', '7d')
    expect(result.toString()).toBe('filter=active&time=created&period=7d')
  })

  // Test case 2: Overwriting existing time filters (Example 2 from JSDoc)
  it('should overwrite existing time and period parameters', () => {
    const originalWithTime = new URLSearchParams(
      'time=created&period=3m&user=john'
    )
    const result = buildTimeQuerySearchParams(originalWithTime, 'updated', '1m')
    // URLSearchParams sorts keys alphabetically, so 'period' might come before 'time' or 'user'
    const resultMap = new Map(result.entries())
    expect(resultMap.get('user')).toBe('john')
    expect(resultMap.get('time')).toBe('updated')
    expect(resultMap.get('period')).toBe('1m')
    expect(result.getAll('time').length).toBe(1) // Ensure only one time param
    expect(result.getAll('period').length).toBe(1) // Ensure only one period param
  })

  // Test case 3: Using default values (Example 3 from JSDoc)
  it('should use default time and period if not provided', () => {
    const originalStr = 'q=searchterm'
    const result = buildTimeQuerySearchParams(originalStr)
    expect(result.toString()).toBe('q=searchterm&time=updated&period=1m')
  })

  // Test case 4: Starting with empty params (Example 4 from JSDoc)
  it('should build params correctly when original params are empty string', () => {
    const result = buildTimeQuerySearchParams('', 'created', '2w')
    expect(result.toString()).toBe('time=created&period=2w')
  })

  // Test case 5: Starting with empty URLSearchParams object
  it('should build params correctly when original params are an empty URLSearchParams object', () => {
    const original = new URLSearchParams()
    const result = buildTimeQuerySearchParams(original, 'created', '14d')
    expect(result.toString()).toBe('time=created&period=14d')
  })

  // Test case 6: Starting with empty Record object
  it('should build params correctly when original params are an empty Record', () => {
    const original: Record<string, string> = {}
    const result = buildTimeQuerySearchParams(original, 'updated', '30d')
    expect(result.toString()).toBe('time=updated&period=30d')
  })

  // Test case 7: Using 'created' for time parameter
  it('should correctly set time to "created"', () => {
    const original = new URLSearchParams('filter=new')
    const result = buildTimeQuerySearchParams(original, 'created', '1y')
    expect(result.toString()).toBe('filter=new&time=created&period=1y')
  })

  // Test case 8: Using different period value
  it('should correctly set a custom period', () => {
    const original = new URLSearchParams('status=pending')
    const result = buildTimeQuerySearchParams(original, 'updated', '6m')
    expect(result.toString()).toBe('status=pending&time=updated&period=6m')
  })

  // Test case 9: Original params as a Record
  it('should handle original params as a Record<string, string>', () => {
    const originalRecord = { user: 'test', type: 'report' }
    const result = buildTimeQuerySearchParams(originalRecord, 'created', '1w')
    const resultMap = new Map(result.entries())
    expect(resultMap.get('user')).toBe('test')
    expect(resultMap.get('type')).toBe('report')
    expect(resultMap.get('time')).toBe('created')
    expect(resultMap.get('period')).toBe('1w')
  })

  // Test case 10: Original params as a query string with existing time/period
  it('should overwrite time/period in a query string', () => {
    const originalStr = 'item=book&time=created&period=1y'
    const result = buildTimeQuerySearchParams(originalStr, 'updated', '1d')
    const resultMap = new Map(result.entries())
    expect(resultMap.get('item')).toBe('book')
    expect(resultMap.get('time')).toBe('updated')
    expect(resultMap.get('period')).toBe('1d')
  })

  // Test case 11: Ensure original URLSearchParams object is not modified
  it('should not modify the original URLSearchParams object', () => {
    const original = new URLSearchParams('a=1&time=old&period=oldP')
    buildTimeQuerySearchParams(original, 'updated', 'newP') // Call the function
    // Check if the original object remains unchanged
    expect(original.toString()).toBe('a=1&time=old&period=oldP')
  })

  // Test case 12: Ensure original Record object is not modified
  it('should not modify the original Record object', () => {
    const originalRecord = { a: '1', time: 'old', period: 'oldP' }
    buildTimeQuerySearchParams(originalRecord, 'updated', 'newP') // Call the function
    // Check if the original record remains unchanged
    expect(originalRecord).toEqual({ a: '1', time: 'old', period: 'oldP' })
  })

  // Test case 13: Params with special characters (should be preserved)
  it('should preserve other parameters with special characters', () => {
    const original = new URLSearchParams('query=a%26b%3Dc&filter=active')
    const result = buildTimeQuerySearchParams(original, 'created', '7d')
    const resultMap = new Map(result.entries())
    expect(resultMap.get('query')).toBe('a&b=c') // Decoded value
    expect(resultMap.get('filter')).toBe('active')
    expect(resultMap.get('time')).toBe('created')
    expect(resultMap.get('period')).toBe('7d')
    expect(result.toString()).toBe(
      'query=a%26b%3Dc&filter=active&time=created&period=7d'
    )
  })
})

/**
 * Tests for buildCollectionPath function
 */
describe('buildCollectionPath', () => {
  // Test suite for preferQueryString = true
  describe('when preferQueryString is true', () => {
    beforeEach(() => {
      // @ts-expect-error - allow modification for testing as it's a mock
      appConfig.preferQueryString = true
    })

    it('should build query string with collectionId only', () => {
      expect(buildCollectionPath('my-notes')).toBe('/?collection=my-notes')
    })

    it('should build query string with collectionId and valid visibility', () => {
      expect(buildCollectionPath('shared-docs', 'shared')).toBe(
        '/?collection=shared-docs&v=shared'
      )
      expect(buildCollectionPath('public-gallery', 'public')).toBe(
        '/?collection=public-gallery&v=public'
      )
      expect(buildCollectionPath('private-stuff', 'private')).toBe(
        '/?collection=private-stuff&v=private'
      )
    })

    it('should build query string with collectionId and ignore invalid visibility', () => {
      expect(buildCollectionPath('my-notes', 'invalid')).toBe(
        '/?collection=my-notes'
      )
      expect(buildCollectionPath('my-notes', '')).toBe('/?collection=my-notes')
    })

    it('should URL-encode collectionId with special characters for query string', () => {
      expect(buildCollectionPath('special/chars&id=val')).toBe(
        '/?collection=specialcharsidval'
      )
      // URLSearchParams encodes space as '+'
      expect(buildCollectionPath('id with spaces')).toBe(
        '/?collection=idwithspaces'
      )
    })

    it('should handle empty collectionId for query string', () => {
      expect(buildCollectionPath('')).toBe('/')
    })
  })

  // Test suite for preferQueryString = false
  describe('when preferQueryString is false', () => {
    beforeEach(() => {
      // @ts-expect-error - allow modification for testing as it's a mock
      appConfig.preferQueryString = false
    })

    it('should build path with collectionId only', () => {
      expect(buildCollectionPath('my-work')).toBe('/c/my-work')
    })

    it('should build path with collectionId and valid visibility', () => {
      expect(buildCollectionPath('project-alpha', 'private')).toBe(
        '/c/private/project-alpha'
      )
      expect(buildCollectionPath('gallery-main', 'public')).toBe(
        '/c/public/gallery-main'
      )
      expect(buildCollectionPath('team-files', 'shared')).toBe(
        '/c/shared/team-files'
      )
    })

    it('should build path with collectionId and ignore invalid visibility', () => {
      expect(buildCollectionPath('my-work', 'other')).toBe('/c/my-work')
      expect(buildCollectionPath('my-work', '')).toBe('/c/my-work')
    })

    it('should URL-encode collectionId with special characters for path', () => {
      // encodeURIComponent encodes space as '%20'
      expect(buildCollectionPath('another/id with spaces')).toBe(
        '/c/anotheridwithspaces'
      )
      expect(buildCollectionPath('id&value=test')).toBe('/c/idvaluetest')
    })

    it('should handle empty collectionId for path', () => {
      expect(buildCollectionPath('')).toBe('/')
    })
  })
})

describe('isRunningInDedicatedDomain', () => {
  // Mock globalThis.location.pathname
  let originalPathname: string

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

    // Store original pathname and set a default mock
    originalPathname = globalThis.location.pathname
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { ...globalThis.location, pathname: '' },
    })
  })

  afterEach(() => {
    // Restore original pathname
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { ...globalThis.location, pathname: originalPathname },
    })
  })

  it('should return true for root path', () => {
    Object.defineProperty(globalThis.location, 'pathname', {
      writable: true,
      value: '/',
    })
    expect(isRunningInDedicatedDomain()).toBe(true)
    expect(isRunningInDedicatedDomain('/')).toBe(true)
  })

  it('should return true for /index.html', () => {
    Object.defineProperty(globalThis.location, 'pathname', {
      writable: true,
      value: '/index.html',
    })
    expect(isRunningInDedicatedDomain()).toBe(true)
    expect(isRunningInDedicatedDomain('/index.html')).toBe(true)
  })

  it('should return true for /collections/{collectionId}', () => {
    const paths = [
      '/collections/my-collection',
      '/collections/12345',
      '/collections/public/12345',
      '/collections/another-collection-with-hyphens',
    ]
    for (const path of paths) {
      Object.defineProperty(globalThis.location, 'pathname', {
        writable: true,
        value: path,
      })
      expect(isRunningInDedicatedDomain()).toBe(true)
      expect(isRunningInDedicatedDomain(path)).toBe(true)
    }
  })

  it('should return true for /c/{collectionId}', () => {
    const paths = [
      '/c/my-collection',
      '/c/67890',
      '/c/shared/67890',
      '/c/short-id',
    ]
    for (const path of paths) {
      Object.defineProperty(globalThis.location, 'pathname', {
        writable: true,
        value: path,
      })
      expect(isRunningInDedicatedDomain()).toBe(true)
      expect(isRunningInDedicatedDomain(path)).toBe(true)
    }
  })

  it('should return false for other paths', () => {
    const paths = [
      '/settings',
      '/about',
      '/collections/', // Missing collectionId
      '/c/', // Missing collectionId
      // '/collections/id/details', // Extra segments
      // '/c/id/edit', // Extra segments
      '/some/other/path',
      '', // Empty path
    ]
    for (const path of paths) {
      Object.defineProperty(globalThis.location, 'pathname', {
        writable: true,
        value: path,
      })
      expect(isRunningInDedicatedDomain()).toBe(false)
      expect(isRunningInDedicatedDomain(path)).toBe(false)
    }
  })

  it('should handle paths with query parameters and hash fragments correctly', () => {
    // These should still be considered dedicated if the base path matches
    expect(isRunningInDedicatedDomain('/?query=param')).toBe(true)
    expect(isRunningInDedicatedDomain('/index.html#hash')).toBe(true)
    expect(isRunningInDedicatedDomain('/collections/abc?query=1')).toBe(true)
    expect(isRunningInDedicatedDomain('/c/def#section')).toBe(true)

    // These should be false as the base path does not match
    expect(isRunningInDedicatedDomain('/settings?query=param')).toBe(false)
    expect(isRunningInDedicatedDomain('/about#hash')).toBe(false)
  })

  it('should handle undefined globalThis object gracefully (e.g., in Node.js environment without DOM)', () => {
    const originalWindow = globalThis.window
    // @ts-expect-error: Simulate non-browser environment
    delete globalThis.window
    expect(isRunningInDedicatedDomain()).toBe(false) // Defaults to empty string, which is false
    expect(isRunningInDedicatedDomain('/specific/path')).toBe(false) // Still respects passed arg
    expect(isRunningInDedicatedDomain('/')).toBe(true) // Still respects passed arg
    globalThis.window = originalWindow
  })
})
