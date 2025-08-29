/**
 * Supported types for bookmark filtering criteria
 */
export type BookmarkFilterType = 'keyword' | 'tag' | 'domain'

/**
 * Single bookmark filter condition
 * @remarks
 * Defines a filter condition with configurable matching rules
 * @example
 *  {
 *    type: 'keyword',
 *    value: 'example',
 *  }
 */
export type BookmarkFilter = {
  type: BookmarkFilterType
  value: string
  operator?: 'contains' | 'equals' | 'startsWith' | 'not-contains'
  caseSensitive?: boolean
}

/**
 * Set of filters combined with OR logic
 * @remarks
 * Filters in this set will match if any condition is satisfied
 * @example
 *  // Bookmarks with tag1 OR tag2
 *  [
 *    { type: 'tag', value: 'tag1' },
 *    { type: 'tag', value: 'tag2' },
 *  ]
 */
export type DisjunctiveFilterSet = BookmarkFilter[]

/**
 * Group of filter sets combined with AND logic
 * @remarks
 * Each inner set uses OR logic, while sets are combined with AND
 * @example
 *  // Bookmarks with (tag1 OR tag2) AND keyword 'example'
 *  [
 *    [
 *      { type: 'keyword', value: 'example' },
 *    ],
 *    [
 *      { type: 'tag', value: 'tag1' },
 *      { type: 'tag', value: 'tag2' },
 *    ],
 *  ]
 */
export type ConjunctiveFilterGroup = DisjunctiveFilterSet[]

/**
 * Nested structure for complex filter expressions
 * @remarks
 * Supports multi-level combinations of AND/OR filter conditions
 * @example
 *  [
 *    [
 *      [
 *        { type: 'keyword', value: 'example' },
 *      ],
 *      [
 *        { type: 'tag', value: 'tag1' },
 *        { type: 'tag', value: 'tag2' },
 *      ],
 *    ],
 *    [
 *      [
 *        { type: 'keyword', value: 'example2' },
 *      ],
 *      [
 *        { type: 'tag', value: 'tag3' },
 *        { type: 'tag', value: 'tag4' },
 *      ],
 *    ],
 *  ]
 */
export type NestedFilterExpression = ConjunctiveFilterGroup[]
