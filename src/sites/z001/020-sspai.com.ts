import { $, $$, hasClass } from "browser-extension-utils"
import styleText from "data-text:./020-sspai.com.scss"

import defaultSite from "../default"

export default (() => {
  const prefix = "https://sspai.com/"
  const excludeLinks = [
    "https://sspai.com/prime",
    "https://sspai.com/matrix",
    "https://sspai.com/page/about-us",
    "https://sspai.com/page/agreement",
    "https://sspai.com/page/bussiness",
    "https://sspai.com/post/37793",
    "https://sspai.com/page/client",
    "https://sspai.com/s/J71e",
    "https://sspai.com/mall",
  ]

  function getCanonicalUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href = url.slice(18)

      if (href.startsWith("u/")) {
        return prefix + href.replace(/^(u\/\w+).*/, "$1")
      }
    }

    return url
  }

  function getUserProfileUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(18)
      if (/^u\/\w+/.test(href2)) {
        return prefix + href2.replace(/^(u\/\w+).*/, "$1")
      }
    }

    return undefined
  }

  function getPostUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(18)
      if (/^post\/\d+/.test(href2)) {
        return prefix + href2.replace(/^(post\/\d+).*/, "$1")
      }
    }

    return undefined
  }

  return {
    matches: /sspai\.com/,
    validate(element: HTMLAnchorElement) {
      const href = element.href
      for (const link of excludeLinks) {
        if (href.includes(link)) {
          return false
        }
      }

      if (
        hasClass(element, "ss__user__nickname__wrapper") ||
        element.closest('.card_bottom > a[href^="/u/"]')
      ) {
        element.dataset.utags = element.dataset.utags || ""
        return true
      }

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      "header",
      "footer",
      ".pai_abstract",
      ".pai_title .link",
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      let key = getPostUrl(location.href)
      if (key) {
        // post title
        const element = $(".article-header .title")
        if (element && !element.closest(".pai_title")) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title, type: "post" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }

      key = getUserProfileUrl(location.href)
      if (key) {
        // profile header
        const element = $(
          ".user_content .user__info__card .ss__user__card__nickname"
        )
        if (element) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getCanonicalUrl,
    getStyle: () => styleText,
  }
})()
