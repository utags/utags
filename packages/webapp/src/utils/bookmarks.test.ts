import { describe, it, expect } from 'vitest'
import type { BookmarkKeyValuePair } from '../types/bookmarks.js'
import {
  getTagCounts,
  getDomainCounts,
  normalizeHierachyPath,
  getHierachyTags,
  isBookmarkKeyValuePairArray,
  addTags,
  removeTags,
  filterBookmarksByUrls,
} from './bookmarks.js'

const testMeta = {
  created: 0,
  updated: 0,
}

describe('getTagCounts', () => {
  it('should handle empty input', () => {
    const result = getTagCounts([])
    expect(result.size).toBe(0)
  })

  it('should count tags for single bookmark', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['url1', { tags: ['tag1', 'tag2'], meta: testMeta }],
    ]
    const result = getTagCounts(bookmarks)
    expect(result.get('tag1')).toBe(1)
    expect(result.get('tag2')).toBe(1)
  })

  it('should count duplicate tags', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['url1', { tags: ['tag1', 'tag1'], meta: testMeta }],
    ]
    const result = getTagCounts(bookmarks)
    expect(result.get('tag1')).toBe(2)
  })

  it('should handle tags from multiple bookmarks', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['url1', { tags: ['tag1', 'tag2'], meta: testMeta }],
      ['url2', { tags: ['tag2', 'tag3'], meta: testMeta }],
    ]
    const result = getTagCounts(bookmarks)
    expect(result.get('tag1')).toBe(1)
    expect(result.get('tag2')).toBe(2)
    expect(result.get('tag3')).toBe(1)
  })

  it('should handle empty tags array', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['url1', { tags: [], meta: testMeta }],
    ]
    const result = getTagCounts(bookmarks)
    expect(result.size).toBe(0)
  })

  it('should handle tags with slashes', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['url1', { tags: ['parent/child'], meta: testMeta }],
    ]
    const result = getTagCounts(bookmarks)
    expect(result.get('parent/child')).toBe(1)
  })

  it('should handle tags with spaces', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['url1', { tags: [' tag with spaces '], meta: testMeta }],
    ]
    const result = getTagCounts(bookmarks)
    expect(result.get(' tag with spaces ')).toBe(1)
  })

  it('should handle tags with special characters', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['url1', { tags: ['tag-with-special-!@#$%^&*()'], meta: testMeta }],
    ]
    const result = getTagCounts(bookmarks)
    expect(result.get('tag-with-special-!@#$%^&*()')).toBe(1)
  })
})

describe('getDomainCounts', () => {
  it('should return empty map for empty input', () => {
    const result = getDomainCounts([])
    expect(result.size).toBe(0)
  })

  it('should count domains for single bookmark', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['https://example.com', { tags: [], meta: testMeta }],
    ]
    const result = getDomainCounts(bookmarks)
    expect(result.get('example.com')).toBe(1)
  })

  it('should count multiple bookmarks from same domain', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['https://example.com/page1', { tags: [], meta: testMeta }],
      ['https://example.com/page2', { tags: [], meta: testMeta }],
    ]
    const result = getDomainCounts(bookmarks)
    expect(result.get('example.com')).toBe(2)
  })

  it('should handle different domains', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['https://example.com', { tags: [], meta: testMeta }],
      ['https://test.org', { tags: [], meta: testMeta }],
    ]
    const result = getDomainCounts(bookmarks)
    expect(result.get('example.com')).toBe(1)
    expect(result.get('test.org')).toBe(1)
  })

  it('should handle URLs with subdomains', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['https://sub.example.com', { tags: [], meta: testMeta }],
    ]
    const result = getDomainCounts(bookmarks)
    expect(result.get('sub.example.com')).toBe(1)
  })

  it('should handle URLs with ports', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['https://example.com:8080', { tags: [], meta: testMeta }],
    ]
    const result = getDomainCounts(bookmarks)
    expect(result.get('example.com')).toBe(1)
  })

  it('should handle invalid URLs', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['invalid-url', { tags: [], meta: testMeta }],
    ]
    const result = getDomainCounts(bookmarks)
    expect(result.get('')).toBe(1)
  })
})

describe('normalizeHierachyPath', () => {
  it('should remove leading slashes', () => {
    expect(normalizeHierachyPath('/test/path')).toBe('test/path')
    expect(normalizeHierachyPath('////test/path')).toBe('test/path')
    expect(normalizeHierachyPath('/// / test/path')).toBe('test/path')
    expect(normalizeHierachyPath(' / / / /test/path')).toBe('test/path')
  })

  it('should preserve trailing slashes', () => {
    expect(normalizeHierachyPath('test/path/')).toBe('test/path/')
    expect(normalizeHierachyPath('test/path////')).toBe('test/path////')
  })

  it('should normalize spaces around slashes', () => {
    expect(normalizeHierachyPath('test / path')).toBe('test/path')
    expect(normalizeHierachyPath('test   /   path')).toBe('test/path')
  })

  it('should trim whitespace from path segments', () => {
    expect(normalizeHierachyPath(' test / path ')).toBe('test/path')
    expect(normalizeHierachyPath('  test  /  path  ')).toBe('test/path')
  })

  it('should handle empty path segments', () => {
    expect(normalizeHierachyPath('test//path')).toBe('test//path')
    expect(normalizeHierachyPath('test///path')).toBe('test///path')
  })

  it('should handle paths with special characters', () => {
    expect(normalizeHierachyPath('test@name/path#1')).toBe('test@name/path#1')
    expect(normalizeHierachyPath('test.name/path-1')).toBe('test.name/path-1')
  })

  it('should handle Chinese characters in paths', () => {
    expect(normalizeHierachyPath('测试/路径')).toBe('测试/路径')
    expect(normalizeHierachyPath(' 测试 / 路径 ')).toBe('测试/路径')
  })

  it('should handle mixed cases', () => {
    expect(normalizeHierachyPath(' / test / path / ')).toBe('test/path/')
    expect(normalizeHierachyPath('  //  test  /  path  //  ')).toBe(
      'test/path//'
    )
  })
})

describe('getHierachyTags', () => {
  const testMeta = { created: 0, updated: 0 }

  it('should return empty array for empty input', () => {
    const result = getHierachyTags([])
    expect(result).toEqual([])
  })

  it('should build hierarchy from flat tags', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['url1', { tags: ['parent/child'], meta: testMeta }],
      ['url2', { tags: ['parent/child2'], meta: testMeta }],
    ]
    const result = getHierachyTags(bookmarks)
    expect(result.length).toBe(1)
    expect(result[0].name).toBe('parent')
    expect(result[0].children.length).toBe(2)
  })

  it('should handle multiple levels of nesting', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['url1', { tags: ['grandparent/parent/child'], meta: testMeta }],
    ]
    const result = getHierachyTags(bookmarks)
    expect(result.length).toBe(1)
    expect(result[0].name).toBe('grandparent')
    expect(result[0].children[0].name).toBe('parent')
    expect(result[0].children[0].children[0].name).toBe('child')
  })

  it('should merge duplicate paths', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['url1', { tags: ['parent/child'], meta: testMeta }],
      ['url2', { tags: ['parent/child'], meta: testMeta }],
    ]
    const result = getHierachyTags(bookmarks)
    expect(result.length).toBe(1)
    expect(result[0].children.length).toBe(1)
    expect(result[0].children[0].count).toBe(2)
  })

  it('should handle tags with leading/trailing spaces', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['url1', { tags: [' parent / child '], meta: testMeta }],
    ]
    const result = getHierachyTags(bookmarks)
    expect(result.length).toBe(1)
    expect(result[0].name).toBe('parent')
    expect(result[0].children[0].name).toBe('child')
  })

  it('should sort tags alphabetically', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['url1', { tags: ['b/a'], meta: testMeta }],
      ['url2', { tags: ['a/b'], meta: testMeta }],
    ]
    const result = getHierachyTags(bookmarks)
    expect(result[0].name).toBe('a')
    expect(result[1].name).toBe('b')
  })

  it('should ignore tags without slashes', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['url1', { tags: ['simple'], meta: testMeta }],
    ]
    const result = getHierachyTags(bookmarks)
    expect(result.length).toBe(0)
  })

  it('should handle Chinese characters in tags', () => {
    const bookmarks: BookmarkKeyValuePair[] = [
      ['url1', { tags: ['父级/子级'], meta: testMeta }],
    ]
    const result = getHierachyTags(bookmarks)
    expect(result.length).toBe(1)
    expect(result[0].name).toBe('父级')
    expect(result[0].children[0].name).toBe('子级')
  })
})

describe('isBookmarkKeyValuePairArray', () => {
  it('should return true for an empty array', () => {
    expect(isBookmarkKeyValuePairArray([])).toBe(true)
  })

  it('should return true for an array of valid BookmarkKeyValuePair', () => {
    const validInput: BookmarkKeyValuePair[] = [
      ['url1', { tags: ['tag1'], meta: testMeta }],
      ['url2', { tags: ['tag2', 'tag3'], meta: testMeta }],
    ]
    expect(isBookmarkKeyValuePairArray(validInput)).toBe(true)
  })

  it('should return true for an array with a single valid BookmarkKeyValuePair', () => {
    const validInput: BookmarkKeyValuePair[] = [
      ['url1', { tags: ['tag1'], meta: testMeta }],
    ]
    expect(isBookmarkKeyValuePairArray(validInput)).toBe(true)
  })

  it('should return false for a single BookmarkKeyValuePair (not an array)', () => {
    const invalidInput: BookmarkKeyValuePair = [
      'url1',
      { tags: ['tag1'], meta: testMeta },
    ]
    expect(isBookmarkKeyValuePairArray(invalidInput)).toBe(false)
  })

  it('should return false for an array containing non-BookmarkKeyValuePair items', () => {
    const invalidInput = [
      // ['url1', { tags: ['tag1'], meta: testMeta }],
      'not a bookmark pair',
    ]
    // @ts-expect-error testing invalid input
    expect(isBookmarkKeyValuePairArray(invalidInput)).toBe(false)
  })

  it('should return false for an array of arrays with incorrect structure', () => {
    const invalidInput = [['url1', { tags: ['tag1'] }], ['url2']] // Missing meta in first, incorrect structure in second
    // FIXME: should return false
    // @ts-expect-error testing invalid input
    expect(isBookmarkKeyValuePairArray(invalidInput)).toBe(true)
  })

  it('should return false for null input', () => {
    // @ts-expect-error testing invalid input
    expect(isBookmarkKeyValuePairArray(null)).toBe(false)
  })

  it('should return false for undefined input', () => {
    // @ts-expect-error testing invalid input
    expect(isBookmarkKeyValuePairArray(undefined)).toBe(false)
  })

  it('should return false for a string input', () => {
    // @ts-expect-error testing invalid input
    expect(isBookmarkKeyValuePairArray('not an array')).toBe(false)
  })

  it('should return false for a number input', () => {
    // @ts-expect-error testing invalid input
    expect(isBookmarkKeyValuePairArray(123)).toBe(false)
  })

  it('should return false for an object input that is not an array', () => {
    const invalidInput = { key: 'value' }
    // @ts-expect-error testing invalid input
    expect(isBookmarkKeyValuePairArray(invalidInput)).toBe(false)
  })
})

describe('addTags', () => {
  it('should add a single tag to an empty array', () => {
    expect(addTags([], 'newTag')).toEqual(['newTag'])
  })

  it('should add multiple tags to an empty array', () => {
    expect(addTags([], ['tag1', 'tag2'])).toEqual(['tag1', 'tag2'])
  })

  it('should add a single tag to an existing array', () => {
    expect(addTags(['oldTag'], 'newTag')).toEqual(['oldTag', 'newTag'])
  })

  it('should add multiple tags to an existing array', () => {
    expect(addTags(['oldTag'], ['tag1', 'tag2'])).toEqual([
      'oldTag',
      'tag1',
      'tag2',
    ])
  })

  it('should not add duplicate tags', () => {
    expect(addTags(['tag1'], 'tag1')).toEqual(['tag1'])
    expect(addTags(['tag1', 'tag2'], ['tag1', 'tag3'])).toEqual([
      'tag1',
      'tag2',
      'tag3',
    ])
  })

  it('should handle undefined orgTags', () => {
    expect(addTags(undefined, 'newTag')).toEqual(['newTag'])
    expect(addTags(undefined, ['tag1', 'tag2'])).toEqual(['tag1', 'tag2'])
  })

  it('should handle null orgTags', () => {
    expect(addTags(null, 'newTag')).toEqual(['newTag'])
    expect(addTags(null, ['tag1', 'tag2'])).toEqual(['tag1', 'tag2'])
  })

  it('should trim tags before adding', () => {
    expect(addTags([], '  spacedTag  ')).toEqual(['spacedTag'])
    expect(addTags(['existing'], ['  tag1  ', 'tag2  '])).toEqual([
      'existing',
      'tag1',
      'tag2',
    ])
  })

  it('should ignore empty or whitespace-only tags in tagsToAdd array', () => {
    expect(addTags(['existing'], ['', '   ', 'validTag'])).toEqual([
      'existing',
      'validTag',
    ])
  })

  it('should ignore empty or whitespace-only single tag in tagsToAdd', () => {
    expect(addTags(['existing'], '')).toEqual(['existing'])
    expect(addTags(['existing'], '   ')).toEqual(['existing'])
  })

  it('should handle mixed valid and invalid tags in tagsToAdd array', () => {
    expect(addTags(['old'], ['  new1', '', 'new2  ', '   '])).toEqual([
      'old',
      'new1',
      'new2',
    ])
  })

  it('should return a new array instance', () => {
    const orgTags = ['tag1']
    const result = addTags(orgTags, 'tag2')
    expect(result).not.toBe(orgTags)
    expect(result).toEqual(['tag1', 'tag2'])
  })

  it('should handle adding an empty array of tags', () => {
    expect(addTags(['existing'], [])).toEqual(['existing'])
    expect(addTags(undefined, [])).toEqual([])
    expect(addTags(null, [])).toEqual([])
  })

  it('should correctly add tags containing commas', () => {
    expect(addTags([], 'tag,with,comma')).toEqual(['tag', 'with', 'comma'])
    expect(addTags(['existing'], 'tag,with,comma，existing')).toEqual([
      'existing',
      'tag',
      'with',
      'comma',
    ])
    expect(addTags(['tag,with,comma'], 'another,with,comma')).toEqual([
      'tag',
      'with',
      'comma',
      'another',
    ])
    expect(addTags(['tag1'], ['tag,with,comma', 'tag2'])).toEqual([
      'tag1',
      'tag',
      'with',
      'comma',
      'tag2',
    ])
  })

  it('should correctly add tags when orgTags contain commas', () => {
    expect(addTags(['tag,with,comma'], 'newTag')).toEqual([
      'tag',
      'with',
      'comma',
      'newTag',
    ])
    expect(addTags(['tag,with,comma', 'tag2'], 'newTag，tag2')).toEqual([
      'tag',
      'with',
      'comma',
      'tag2',
      'newTag',
    ])
  })
})

describe('removeTags', () => {
  it('should return an empty array if orgTags is undefined or null', () => {
    expect(removeTags(undefined, 'tag1')).toEqual([])
    expect(removeTags(null, 'tag1')).toEqual([])
    expect(removeTags(null, ['tag1', 'tag2'])).toEqual([])
  })

  it('should return an empty array if orgTags is empty', () => {
    expect(removeTags([], 'tag1')).toEqual([])
    expect(removeTags([], ['tag1', 'tag2'])).toEqual([])
  })

  it('should remove a single tag from the array', () => {
    expect(removeTags(['tag1', 'tag2', 'tag3'], 'tag2')).toEqual([
      'tag1',
      'tag3',
    ])
  })

  it('should remove multiple tags from the array', () => {
    expect(
      removeTags(['tag1', 'tag2', 'tag3', 'tag4'], ['tag2', 'tag4'])
    ).toEqual(['tag1', 'tag3'])
  })

  it('should handle removing non-existent tags gracefully', () => {
    expect(removeTags(['tag1', 'tag2'], 'tag3')).toEqual(['tag1', 'tag2'])
    expect(removeTags(['tag1', 'tag2'], ['tag3', 'tag4'])).toEqual([
      'tag1',
      'tag2',
    ])
  })

  it('should handle an empty tagsToRemove array', () => {
    expect(removeTags(['tag1', 'tag2'], [])).toEqual(['tag1', 'tag2'])
  })

  it('should handle tagsToRemove being a single non-existent tag', () => {
    expect(removeTags(['tag1', 'tag2'], 'tag3')).toEqual(['tag1', 'tag2'])
  })

  it('should return a new array instance', () => {
    const orgTags = ['tag1', 'tag2']
    const result = removeTags(orgTags, 'tag1')
    expect(result).not.toBe(orgTags)
    expect(orgTags).toEqual(['tag1', 'tag2']) // Original array should be unchanged
  })

  it('should handle duplicate tags in orgTags (Set behavior)', () => {
    // removeTags uses a Set internally, so duplicates in orgTags are effectively handled
    expect(removeTags(['tag1', 'tag2', 'tag1', 'tag2'], 'tag1')).toEqual([
      'tag2',
    ])
  })

  it('should handle duplicate tags in tagsToRemove', () => {
    expect(removeTags(['tag1', 'tag2', 'tag3'], ['tag2', 'tag2'])).toEqual([
      'tag1',
      'tag3',
    ])
  })

  it('should ignore empty strings or whitespace-only strings in tagsToRemove', () => {
    expect(removeTags(['tag1', 'tag2'], ['', '   '])).toEqual(['tag1', 'tag2'])
    expect(removeTags(['tag1', 'tag2'], '')).toEqual(['tag1', 'tag2'])
    expect(removeTags(['tag1', 'tag2'], '   ')).toEqual(['tag1', 'tag2'])
  })

  it('should correctly remove tags containing commas', () => {
    expect(removeTags(['tag,with,comma', 'tag2'], 'tag,with,comma')).toEqual([
      'tag2',
    ])
    expect(
      removeTags(['tag1', 'tag,with,comma', 'tag3'], ['tag,with,comma'])
    ).toEqual(['tag1', 'tag3'])
    expect(removeTags(['tag1', 'tag,with,comma', 'tag3'], 'tag1')).toEqual([
      'tag',
      'with',
      'comma',
      'tag3',
    ])
  })

  it('should handle mixed existing and non-existing tags in tagsToRemove', () => {
    expect(
      removeTags(['tag1', 'tag2', 'tag3'], ['tag2', 'nonexistent', 'tag3'])
    ).toEqual(['tag1'])
  })

  it('should handle removing all tags', () => {
    expect(removeTags(['tag1', 'tag2'], ['tag1', 'tag2'])).toEqual([])
    expect(removeTags(['tag1', 'tag2'], 'tag1')).toEqual(['tag2'])
    expect(removeTags(['tag1'], 'tag1')).toEqual([])
  })
})

describe('filterBookmarksByUrls', () => {
  const bookmark1: BookmarkKeyValuePair = [
    'url1',
    { tags: ['tag1'], meta: testMeta },
  ]
  const bookmark2: BookmarkKeyValuePair = [
    'url2',
    { tags: ['tag2'], meta: testMeta },
  ]
  const bookmark3: BookmarkKeyValuePair = [
    'url3',
    { tags: ['tag3'], meta: testMeta },
  ]
  const allBookmarks: BookmarkKeyValuePair[] = [bookmark1, bookmark2, bookmark3]

  it('should return an empty array if bookmarks is empty', () => {
    const result = filterBookmarksByUrls([], ['url1'])
    expect(result).toEqual([])
  })

  it('should return an empty array if urls is empty', () => {
    const result = filterBookmarksByUrls(allBookmarks, [])
    expect(result).toEqual([])
  })

  it('should return an empty array if no bookmarks match the given urls', () => {
    const result = filterBookmarksByUrls(allBookmarks, ['url4', 'url5'])
    expect(result).toEqual([])
  })

  it('should filter bookmarks when bookmarks count is greater than urls count', () => {
    const result = filterBookmarksByUrls(allBookmarks, ['url1', 'url3'])
    expect(result).toEqual([bookmark1, bookmark3])
  })

  it('should filter bookmarks when bookmarks count is less than urls count', () => {
    const bookmarks: BookmarkKeyValuePair[] = [bookmark1]
    const result = filterBookmarksByUrls(bookmarks, ['url1', 'url2', 'url3'])
    expect(result).toEqual([bookmark1])
  })

  it('should filter bookmarks when bookmarks count is equal to urls count and all match', () => {
    const result = filterBookmarksByUrls(allBookmarks, ['url1', 'url2', 'url3'])
    expect(result).toEqual(allBookmarks)
  })

  it('should filter bookmarks when bookmarks count is equal to urls count and some match', () => {
    const result = filterBookmarksByUrls(allBookmarks, ['url1', 'url4', 'url2'])
    expect(result).toEqual([bookmark1, bookmark2])
  })

  it('should handle duplicate urls in the urls array correctly', () => {
    const result = filterBookmarksByUrls(allBookmarks, ['url1', 'url1', 'url2'])
    expect(result).toEqual([bookmark1, bookmark2])
  })

  it('should handle bookmarks with empty tags or meta', () => {
    const bookmark4: BookmarkKeyValuePair = [
      'url4',
      { tags: [], meta: testMeta },
    ]
    const bookmark5: BookmarkKeyValuePair = [
      'url5',
      { tags: [], meta: { created: 1, updated: 1 } },
    ]
    const bookmarksWithEmptyMeta: BookmarkKeyValuePair[] = [
      bookmark4,
      bookmark5,
    ]
    const result = filterBookmarksByUrls(bookmarksWithEmptyMeta, ['url4'])
    expect(result).toEqual([bookmark4])
  })
})
