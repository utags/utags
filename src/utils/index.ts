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

  return text.replaceAll(/[\n\r\t]/gm, " ").split(/\s*[,，]\s*/)
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
