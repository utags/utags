import { $, $$, hasClass } from "browser-extension-utils"

import defaultSite from "../default"

const prefix = "https://www.xiaohongshu.com/"

function getUserProfileUrl(url: string, exact = false) {
  if (url.startsWith(prefix)) {
    const href2 = url.slice(28)
    if (exact) {
      if (/^user\/profile\/\w+(\?.*)?$/.test(href2)) {
        return prefix + href2.replace(/^(user\/profile\/\w+).*/, "$1")
      }
    } else if (/^user\/profile\/\w+/.test(href2)) {
      return prefix + href2.replace(/^(user\/profile\/\w+).*/, "$1")
    }
  }

  return undefined
}

function getPostUrl(url: string) {
  if (url.startsWith(prefix)) {
    const href2 = url.slice(28)
    if (/^explore\/\w+/.test(href2)) {
      return prefix + href2.replace(/^(explore\/\w+).*/, "$1")
    }

    if (/^user\/profile\/\w+\/\w+/.test(href2)) {
      return (
        prefix +
        "explore/" +
        href2.replace(/^user\/profile\/\w+\/(\w+).*/, "$1")
      )
    }
  }

  return undefined
}

const site = {
  matches: /www\.xiaohongshu\.com/,
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href

        if (!href.includes("www.xiaohongshu.com")) {
          return true
        }

        let key = getUserProfileUrl(href, true)
        if (key) {
          const titleElement = hasClass(element, "name")
            ? element
            : $(".name", element)
          let title: string | undefined
          if (titleElement) {
            title = titleElement.textContent!
          }

          const meta = { type: "user" }
          if (title) {
            meta.title = title
          } else {
            return false
          }

          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""

          return true
        }

        key = getPostUrl(href)
        if (key) {
          const meta = { type: "post" }
          element.utags = { key, meta }
          return true
        }

        return true
      }
    ) as HTMLAnchorElement[]
  },
  excludeSelectors: [...defaultSite.excludeSelectors, ".cover"],
  addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
    let key = getUserProfileUrl(location.href)
    if (key) {
      // profile header
      const element = $(".user-info .user-name")
      if (element) {
        const title = element.textContent!.trim()
        if (title) {
          const meta = { title, type: "user" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    }

    key = getPostUrl(location.href)
    if (key) {
      // post title
      const element = $(".note-content .title")
      if (element) {
        const title = element.textContent!.trim()
        if (title) {
          const meta = { title, type: "post" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    }
  },
}

export default site
