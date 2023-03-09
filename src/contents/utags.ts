import styleText from "data-text:./style.scss"

import { matchedSite } from "../sites/index"
import { addTagsValueChangeListener, getTags, saveTags } from "../storage/index"

const getStyle = () => {
  const style = document.createElement("style")
  style.id = "utags_style"
  style.textContent = styleText
  document.head.append(style)
  return style
}

function appendTagsToPage(element, key, tags: string[]) {
  if (element.nextSibling?.classList?.contains("utags_ul")) {
    element.nextSibling.remove()
  }

  const ul = document.createElement("ul")
  let li = document.createElement("li")
  let a = document.createElement("a")
  // a.textContent = "添加标签🏷️";
  a.textContent = "🏷️"
  a.setAttribute(
    "class",
    tags.length === 0
      ? "utags_text_tag utags_captain_tag"
      : "utags_text_tag utags_captain_tag2"
  )
  a.addEventListener("click", async function () {
    // eslint-disable-next-line no-alert
    const newTags = prompt(
      "[UTags] 请输入标签，用逗号分开多个标签",
      tags.join(", ")
    )
    if (newTags !== null) {
      const newTagsArray = newTags.split(/\s*[,，]\s*/)
      await saveTags(key, newTagsArray)
    }
  })
  li.append(a)
  ul.append(li)

  for (const tag of tags) {
    li = document.createElement("li")
    a = document.createElement("a")
    a.textContent = tag
    a.dataset.utags_tag = tag
    a.setAttribute("href", "https://utags.pipecraft.net/tags/#" + tag)
    a.setAttribute("target", "_blank")
    a.setAttribute("class", "utags_text_tag")
    li.append(a)
    ul.append(li)
  }

  ul.setAttribute("class", "utags_ul")
  element.after(ul)
}

function displayTags() {
  if (location.hostname === "utags.pipecraft.net") {
    // document.GM_getValue = GM_getValue
    // document.GM_setValue = GM_setValue
    // document.GM_addValueChangeListener = GM_addValueChangeListener
  } else {
    const listNodes = site.getListNodes()
    for (const node of listNodes) {
      node.dataset.utags_list_node = ""
    }

    const conditionNodes = site.getConditionNodes()
    for (const node of conditionNodes) {
      node.dataset.utags_condition_node = ""
    }

    // Display tags for matched components on matched pages
    const nodes = site.matchedNodes()
    nodes.map(async (node) => {
      const tags = await getTags(node.key)
      appendTagsToPage(node.element, node.key, tags)
    })
  }
}

function initStorage() {
  addTagsValueChangeListener(displayTags)
}

let site
function main() {
  site = matchedSite(location.hostname)
  if (!site) {
    return
  }

  initStorage()
  getStyle()

  displayTags()
}

main()
