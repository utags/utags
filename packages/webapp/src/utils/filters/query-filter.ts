import Console from 'console-tagger'
import { normalizeAndDeduplicateStrings, deduplicateArrays } from '../index.js'
import { getHostName } from '../url-utils.js'
import type { FilterCondition } from '../filter-registry.js'
import type { BookmarkMetadata } from '../../types/bookmarks.js'
import {
  extractValidRegexes,
  encodeRegex,
  createRegexFromEncoded,
  type RegexExtraction,
} from '../regex-utils.js'

const console = new Console({
  prefix: 'query-filter',
  color: { line: 'white', background: 'orange' },
})

type MatcherInput = {
  href: string
  tags: string[]
  meta: BookmarkMetadata
}

export type QueryMatcher = (input: MatcherInput) => boolean

// 创建单一条件
// 使用函数式方法实现组合模式
type Condition = (input: MatcherInput) => boolean

// 创建AND条件组合
const createAndCondition =
  (conditions: Condition[]): Condition =>
  (input: MatcherInput) =>
    conditions.every((condition) => condition(input))

// 创建OR条件组合
const createOrCondition =
  (conditions: Condition[]): Condition =>
  (input: MatcherInput) =>
    conditions.some((condition) => condition(input))

const createNegatedCondition =
  (condition: Condition): Condition =>
  (input: MatcherInput) =>
    !condition(input)

const getCondition = (condition: Condition): Condition => condition

const createTitleCondition = (keyword: string) => {
  if (keyword.startsWith('re/')) {
    const regex = createRegexFromEncoded(keyword)
    if (regex) {
      return (input: MatcherInput) => regex.test(input.meta.title || '')
    }
  }

  return (input: MatcherInput) =>
    Boolean(input.meta.title?.toLowerCase().includes(keyword))
}

const createDescriptionCondition = (keyword: string) => {
  if (keyword.startsWith('re/')) {
    const regex = createRegexFromEncoded(keyword)
    if (regex) {
      return (input: MatcherInput) => regex.test(input.meta.description || '')
    }
  }

  return (input: MatcherInput) =>
    Boolean(input.meta.description?.toLowerCase().includes(keyword))
}

const createNoteCondition = (keyword: string) => {
  if (keyword.startsWith('re/')) {
    const regex = createRegexFromEncoded(keyword)
    if (regex) {
      return (input: MatcherInput) => regex.test(input.meta.note || '')
    }
  }

  return (input: MatcherInput) =>
    Boolean(input.meta.note?.toLowerCase().includes(keyword))
}

const createTagsCondition = (keyword: string) => {
  if (keyword.startsWith('re/')) {
    const regex = createRegexFromEncoded(keyword)
    if (regex) {
      return (input: MatcherInput) => input.tags.some((tag) => regex.test(tag))
    }
  }

  return (input: MatcherInput) =>
    input.tags.some((tag) => tag.toLowerCase().includes(keyword))
}

const createUrlCondition = (keyword: string) => {
  if (keyword.startsWith('re/')) {
    const regex = createRegexFromEncoded(keyword)
    if (regex) {
      return (input: MatcherInput) => regex.test(input.href)
    }
  }

  return (input: MatcherInput) => input.href.toLowerCase().includes(keyword)
}

const createDomainCondition = (keyword: string) => {
  if (keyword.startsWith('re/')) {
    const regex = createRegexFromEncoded(keyword)
    if (regex) {
      return (input: MatcherInput) => regex.test(getHostName(input.href))
    }
  }

  return (input: MatcherInput) => getHostName(input.href).includes(keyword)
}

/**
 * Normalizes query strings by applying the following transformations:
 * 1. Removes spaces around commas (e.g., "tag1 , tag2" -> "tag1,tag2")
 * 2. Consolidates multiple commas into a single comma (e.g., "tag1,,tag2" -> "tag1,tag2")
 * 3. Converts all text to lowercase (e.g., "Tag:JS" -> "tag:js")
 * 4. Replaces shorthand prefixes with their full forms (e.g., "t:js" -> "tag:js")
 * 5. Removes spaces around colons for specific prefixes like title:, tag:, etc.
 *    (e.g., "title : value" -> "title:value")
 * 6. Preserves spaces around colons for other prefixes (e.g., "other : value" remains unchanged)
 * 7. Consolidates multiple consecutive spaces into a single space
 * 8. Removes leading and trailing commas (e.g., ",tag1,tag2," -> "tag1,tag2")
 * 9. Trims leading and trailing whitespace
 *
 * @param {string} string - The input query string to normalize
 * @returns {string} The normalized query string
 */
export const normalizeQueryStrings = (string: string): string => {
  // Check if the string contains any regex patterns (indicated by '/')
  if (string.includes('/')) {
    // Extract all valid regex patterns from the string
    const regexes: RegexExtraction[] = extractValidRegexes(string)
    if (regexes.length > 0) {
      // For each valid regex pattern found
      for (const regex of regexes) {
        // Replace the original regex pattern with its encoded version
        // This prevents subsequent string operations (like toLowerCase)
        // from modifying the regex pattern incorrectly
        string = string.replace(`/${regex.pattern}/${regex.flags}`, (match) =>
          encodeRegex(match)
        )
      }
    }

    console.log('regexes', string)
  }

  return (
    string
      // Remove spaces around commas
      .replaceAll(/\s*,\s*/g, ',')
      // Consolidate multiple commas into a single comma
      .replaceAll(/,+/g, ',')
      // Convert to lowercase
      .toLowerCase()
      // Replace shorthand prefixes with their full forms
      .replaceAll(/\b(tags|t)\s*:/g, 'tag:')
      .replaceAll(/\b(href|u)\s*:/g, 'url:')
      .replaceAll(/\b(site|d)\s*:/g, 'domain:')
      .replaceAll(/\bti\s*:/g, 'title:')
      .replaceAll(/\bde\s*:/g, 'description:')
      .replaceAll(/\bn\s*:/g, 'note:')
      // Remove spaces around colons for specific prefixes
      .replaceAll(/\b(title|description|note|tag|url|domain)\s*:\s*/g, '$1:')
      // Consolidate multiple spaces into a single space
      .replaceAll(/\s+/g, ' ')
      // Remove leading and trailing commas
      .replaceAll(/^,+|,+$/g, '')

      .trim()
  )
}

/**
 * Expands prefixes in query strings and returns an array of terms
 * If the query string contains commas, returns an array with the original string
 * Otherwise, expands prefixes to space-separated terms and returns them as an array
 * For example:
 *   "tag:aaa bbb ccc" => ["tag:aaa", "tag:bbb", "tag:ccc"]
 *   "tag:aaa bbb note:ccc ddd" => ["tag:aaa", "tag:bbb", "note:ccc", "note:ddd"]
 *   "tag:aaa,tag:bbb" => ["tag:aaa,tag:bbb"]
 *
 * @param {string} query - The input query string
 * @returns {string[]} Array of terms with expanded prefixes
 */
export function expandPrefixes(query: string): string[] {
  // First normalize the query string
  const normalizedQuery = normalizeQueryStrings(query)
  console.log('normalizedQuery', normalizedQuery)

  // If contains comma after normalization, return an array with the original normalized string
  if (normalizedQuery.includes(',')) {
    return [normalizedQuery]
  }

  // Split the query string by spaces
  const parts = normalizedQuery.split(' ')

  // If only one part, return as single-item array
  if (parts.length <= 1) {
    return normalizedQuery ? [normalizedQuery] : []
  }

  const result: string[] = []
  let currentPrefix = ''

  // Iterate through all parts
  for (const part of parts) {
    // Check if it contains a prefix (like tag:, url:, etc.)
    const prefixMatch =
      /^([!-]?(title|description|note|tag|url|domain)):(.*)$/.exec(part)

    if (prefixMatch) {
      // If it has a prefix, update the current prefix and add the current part
      currentPrefix = prefixMatch[1] + ':'
      result.push(part)
    } else if (currentPrefix && part) {
      // If there's a current prefix and the current part is not empty, add the prefix to the current part
      result.push(currentPrefix + part)
    } else {
      // No prefix or current part is empty, add directly
      result.push(part)
      currentPrefix = '' // Reset prefix
    }
  }

  return result
}

/**
 * Sorts an array of query terms according to specific rules
 * Sorting rules:
 * 1. Prefixed terms > Non-prefixed terms > Terms with commas
 * 2. Prefixed terms priority: domain > url > tag > title > description > note
 * 3. For same priority: longer length > shorter length
 *
 * @param queries Array of query terms to be sorted
 * @returns Sorted array of query terms
 */
export function sortQueries(queries: string[]): string[] {
  // Prefix priority mapping, smaller number means higher priority

  const prefixPriority: Record<string, number> = {
    'domain:': 1,
    'url:': 2,
    'tag:': 3,
    'title:': 4,
    'description:': 5,
    'note:': 6,
  }

  // Get query priority
  const getQueryPriority = (query: string): number => {
    // Queries with commas have lowest priority
    if (query.includes(',')) {
      return 20
    }

    // Check if query has a prefix
    for (const prefix in prefixPriority) {
      if (query.startsWith(prefix)) {
        return prefixPriority[prefix]
      }
    }

    // Non-prefixed queries have medium priority
    return 10
  }

  return [...queries].sort((a, b) => {
    const priorityA = getQueryPriority(a)
    const priorityB = getQueryPriority(b)

    // First sort by priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    // For same priority, sort by length (longer > shorter)
    return b.length - a.length
  })
}

// 创建特定类型的匹配器
const createPrefixMatcher = (prefix: string, keyword: string): Condition => {
  switch (prefix) {
    case 'title': {
      return createTitleCondition(keyword)
    }

    case 'description': {
      return createDescriptionCondition(keyword)
    }

    case 'note': {
      return createNoteCondition(keyword)
    }

    case 'tag': {
      return createTagsCondition(keyword)
    }

    case 'url': {
      return createUrlCondition(keyword)
    }

    case 'domain': {
      return createDomainCondition(keyword)
    }

    default: {
      console.warn(`Unknown prefix: ${prefix}`)
      // 返回一个始终为false的条件
      return () => false
    }
  }
}

// 创建通用搜索匹配器（搜索所有字段）
const createGenericMatcher = (query: string): Condition =>
  createOrCondition([
    createTitleCondition(query),
    createDescriptionCondition(query),
    createNoteCondition(query),
    createTagsCondition(query),
    createUrlCondition(query),
    createDomainCondition(query),
  ])

/**
 * 从查询字符串数组创建条件数组
 * @param requiredQueries 处理后的查询字符串数组
 * @returns 条件数组
 */
const createConditionsFromQueries = (
  requiredQueries: string[]
): Condition[] => {
  const conditions: Condition[] = []

  console.log('requiredQueries', requiredQueries)

  for (const query of requiredQueries) {
    console.log('query', query)
    const prefixMatch =
      /^([!-])?(title|description|note|tag|url|domain):(.*)$/.exec(query)

    if (query.includes(',')) {
      console.warn(`Invalid query: ${query}`)
      const orQueryStrings = query.split(',')
      console.log('orQueryStrings:', orQueryStrings)
      const orConditions = deduplicateArrays(
        orQueryStrings
          // .map((orQuery) => normalizeQueryStrings(orQuery))
          .map((queryValue) => expandPrefixes(queryValue))
          .map((querys) => normalizeAndDeduplicateStrings(querys))
          .map((querys) => sortQueries(querys))
          .filter((querys) => querys.length > 0),
        true
      )
        .map((querys) => createConditionsFromQueries(querys))
        .filter((conditions) => conditions.length > 0)
        .map((conditions) => createAndCondition(conditions))

      console.log('orConditions:', orConditions)
      if (orConditions.length > 0) {
        conditions.push(createOrCondition(orConditions))
      }
    } else if (prefixMatch) {
      const isNegated = Boolean(prefixMatch[1])
      const prefix = prefixMatch[2]
      const keyword = prefixMatch[3]
      console.log('isNegated:', isNegated)
      console.log('prefix:', prefix)
      console.log('keyword:', `'${keyword}'`)

      if (!keyword) {
        console.warn(`Invalid query: '${query}'`)
        continue
      }

      const wrapper = isNegated ? createNegatedCondition : getCondition
      conditions.push(wrapper(createPrefixMatcher(prefix, keyword)))
    } else {
      const isNegated = query.startsWith('!') || query.startsWith('-')
      const actualQuery = isNegated ? query.slice(1) : query
      const wrapper = isNegated ? createNegatedCondition : getCondition
      conditions.push(wrapper(createGenericMatcher(actualQuery)))
    }
  }

  return conditions
}

export function createQueryFilterCondition(
  params: URLSearchParams
): FilterCondition | undefined {
  if (!params.has('q')) return undefined

  const queryValues = params.getAll('q')

  const requiredQueries = sortQueries(
    normalizeAndDeduplicateStrings(
      queryValues
        // .map((queryValue) => normalizeQueryStrings(queryValue))
        .flatMap((queryValue) => expandPrefixes(queryValue))
    )
  )

  console.log('requiredQueries', requiredQueries)

  if (requiredQueries.length === 0) {
    return undefined
  }

  // 使用提取的方法创建条件数组
  const conditions = createConditionsFromQueries(requiredQueries)

  // 如果没有有效条件，返回undefined
  if (conditions.length === 0) {
    return undefined
  }

  // 创建AND条件组合所有查询条件
  const finalCondition = createAndCondition(conditions)

  // 返回符合FilterCondition类型的函数
  return (href: string, tags: string[], meta: BookmarkMetadata) =>
    // debugger
    finalCondition({ href, tags, meta })
}
