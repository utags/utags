import { createElement } from "browser-extension-utils"

export default function createTag(tagName: string) {
  const a = createElement("a")
  a.textContent = tagName
  a.dataset.utags_tag = tagName
  a.setAttribute(
    "href",
    "https://utags.pipecraft.net/tags/#" + encodeURIComponent(tagName)
  )
  a.setAttribute("target", "_blank")
  a.setAttribute("class", "utags_text_tag")
  return a
}
