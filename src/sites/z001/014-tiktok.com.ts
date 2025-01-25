import { $, $$ } from "browser-extension-utils"
import styleText from "data-text:./014-tiktok.com.scss"

import defaultSite from "../default"

const prefix = "https://www.tiktok.com/"

function getUserProfileUrl(url: string, exact = false) {
  if (url.startsWith(prefix)) {
    const href2 = url.slice(23)
    if (exact) {
      if (/^@[\w.-]+([?#].*)?$/.test(href2)) {
        return prefix + href2.replace(/(^@[\w.-]+).*/, "$1")
      }
    } else if (/^@[\w.-]+/.test(href2)) {
      return prefix + href2.replace(/(^@[\w.-]+).*/, "$1")
    }
  }

  return undefined
}

const site = {
  matches: /tiktok\.com/,
  listNodesSelectors: [
    ".css-ulyotp-DivCommentContentContainer",
    ".css-1gstnae-DivCommentItemWrapper",
    ".css-x6y88p-DivItemContainerV2",
  ],
  conditionNodesSelectors: [
    '.css-ulyotp-DivCommentContentContainer a[href^="/@"]',
    '.css-1gstnae-DivCommentItemWrapper a[href^="/@"]',
    '.css-x6y88p-DivItemContainerV2 a[href^="/@"]',
  ],
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href
        if (!href.startsWith(prefix)) {
          return true
        }

        const key = getUserProfileUrl(href, true)
        if (key) {
          const titleElement = $('h3,[data-e2e="browse-username"]', element)
          const title = titleElement
            ? titleElement.textContent!.trim()
            : element.textContent!.trim()

          if (!title) {
            return false
          }

          const meta = { type: "user", title }

          element.utags = { key, meta }
          // element.dataset.utags = element.dataset.utags || ""

          return true
        }

        return false
      }
    ) as HTMLAnchorElement[]
  },
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    ".avatar-anchor",
    '[data-e2e*="avatar"]',
    '[data-e2e="user-card-nickname"]',
  ],
  validMediaSelectors: [
    '[data-e2e="browse-bluev"]',
    '[data-e2e="recommend-card"]',
  ],
  addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
    // profile header
    const element = $('h1[data-e2e="user-title"]')
    if (element) {
      const title = element.textContent!.trim()
      const key = getUserProfileUrl(location.href)
      if (title && key) {
        const meta = { title, type: "user" }
        element.utags = { key, meta }
        matchedNodesSet.add(element)
      }
    }
  },
  getStyle: () => styleText,
}

export default site
