import { $, $$ } from "browser-extension-utils"

const prefix = "https://www.bilibili.com/"
const prefix2 = "https://space.bilibili.com/"
const prefix3 = "https://m.bilibili.com/"

function getUserProfileUrl(href: string) {
  if (href.startsWith(prefix2)) {
    const href2 = href.slice(27)
    if (/^\d+/.test(href2)) {
      return prefix2 + href2.replace(/(^\d+).*/, "$1")
    }
  }

  if (href.startsWith(prefix3 + "space/")) {
    const href2 = href.slice(29)
    if (/^\d+/.test(href2)) {
      return prefix2 + href2.replace(/(^\d+).*/, "$1")
    }
  }

  return undefined
}

const site = {
  matches: /bilibili\.com/,
  addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
    const elements = $$(
      ".user-name[data-user-id],.sub-user-name[data-user-id],.jump-link.user[data-user-id]"
    )
    for (const element of elements) {
      const userId = element.dataset.userId
      if (!userId) {
        return false
      }

      const title = element.textContent!.trim()
      const key = prefix2 + userId
      const meta = { title, type: "user" }
      element.utags = { key, meta }
      matchedNodesSet.add(element)
    }

    const elements2 = $$(".upname a")
    for (const element of elements2) {
      const href = element.href as string
      if (href.startsWith(prefix2)) {
        const key = getUserProfileUrl(href)
        if (key) {
          const nameElement = $(".name", element)
          if (nameElement) {
            const title = nameElement.textContent
            const meta = { title, type: "user" }
            nameElement.utags = { key, meta }
            matchedNodesSet.add(nameElement)
          }
        }
      }
    }

    if (
      location.href.startsWith(prefix2) ||
      location.href.startsWith(prefix3 + "space/")
    ) {
      // profile header
      const element = $("#h-name,.m-space-info .name")
      if (element) {
        const title = element.textContent!.trim()
        const key = getUserProfileUrl(location.href)
        if (title && key) {
          const meta = { title, type: "user" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    }
  },
}

export default site
