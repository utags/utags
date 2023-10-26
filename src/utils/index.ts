import { $$, createElement } from "browser-extension-utils"

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

export function splitTags(text: string | undefined) {
  if (!text) {
    return []
  }

  return text
    .trim()
    .replaceAll(/[\n\r\t]/gm, " ")
    .split(/\s*[,，]\s*/)
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
