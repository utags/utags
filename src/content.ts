import {
  getSettingsValue,
  initSettings,
  showSettings,
} from "browser-extension-settings"
import {
  $,
  $$,
  addClass,
  addStyle,
  createElement,
  doc,
  registerMenuCommand,
  removeClass,
  setStyle,
  uniq,
} from "browser-extension-utils"
import styleText from "data-text:./content.scss"

import createTag from "./components/tag"
import { outputData } from "./modules/export-import"
import { bindDocumentEvents } from "./modules/global-events"
import { getConditionNodes, getListNodes, matchedNodes } from "./sites/index"
import {
  addTagsValueChangeListener,
  getTags,
  migration,
  saveTags,
} from "./storage/index"

const settingsTable = {
  showHidedItems: {
    title: "显示被隐藏的内容 (添加了 'block', 'hide', '隐藏'等标签的内容)",
    defaultValue: false,
  },
  noOpacityEffect: {
    title: "去除半透明效果 (添加了 'sb', '忽略', '标题党'等标签的内容)",
    defaultValue: false,
  },
  openTagsPage: {
    title: "标签列表",
    type: "externalLink",
    url: "https://utags.pipecraft.net/tags/",
    group: 2,
  },
  openDataPage: {
    title: "导出数据/导入数据",
    type: "externalLink",
    url: "https://utags.pipecraft.net/data/",
    group: 2,
  },
}

const addUtagsStyle = () => {
  const style = addStyle(styleText)
  style.id = "utags_style"
}

function onSettingsChange() {
  if (getSettingsValue("showHidedItems")) {
    addClass(doc.documentElement, "utags_no_hide")
  } else {
    removeClass(doc.documentElement, "utags_no_hide")
  }

  if (getSettingsValue("noOpacityEffect")) {
    addClass(doc.documentElement, "utags_no_opacity_effect")
  } else {
    removeClass(doc.documentElement, "utags_no_opacity_effect")
  }
}

// For debug, 0 disable, 1 enable
let start = 0

if (start) {
  start = Date.now()
}

function appendTagsToPage(
  element: HTMLElement,
  key: string,
  tags: string[],
  meta: Record<string, any>
) {
  if (element.nextSibling?.classList?.contains("utags_ul")) {
    element.nextSibling.remove()
  }

  const ul = createElement("ul")
  let li = createElement("li")
  if (tags.length === 0) {
    addClass(li, "notag")
  }

  let a = createElement("a")
  // a.textContent = "🏷️"
  a.dataset.utags_tag = "🏷️"
  a.setAttribute(
    "class",
    tags.length === 0
      ? "utags_text_tag utags_captain_tag"
      : "utags_text_tag utags_captain_tag2"
  )
  a.addEventListener("click", async function (event: Event) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()

    setTimeout(async () => {
      // eslint-disable-next-line no-alert
      const newTags = prompt(
        "[UTags] 请输入标签，用逗号分开多个标签",
        tags.join(", ")
      )
      if (newTags !== null) {
        if (start) {
          start = Date.now()
        }

        const newTagsArray = newTags.split(/\s*[,，]\s*/)
        await saveTags(key, newTagsArray, meta)
        if (start) {
          console.error("after saveTags", Date.now() - start)
        }
      }
    })
  })
  li.append(a)
  ul.append(li)

  for (const tag of tags) {
    li = createElement("li")
    a = createTag(tag)
    li.append(a)
    ul.append(li)
  }

  ul.setAttribute("class", "utags_ul")
  element.after(ul)
  element.dataset.utags = tags.join(",")
  /* Fix v2ex polish start */
  // 为了防止阻塞渲染页面，延迟执行
  setTimeout(() => {
    const style = getComputedStyle(element)
    const zIndex = style.zIndex
    if (zIndex && zIndex !== "auto") {
      setStyle(ul, { zIndex })
    }
  }, 200)
  /* Fix v2ex polish end */
}

async function displayTags() {
  if (start) {
    console.error("start of displayTags", Date.now() - start)
  }

  // console.error("displayTags")
  const listNodes = getListNodes()
  for (const node of listNodes) {
    // Flag list nodes first
    node.dataset.utags_list_node = ""
  }

  const conditionNodes = getConditionNodes()
  for (const node of conditionNodes) {
    // Flag condition nodes
    node.dataset.utags_condition_node = ""
  }

  if (start) {
    console.error("before matchedNodes", Date.now() - start)
  }

  // Display tags for matched components on matched pages
  const nodes = matchedNodes()
  if (start) {
    console.error("after matchedNodes", Date.now() - start, nodes.length)
  }

  for (const node of nodes) {
    const utags = node.utags
    if (!utags) {
      continue
    }

    const key = utags.key as string
    if (!key) {
      continue
    }

    const object = getTags(key)

    const tags: string[] = (object.tags as string[]) || []
    appendTagsToPage(node, key, tags, utags.meta)
  }

  if (start) {
    console.error("after appendTagsToPage", Date.now() - start)
  }

  for (const node of listNodes) {
    const conditionNodes = $$("[data-utags_condition_node]", node)
    const tagsArray: string[] = []
    for (const node2 of conditionNodes) {
      if (node2.closest("[data-utags_list_node]") !== node) {
        // Nested list node
        continue
      }

      if (node2.dataset.utags) {
        tagsArray.push(node2.dataset.utags)
      }
    }

    if (tagsArray.length === 1) {
      node.dataset.utags_list_node = "," + tagsArray[0] + ","
    } else if (tagsArray.length > 1) {
      node.dataset.utags_list_node =
        "," + uniq(tagsArray.join(",").split(",")).join(",") + ","
    }
  }

  if (start) {
    console.error("end of displayTags", Date.now() - start)
  }
}

async function initStorage() {
  await migration()
  addTagsValueChangeListener(() => {
    setTimeout(displayTags)
  })
}

let countOfLinks = 0
async function main() {
  if ($("#utags_style")) {
    // already running
    console.log(
      // eslint-disable-next-line n/prefer-global/process, @typescript-eslint/restrict-template-expressions
      `[UTags] [${process.env.PLASMO_TARGET}-${process.env.PLASMO_TAG}] Skip this, since another instance is already running.`,
      location.href
    )
    return
  }

  addUtagsStyle()

  await initSettings({
    id: "utags",
    title: "🏷️ 小鱼标签 (UTags) - 为链接添加用户标签",
    footer: `
    <p>
    <a href="https://github.com/utags/utags/issues" target="_blank">
    Report and Issue...
    </a></p>
    <p>Made with ❤️ by
    <a href="https://www.pipecraft.net/" target="_blank">
      Pipecraft
    </a></p>`,
    settingsTable,
    async onValueChange() {
      onSettingsChange()
    },
  })

  registerMenuCommand("⚙️ 设置", showSettings, "o")

  await initStorage()

  setTimeout(outputData, 1)

  onSettingsChange()

  await displayTags()

  bindDocumentEvents()

  countOfLinks = $$("a:not(.utags_text_tag)").length
  setInterval(async () => {
    const count = $$("a:not(.utags_text_tag)").length
    if (countOfLinks !== count) {
      // console.log(countOfLinks, count)
      countOfLinks = count
      await displayTags()
    }
  }, 1000)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises, unicorn/prefer-top-level-await
main()
