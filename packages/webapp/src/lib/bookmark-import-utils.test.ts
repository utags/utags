import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { JSDOM } from 'jsdom'
import { htmlToBookmarks, validateBookmarks } from './bookmark-import-utils.js'

// Setup JSDOM environment
beforeAll(() => {
  const dom = new JSDOM()
  globalThis.DOMParser = dom.window.DOMParser
})

afterAll(() => {
  // Clean up global variables
  // @ts-expect-error Reset global variables
  globalThis.DOMParser = undefined
})

describe('htmlToBookmarks', () => {
  it('should handle empty HTML', () => {
    const result = htmlToBookmarks('')
    expect(result.data).toEqual({})
    expect(result.meta.databaseVersion).toBe(3)
  })

  it('should handle basic bookmark structure', () => {
    const html = `
      <dl>
        <dt><a href="https://example.com" add_date="1620000000">Example</a></dt>
      </dl>
    `
    const result = htmlToBookmarks(html)
    expect(Object.keys(result.data)).toHaveLength(1)
    expect(result.data['https://example.com'].meta.title).toBe('Example')
    expect(result.data['https://example.com'].tags).toEqual([
      '/Other Bookmarks',
    ])
  })

  it('should handle bookmarks with tags', () => {
    const html = `
      <dl>
        <dt><a href="https://example.com" add_date="1620000000" tags="tag1,tag2">Example</a></dt>
      </dl>
    `
    const result = htmlToBookmarks(html)
    expect(result.data['https://example.com'].tags).toEqual([
      '/Other Bookmarks',
      'tag1',
      'tag2',
    ])
  })

  it('should handle folder structure', () => {
    const html = `
      <dl>
        <dt><h3>Folder</h3>
          <dl>
            <dt><a href="https://example.com" add_date="1620000000">Example</a></dt>
          </dl>
        </dt>
      </dl>
    `
    const result = htmlToBookmarks(html)
    expect(result.data['https://example.com'].tags).toEqual(['/Folder'])
  })

  it('should handle nested folder structure', () => {
    const html = `
      <dl>
        <dt><h3>Parent</h3>
          <dl>
            <dt><h3>Child</h3>
              <dl>
                <dt><a href="https://example.com" add_date="1620000000">Example</a></dt>
              </dl>
            </dt>
          </dl>
        </dt>
      </dl>
    `
    const result = htmlToBookmarks(html)
    expect(result.data['https://example.com'].tags).toEqual(['/Parent/Child'])
  })

  it('should ignore place: protocol bookmarks', () => {
    const html = `
      <dl>
        <dt><a href="place:type=6">Recent Tags</a></dt>
        <dt><a href="https://example.com">Example</a></dt>
      </dl>
    `
    const result = htmlToBookmarks(html)
    expect(Object.keys(result.data)).toHaveLength(1)
    expect(result.data['https://example.com']).toBeDefined()
  })

  it('should merge duplicate bookmarks', () => {
    const html = `
      <dl>
        <dt><a href="https://example.com" add_date="1620000000" tags="tag1">Example</a></dt>
        <dt><a href="https://example.com" add_date="1620000001" tags="tag2">Example 2</a></dt>
      </dl>
    `
    const result = htmlToBookmarks(html)
    expect(result.data['https://example.com'].tags).toEqual([
      '/Other Bookmarks',
      'tag1',
      'tag2',
    ])
    expect(result.data['https://example.com'].meta.title).toBe('Example 2')
  })

  it('should handle Firefox exported HTML format', () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
      <dl>
        <dt><a href="https://example.com" add_date="1620000000" last_modified="1620000001">Example</a></dt>
      </dl>
    `
    const result = htmlToBookmarks(html)
    expect(result.data['https://example.com']).toBeDefined()
  })

  it('should handle Chrome exported HTML format', () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <!-- This is an automatically generated file. -->
      <dl>
        <dt><a href="https://example.com" add_date="1620000000">Example</a></dt>
      </dl>
    `
    const result = htmlToBookmarks(html)
    expect(result.data['https://example.com']).toBeDefined()
  })

  it('should handle Safari exported HTML format', () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <HTML>
      <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
      <Title>Bookmarks</Title>
      <H1>Bookmarks</H1>
      <DT><H3 FOLDED>Favorites</H3>
      <DL><p>
          <DT><A HREF="https://www.google.com">Google</A>
          <DT><H3 FOLDED>News</H3>
          <DL><p>
              <DT><A HREF="https://news.example.com">Example News</A>
          </DL><p>
      </DL><p>
    `
    const result = htmlToBookmarks(html)
    expect(Object.keys(result.data)).toHaveLength(2)
    expect(result.data['https://www.google.com']).toBeDefined()
    expect(result.data['https://news.example.com']).toBeDefined()
    expect(result.data['https://news.example.com'].tags).toEqual([
      '/Favorites/News',
    ])
  })

  it('should handle bookmarks without add_date', () => {
    const html = `
      <dl>
        <dt><a href="https://example.com">Example</a></dt>
      </dl>
    `
    const result = htmlToBookmarks(html)
    expect(result.data['https://example.com'].meta.created).toBeGreaterThan(
      9_999_999_999_999
    )
  })

  it('should handle bookmarks with add_date as 0', () => {
    const html = `
      <dl>
        <dt><a href="https://example.com" add_date="0">Example</a></dt>
      </dl>
    `
    const result = htmlToBookmarks(html)
    expect(result.data['https://example.com'].meta.created).toBeGreaterThan(
      9_999_999_999_999
    )
  })

  it('should handle bookmarks with last_modified as 0', () => {
    const html = `
      <dl>
        <dt><a href="https://example.com" add_date="1620000000" last_modified="0">Example</a></dt>
      </dl>
    `
    const result = htmlToBookmarks(html)
    expect(result.data['https://example.com'].meta.updated).toBe(0)
  })

  it('should handle folder names with spaces', () => {
    const html = `
      <dl>
        <dt><h3>Bookmarks Bar</h3>
          <dl>
            <dt><h3>   test </h3>
              <dl>
                <dt><a href="https://example.com">Example</a></dt>
              </dl>
            </dt>
          </dl>
        </dt>
      </dl>
    `
    const result = htmlToBookmarks(html)
    expect(result.data['https://example.com'].tags).toEqual([
      '/Bookmarks Bar/test',
    ])
  })

  it('should handle empty folder names', () => {
    const html = `
      <dl>
        <dt><h3>Bookmarks Bar</h3>
          <dl>
            <dt><h3></h3>
              <dl>
                <dt><a href="https://example.com">Example</a></dt>
              </dl>
            </dt>
            <dt><h3> </h3>
              <dl>
                <dt><a href="https://example2.com">Example2</a></dt>
              </dl>
            </dt>
          </dl>
        </dt>
      </dl>
    `
    const result = htmlToBookmarks(html)
    expect(result.data['https://example.com'].tags).toEqual(['/Bookmarks Bar/'])
    expect(result.data['https://example2.com'].tags).toEqual([
      '/Bookmarks Bar/',
    ])
  })

  it('should handle multi-level empty folder names', () => {
    const html = `
      <dl>
        <dt><h3>Bookmarks Bar</h3>
          <dl>
            <dt><h3>test</h3>
              <dl>
                <dt><h3></h3>
                  <dl>
                    <dt><a href="https://example.com">Example</a></dt>
                  </dl>
                </dt>
                <dt><h3> </h3>
                  <dl>
                    <dt><a href="https://example2.com">Example2</a></dt>
                  </dl>
                </dt>
              </dl>
            </dt>
          </dl>
        </dt>
      </dl>
    `
    const result = htmlToBookmarks(html)
    expect(result.data['https://example.com'].tags).toEqual([
      '/Bookmarks Bar/test/',
    ])
    expect(result.data['https://example2.com'].tags).toEqual([
      '/Bookmarks Bar/test/',
    ])
  })

  it('should handle folder names with multiple slashes and spaces', () => {
    const html = `
      <dl>
        <dt><h3>Bookmarks Bar</h3>
          <dl>
            <dt><h3>test</h3>
              <dl>
                <dt><h3> </h3>
                  <dl>
                    <dt><h3>/ /</h3>
                      <dl>
                        <dt><h3> </h3>
                          <dl>
                            <dt><a href="https://example.com">Example</a></dt>
                          </dl>
                        </dt>
                      </dl>
                    </dt>
                  </dl>
                </dt>
              </dl>
            </dt>
          </dl>
        </dt>
      </dl>
    `
    const result = htmlToBookmarks(html)
    expect(result.data['https://example.com'].tags).toEqual([
      '/Bookmarks Bar/test/////',
    ])
  })
})

describe('validateBookmarks', () => {
  const validBookmarks = {
    data: {
      'https://example.com': {
        tags: ['tag1'],
        meta: {
          title: 'Example',
          created: 1_620_000_000_000,
          updated: 1_620_000_001_000,
        },
      },
    },
    meta: {
      databaseVersion: 3,
      created: 1_620_000_000_000,
      exported: 1_620_000_000_000,
    },
  }

  it('should validate valid bookmark data', () => {
    const result = validateBookmarks(validBookmarks)
    expect(result.total).toBe(1)
    expect(result.noCreated).toBe(0)
  })

  it('should reject non-object input', () => {
    // @ts-expect-error Test invalid input type
    expect(() => validateBookmarks(null)).toThrow('无效的JSON格式')
    // @ts-expect-error Test invalid input type
    expect(() => validateBookmarks(undefined)).toThrow('无效的JSON格式')
    // @ts-expect-error Test invalid input type
    expect(() => validateBookmarks('string')).toThrow('无效的JSON格式')
  })

  it('should reject missing data field', () => {
    const invalid = { ...validBookmarks, data: undefined }
    // @ts-expect-error Test missing data field
    expect(() => validateBookmarks(invalid)).toThrow('缺少data字段或格式不正确')
  })

  it('should automatically create missing meta field', () => {
    const invalid = { ...validBookmarks, meta: undefined }
    // @ts-expect-error Test missing meta field
    const result = validateBookmarks(invalid)
    expect(result.total).toBe(1)
    expect(result.data.meta).toBeDefined()
    expect(result.data.meta.databaseVersion).toBe(3)
    expect(typeof result.data.meta.created).toBe('number')
    expect(typeof result.data.meta.exported).toBe('number')
  })

  it('should reject invalid meta field', () => {
    const invalidMeta = {
      ...validBookmarks,
      meta: { databaseVersion: '3' },
    }
    // @ts-expect-error Test invalid meta field type
    expect(() => validateBookmarks(invalidMeta)).toThrow(
      '数据文件版本不支持，请联系开发者'
    )
  })

  it('should reject invalid databaseVersion value', () => {
    const invalidVersion = {
      ...validBookmarks,
      meta: { ...validBookmarks.meta, databaseVersion: 2 },
    }
    expect(() => validateBookmarks(invalidVersion)).toThrow(
      '数据文件版本不支持，请联系开发者'
    )
  })

  it('应该拒绝无效的meta字段', () => {
    const invalidMeta = {
      ...validBookmarks,
      meta: { databaseVersion: 3, created: '1620000000000' },
    }
    // @ts-expect-error Test invalid meta field type
    expect(() => validateBookmarks(invalidMeta)).toThrow(
      'meta 字段里的属性类型错误'
    )
  })

  it('应该拒绝无效的meta字段', () => {
    const invalidMeta = {
      ...validBookmarks,
      meta: { databaseVersion: 3, exported: '1620000000000' },
    }
    // @ts-expect-error Test invalid meta field type
    expect(() => validateBookmarks(invalidMeta)).toThrow(
      'meta 字段里的属性类型错误'
    )
  })

  it('should reject invalid bookmark tags field', () => {
    const invalidData = {
      ...validBookmarks,
      data: {
        'https://example.com': {
          tags: 'not-an-array',
          meta: validBookmarks.data['https://example.com'].meta,
        },
      },
    }
    // @ts-expect-error Test invalid tags field type
    expect(() => validateBookmarks(invalidData)).toThrow(
      '书签 https://example.com 缺少有效的tags字段'
    )
  })

  it('should reject invalid bookmark meta field', () => {
    const invalidData = {
      ...validBookmarks,
      data: {
        'https://example.com': {
          tags: ['tag1'],
          meta: { created: '1620000000000', updated: 1_620_000_001_000 },
        },
      },
    }
    // @ts-expect-error Test invalid meta field type
    expect(() => validateBookmarks(invalidData)).toThrow(
      '书签 https://example.com 的meta字段缺少必要属性'
    )
  })

  it('should count bookmarks without creation time', () => {
    const noCreatedData = {
      ...validBookmarks,
      data: {
        'https://example.com': {
          tags: ['tag1'],
          meta: {
            title: 'Example',
            created: 99_999_999_999_999, // Invalid creation time
            updated: 1_620_000_001_000,
          },
        },
      },
    }
    const result = validateBookmarks(noCreatedData)
    expect(result.noCreated).toBe(1)
  })

  it('should handle multiple bookmarks', () => {
    const multipleBookmarks = {
      ...validBookmarks,
      data: {
        ...validBookmarks.data,

        'https://example2.com': {
          tags: ['tag2'],
          meta: {
            title: 'Example 2',
            created: 1_620_000_002_000,
            updated: 1_620_000_003_000,
          },
        },
      },
    }
    const result = validateBookmarks(multipleBookmarks)
    expect(result.total).toBe(2)
  })
})
