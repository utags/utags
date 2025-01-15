import { $, $$, hasClass } from "browser-extension-utils"
import styleText from "data-text:./018-xiaohongshu.com.scss"

import defaultSite from "../default"

const prefix = "https://www.xiaohongshu.com/"

function getCanonicalUrl(url: string) {
  if (url.startsWith(prefix)) {
    const href2 = url.slice(prefix.length)
    // https://www.xiaohongshu.com/search_result?keyword=abcd&type=54&source=web_note_detail_r10
    if (href2.startsWith("search_result") && href2.includes("keyword")) {
      return (
        prefix +
        "search_result/?" +
        href2.replace(/.*?(keyword=[^&]*).*/, "$1") +
        "&type=54"
      )
    }
  }

  return url
}

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

// 2024年开始小红书需要 xsec_token 参数才可以访问。目前先只打标签，无法访问的问题日后通过其他方式实现可访问。比如破解参数生成，或通过中转站。
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
        element.dataset.utags_position = "LB"

        if (!href.startsWith(prefix)) {
          return true
        }

        let key = getUserProfileUrl(href, true)
        if (key) {
          if (element.closest(".note-content-user")) {
            console.log(element)
          }

          const titleElement =
            (hasClass(element, "name") ? element : $(".name", element)) ||
            element
          let title: string | undefined
          if (titleElement) {
            title = titleElement.textContent!
          }

          if (!title) {
            return false
          }

          if (element.closest(".author-container .author-wrapper .name")) {
            // element.dataset.utags_position = "LT"
          }

          const meta = { type: "user", title }
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
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    ".cover",
    ".side-bar",
    ".dropdown-nav",
    ".dropdown-container",
    ".interaction-info",
  ],
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
          element.dataset.utags_position = "LT"
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
  getCanonicalUrl,
  getStyle: () => styleText,
}

export default site
