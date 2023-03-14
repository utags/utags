import { createElement } from "../utils"

export default function createTag(tagName) {
  const a = createElement("a")
  a.textContent = tagName
  a.dataset.utags_tag = tagName
  a.setAttribute("href", "https://utags.pipecraft.net/tags/#" + tagName)
  a.setAttribute("target", "_blank")
  a.setAttribute("class", "utags_text_tag")
  return a
}
