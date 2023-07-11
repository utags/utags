import {
  getSettingsValue,
  initSettings,
  showSettings,
} from "browser-extension-settings"
import {
  $,
  $$,
  addClass,
  createElement,
  registerMenuCommand,
  removeClass,
  uniq,
} from "browser-extension-utils"
import styleText from "data-text:./content.scss"

import createTag from "./components/tag"
import { getConditionNodes, getListNodes, matchedNodes } from "./sites/index"
import {
  addTagsValueChangeListener,
  getTags,
  getUrlMap,
  mergeData,
  migration,
  saveTags,
} from "./storage/index"

const hostname = location.hostname

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

const getStyle = () => {
  const style = createElement("style")
  style.id = "utags_style"
  style.textContent = styleText
  document.head.append(style)
  // return style
}

function onSettingsChange() {
  if (getSettingsValue("showHidedItems")) {
    addClass(document.documentElement, "utags_no_hide")
  } else {
    removeClass(document.documentElement, "utags_no_hide")
  }

  if (getSettingsValue("noOpacityEffect")) {
    addClass(document.documentElement, "utags_no_opacity_effect")
  } else {
    removeClass(document.documentElement, "utags_no_opacity_effect")
  }
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
  let a = createElement("a")
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
      await saveTags(key, newTagsArray, meta)
    }
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
}

async function displayTags() {
  // console.error("displayTags")
  const listNodes = getListNodes(hostname)
  for (const node of listNodes) {
    // Flag list nodes first
    node.dataset.utags_list_node = ""
  }

  const conditionNodes = getConditionNodes(hostname)
  for (const node of conditionNodes) {
    // Flag condition nodes
    node.dataset.utags_condition_node = ""
  }

  // Display tags for matched components on matched pages
  const nodes = matchedNodes(hostname)
  await Promise.all(
    nodes.map(async (node) => {
      if (!node.utags || !node.utags.key) {
        return
      }

      const object = await getTags(node.utags.key)
      const tags = object.tags || []
      appendTagsToPage(node, node.utags.key, tags, node.utags.meta)
    })
  )

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
}

async function outputData() {
  if (
    /^(utags\.pipecraft\.net|localhost|127\.0\.0\.1)$/.test(location.hostname)
  ) {
    const urlMap = await getUrlMap()

    const textarea = createElement("textarea")
    textarea.id = "utags_output"
    textarea.setAttribute("style", "display:none")
    textarea.value = JSON.stringify(urlMap)
    document.body.append(textarea)

    textarea.addEventListener("click", async () => {
      if (textarea.dataset.utags_type === "export") {
        const urlMap = await getUrlMap()
        textarea.value = JSON.stringify(urlMap)
        textarea.dataset.utags_type = "export_done"
        // Triger change event
        textarea.click()
      } else if (textarea.dataset.utags_type === "import") {
        const data = textarea.value as string
        try {
          const result = await mergeData(JSON.parse(data))
          textarea.value = JSON.stringify(result)
          textarea.dataset.utags_type = "import_done"
          // Triger change event
          textarea.click()
        } catch (error) {
          console.error(error)
          textarea.value = JSON.stringify(error)
          textarea.dataset.utags_type = "import_failed"
          // Triger change event
          textarea.click()
        }
      }
    })
  }
}

async function initStorage() {
  await migration()
  addTagsValueChangeListener(displayTags)
}

let countOfLinks = 0
async function main() {
  if ($("#utags_style")) {
    // already running
    console.log(
      // eslint-disable-next-line n/prefer-global/process
      `[UTags] [${process.env.PLASMO_TARGET}-${process.env.PLASMO_TAG}] Skip this, since another instance is already running.`,
      location.href
    )
    return
  }

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

  document.addEventListener("mouseover", (event) => {
    if (event.target && event.target.tagName === "A") {
      // TODO: delay display utags for event.target
      // console.log(event.target, event.currentTarget)
    }
  })
  // TODO: delay display utags in corner of page for current page

  getStyle()
  setTimeout(outputData, 1)

  await initStorage()

  onSettingsChange()

  await displayTags()

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
