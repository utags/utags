import { describe, it, expect, vi } from 'vitest'
import {
  extractValidRegexes,
  encodeRegex,
  decodeRegex,
  type RegexExtraction,
} from '../regex-utils.js'
import {
  normalizeQueryStrings,
  expandPrefixes,
  sortQueries,
  createQueryFilterCondition,
} from './query-filter.js'

// 模拟 console
vi.mock('console-tagger', () => ({
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  default: class Console {
    constructor() {
      // eslint-disable-next-line no-constructor-return
      return {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }
    }
  },
}))

describe('normalizeQueryStrings', () => {
  // Test empty string handling
  it('should handle empty strings correctly', () => {
    expect(normalizeQueryStrings('')).toBe('')
    expect(normalizeQueryStrings('   ')).toBe('')
  })

  // Test removing spaces around commas
  it('should remove spaces around commas', () => {
    expect(normalizeQueryStrings('tag1 , tag2')).toBe('tag1,tag2')
    expect(normalizeQueryStrings('tag1,  tag2 , tag3')).toBe('tag1,tag2,tag3')
    expect(normalizeQueryStrings('tag1  ,tag2')).toBe('tag1,tag2')
  })

  // Test removing spaces around colons for specific prefixes
  it('should remove spaces around colons for specific prefixes', () => {
    expect(normalizeQueryStrings('title : value')).toBe('title:value')
    expect(normalizeQueryStrings('tag : value')).toBe('tag:value')
    expect(normalizeQueryStrings('description : value')).toBe(
      'description:value'
    )
    expect(normalizeQueryStrings('note : value')).toBe('note:value')
    expect(normalizeQueryStrings('url : value')).toBe('url:value')
    expect(normalizeQueryStrings('href : value')).toBe('url:value')
    expect(normalizeQueryStrings('t : value')).toBe('tag:value')
    expect(normalizeQueryStrings('d : value')).toBe('domain:value')
    expect(normalizeQueryStrings('site : value')).toBe('domain:value')
    expect(normalizeQueryStrings('ti : value')).toBe('title:value')
    expect(normalizeQueryStrings('de : value')).toBe('description:value')
    expect(normalizeQueryStrings('n : value')).toBe('note:value')
    expect(normalizeQueryStrings('u : value')).toBe('url:value')
  })

  // Test preserving spaces around colons for other prefixes
  it('should preserve spaces around colons for other prefixes', () => {
    expect(normalizeQueryStrings('other : value')).toBe('other : value')
    expect(normalizeQueryStrings('random : text')).toBe('random : text')
    expect(normalizeQueryStrings('something : else')).toBe('something : else')
  })

  // Test consolidating multiple spaces into a single space
  it('should consolidate multiple spaces into a single space', () => {
    expect(normalizeQueryStrings('tag1    tag2')).toBe('tag1 tag2')
    expect(normalizeQueryStrings('multiple   spaces   here')).toBe(
      'multiple spaces here'
    )
  })

  // Test removing leading and trailing commas
  it('should remove leading and trailing commas', () => {
    expect(normalizeQueryStrings(',tag1,tag2,')).toBe('tag1,tag2')
    expect(normalizeQueryStrings(',,tag1,tag2,,')).toBe('tag1,tag2')
    expect(normalizeQueryStrings(',tag1')).toBe('tag1')
    expect(normalizeQueryStrings('tag1,')).toBe('tag1')
  })

  // Test consolidating multiple commas into a single comma
  it('should consolidate multiple commas into a single comma', () => {
    expect(normalizeQueryStrings('tag1,,tag2')).toBe('tag1,tag2') // Multiple commas should be consolidated
    expect(normalizeQueryStrings('tag1,,,tag2,')).toBe('tag1,tag2') // Both internal and trailing commas handled
    expect(normalizeQueryStrings('tag1,,,,tag2,,,tag3')).toBe('tag1,tag2,tag3') // Multiple groups of commas
  })

  // Test replacing shorthand prefixes with their full forms
  it('should replace shorthand prefixes with their full forms', () => {
    // Test tags: and t: to tag:
    expect(normalizeQueryStrings('tags:javascript')).toBe('tag:javascript')
    expect(normalizeQueryStrings('t:javascript')).toBe('tag:javascript')

    // Test href: and u: to url:
    expect(normalizeQueryStrings('href:example.com')).toBe('url:example.com')
    expect(normalizeQueryStrings('u:example.com')).toBe('url:example.com')

    // Test ti: to title:
    expect(normalizeQueryStrings('ti:some text')).toBe('title:some text')

    // Test de: to description:
    expect(normalizeQueryStrings('de:some text')).toBe('description:some text')

    // Test n: to note:
    expect(normalizeQueryStrings('n:important')).toBe('note:important')

    // Test site: and d: to domain:
    expect(normalizeQueryStrings('site:important')).toBe('domain:important')
    expect(normalizeQueryStrings('d:important')).toBe('domain:important')

    // Test with spaces around colons
    expect(normalizeQueryStrings('t : javascript')).toBe('tag:javascript')
    expect(normalizeQueryStrings('u : example.com')).toBe('url:example.com')
    expect(normalizeQueryStrings('d : some text')).toBe('domain:some text')
    expect(normalizeQueryStrings('n : important')).toBe('note:important')

    // Test with multiple shorthand prefixes
    expect(normalizeQueryStrings('t:js de:framework')).toBe(
      'tag:js description:framework'
    )
    expect(normalizeQueryStrings('t:react u:github.com')).toBe(
      'tag:react url:github.com'
    )

    // Test with mixed shorthand and full prefixes
    expect(normalizeQueryStrings('tag:js t:react')).toBe('tag:js tag:react')
    expect(normalizeQueryStrings('url:example.com href:github.com')).toBe(
      'url:example.com url:github.com'
    )
  })

  // Test complex combinations
  it('should handle complex combinations correctly', () => {
    expect(normalizeQueryStrings('  title : abc  ,  tag : xyz  ')).toBe(
      'title:abc,tag:xyz'
    )
    expect(normalizeQueryStrings('title:abc,,,tag:xyz')).toBe(
      'title:abc,tag:xyz'
    )
    expect(normalizeQueryStrings('title : abc other : xyz')).toBe(
      'title:abc other : xyz'
    )
    expect(normalizeQueryStrings(',tag1 , tag2 , tag3,')).toBe('tag1,tag2,tag3')
    expect(normalizeQueryStrings('title:abc    tag:xyz')).toBe(
      'title:abc tag:xyz'
    )
    expect(normalizeQueryStrings('  title  :  abc  ,  other  :  xyz  ')).toBe(
      'title:abc,other : xyz'
    )
  })

  // Test complex combinations with shorthand prefixes
  it('should handle complex combinations with shorthand prefixes correctly', () => {
    expect(normalizeQueryStrings('t:js, de:framework, n:important')).toBe(
      'tag:js,description:framework,note:important'
    )
    expect(normalizeQueryStrings('t:react,tags:vue,u:github.com')).toBe(
      'tag:react,tag:vue,url:github.com'
    )
    expect(
      normalizeQueryStrings(
        'title:Project t:js t:ts d:example.com de:framework'
      )
    ).toBe(
      'title:project tag:js tag:ts domain:example.com description:framework'
    )
  })

  // Test edge cases
  it('should handle edge cases correctly', () => {
    // Multiple colons
    expect(normalizeQueryStrings('title :: value')).toBe('title:: value')
    // Colon at the beginning
    expect(normalizeQueryStrings(': value')).toBe(': value')
    // Colon at the end
    expect(normalizeQueryStrings('title :')).toBe('title:')
    // Only colon
    expect(normalizeQueryStrings(':')).toBe(':')
    // Only comma
    expect(normalizeQueryStrings(',')).toBe('')
    // Mixed scenarios
    expect(
      normalizeQueryStrings(
        'tag1,,,tag2 , , tag3  title : abc , , description : xyz'
      )
    ).toBe('tag1,tag2,tag3 title:abc,description:xyz')
    // Shorthand prefixes in mixed scenarios
    expect(
      normalizeQueryStrings('t:js,,,de:framework , , n:important  ti : abc')
    ).toBe('tag:js,description:framework,note:important title:abc')
  })

  // Test converting to lowercase
  it('should convert all text to lowercase', () => {
    expect(normalizeQueryStrings('TAG:JavaScript')).toBe('tag:javascript')
    expect(normalizeQueryStrings('Title:Project Description:Framework')).toBe(
      'title:project description:framework'
    )
    expect(normalizeQueryStrings('JavaScript React TypeScript')).toBe(
      'javascript react typescript'
    )
    expect(normalizeQueryStrings('URL:Example.COM')).toBe('url:example.com')
  })

  // Test domain prefix support
  it('should support domain prefix', () => {
    expect(normalizeQueryStrings('domain:github.com')).toBe('domain:github.com')
    expect(normalizeQueryStrings('domain : example.com')).toBe(
      'domain:example.com'
    )
    expect(normalizeQueryStrings('tag:js domain:github.com')).toBe(
      'tag:js domain:github.com'
    )
  })
})

describe('normalizeQueryStrings', () => {
  it('should handle basic string normalization', () => {
    const input = 'Tag:JS , title : Node.js'
    const result = normalizeQueryStrings(input)
    expect(result).toBe('tag:js,title:node.js')
  })

  it('should preserve regex patterns while normalizing other parts', () => {
    const input = 'title:/Test.*Pattern/i , tag:js'
    const result = normalizeQueryStrings(input)
    // The regex pattern should be encoded to protect it from normalization
    expect(result).toMatch(/^title:re\/.*\/i,tag:js$/)

    // Decode the regex part to verify it's preserved correctly
    const encodedRegex = result.split(',')[0].slice(6)
    const decodedRegex = decodeRegex(encodedRegex)
    expect(decodedRegex).toBe('/Test.*Pattern/i')
  })

  it('should handle multiple regex patterns in query', () => {
    const input = 'title:/Test/i tag:/Pattern/g url:example'
    const result = normalizeQueryStrings(input)

    const parts = result.split(' ')
    // First regex pattern
    expect(decodeRegex(parts[0].slice(6))).toBe('/Test/i')
    // Second regex pattern
    expect(decodeRegex(parts[1].slice(4))).toBe('/Pattern/g')
    // Normal part
    expect(parts[2]).toBe('url:example')
  })

  it('should handle regex patterns with special characters', () => {
    const input = 'title:/Test\\d+[a-z]*/i'
    const result = normalizeQueryStrings(input)

    const decodedRegex = decodeRegex(result.slice(6))
    expect(decodedRegex).toBe('/Test\\d+[a-z]*/i')
  })

  it('should ignore invalid regex patterns', () => {
    const input = 'title:/unclosed pattern'
    const result = normalizeQueryStrings(input)
    expect(result).toBe('title:/unclosed pattern')
  })

  it('should handle regex patterns with spaces', () => {
    const input = 'title:/hello world/i'
    const result = normalizeQueryStrings(input)
    const decodedRegex = decodeRegex(result.slice(6))
    expect(decodedRegex).toBe('/hello world/i')
  })
})

describe('expandPrefixes', () => {
  // Test handling of strings with commas
  it('should return array with original normalized string when input contains commas', () => {
    expect(expandPrefixes('tag:js,tag:ts')).toEqual(['tag:js,tag:ts'])
    expect(expandPrefixes('tag:js, tag:ts')).toEqual(['tag:js,tag:ts'])
    expect(expandPrefixes(',tag:js,tag:ts,')).toEqual(['tag:js,tag:ts'])
  })

  // Test handling of empty strings
  it('should handle empty strings correctly', () => {
    expect(expandPrefixes('')).toEqual([])
    expect(expandPrefixes('   ')).toEqual([])
  })

  // Test single term handling
  it('should return single-item array for single terms', () => {
    expect(expandPrefixes('javascript')).toEqual(['javascript'])
    expect(expandPrefixes('tag:javascript')).toEqual(['tag:javascript'])
  })

  // Test basic prefix expansion
  it('should expand prefixes to space-separated terms', () => {
    expect(expandPrefixes('tag:js ts react')).toEqual([
      'tag:js',
      'tag:ts',
      'tag:react',
    ])
    expect(expandPrefixes('title:project description')).toEqual([
      'title:project',
      'title:description',
    ])
  })

  // Test multiple different prefixes
  it('should handle multiple different prefixes correctly', () => {
    expect(expandPrefixes('tag:js react note:important reminder')).toEqual([
      'tag:js',
      'tag:react',
      'note:important',
      'note:reminder',
    ])

    expect(
      expandPrefixes('title:project description:framework js react')
    ).toEqual([
      'title:project',
      'description:framework',
      'description:js',
      'description:react',
    ])
  })

  // Test terms without prefixes
  it('should keep terms without prefixes unchanged', () => {
    expect(expandPrefixes('javascript tag:js react')).toEqual([
      'javascript',
      'tag:js',
      'tag:react',
    ])

    expect(expandPrefixes('search tag:js react title:node')).toEqual([
      'search',
      'tag:js',
      'tag:react',
      'title:node',
    ])
  })

  // Test shorthand prefix normalization
  it('should normalize shorthand prefixes correctly', () => {
    expect(expandPrefixes('t:js ts react')).toEqual([
      'tag:js',
      'tag:ts',
      'tag:react',
    ])
    expect(expandPrefixes('de:framework js n:important')).toEqual([
      'description:framework',
      'description:js',
      'note:important',
    ])
    expect(expandPrefixes('u:github.com docs')).toEqual([
      'url:github.com',
      'url:docs',
    ])
    expect(expandPrefixes('site:github.com docs')).toEqual([
      'domain:github.com',
      'domain:docs',
    ])
  })

  // Test complex combinations
  it('should handle complex combinations correctly', () => {
    expect(
      expandPrefixes(
        'javascript t:js react de:framework n:important reminder u:github.com'
      )
    ).toEqual([
      'javascript',
      'tag:js',
      'tag:react',
      'description:framework',
      'note:important',
      'note:reminder',
      'url:github.com',
    ])

    expect(
      expandPrefixes('  title:Project   t:js   t:ts   de:framework  ')
    ).toEqual(['title:project', 'tag:js', 'tag:ts', 'description:framework'])
  })

  // Test edge cases
  it('should handle edge cases correctly', () => {
    expect(expandPrefixes('tag:    js')).toEqual(['tag:js'])

    // Multiple consecutive spaces
    expect(expandPrefixes('tag:js    react    node')).toEqual([
      'tag:js',
      'tag:react',
      'tag:node',
    ])

    // Mixed case
    expect(expandPrefixes('Tag:JS react')).toEqual(['tag:js', 'tag:react'])
  })
  // Test domain prefix in expandPrefixes
  it('should handle domain prefix correctly', () => {
    expect(expandPrefixes('domain:github.com js react')).toEqual([
      'domain:github.com',
      'domain:js',
      'domain:react',
    ])

    expect(expandPrefixes('tag:js domain:github.com react')).toEqual([
      'tag:js',
      'domain:github.com',
      'domain:react',
    ])
  })

  // Test prefix matching with domain included
  it('should match domain prefix in part pattern', () => {
    const prefixMatch = /^(title|description|note|tag|url|domain):(.+)$/.exec(
      'domain:github.com'
    )
    expect(prefixMatch).not.toBeNull()
    expect(prefixMatch?.[1]).toBe('domain')
    expect(prefixMatch?.[2]).toBe('github.com')
  })

  it('should handle empty values after prefix', () => {
    // 单个空前缀
    expect(expandPrefixes('tag:')).toEqual(['tag:'])

    // 多个空前缀
    expect(expandPrefixes('tag:,title:')).toEqual(['tag:,title:'])

    // 混合空前缀和正常查询
    expect(expandPrefixes('abc title:')).toEqual(['abc', 'title:'])
    expect(expandPrefixes('tag:abc title:')).toEqual(['tag:abc', 'title:'])
    expect(expandPrefixes('tag:abc title: url:')).toEqual([
      'tag:abc',
      'title:url:',
    ])
    expect(expandPrefixes('title: tag:')).toEqual(['title:tag:'])
    expect(expandPrefixes('title: tag: url:')).toEqual(['title:tag:url:'])
    expect(expandPrefixes('title: tag: url: note:')).toEqual([
      'title:tag:url:note:',
    ])
    expect(expandPrefixes('other: tag: url:')).toEqual(['other:', 'tag:url:'])
    expect(expandPrefixes('other : tag : url : ')).toEqual([
      'other',
      ':',
      'tag:url:',
    ])
  })

  // 测试否定前缀
  it('should handle negated prefixes correctly', () => {
    expect(expandPrefixes('!tag:js')).toEqual(['!tag:js'])
    expect(expandPrefixes('-tag:js')).toEqual(['-tag:js'])
    expect(expandPrefixes('!title:project')).toEqual(['!title:project'])
    expect(expandPrefixes('-description:framework')).toEqual([
      '-description:framework',
    ])
  })

  // 测试否定符号与前缀之间有空格的情况
  it('should handle spaces between negation and prefix', () => {
    expect(expandPrefixes('! tag:abc')).toEqual(['!', 'tag:abc'])
    expect(expandPrefixes('- tag:abc')).toEqual(['-', 'tag:abc'])
    expect(expandPrefixes('! title:project')).toEqual(['!', 'title:project'])
    expect(expandPrefixes('- description:framework')).toEqual([
      '-',
      'description:framework',
    ])
  })

  // 测试混合空格情况
  it('should handle mixed spaces with negated prefixes', () => {
    expect(expandPrefixes('!  tag:abc')).toEqual(['!', 'tag:abc'])
    expect(expandPrefixes('-   tag:abc')).toEqual(['-', 'tag:abc'])
    expect(expandPrefixes(' ! tag:abc')).toEqual(['!', 'tag:abc'])
    expect(expandPrefixes(' - tag:abc')).toEqual(['-', 'tag:abc'])
  })

  // 测试带否定前缀的扩展
  it('should expand negated prefixes to space-separated terms', () => {
    expect(expandPrefixes('!tag:js ts react')).toEqual([
      '!tag:js',
      '!tag:ts',
      '!tag:react',
    ])
    expect(expandPrefixes('-title:project description')).toEqual([
      '-title:project',
      '-title:description',
    ])
  })

  // 测试混合否定和非否定前缀
  it('should handle mixed negated and non-negated prefixes', () => {
    expect(expandPrefixes('tag:js !tag:ts')).toEqual(['tag:js', '!tag:ts'])
    expect(expandPrefixes('!title:project description:framework')).toEqual([
      '!title:project',
      'description:framework',
    ])
  })

  // 测试否定前缀与普通词的混合
  it('should handle negated prefixes with plain terms', () => {
    expect(expandPrefixes('javascript !tag:js')).toEqual([
      'javascript',
      '!tag:js',
    ])
    expect(expandPrefixes('javascript  -tag:react ')).toEqual([
      'javascript',
      '-tag:react',
    ])
  })
})

describe('sortQueries', () => {
  // Test empty arrays
  it('should handle empty arrays', () => {
    expect(sortQueries([])).toEqual([])
  })

  // Test single-item arrays
  it('should handle single-item arrays', () => {
    expect(sortQueries(['tag:javascript'])).toEqual(['tag:javascript'])
    expect(sortQueries(['javascript'])).toEqual(['javascript'])
  })

  // Test prefix priority sorting
  it('should sort by prefix priority', () => {
    const input = [
      'note:important',
      'tag:javascript',
      'url:example.com',
      'title:project',
      'domain:github.com',
      'description:framework',
    ]
    const expected = [
      'domain:github.com',
      'url:example.com',
      'tag:javascript',
      'title:project',
      'description:framework',
      'note:important',
    ]
    expect(sortQueries(input)).toEqual(expected)
  })

  // Test prefixed > non-prefixed > comma-containing sorting rule
  it('should sort prefixed > non-prefixed > comma-containing terms', () => {
    const input = [
      'javascript',
      'tag:react',
      'tag:js,tag:ts',
      'react',
      'domain:github.com',
    ]
    const expected = [
      'domain:github.com',
      'tag:react',
      'javascript',
      'react',
      'tag:js,tag:ts',
    ]
    expect(sortQueries(input)).toEqual(expected)
  })

  // Test sorting by length for same priority
  it('should sort by length for same priority', () => {
    // Items with the same prefix
    const prefixedInput = [
      'tag:js',
      'tag:javascript',
      'tag:react',
      'tag:typescript',
    ]
    const prefixedExpected = [
      'tag:javascript',
      'tag:typescript',
      'tag:react',
      'tag:js',
    ]
    expect(sortQueries(prefixedInput)).toEqual(prefixedExpected)

    // Non-prefixed items
    const nonPrefixedInput = ['js', 'javascript', 'react', 'typescript']
    const nonPrefixedExpected = ['javascript', 'typescript', 'react', 'js']
    expect(sortQueries(nonPrefixedInput)).toEqual(nonPrefixedExpected)

    // Items with commas
    const commaInput = [
      'tag:js,tag:ts',
      'tag:javascript,tag:typescript',
      'tag:a,tag:b',
    ]
    const commaExpected = [
      'tag:javascript,tag:typescript',
      'tag:js,tag:ts',
      'tag:a,tag:b',
    ]
    expect(sortQueries(commaInput)).toEqual(commaExpected)
  })

  // Test mixed cases
  it('should handle mixed cases correctly', () => {
    const input = [
      'javascript',
      'tag:react',
      'domain:github.com',
      'tag:js,tag:ts',
      'typescript',
      'note:important',
      'url:example.com',
      'tag:javascript',
    ]
    const expected = [
      'domain:github.com',
      'url:example.com',
      'tag:javascript',
      'tag:react',
      'note:important',
      'javascript',
      'typescript',
      'tag:js,tag:ts',
    ]
    expect(sortQueries(input)).toEqual(expected)
  })

  // Test edge cases
  it('should handle edge cases', () => {
    // Empty string
    expect(sortQueries([''])).toEqual([''])

    // Items with only colon
    const colonInput = ['tag:', 'title:', 'domain:']
    const colonExpected = ['domain:', 'tag:', 'title:']
    expect(sortQueries(colonInput)).toEqual(colonExpected)

    // Prefixes not in priority mapping
    const unknownPrefixInput = ['unknown:value', 'tag:js', 'custom:data']
    const unknownPrefixExpected = ['tag:js', 'unknown:value', 'custom:data']
    expect(sortQueries(unknownPrefixInput)).toEqual(unknownPrefixExpected)
  })

  // Test realistic search scenario
  it('should sort queries in a realistic search scenario', () => {
    const input = expandPrefixes(
      'javascript tag:react domain:github.com note:important'
    )
    const expected = [
      'domain:github.com',
      'tag:react',
      'note:important',
      'javascript',
    ]
    expect(sortQueries(input)).toEqual(expected)
  })

  // Test working with expandPrefixes
  it('should work correctly with expandPrefixes', () => {
    const query = 'tag:js react typescript domain:github.com'
    const expanded = expandPrefixes(query)
    const sorted = sortQueries(expanded)

    expect(expanded).toEqual([
      'tag:js',
      'tag:react',
      'tag:typescript',
      'domain:github.com',
    ])
    expect(sorted).toEqual([
      'domain:github.com',
      'tag:typescript',
      'tag:react',
      'tag:js',
    ])
  })
})

describe('createQueryFilterCondition', () => {
  const testMeta = {
    created: 0,
    updated: 0,
  }

  // Test basic functionality
  it('should return undefined when no q parameter is provided', () => {
    const params = new URLSearchParams()
    const result = createQueryFilterCondition(params)
    expect(result).toBeUndefined()
  })

  it('should return undefined when q parameter is empty', () => {
    const params = new URLSearchParams('q=')
    const result = createQueryFilterCondition(params)
    expect(result).toBeUndefined()
  })

  it('should handle empty values after prefix', () => {
    // 单个空前缀
    expect(
      createQueryFilterCondition(new URLSearchParams('q=tag:'))
    ).toBeUndefined()

    // 多个空前缀
    expect(
      createQueryFilterCondition(new URLSearchParams('q=tag:,title:'))
    ).toBeUndefined()

    // 混合空前缀和正常查询
    expect(
      createQueryFilterCondition(new URLSearchParams('q=abc title:')) // final keyword: ['title:', 'abc'] => 'abc'
    ).toBeDefined()
    expect(
      createQueryFilterCondition(new URLSearchParams('q=title: tag:')) // final keyword: 'title:tag:'
    ).toBeDefined()
    expect(
      createQueryFilterCondition(new URLSearchParams('q=title: tag: url:')) // final keyword: 'title:tag:url:'
    ).toBeDefined()
    expect(
      createQueryFilterCondition(new URLSearchParams('q=other: tag: url:')) // final keyword: ['tag:url:', 'other:']
    ).toBeDefined()
    expect(
      createQueryFilterCondition(new URLSearchParams('q=other : tag : url : ')) // final keyword: ['tag:url:', 'other', ':']
    ).toBeDefined()
  })

  it('should handle empty values in complex queries', () => {
    // 空前缀与有效查询混合
    const params = new URLSearchParams('q=tag:js&q=title:&q=description:test')
    const filter = createQueryFilterCondition(params)
    expect(filter).toBeDefined()

    // 验证空前缀被忽略
    if (filter) {
      expect(
        filter('https://example.com', ['js'], {
          title: '',
          description: 'test',
          ...testMeta,
        })
      ).toBe(true)
      expect(
        filter('https://example.com', ['js'], {
          title: '',
          description: '',
          ...testMeta,
        })
      ).toBe(false)
      expect(
        filter('https://example.com', ['java'], {
          title: '',
          description: 'test',
          ...testMeta,
        })
      ).toBe(false)
      expect(
        filter('https://example.com', [], {
          title: 'value',
          description: '',
          ...testMeta,
        })
      ).toBe(false)
    }
  })

  // 测试单个查询条件
  it('should create a filter for a single title query', () => {
    const params = new URLSearchParams('q=title:javascript')
    const filter = createQueryFilterCondition(params)

    expect(filter).toBeDefined()
    if (filter) {
      // Match bookmarks with title containing javascript
      expect(
        filter('https://example.com', [], {
          title: 'JavaScript Tutorial',
          ...testMeta,
        })
      ).toBe(true)
      // Don't match bookmarks without javascript in title
      expect(
        filter('https://example.com', [], {
          title: 'TypeScript Guide',
          ...testMeta,
        })
      ).toBe(false)
    }
  })

  it('should create a filter for a single description query', () => {
    const params = new URLSearchParams('q=description:framework')
    const filter = createQueryFilterCondition(params)

    expect(filter).toBeDefined()
    if (filter) {
      // Match bookmarks with description containing framework
      expect(
        filter('https://example.com', [], {
          description: 'A JavaScript framework',
          ...testMeta,
        })
      ).toBe(true)
      // Don't match bookmarks without framework in description
      expect(
        filter('https://example.com', [], {
          description: 'A JavaScript library',
          ...testMeta,
        })
      ).toBe(false)
    }
  })

  it('should create a filter for a single note query', () => {
    const params = new URLSearchParams('q=note:important')
    const filter = createQueryFilterCondition(params)

    expect(filter).toBeDefined()
    if (filter) {
      // Match bookmarks with note containing important
      expect(
        filter('https://example.com', [], {
          note: 'This is an important resource',
          ...testMeta,
        })
      ).toBe(true)
      // Don't match bookmarks without important in note
      expect(
        filter('https://example.com', [], {
          note: 'Just a regular note',
          ...testMeta,
        })
      ).toBe(false)
    }
  })

  it('should create a filter for a single tag query', () => {
    const params = new URLSearchParams('q=tag:javascript')
    const filter = createQueryFilterCondition(params)

    expect(filter).toBeDefined()
    if (filter) {
      // Match bookmarks with tag containing javascript
      expect(
        filter('https://example.com', ['javascript', 'tutorial'], testMeta)
      ).toBe(true)
      // Don't match bookmarks without javascript in tags
      expect(
        filter('https://example.com', ['typescript', 'guide'], testMeta)
      ).toBe(false)
    }
  })

  it('should create a filter for a single url query', () => {
    const params = new URLSearchParams('q=url:github')
    const filter = createQueryFilterCondition(params)

    expect(filter).toBeDefined()
    if (filter) {
      // Match bookmarks with URL containing github
      expect(filter('https://github.com/example/repo', [], testMeta)).toBe(true)
      // Don't match bookmarks without github in URL
      expect(filter('https://gitlab.com/example/repo', [], testMeta)).toBe(
        false
      )
    }
  })

  it('should create a filter for a single domain query', () => {
    const params = new URLSearchParams('q=domain:github.com')
    const filter = createQueryFilterCondition(params)

    expect(filter).toBeDefined()
    if (filter) {
      // Match bookmarks with domain github.com
      expect(filter('https://github.com/example/repo', [], testMeta)).toBe(true)
      // Don't match bookmarks with domain other than github.com
      expect(filter('https://gitlab.com/example/repo', [], testMeta)).toBe(
        false
      )
    }
  })

  // Test generic query (no prefix)
  it('should create a filter for a generic query (no prefix)', () => {
    const params = new URLSearchParams('q=javascript')
    const filter = createQueryFilterCondition(params)

    expect(filter).toBeDefined()
    if (filter) {
      // Match bookmarks with title containing javascript
      expect(
        filter('https://example.com', [], {
          title: 'JavaScript Tutorial',
          ...testMeta,
        })
      ).toBe(true)
      // 匹配描述包含 javascript 的书签
      expect(
        filter('https://example.com', [], {
          description: 'Learn JavaScript',
          ...testMeta,
        })
      ).toBe(true)
      // 匹配笔记包含 javascript 的书签
      expect(
        filter('https://example.com', [], {
          note: 'JavaScript notes',
          ...testMeta,
        })
      ).toBe(true)
      // Match bookmarks with tag containing javascript
      expect(filter('https://example.com', ['javascript'], testMeta)).toBe(true)
      // 匹配URL包含 javascript 的书签
      expect(filter('https://javascript.info', [], testMeta)).toBe(true)
      // 不匹配任何字段都不包含 javascript 的书签
      expect(
        filter('https://example.com', ['typescript'], {
          title: 'TypeScript Guide',
          description: 'Learn TypeScript',
          note: 'TypeScript notes',
          ...testMeta,
        })
      ).toBe(false)
    }
  })

  // Test multiple query conditions (AND relationship)
  it('should create a filter for multiple queries (AND relationship)', () => {
    const params = new URLSearchParams()
    params.append('q', 'tag:javascript')
    params.append('q', 'domain:github.com')

    const filter = createQueryFilterCondition(params)

    expect(filter).toBeDefined()
    if (filter) {
      // 匹配同时满足两个条件的书签
      expect(
        filter(
          'https://github.com/example/javascript-repo',
          ['javascript', 'repo'],
          testMeta
        )
      ).toBe(true)
      // 不匹配只满足一个条件的书签
      expect(
        filter(
          'https://github.com/example/typescript-repo',
          ['typescript'],
          testMeta
        )
      ).toBe(false)
      expect(
        filter('https://example.com/javascript', ['javascript'], testMeta)
      ).toBe(false)
    }
  })

  // Test comma-separated query conditions (OR relationship)
  it('should create a filter for comma-separated queries (OR relationship)', () => {
    const params = new URLSearchParams('q=tag:javascript,tag:typescript')
    const filter = createQueryFilterCondition(params)

    expect(filter).toBeDefined()
    if (filter) {
      // 匹配满足第一个条件的书签
      expect(filter('https://example.com', ['javascript'], testMeta)).toBe(true)
      // 匹配满足第二个条件的书签
      expect(filter('https://example.com', ['typescript'], testMeta)).toBe(true)
      // 匹配满足二个条件的书签
      expect(
        filter('https://example.com', ['javascript', 'typescript'], testMeta)
      ).toBe(true)
      // 不匹配不满足任何条件的书签
      expect(filter('https://example.com', ['react'], testMeta)).toBe(false)
    }
  })

  // Test complex query combinations
  it('should handle complex query combinations', () => {
    const params = new URLSearchParams()
    params.append('q', 'tag:javascript,tag:typescript')
    params.append('q', 'domain:github.com')
    params.append('q', 'title:tutorial')

    const filter = createQueryFilterCondition(params)

    expect(filter).toBeDefined()
    if (filter) {
      // 匹配满足所有条件的书签
      expect(
        filter('https://github.com/example/js-tutorial', ['javascript'], {
          title: 'JavaScript Tutorial',
          ...testMeta,
        })
      ).toBe(true)

      // 匹配满足所有条件的书签（使用另一个标签）
      expect(
        filter('https://github.com/example/ts-tutorial', ['typescript'], {
          title: 'TypeScript Tutorial',
          ...testMeta,
        })
      ).toBe(true)

      // 不匹配缺少任何一个条件的书签
      expect(
        filter('https://example.com/js-tutorial', ['javascript'], {
          title: 'JavaScript Tutorial',
          ...testMeta,
        })
      ).toBe(false)

      expect(
        filter('https://github.com/example/js-guide', ['javascript'], {
          title: 'JavaScript Guide',
          ...testMeta,
        })
      ).toBe(false)

      expect(
        filter('https://github.com/example/react-tutorial', ['react'], {
          title: 'React Tutorial',
          ...testMeta,
        })
      ).toBe(false)
    }
  })

  // Test prefix shorthands
  it('should handle prefix shorthands', () => {
    const params = new URLSearchParams('q=t:javascript de:framework')
    const filter = createQueryFilterCondition(params)

    expect(filter).toBeDefined()
    if (filter) {
      // 匹配满足所有条件的书签
      expect(
        filter('https://example.com', ['javascript'], {
          description: 'A JavaScript framework',
          ...testMeta,
        })
      ).toBe(true)

      // 不匹配缺少任何一个条件的书签
      expect(
        filter('https://example.com', ['typescript'], {
          description: 'A JavaScript framework',
          ...testMeta,
        })
      ).toBe(false)

      expect(
        filter('https://example.com', ['javascript'], {
          description: 'A JavaScript library',
          ...testMeta,
        })
      ).toBe(false)
    }
  })

  // Test case insensitivity
  it('should be case insensitive', () => {
    const params = new URLSearchParams('q=TAG:JavaScript')
    const filter = createQueryFilterCondition(params)

    expect(filter).toBeDefined()
    if (filter) {
      // 匹配不区分大小写
      expect(filter('https://example.com', ['javascript'], testMeta)).toBe(true)
      expect(filter('https://example.com', ['JavaScript'], testMeta)).toBe(true)
      expect(filter('https://example.com', ['JAVASCRIPT'], testMeta)).toBe(true)
    }
  })

  // Test null/undefined handling
  it('should handle null or undefined metadata fields', () => {
    const params = new URLSearchParams('q=title:javascript')
    const filter = createQueryFilterCondition(params)

    expect(filter).toBeDefined()
    if (filter) {
      // 处理 undefined 标题
      expect(
        filter('https://example.com', [], { title: undefined, ...testMeta })
      ).toBe(false)
      // 处理 null 标题
      expect(
        filter('https://example.com', [], { title: null as any, ...testMeta })
      ).toBe(false)
      // 处理空标题
      expect(
        filter('https://example.com', [], { title: '', ...testMeta })
      ).toBe(false)
    }
  })

  // Test invalid queries
  it('should handle invalid queries', () => {
    const params = new URLSearchParams('q=invalid:javascript')
    const filter = createQueryFilterCondition(params)

    // 应该仍然返回一个过滤器，但该过滤器不会匹配任何内容
    expect(filter).toBeDefined()
    if (filter) {
      expect(
        filter('https://example.com', ['javascript'], {
          title: 'JavaScript',
          ...testMeta,
        })
      ).toBe(false)
    }
  })

  // Test empty prefix values
  it('should handle empty prefix values', () => {
    const params = new URLSearchParams('q=tag:')
    const filter = createQueryFilterCondition(params)

    // 应该返回 undefined 或不匹配任何内容的过滤器
    if (filter) {
      expect(filter('https://example.com', ['javascript'], testMeta)).toBe(
        false
      )
    }
  })
})

describe('Regex Filter Tests via createQueryFilterCondition', () => {
  const testMeta = {
    created: 0,
    updated: 0,
  }

  describe('Title Regex Filter', () => {
    const createParams = (query: string): URLSearchParams =>
      new URLSearchParams({ q: query })

    it('should match title with basic regex pattern', () => {
      const filter = createQueryFilterCondition(
        createParams('title:/test.*pattern/i')
      )
      expect(filter).toBeDefined()
      expect(
        filter!('https://example.com', ['test'], {
          title: 'Test Some Pattern',
          ...testMeta,
        })
      ).toBe(true)
      expect(
        filter!('https://example.com', ['test'], {
          title: 'No Match',
          ...testMeta,
        })
      ).toBe(false)
    })

    it('should handle empty title', () => {
      const filter = createQueryFilterCondition(createParams('title:/test/i'))
      expect(filter).toBeDefined()
      expect(
        filter!('https://example.com', ['test'], { title: '', ...testMeta })
      ).toBe(false)
      expect(filter!('https://example.com', ['test'], { ...testMeta })).toBe(
        false
      )
    })

    it('should handle special regex characters', () => {
      const filter = createQueryFilterCondition(
        createParams('title:/\\d+\\.\\d+/i')
      )
      expect(filter).toBeDefined()
      expect(
        filter!('https://example.com', ['test'], {
          title: 'Version 1.0',
          ...testMeta,
        })
      ).toBe(true)
      expect(
        filter!('https://example.com', ['test'], {
          title: 'Version One',
          ...testMeta,
        })
      ).toBe(false)
    })
  })

  describe('Combined Regex Filters', () => {
    const input = {
      href: 'https://blog.example.com/post-1',
      tags: ['javascript', 'react'],
      meta: {
        title: 'React Hooks Guide',
        description: 'Complete guide for React Hooks',
        note: '#review: good resource',
        ...testMeta,
      },
    }

    it('should match with multiple regex conditions', () => {
      const params = new URLSearchParams()
      params.append('q', 'title:/react.*guide/i')
      params.append('q', 'tag:/^javascript$/i')
      params.append('q', 'note:/#review/i')

      const filter = createQueryFilterCondition(params)
      expect(filter).toBeDefined()
      expect(filter!(input.href, input.tags, input.meta)).toBe(true)
    })

    it('should handle mixed regex and normal conditions', () => {
      const params = new URLSearchParams()
      params.append('q', 'title:/react/i')
      params.append('q', 'tag:react')
      params.append('q', 'description:complete')

      const filter = createQueryFilterCondition(params)
      expect(filter).toBeDefined()
      expect(filter!(input.href, input.tags, input.meta)).toBe(true)
    })

    it('should handle OR conditions with regex', () => {
      const filter = createQueryFilterCondition(
        new URLSearchParams({ q: 'title:/vue/i,tag:/^react$/i' })
      )
      expect(filter).toBeDefined()
      expect(filter!(input.href, input.tags, input.meta)).toBe(true)
    })
  })

  describe('Domain and URL Regex Filters', () => {
    it('should match domain with regex pattern', () => {
      const filter = createQueryFilterCondition(
        new URLSearchParams({ q: 'domain:/^blog\\.example\\.com$/' })
      )
      expect(filter).toBeDefined()
      expect(
        filter!('https://blog.example.com/post', [], { ...testMeta })
      ).toBe(true)
      expect(filter!('https://example.com/blog', [], { ...testMeta })).toBe(
        false
      )
    })

    it('should match URL with regex pattern', () => {
      const filter = createQueryFilterCondition(
        new URLSearchParams({ q: 'url:/\\/post-\\d+$/' })
      )
      expect(filter).toBeDefined()
      expect(filter!('https://example.com/post-123', [], { ...testMeta })).toBe(
        true
      )
      expect(filter!('https://example.com/about', [], { ...testMeta })).toBe(
        false
      )
    })
  })
})

describe('createQueryFilterCondition', () => {
  const testMeta = {
    created: 0,
    updated: 0,
  }

  // 添加无前缀正则表达式测试用例
  it('should match regex pattern against all fields when no prefix specified', () => {
    const params = new URLSearchParams('q=/javascript|typescript/i')
    const filter = createQueryFilterCondition(params)

    expect(filter).toBeDefined()
    if (filter) {
      // 匹配标题
      expect(
        filter('https://example.com', [], {
          title: 'JavaScript Tutorial',
          ...testMeta,
        })
      ).toBe(true)

      // 匹配标签
      expect(
        filter('https://example.com', ['typescript'], {
          title: 'React Guide',
          ...testMeta,
        })
      ).toBe(true)

      // 匹配域名
      expect(
        filter('https://typescript.org/docs', [], {
          title: 'Documentation',
          ...testMeta,
        })
      ).toBe(true)

      // 匹配描述
      expect(
        filter('https://example.com', [], {
          title: 'Guide',
          description: 'Learn javascript',
          ...testMeta,
        })
      ).toBe(true)

      // 不匹配的情况
      expect(
        filter('https://python.org', ['python'], {
          title: 'Python Guide',
          ...testMeta,
        })
      ).toBe(false)
    }
  })

  // 添加更复杂的无前缀正则表达式测试
  it('should handle complex regex patterns without prefix', () => {
    const params = new URLSearchParams('q=/\\d{4}-\\d{2}-\\d{2}/')
    const filter = createQueryFilterCondition(params)

    expect(filter).toBeDefined()
    if (filter) {
      // 匹配日期格式
      expect(
        filter('https://example.com', [], {
          title: 'Release 2023-01-15',
          ...testMeta,
        })
      ).toBe(true)

      expect(
        filter('https://example.com/2022-12-01', [], {
          title: 'Archive',
          ...testMeta,
        })
      ).toBe(true)

      expect(
        filter('https://example.com', [], {
          note: 'Created on 2021-05-20',
          ...testMeta,
        })
      ).toBe(true)

      // 不匹配的情况
      expect(
        filter('https://example.com', [], {
          title: 'Version 1.0',
          ...testMeta,
        })
      ).toBe(false)
    }
  })
})
