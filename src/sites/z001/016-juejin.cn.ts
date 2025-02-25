import { $, $$ } from "browser-extension-utils"

import defaultSite from "../default"

export default (() => {
  const prefix = "https://juejin.cn/"

  function getUserProfileUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(18)
      if (/^user\/\d+/.test(href2)) {
        return prefix + href2.replace(/^(user\/\d+).*/, "$1")
      }
    }

    return undefined
  }

  return {
    matches: /juejin\.cn/,
    validate(element: HTMLAnchorElement) {
      if ($(".avatar", element)) {
        return false
      }

      const href = element.href
      if (href.startsWith(prefix)) {
        const key = getUserProfileUrl(href)
        if (key) {
          const titleElement = $(".name", element)
          let title: string | undefined
          if (titleElement) {
            title = titleElement.textContent!
          }

          const meta = { type: "user" }
          if (title) {
            meta.title = title
          }

          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""

          return true
        }
      }

      return false
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      ".list-header",
      ".sub-header",
      ".next-page",
      ".follow-item",
      ".more-item",
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      const key = getUserProfileUrl(location.href)
      if (key) {
        // profile header
        const element = $("h1.username")
        if (element) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }

      // 文章右侧栏作者信息
      const element = $(".sidebar-block.author-block a .username")
      if (element) {
        const anchor = element.closest("a")
        if (anchor) {
          const key = getUserProfileUrl(anchor.href)
          if (key) {
            const titleElement = $(".name", element)
            const title = titleElement
              ? titleElement.textContent!
              : element.textContent!

            if (title) {
              const meta = { title, type: "user" }
              element.utags = { key, meta }
              matchedNodesSet.add(element)
            }
          }
        }
      }
    },
  }
})()
