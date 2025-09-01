import Console from 'console-tagger'
import { splitTags, trimTitle } from 'utags-utils'
import appConfig from '../config/app-config.js'
import {
  HASH_DELIMITER,
  FILTER_DELIMITER,
  OR_CONDITION_DELIMITER,
  DELETED_BOOKMARK_TAG,
} from '../config/constants.js'
import { getFilterStringByPathname } from '../stores/collections.js'

const console = new Console({
  prefix: 'url-utils',
  color: { line: 'white', background: 'orange' },
})

/**
 * Extracts the hostname from a URL string.
 *
 * This function safely parses a URL string and returns the hostname for standard
 * web protocols (http, https, ftp), or returns the protocol for non-standard URLs.
 *
 * @param {string} href - The URL string to extract hostname from
 * @returns {string} The hostname if URL is valid and uses standard protocol,
 *                   the protocol string for non-standard URLs,
 *                   or empty string if URL is invalid or empty
 *
 * @example
 * // Returns "example.com"
 * getHostName("https://example.com/path?query=value")
 *
 * @example
 * // Returns "sub.example.com"
 * getHostName("http://sub.example.com:8080")
 *
 * @example
 * // Returns "file:"
 * getHostName("file:///path/to/file.txt")
 *
 * @example
 * // Returns ""
 * getHostName("")
 *
 * @example
 * // Returns ""
 * getHostName("invalid-url")
 */
export function getHostName(href: string) {
  if (!href) {
    return ''
  }

  try {
    const url = new URL(href)
    if (
      url.protocol === 'http:' ||
      url.protocol === 'https:' ||
      url.protocol === 'ftp:'
    ) {
      return url.hostname
    }

    return url.protocol
  } catch {
    return ''
  }
}

/**
 * Normalizes and simplifies a URL by:
 * 1. Removing tracking parameters (utm_*, fbclid, etc)
 * 2. Simplifying path segments (keep first 2 or last 1)
 * 3. Removing trailing slashes
 * 4. Decoding special characters
 * 5. Stripping protocol and www prefix
 * @param {string} url - Original URL to process
 * @returns {string} Cleaned and human-readable URL
 */
export function humanizeUrl(url: string) {
  try {
    const parsed = new URL(url)

    // Filter common tracking parameters while preserving valid query parameters
    const allowedParameters = [...parsed.searchParams].filter(
      ([key]) => !/^(utm_|fbclid|gclid|mc_|yclid|_ga|zanpid)/.test(key)
    )

    // Path simplification logic: Keep first and last segments when exceeding 2, otherwise keep original
    const pathSegments = parsed.pathname.split('/').filter(Boolean)
    const simplifiedPath =
      pathSegments.length > 4
        ? `/${pathSegments[0]}/.../${pathSegments.slice(-2).join('/')}`
        : parsed.pathname

    // Build new URL object with cleaned parameters and simplified path
    const cleaned = new URL(parsed.origin)
    cleaned.pathname = simplifiedPath
    for (const [k, v] of allowedParameters) {
      cleaned.searchParams.set(k, v)
    }

    // Decode URI components and remove protocol, www prefix, and trailing slash
    return decodeURIComponent(`${cleaned.toString()}${parsed.hash}`)
      .replace(/\/$/, '')
      .replace(/^(https?:\/\/)?(www\.)?/, '')
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split(/[?#]/)[0]
  }
}

/**
 * Cleans trailing spaces and slashes from filter string
 * @param {string|undefined} str - Raw string with possible trailing spaces/slashes
 * @returns {string} Cleaned string
 * @example
 * cleanFilterString('a,b,c/a.com/  ') // => 'a,b,c/a.com'
 * cleanFilterString('a,b,c/  /  ')   // => 'a,b,c'
 */
export function cleanFilterString(filterString: string | undefined) {
  if (!filterString) {
    return ''
  }

  return filterString.replace(/[\s/]+$/, '').trim()
}

/**
 * Converts tags, domains, and keywords into a URL-safe filter string
 * @param {Set<string>} tags - Set of tags to encode
 * @param {Set<string>} domains - Set of domains to encode
 * @param {string} keyword - Search keyword to encode
 * @returns {string} Formatted as [encoded_tags]/[encoded_domains]/[encoded_keyword]
 * @example
 * convertToFilterString(new Set(['tag1', 'tag2']), new Set(['example.com', 'test.com']), 'keyword')
 * // Returns 'tag1%2Ctag2/example.com%2Ctest.com/keyword'
 * @example
 * convertToFilterString(new Set(), new Set(), '')
 * // Returns ''
 */
export function convertToFilterString(
  tags: Set<string>,
  domains: Set<string>,
  keyword: string
) {
  const filterString = [
    encodeURIComponent([...tags].join(OR_CONDITION_DELIMITER)),
    encodeURIComponent([...domains].join(OR_CONDITION_DELIMITER)),
    encodeURIComponent(keyword.trim()),
  ].join(FILTER_DELIMITER)

  return filterString === '//' ? '' : filterString.replace(/[/#]+$/, '')
}

/**
 * Parses filter string from URL hash
 * @param {string} filterString - Format: `[tags]/[domains]/[keyword]`
 *                                 - tags: URL-encoded comma-separated tags (e.g 'tag1%2Ctag2')
 *                                 - domains: URL-encoded comma-separated domains
 *                                 - keyword: URL-encoded search term
 * @returns {Object|undefined} Object with:
 *                  - searchKeyword: Cleaned search term
 *                  - selectedTags: Set of tags
 *                  - selectedDomains: Set of domains
 *                 Returns undefined on parse failure
 * @example
 * // Input example
 * parseFilterString('tag1%2Ctag2/example.com%2Ctest.com/keyword%20test')
 * // Returns
 * {
 *   searchKeyword: 'keyword test',
 *   selectedTags: new Set(['tag1', 'tag2']),
 *   selectedDomains: new Set(['example.com', 'test.com'])
 * }
 */
export function parseFilterString(filterString: string | undefined) {
  try {
    console.info(`current filter string: [${filterString}]`)

    if (filterString) {
      // Split into three parts: tags, domains, keyword [tags/domains/keyword]
      const [tagString = '', domainString = '', keyword = ''] =
        filterString.split(FILTER_DELIMITER, 3)

      // Process tag array (returns empty array if empty string)
      const tags = splitTags(decodeURIComponent(tagString))

      // Process domain array (returns empty array if empty string)
      const domains = splitTags(decodeURIComponent(domainString))

      // Clean and decode search keyword
      const cleanedKeyword = trimTitle(decodeURIComponent(keyword))

      return {
        searchKeyword: cleanedKeyword,
        selectedTags: new Set(tags),
        selectedDomains: new Set(domains),
      }
    }
  } catch (error) {
    console.error('Failed to parse filter string:', {
      error,
      filterString,
    })
  }

  return undefined
}

/**
 * Converts a hash-based filter string into URLSearchParams format.
 *
 * This function takes a URL hash string containing filter information in the format
 * `tag1%2Ctag2/example.com%2Ctest.com/keyword%20test` and converts it into URLSearchParams
 * with the structure `t=tag1,tag2&d=example.com,test.com&q=keyword test`.
 *
 * @param {string|undefined} hash - The URL hash string containing filter information.
 *                                 Expected format: `[encoded_tags]/[encoded_domains]/[encoded_keyword]`
 * @returns {URLSearchParams} A URLSearchParams object containing the parsed filter parameters:
 *                           - 't' parameter for tags (comma-separated)
 *                           - 'd' parameter for domains (comma-separated)
 *                           - 'q' parameter for search keyword
 * @example
 * // Returns URLSearchParams with 't=tag1,tag2&d=example.com,test.com&q=keyword test'
 * parseHashFiltersToSearchParams('tag1%2Ctag2/example.com%2Ctest.com/keyword%20test');
 *
 * @example
 * // Returns URLSearchParams with 't=tag1,tag2&d=example.com,test.com&q=keyword test&t=tag3,tag4&d=example.net,test.net&q=keyword test2'
 * parseHashFiltersToSearchParams('tag1%2Ctag2/example.com%2Ctest.com/keyword%20test#tag3%2Ctag4/example.net%2Ctest.net/keyword%20test2');
 *
 * @example
 * // Returns empty URLSearchParams
 * parseHashFiltersToSearchParams('');
 */
export function parseHashFiltersToSearchParams(
  hash: string | undefined
): URLSearchParams {
  const searchParams = new URLSearchParams()

  if (!hash?.trim()) return searchParams

  const filterStrings = hash.split(HASH_DELIMITER).filter(Boolean)

  for (const filterString of filterStrings) {
    const filter = parseFilterString(filterString)
    if (!filter) continue

    const { selectedTags, selectedDomains, searchKeyword } = filter

    if (selectedTags.size > 0) {
      searchParams.append(
        't',
        Array.from(selectedTags).join(OR_CONDITION_DELIMITER)
      )
    }

    if (selectedDomains.size > 0) {
      searchParams.append(
        'd',
        Array.from(selectedDomains).join(OR_CONDITION_DELIMITER)
      )
    }

    if (searchKeyword) {
      searchParams.append('q', searchKeyword)
    }
  }

  return searchParams
}

/**
 * Extracts filter parameters from URL hash and merges them into URL search parameters.
 *
 * This function takes a URL string, extracts the hash portion containing filter parameters,
 * converts them to URLSearchParams format using parseHashFiltersToSearchParams,
 * and merges them into the existing URL search parameters.
 *
 * @param {string} href - The URL string containing both search parameters and hash
 * @returns {void} Modifies the URL's search parameters in place by merging hash parameters
 * @example
 * // For URL 'https://example.com?existing=param#tag1,tag2/domain.com/keyword'
 * // Will merge hash parameters into search params as 'existing=param&t=tag1,tag2&d=domain.com&q=keyword'
 * mergeHashFiltersIntoSearchParams('https://example.com?existing=param#tag1,tag2/domain.com/keyword');
 */
export function mergeHashFiltersIntoSearchParams(
  href: string
): URLSearchParams {
  const url = new URL(href)
  const searchParams = url.searchParams
  const hash = url.hash
  const searchParams2 = parseHashFiltersToSearchParams(hash)
  for (const [key, value] of searchParams2.entries()) {
    searchParams.append(key, value)
  }

  return searchParams
}

/**
 * Transforms collection URL paths into query parameters format
 *
 * This function converts collection-specific URL path patterns into standardized query parameters,
 * making URL handling more consistent throughout the application.
 *
 * Supports the following path patterns:
 * - /collections/{collection-id} -> ?collection={collection-id}
 * - /c/{collection-id} -> ?collection={collection-id}
 * - /collections/shared/{collection-id} -> ?collection={collection-id}&v=shared
 * - /collections/public/{collection-id} -> ?collection={collection-id}&v=public
 * - /collections/private/{collection-id} -> ?collection={collection-id}&v=private
 * - /c/shared/{collection-id} -> ?collection={collection-id}&v=shared
 * - /c/public/{collection-id} -> ?collection={collection-id}&v=public
 * - /c/private/{collection-id} -> ?collection={collection-id}&v=private
 *
 * @param url - The URL to transform
 * @returns The URL with collection path converted to query parameters
 *
 * @example
 * // Basic collection URL
 * transformCollectionPathToQueryParams('https://example.com/collections/my-collection')
 * // Returns: 'https://example.com/?collection=my-collection'
 *
 * @example
 * // Shared collection URL
 * transformCollectionPathToQueryParams('https://example.com/c/shared/shared-collection')
 * // Returns: 'https://example.com/?collection=shared-collection&v=shared'
 *
 * @example
 * // Public collection URL
 * transformCollectionPathToQueryParams('https://example.com/collections/public/public-collection')
 * // Returns: 'https://example.com/?collection=public-collection&v=public'
 *
 * @example
 * // Private collection URL
 * transformCollectionPathToQueryParams('https://example.com/c/private/private-collection')
 * // Returns: 'https://example.com/?collection=private-collection&v=private'
 */
export function transformCollectionPathToQueryParams(url: string): string {
  const urlObj = new URL(url)
  const searchParams = new URLSearchParams(urlObj.search)
  const pathname = urlObj.pathname

  // Match collection patterns
  const collectionRegex =
    /^\/(?:collections?|c)\/(?:(shared|public|private)\/)?([^/]+)(?:\/(.*))?$/
  const match = collectionRegex.exec(pathname)

  if (match) {
    const [, visibility, collectionId, remainingPath] = match
    const collectionIdValue = collectionId.replaceAll(/[^\w-]/g, '')

    const newParams = new URLSearchParams()
    if (collectionIdValue) {
      // Add collection parameter (place at the beginning)
      newParams.set('collection', collectionIdValue)
      // Add visibility parameter if present (place after collection)
      if (visibility) {
        newParams.set('v', visibility)
      }
    }

    // Add all existing parameters
    for (const [key, value] of searchParams.entries()) {
      newParams.set(key, value)
    }

    // Update URL with new search parameters and remaining path
    urlObj.search = newParams.toString()
    urlObj.pathname = remainingPath ? `/${remainingPath}` : '/'

    return urlObj.toString()
  }

  // If no match, return the original URL
  return url
}

/**
 * Builds a URL path or query string for a collection.
 *
 * The `collectionId` is first sanitized by removing any characters that are not
 * alphanumeric or hyphens (i.e., matching `/[^\w-]/g`). If the sanitized
 * `collectionId` becomes empty as a result, this function returns `"/"`.
 *
 * The format of the returned string depends on the `appConfig.preferQueryString` setting:
 * - If `true`, it returns a query string like `/?collection={sanitizedCollectionId}&v={visibility}`.
 *   The `URLSearchParams` constructor automatically handles URL encoding for query parameters.
 * - If `false`, it returns a path like `/c/{visibility}/{sanitizedCollectionId}` or `/c/{sanitizedCollectionId}`.
 *   The sanitized `collectionId` is used directly as it only contains URL-safe characters for path segments.
 *
 * The `visibility` parameter is only included if it's one of 'shared', 'public', or 'private'.
 *
 * @param {string} collectionId - The ID of the collection. It will be sanitized.
 * @param {string} [visibility] - Optional visibility of the collection ('shared', 'public', 'private').
 * @returns {string} The constructed URL path or query string for the collection, or "/" if sanitized collectionId is empty.
 *
 * @example
 * // Assuming appConfig.preferQueryString = true
 * buildCollectionPath('my-notes')
 * // Returns: "/?collection=my-notes"
 *
 * buildCollectionPath('shared-docs', 'shared')
 * // Returns: "/?collection=shared-docs&v=shared"
 *
 * buildCollectionPath('special/chars&id=value!', 'public') // Sanitized to "specialcharsidvalue"
 * // Returns: "/?collection=specialcharsidvalue&v=public"
 *
 * buildCollectionPath('id with spaces', 'public') // Sanitized to "idwithspaces"
 * // Returns: "/?collection=idwithspaces&v=public"
 *
 * buildCollectionPath('') // Sanitized to ""
 * // Returns: "/"
 *
 * buildCollectionPath('!@#$%^', 'private') // Sanitized to ""
 * // Returns: "/"
 *
 * @example
 * // Assuming appConfig.preferQueryString = false
 * buildCollectionPath('my-work')
 * // Returns: "/c/my-work"
 *
 * buildCollectionPath('project-alpha', 'private')
 * // Returns: "/c/private/project-alpha"
 *
 * buildCollectionPath('another/id with spaces', 'public') // Sanitized to "anotheridwithspaces"
 * // Returns: "/c/public/anotheridwithspaces"
 *
 * buildCollectionPath('!@#$', 'shared') // Sanitized to ""
 * // Returns: "/"
 */
export function buildCollectionPath(
  collectionId: string,
  visibility?: string
): string {
  const collectionIdValue = collectionId.replaceAll(/[^\w-]/g, '')
  if (!collectionIdValue) {
    return '/'
  }

  const isValidVisibility =
    visibility && ['shared', 'public', 'private'].includes(visibility)

  if (appConfig.preferQueryString) {
    const params = new URLSearchParams()
    params.set('collection', collectionIdValue)
    if (isValidVisibility) {
      params.set('v', visibility)
    }

    return `${appConfig.base}?${params.toString()}`
  }

  // Path-based construction
  const pathSegments = ['c']
  if (isValidVisibility) {
    pathSegments.push(visibility)
  }

  pathSegments.push(collectionIdValue)
  return `/${pathSegments.join('/')}`
}

/**
 * Converts collection parameter in URL search params to filter string parameters
 *
 * This function extracts the collection ID from URL search parameters,
 * retrieves the corresponding filter string using getFilterStringByPathname,
 * and replaces the collection parameter with the filter string parameters.
 * If the collection doesn't exist, it adds special domain filters that will
 * result in an empty bookmark list (via rejectAllCondition).
 *
 * @param {URLSearchParams} searchParams - The URL search parameters containing collection parameter
 * @returns {URLSearchParams} New URLSearchParams with collection replaced by filter parameters
 *
 * @example
 * // For searchParams with 'collection=my-collection&v=shared'
 * // If getFilterStringByPathname returns 'tag1,tag2/domain.com/keyword'
 * // Returns URLSearchParams with 't=tag1,tag2&d=domain.com&q=keyword&v=shared'
 * convertCollectionToFilterParams(new URLSearchParams('collection=my-collection&v=shared'));
 *
 * @example
 * // For non-existent collection
 * // Returns URLSearchParams with 'd=unexisted-collection.com&d=unexisted-collection.org&v=shared'
 * // (These domain filters will result in an empty bookmark list)
 * convertCollectionToFilterParams(new URLSearchParams('collection=non-existent&v=shared'));
 */
export function convertCollectionToFilterParams(
  searchParams: URLSearchParams
): URLSearchParams {
  const collectionId = searchParams.get('collection')
  const visibility = searchParams.get('v')

  // Create new search params to avoid modifying the original
  const newSearchParams = new URLSearchParams()

  if (collectionId === 'deleted') {
    // Do not convert 'deleted' collection
    newSearchParams.set('t', DELETED_BOOKMARK_TAG)
  } else if (
    collectionId &&
    visibility &&
    ['shared', 'public', 'private'].includes(visibility)
  ) {
    // TODO: 处理不同可见性类型的集合
    console.log(
      `convertCollectionToFilterParams: ${visibility} collection is not fully supported yet`
    )
    newSearchParams.set('c', collectionId)
  } else if (collectionId) {
    // If collection ID exists, get filter string and convert to search params
    const filterString = getFilterStringByPathname(collectionId)
    if (filterString) {
      // Parse filter string to search params
      const filterParams = new URLSearchParams(filterString)

      // Add filter params to new search params
      for (const [key, value] of filterParams.entries()) {
        newSearchParams.append(key, value)
      }
    } else {
      // For non-existent collections, display an empty bookmark list by creating multiple domain
      // filter conditions that will trigger the rejectAllCondition logic
      newSearchParams.append('d', 'unexisted-collection.com')
      newSearchParams.append('d', 'unexisted-collection.org')
    }
  }

  // Copy all parameters except 'collection'
  for (const [key, value] of searchParams.entries()) {
    if (key !== 'collection') {
      newSearchParams.append(key, value)
    }
  }

  return newSearchParams
}

/**
 * Appends new search parameters to existing search parameters.
 *
 * This function takes an initial set of search parameters and a new set of search parameters,
 * and returns a new URLSearchParams object with the new parameters appended to the original ones.
 * If a key from newSearchParams already exists in orgSearchParams, the new value will be added,
 * potentially resulting in multiple values for that key.
 *
 * @param {URLSearchParams | Record<string, string> | string} orgSearchParams - The original search parameters.
 *   Can be a URLSearchParams object, a record of string key-value pairs, or a query string.
 * @param {URLSearchParams | Record<string, string> | string} newSearchParams - The new search parameters to append.
 *   Can be a URLSearchParams object, a record of string key-value pairs, or a query string.
 * @returns {URLSearchParams} A new URLSearchParams object with the appended parameters.
 *
 * @example
 * // Example 1: Appending a string to URLSearchParams
 * const original = new URLSearchParams('a=1&b=2');
 * const newParams = 'c=3&a=4';
 * const result1 = appendSearchParams(original, newParams);
 * console.log(result1.toString()); // Output: a=1&b=2&c=3&a=4
 *
 * @example
 * // Example 2: Appending a record to a string
 * const originalStr = 'x=10';
 * const newRecord = { y: '20', z: '30' };
 * const result2 = appendSearchParams(originalStr, newRecord);
 * console.log(result2.toString()); // Output: x=10&y=20&z=30
 *
 * @example
 * // Example 3: Appending URLSearchParams to URLSearchParams
 * const params1 = new URLSearchParams('foo=bar');
 * const params2 = new URLSearchParams('baz=qux&foo=another');
 * const result3 = appendSearchParams(params1, params2);
 * console.log(result3.toString()); // Output: foo=bar&baz=qux&foo=another
 */
export function appendSearchParams(
  orgSearchParams: URLSearchParams | Record<string, string> | string,
  newSearchParams: URLSearchParams | Record<string, string> | string
): URLSearchParams {
  // Initialize a new URLSearchParams object with the original parameters.
  // The URLSearchParams constructor can handle string, Record, or another URLSearchParams instance.
  const result = new URLSearchParams(orgSearchParams)

  // Convert newSearchParams to a URLSearchParams object to easily iterate over them,
  // regardless of its original type (string, Record, or URLSearchParams).
  const paramsToAppend = new URLSearchParams(newSearchParams)

  // Iterate over the new parameters and append them to the result.
  // The append method adds a new key/value pair, allowing for multiple values for the same key.
  for (const [key, value] of paramsToAppend.entries()) {
    result.append(key, value)
  }

  return result
}

/**
 * Removes specified keys from a set of search parameters.
 *
 * This function takes an initial set of search parameters and an array of keys to remove.
 * It returns a new URLSearchParams object with the specified keys removed.
 * The original search parameters are not modified.
 *
 * @param {URLSearchParams | Record<string, string> | string} orgSearchParams - The original search parameters.
 *   Can be a URLSearchParams object, a record of string key-value pairs, or a query string.
 * @param {string[]} keysToRemove - An array of string keys to remove from the search parameters.
 * @returns {URLSearchParams} A new URLSearchParams object with the specified keys removed.
 *
 * @example
 * // Example 1: Removing keys from URLSearchParams
 * const original = new URLSearchParams('a=1&b=2&c=3&b=4');
 * const keys = ['b', 'd']; // 'd' does not exist, will be ignored
 * const result1 = removeSearchParams(original, keys);
 * console.log(result1.toString()); // Output: a=1&c=3
 *
 * @example
 * // Example 2: Removing keys from a string
 * const originalStr = 'x=10&y=20&z=30';
 * const keys2 = ['y'];
 * const result2 = removeSearchParams(originalStr, keys2);
 * console.log(result2.toString()); // Output: x=10&z=30
 *
 * @example
 * // Example 3: Removing keys from a Record
 * const originalRecord = { foo: 'bar', baz: 'qux', key: 'value' };
 * const keys3 = ['baz', 'nonExistentKey'];
 * const result3 = removeSearchParams(originalRecord, keys3);
 * console.log(result3.toString()); // Output: foo=bar&key=value
 *
 * @example
 * // Example 4: Removing all keys
 * const original4 = new URLSearchParams('a=1&b=2');
 * const keys4 = ['a', 'b'];
 * const result4 = removeSearchParams(original4, keys4);
 * console.log(result4.toString()); // Output: ""
 *
 * @example
 * // Example 5: Empty keysToRemove array
 * const original5 = new URLSearchParams('a=1&b=2');
 * const keys5: string[] = [];
 * const result5 = removeSearchParams(original5, keys5);
 * console.log(result5.toString()); // Output: a=1&b=2
 */
export function removeSearchParams(
  orgSearchParams: URLSearchParams | Record<string, string> | string,
  keysToRemove: string[]
): URLSearchParams {
  // Create a new URLSearchParams instance from the original parameters
  // to avoid modifying the original object.
  const result = new URLSearchParams(orgSearchParams)

  // Iterate over the array of keys that need to be removed.
  for (const key of keysToRemove) {
    // Delete each specified key from the new URLSearchParams instance.
    // If a key does not exist, .delete() does nothing and does not throw an error.
    result.delete(key)
  }

  // Return the new URLSearchParams instance with the keys removed.
  return result
}

// Keys to be specifically managed (removed and then re-added) by buildTimeQuerySearchParams.
const timeQueryKeysToRemove = ['time', 'period']

/**
 * Builds a new URLSearchParams object with specified time and period parameters,
 * after removing any existing 'time' and 'period' parameters from the original search parameters.
 *
 * This function is useful for constructing or updating URL query strings
 * that involve time-based filtering (e.g., "created in the last month", "updated in the last week").
 *
 * @param {URLSearchParams | Record<string, string> | string} orgSearchParams - The original search parameters.
 *   Can be a URLSearchParams object, a record of string key-value pairs, or a query string.
 * @param {'updated' | 'created'} [time='updated'] - The time parameter to set. Defaults to 'updated'.
 *   Indicates whether the filter refers to the creation time or update time.
 * @param {string} [period='1m'] - The period for the time filter. Defaults to '1m' (1 month).
 *   Examples: '7d' (7 days), '3m' (3 months), '1y' (1 year).
 * @returns {URLSearchParams} A new URLSearchParams object with the 'time' and 'period' parameters set,
 *   and any previous 'time' or 'period' parameters removed.
 *
 * @example
 * // Example 1: Adding time filters to existing params
 * const original = new URLSearchParams('filter=active');
 * const result1 = buildTimeQuerySearchParams(original, 'created', '7d');
 * console.log(result1.toString()); // Output: filter=active&time=created&period=7d
 *
 * @example
 * // Example 2: Overwriting existing time filters
 * const originalWithTime = new URLSearchParams('time=created&period=3m&user=john');
 * const result2 = buildTimeQuerySearchParams(originalWithTime, 'updated', '1m');
 * console.log(result2.toString()); // Output: user=john&time=updated&period=1m
 *
 * @example
 * // Example 3: Using default values
 * const originalStr = 'q=searchterm';
 * const result3 = buildTimeQuerySearchParams(originalStr);
 * console.log(result3.toString()); // Output: q=searchterm&time=updated&period=1m
 *
 * @example
 * // Example 4: Starting with empty params
 * const result4 = buildTimeQuerySearchParams('', 'created', '2w');
 * console.log(result4.toString()); // Output: time=created&period=2w
 */
export function buildTimeQuerySearchParams(
  orgSearchParams: URLSearchParams | Record<string, string> | string,
  time: 'updated' | 'created' = 'updated',
  period = '1m'
): URLSearchParams {
  if (!orgSearchParams) {
    return new URLSearchParams({ time, period })
  }

  // First, remove any existing 'time' or 'period' parameters from the original search params.
  const paramsWithoutTime = removeSearchParams(
    orgSearchParams,
    timeQueryKeysToRemove
  )
  // Then, append the new 'time' and 'period' parameters.
  return appendSearchParams(paramsWithoutTime, {
    time,
    period,
  })
}

/**
 * Checks if the current web application is running in a dedicated domain context.
 * This determination is based on the current URL's pathname.
 *
 * A dedicated domain context is assumed if the pathname is:
 * - Exactly '/' (root)
 * - Exactly '/index.html'
 * - Matches the pattern '/collections/{collectionId}' (e.g., /collections/my-collection)
 * - Matches the pattern '/c/{collectionId}' (e.g., /c/another-collection)
 *
 * @param {string} [pathname=window.location.pathname] - The URL pathname to check. Defaults to the current window's pathname.
 * @returns {boolean} True if the pathname indicates a dedicated domain context, false otherwise.
 *
 * @example
 * // Assuming window.location.pathname is '/'
 * isRunningInDedicatedDomain(); // true
 *
 * @example
 * // Assuming window.location.pathname is '/index.html'
 * isRunningInDedicatedDomain(); // true
 *
 * @example
 * // Assuming window.location.pathname is '/collections/some-id'
 * isRunningInDedicatedDomain(); // true
 *
 * @example
 * // Assuming window.location.pathname is '/c/other-id'
 * isRunningInDedicatedDomain(); // true
 *
 * @example
 * // Assuming window.location.pathname is '/settings'
 * isRunningInDedicatedDomain(); // false
 *
 * @example
 * // Explicitly passing a pathname
 * isRunningInDedicatedDomain('/collections/123'); // true
 * isRunningInDedicatedDomain('/c/abc'); // true
 * isRunningInDedicatedDomain('/about'); // false
 */
export function isRunningInDedicatedDomain(
  pathname: string = typeof globalThis !== 'undefined' && globalThis.location
    ? globalThis.location.pathname
    : ''
): boolean {
  pathname = pathname.replace(/[?#].*$/, '')
  if (pathname === '/' || pathname === '/index.html') {
    return true
  }

  // Regex to match /collections/{collectionId} or /c/{collectionId}
  // where {collectionId} is one or more characters that are not a slash.
  const collectionPathRegex =
    /^\/(?:collections?|c)\/(?:(shared|public|private)\/)?([^/]+)(?:\/(.*))?$/
  if (collectionPathRegex.test(pathname)) {
    return true
  }

  return false
}
