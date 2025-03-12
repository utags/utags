import { $ } from "browser-extension-utils"
import styleText from "data-text:./004-dmm.co.jp.scss"
import { getTrimmedTitle } from "utags-utils"

import defaultSite from "../default"

export default (() => {
  const prefix = "https://www.dmm.co.jp/"

  function getCanonicalUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (href2.includes("/=/")) {
        return prefix + href2.replace(/\?.*/, "")
      }
    }

    return url
  }

  function getProductUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (href2.includes("/detail/=/cid=")) {
        return prefix + href2.replace(/\?.*/, "")
      }
    }

    return undefined
  }

  function getMakerUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (href2.includes("/list/=/article=maker/id=")) {
        return prefix + href2.replace(/\?.*/, "")
      }
    }

    return undefined
  }

  return {
    matches: /dmm\.co\.jp/,
    validate(element: HTMLAnchorElement) {
      const href = element.href

      if (!href.startsWith(prefix)) {
        return true
      }

      if (href.includes("/=/")) {
        const key = getProductUrl(href)
        if (key) {
          const titleElement = $(
            ".mainListLinkWork__txt,.responsive-name",
            element
          )
          const title = titleElement
            ? getTrimmedTitle(titleElement)
            : getTrimmedTitle(element)
          if (title) {
            const meta = { title, type: "product" }
            element.utags = { key, meta }
          }
        }

        return true
      }

      return false
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      "header",
      ".localNav-list",
      ".m-leftNavigation",
      ".l-areaSideNavColumn",
      ".top-leftcolumn",
      ".top-rightcolumn",
      ".d-btn-xhi-st",
      ".headingTitle__txt--more",
      ".recommendCapt__txt",
      ".circleFanButton__content",
      ".displayFormat",
      ".pageNationList",
      ".nav-text-container",
      ".sub-nav-link",
      ".m-listHeader",
      ".dcd-review__rating_map",
      ".dcd-review_boxpagenation",
      ".sampleButton",
      ".right_navi_link",
    ],
    validMediaSelectors: [
      ".mainList",
      ".pickup .fn-responsiveImg",
      "#l-areaRecommendProduct",
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      let key = getProductUrl(location.href)
      if (key) {
        // post title
        const element = $("h1.productTitle__txt")
        if (element) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }

      key = getMakerUrl(location.href)
      if (key) {
        // post title
        const element = $(".circleProfile__name span")
        if (element) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title }
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
