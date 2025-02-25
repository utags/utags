import { $, $$, hasClass } from "browser-extension-utils"
import styleText from "data-text:./021-douyin.com.scss"

import { getFirstHeadElement } from "../../utils"
import defaultSite from "../default"

export default (() => {
  const prefix = "https://www.douyin.com/"

  function getUserProfileUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(23)
      if (exact) {
        if (/^user\/[\w-]+(\?.*)?$/.test(href2)) {
          return prefix + href2.replace(/^(user\/[\w-]+).*/, "$1")
        }
      } else if (/^user\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/^(user\/[\w-]+).*/, "$1")
      }
    }

    return undefined
  }

  function getVideoUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(23)
      if (/^video\/\w+/.test(href2)) {
        return prefix + href2.replace(/^(video\/\w+).*/, "$1")
      }
    }

    return undefined
  }

  function getNoteUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(23)
      if (/^note\/\w+/.test(href2)) {
        return prefix + href2.replace(/^(note\/\w+).*/, "$1")
      }
    }

    return undefined
  }

  return {
    matches: /www\.douyin\.com/,
    validate(element: HTMLAnchorElement) {
      const href = element.href

      if (!href.includes("www.douyin.com")) {
        return true
      }

      let key = getUserProfileUrl(href, true)
      if (key) {
        const meta = { type: "user" }
        element.utags = { key, meta }
        return true
      }

      key = getVideoUrl(href)
      if (key) {
        const meta = { type: "video" }
        element.utags = { key, meta }
        return true
      }

      key = getNoteUrl(href)
      if (key) {
        const meta = { type: "post" }
        element.utags = { key, meta }
        return true
      }

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '[data-e2e="douyin-navigation"]',
    ],
    validMediaSelectors: [
      // 昵称中的 emoji 图片
      'img[src*="twemoji"]',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      let key = getUserProfileUrl(location.href)
      if (key) {
        // profile header
        const element = getFirstHeadElement("h1")
        if (element) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }

      key = getVideoUrl(location.href)
      if (key) {
        // post title
        const element = getFirstHeadElement("h1")
        if (element) {
          const title = element.textContent!.trim()
          const target = element.parentElement!.parentElement!
          if (title) {
            const meta = { title, type: "video" }
            target.utags = { key, meta }
            target.dataset.utags_node_type = "link"
            matchedNodesSet.add(target)
          }
        }
      }

      key = getNoteUrl(location.href)
      if (key) {
        // post title
        const element = getFirstHeadElement("h1")
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
    getStyle: () => styleText,
  }
})()
