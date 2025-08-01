import { $$, createElement } from "browser-extension-utils"

import type { BookmarkTagsAndMetadata } from "../types/bookmarks.js"

// eslint-disable-next-line n/prefer-global/process
export const isChromeExtension = process.env.PLASMO_TARGET === "chrome-mv3"
// eslint-disable-next-line n/prefer-global/process
export const isFirefoxExtension = process.env.PLASMO_TARGET === "firefox-mv2"
export const isExtension = isChromeExtension || isFirefoxExtension
// @ts-expect-error `scripts/common.mjs` handle it
// eslint-disable-next-line n/prefer-global/process
export const isUserscript = process.env.PLASMO_TARGET === "userscript"
// eslint-disable-next-line n/prefer-global/process
export const isProduction = process.env.PLASMO_TAG === "prod"

export function cloneWithoutUtags(element: HTMLElement) {
  const newElement = element.cloneNode(true) as HTMLElement
  for (const utag of $$(".utags_ul", newElement)) {
    utag.remove()
  }

  return newElement
}

export function getFirstHeadElement(tagName = "h1") {
  for (const element of $$(tagName)) {
    if (element.closest(".browser_extension_settings_container")) {
      continue
    }

    return element
  }

  return undefined
}

export function sortTags(tags: string[], privilegedTags: string[]) {
  return tags.sort((a, b) => {
    const pA = privilegedTags.includes(a)
    const pB = privilegedTags.includes(b)
    if (pA && pB) {
      return 0
    }

    if (pA) {
      return -1
    }

    if (pB) {
      return 1
    }

    return 0
  })
}

export function filterTags(tags: string[], removed: string[] | string) {
  if (typeof removed === "string") {
    removed = [removed]
  }

  if (removed.length === 0) {
    return tags
  }

  return tags.filter((value) => {
    return !removed.includes(value)
  })
}

export async function copyText(data: string) {
  const textArea = createElement("textarea", {
    style: "position: absolute; left: -100%;",
    contentEditable: "true",
  }) as HTMLTextAreaElement
  textArea.value = data.replaceAll("\u00A0", " ")

  document.body.append(textArea)
  textArea.select()
  await navigator.clipboard.writeText(textArea.value)
  textArea.remove()
}

export function deleteUrlParameters(
  urlString: string,
  keys: string[] | string,
  excepts?: string[]
) {
  const url = new URL(urlString)
  if (keys === "*") {
    if (excepts && excepts.length > 0) {
      const parameters = new URLSearchParams(url.search)
      keys = []
      for (const key of parameters.keys()) {
        if (!excepts.includes(key)) {
          keys.push(key)
        }
      }
    } else {
      url.search = ""
      return url.toString()
    }
  }

  if (typeof keys === "string") {
    keys = [keys]
  }

  const parameters = new URLSearchParams(url.search)
  for (const key of keys) {
    parameters.delete(key)
  }

  url.search = parameters.size === 0 ? "" : "?" + parameters.toString()
  return url.toString()
}

/*
let testUrl = "https://example.com?foo=1&bar=2&foo=3&hoo=11"
console.log(deleteUrlParameters(testUrl, ["", "bar"]))

console.log(deleteUrlParameters(testUrl, "*"))

console.log(deleteUrlParameters(testUrl, "foo"))

console.log(deleteUrlParameters(testUrl, "*", ["bar"]))
*/

export function getUrlParameters(
  urlString: string,
  keys: string[] | string,
  allowEmpty = false
) {
  const url = new URL(urlString)

  if (typeof keys === "string") {
    keys = [keys]
  }

  const result = {}
  const parameters = new URLSearchParams(url.search)
  for (const key of keys) {
    if (key) {
      const value = parameters.get(key)
      if (
        (allowEmpty && value !== undefined && value !== null) ||
        (!allowEmpty && value)
      ) {
        result[key] = value
      }
    }
  }

  return result
}

/*
let testUrl = "https://example.com?foo=1&bar=2&foo=3&hoo=11&car=&go#boo=5"
console.log(getUrlParameters(testUrl, ["", "bar"]))

console.log(getUrlParameters(testUrl, "*"))

console.log(getUrlParameters(testUrl, "foo"))

console.log(getUrlParameters(testUrl, ["bar"]))

console.log(getUrlParameters(testUrl, ["bar", "foo", "boo"]))

console.log(getUrlParameters(testUrl, ["bar", "foo", "car", "go"]))

console.log(getUrlParameters(testUrl, ["bar", "foo", "car", "go"], true))
*/

type BookmarkItem = [string, BookmarkTagsAndMetadata]

/**
 * Sort an array of bookmarks by created date desc
 * @param bookmarks Array of bookmarks in format [[url, entry], ...]
 * @returns Sorted array of bookmarks
 */
export function sortBookmarks(bookmarks: BookmarkItem[]): BookmarkItem[] {
  return [...bookmarks].sort((a, b) => {
    const createdA = a[1].meta.created
    const createdB = b[1].meta.created

    if (createdB === createdA) {
      return a[0].localeCompare(b[0])
    }

    return createdB - createdA
  })
}

/**
 * Sort meta object properties with created at the end for consistent export format
 * @param meta - Meta object to sort
 * @returns Sorted meta object with created property at the end
 */
function sortMetaProperties(
  meta: BookmarkTagsAndMetadata["meta"]
): BookmarkTagsAndMetadata["meta"] {
  if (!meta || typeof meta !== "object") {
    return meta
  }

  // Use Record type for better type safety
  const sortedMeta: Record<string, unknown> = {}
  const entries = Object.entries(meta)

  // Separate created from other properties for more efficient processing
  const createdEntry = entries.find(([key]) => key === "created")
  const otherEntries = entries
    .filter(([key]) => key !== "created")
    .sort(([a], [b]) => a.localeCompare(b))

  // Add sorted properties first
  for (const [key, value] of otherEntries) {
    sortedMeta[key] = value
  }

  // Add created property at the end if it exists
  if (createdEntry) {
    sortedMeta[createdEntry[0]] = createdEntry[1]
  }

  return sortedMeta as BookmarkTagsAndMetadata["meta"]
}

/**
 * Type guard to check if a value is a valid meta object
 * @param value - Value to check
 * @returns True if value is a valid meta object
 */
function isMetaObject(
  value: unknown
): value is BookmarkTagsAndMetadata["meta"] {
  return value !== null && typeof value === "object"
}

/**
 * Type guard to check if a value is a BookmarkTagsAndMetadata object
 * @param value - Value to check
 * @returns True if value has the structure of BookmarkTagsAndMetadata
 */
function isBookmarkTagsAndMetadata(
  value: unknown
): value is BookmarkTagsAndMetadata {
  return (
    value !== null &&
    typeof value === "object" &&
    "tags" in value &&
    Array.isArray((value as BookmarkTagsAndMetadata).tags)
  )
}

/**
 * Sort bookmark properties to ensure consistent structure
 * Places tags first, followed by other properties, with meta always at the end
 * @param value - Bookmark data with tags and metadata
 * @returns Sorted bookmark object with consistent property order
 */
function sortBookmarkProperties(
  value: BookmarkTagsAndMetadata
): BookmarkTagsAndMetadata {
  const { tags, meta, ...rest } = value
  return {
    tags,
    ...rest,
    meta,
  }
}

/**
 * Normalize bookmark data structure by standardizing meta object properties for consistent format
 * Recursively processes the data structure and ensures all meta objects have their properties
 * sorted alphabetically with 'created' property positioned at the end for export consistency
 * @param data - Bookmark data to normalize (can be any valid JSON value)
 * @returns Normalized data with standardized meta object structure
 */
export function normalizeBookmarkData<T>(data: T): T {
  // Handle null and undefined explicitly
  if (data === null || data === undefined) {
    return data
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      normalizeBookmarkData(item)
    ) as T
  }

  // Handle objects (excluding null which is already handled)
  if (typeof data === "object") {
    const result: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(data)) {
      result[key] =
        key === "meta" && isMetaObject(value)
          ? sortMetaProperties(value)
          : normalizeBookmarkData(value)
    }

    if (isBookmarkTagsAndMetadata(result)) {
      return sortBookmarkProperties(result) as T
    }

    return result as T
  }

  // Handle primitives (string, number, boolean)
  return data
}
