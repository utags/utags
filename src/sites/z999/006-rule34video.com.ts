import { $, $$ } from "browser-extension-utils"
import styleText from "data-text:./006-rule34video.com.scss"

import defaultSite from "../default"

export default (() => {
  const prefix = location.origin + "/"

  function getModelUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (/^models\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/^(models\/[\w-]+).*/, "$1") + "/"
      }
    }

    return undefined
  }

  function getMemberUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (/^members\/\d+/.test(href2)) {
        return prefix + href2.replace(/^(members\/\d+).*/, "$1") + "/"
      }
    }

    return undefined
  }

  function getCategoryUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (/^categories\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/^(categories\/[\w-]+).*/, "$1") + "/"
      }
    }

    return undefined
  }

  function getVideoUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (/^video\/\d+(\/[\w-]+)?/.test(href2)) {
        return prefix + href2.replace(/^(video\/\d+(\/[\w-]+)?).*/, "$1") + "/"
      }
    }

    return undefined
  }

  return {
    matches: /rule34video\.com|rule34gen\.com/,
    listNodesSelectors: [
      //
      ".list-comments .item",
      ".thumbs .item",
    ],
    conditionNodesSelectors: [
      //
      ".list-comments .item .comment-info .inner a",
      ".thumbs .item a.th",
    ],
    validate(element: HTMLAnchorElement) {
      const href = element.href

      if (!href.startsWith(prefix)) {
        if ($("header", element.parentElement!)) {
          // AD
          const key = href.replace(/(https?:\/\/[^/]+\/).*/, "$1")
          const meta = { type: "AD", title: "AD" }

          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""
        }

        return true
      }

      const key = getVideoUrl(href)
      if (key) {
        const titleElement = $(".thumb_title", element)
        const title = titleElement
          ? titleElement.textContent!.trim()
          : element.textContent!.trim()

        if (!title) {
          return false
        }

        const meta = { type: "video", title }

        element.utags = { key, meta }
        element.dataset.utags = element.dataset.utags || ""

        return true
      }

      element.dataset.utags = element.dataset.utags || ""

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      ".header",
      ".btn_more",
      ".tabs-menu",
      ".pagination",
      ".headline",
      ".prev",
      ".next",
      ".btn",
      ".all",
      ".tag_item_suggest",
      'a[href*="download"]',
      ".list-comments .wrap_image",
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      let key = getModelUrl(location.href)
      if (key) {
        // title
        const element = $(".brand_inform .title")
        if (element) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title, type: "model" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }

      key = getMemberUrl(location.href)
      if (key) {
        // title
        const element = $(".channel_logo .title")
        if (element) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }

      key = getCategoryUrl(location.href)
      if (key) {
        // title
        const element = $(".brand_inform .title")
        if (element) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title, type: "category" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }

      key = getVideoUrl(location.href)
      if (key) {
        // title
        const element = $("h1.title_video")
        if (element) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title, type: "video" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getStyle: () => styleText,
  }
})()
