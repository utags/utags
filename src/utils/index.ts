import { $$ } from "browser-extension-utils"

export function cloneWithoutUtags(element: HTMLElement) {
  const newElement = element.cloneNode(true) as HTMLElement
  for (const utag of $$(".utags_ul", newElement)) {
    utag.remove()
  }

  return newElement
}
