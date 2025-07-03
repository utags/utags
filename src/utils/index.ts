import { $$, createElement } from "browser-extension-utils"

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
