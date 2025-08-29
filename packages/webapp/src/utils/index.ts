import Console from 'console-tagger'
import { defaultFavicons } from '../config/constants.js'
import { getLocale } from '../paraglide/runtime.js'

/**
 * Custom console instance for utils module
 */
const console = new Console({
  prefix: 'utils',
  color: { line: 'white', background: 'orange' },
})

// TODO: get locale from user settings
const locale = getLocale() // ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'][1]

/**
 * Formats a timestamp into a human-readable date/time string
 *
 * @param date - Timestamp in milliseconds
 * @param full - Whether to include time information (hours, minutes, seconds)
 * @returns Formatted date string in the format YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
 */
export function formatDatetime(date: number, full = false) {
  return full
    ? new Date(date).toLocaleString(locale, {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : new Date(date).toLocaleString(locale, {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
}

/**
 * Generates a favicon URL for a given website
 *
 * @param href - The URL of the website
 * @param size - The desired favicon size (16, 32, or 64 pixels)
 * @returns URL to the favicon image
 *
 * TODO:
 * - Add cache mechanism: cache[href][size]
 * - Implement fallback to first letter image when favicon is not available. Use first letter of title or domain.
 */
export function getFaviconUrl(href: string, size: 16 | 32 | 64 = 16) {
  // Google favicon service URLs for reference:
  // https://www.google.com/s2/favicons?domain=google.com&sz=64
  // https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://google.com&size=64

  try {
    const domain = new URL(href, location.origin).origin
    const url = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${domain}&size=${size}`
    const wrapUrl = `https://wsrv.nl/?w=${size}&h=${size}&url=${encodeURIComponent(url)}&default=${defaultFavicons[size]}`
    return wrapUrl
  } catch (error) {
    console.error('Error generating favicon URL:', error)
    return decodeURIComponent(defaultFavicons[size])
  }
}

/**
 * Normalizes and deduplicates an array of strings by:
 * 1. Trimming whitespace from each string
 * 2. Filtering out empty strings
 * 3. Removing duplicate strings (case-sensitive)
 *
 * @param {string[]} strings - Array of strings to process
 * @returns {string[]} New array with unique, non-empty, trimmed strings
 * @example
 * // Returns ['tag1', 'tag2', 'tag3']
 * normalizeAndDeduplicateStrings([' tag1', 'tag2 ', ' tag1 ', '', 'tag3'])
 */
export const normalizeAndDeduplicateStrings = (strings: string[]): string[] => [
  ...new Set(strings.map((string) => string.trim()).filter(Boolean)),
]

/**
 * Deduplicates a two-dimensional array based on the content of each sub-array.
 * Uses each sub-array's string representation as a key to ensure arrays with identical elements are only kept once.
 *
 * @param {T[][]} arr - The two-dimensional array to deduplicate
 * @param {boolean} [ignoreOrder=false] - When true, array elements will be sorted before comparison,
 *                                        making [1,2] and [2,1] considered identical
 * @returns {T[][]} A deduplicated two-dimensional array
 * @example
 * // Returns [[1, 2], [3, 4]]
 * deduplicateArrays([[1, 2], [1, 2], [3, 4]])
 * @example
 * // With ignoreOrder=true, returns [[1, 2], [3, 4]]
 * deduplicateArrays([[1, 2], [2, 1], [3, 4]], true)
 */
export function deduplicateArrays<T>(arr: T[][], ignoreOrder = false): T[][] {
  // Use a Map object with string representation of arrays as keys and original arrays as values
  const uniqueMap = new Map<string, T[]>()

  for (const item of arr) {
    // When ignoreOrder is true, sort the array before creating the key
    // This ensures that arrays with the same elements in different orders are considered identical
    const keyArray =
      ignoreOrder && Array.isArray(item)
        ? [...item].sort((a, b) => {
            // For number type, use numeric comparison
            if (typeof a === 'number' && typeof b === 'number') {
              return a - b
            }

            // For string type, use string comparison
            if (typeof a === 'string' && typeof b === 'string') {
              return a.localeCompare(b)
            }

            // For other types, convert to string then compare
            return JSON.stringify(a).localeCompare(JSON.stringify(b))
          })
        : item
    const key = JSON.stringify(keyArray)

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item)
    }
  }

  return Array.from(uniqueMap.values())
}

/**
 * Checks if a value is a non-null object (not null, not undefined, not an array)
 *
 * @param value - The value to check
 * @returns True if the value is a non-null object, false otherwise
 */
export function isNonNullObject(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function getType(value: any) {
  return Object.prototype.toString.call(value).slice(8, -1)
}

/**
 * Checks if two arrays are shallowly equal.
 * Returns true if both arrays are undefined.
 * Returns false if only one array is undefined.
 * Otherwise, it checks if the arrays have the same length and if each corresponding element is strictly equal (===).
 * This function does not perform a deep comparison; for arrays of objects or nested arrays, it compares references, not values.
 *
 * @param arr1 - The first array to compare, or undefined.
 * @param arr2 - The second array to compare, or undefined.
 * @returns True if the arrays are considered equal, false otherwise.
 */
export function areArraysEqual(
  arr1: unknown[] | undefined,
  arr2: unknown[] | undefined
): boolean {
  if (arr1 === undefined && arr2 === undefined) {
    return true // Both are undefined, considered equal
  }

  if (arr1 === undefined || arr2 === undefined) {
    return false // Only one is undefined, not equal
  }

  // Both are defined, proceed with array comparison
  if (arr1.length !== arr2.length) {
    return false
  }

  // eslint-disable-next-line unicorn/no-for-loop
  for (let i = 0; i < arr1.length; i++) {
    // Performs a shallow comparison of elements.
    if (arr1[i] !== arr2[i]) {
      return false
    }
  }

  return true
}

/**
 * Checks if two objects are shallowly equal based on their properties.
 * Returns true if both objects are undefined.
 * Returns false if only one object is undefined.
 * Otherwise, it checks if the objects have the same number of enumerable own properties
 * (excluding those in `ignoredKeys`) and if the values of these properties are strictly equal (===).
 * This function does not perform a deep comparison; for properties that are objects or arrays, it compares references, not values.
 *
 * @param obj1 - The first object to compare, or undefined.
 * @param obj2 - The second object to compare, or undefined.
 * @param ignoredKeys - An array of keys to ignore during comparison. Defaults to an empty array.
 * @returns True if the objects are considered equal (after ignoring specified keys), false otherwise.
 */
export function areObjectsEqual(
  obj1: Record<string, unknown> | undefined,
  obj2: Record<string, unknown> | undefined,
  ignoredKeys: string[] = []
): boolean {
  if (obj1 === undefined && obj2 === undefined) {
    return true // Both are undefined, considered equal
  }

  if (obj1 === undefined || obj2 === undefined) {
    return false // Only one is undefined, not equal
  }

  // Both are defined, proceed with object comparison
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  const filteredKeys1 = keys1.filter((key) => !ignoredKeys.includes(key))
  const filteredKeys2 = keys2.filter((key) => !ignoredKeys.includes(key))

  if (filteredKeys1.length !== filteredKeys2.length) {
    return false
  }

  for (const key of filteredKeys1) {
    // Ensures the key exists in obj2 and performs a shallow comparison of property values.
    if (!Object.hasOwn(obj2, key) || obj1[key] !== obj2[key]) {
      return false
    }
  }

  return true
}
