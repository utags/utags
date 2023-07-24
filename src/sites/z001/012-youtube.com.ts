import { $, $$, getAttribute } from "browser-extension-utils"

import defaultSite from "../default"

const prefix = "https://www.youtube.com/"
const prefix2 = "https://m.youtube.com/"

function getUserProfileUrl(href: string) {
  if (href.startsWith(prefix) || href.startsWith(prefix2)) {
    const href2 = href.startsWith(prefix2) ? href.slice(22) : href.slice(24)
    if (/^@\w+/.test(href2)) {
      return prefix + href2.replace(/(^@\w+).*/, "$1")
    }

    if (/^channel\/[\w-]+/.test(href2)) {
      return prefix + href2.replace(/(^channel\/[\w-]+).*/, "$1")
    }
  }

  return undefined
}

const site = {
  matches: /youtube\.com/,
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const hrefAttr = getAttribute(element, "href")
        if (!hrefAttr || hrefAttr === "null" || hrefAttr === "#") {
          return false
        }

        const href = element.href
        if (href.startsWith(prefix) || href.startsWith(prefix2)) {
          const pathname = element.pathname
          if (/^\/@\w+$/.test(pathname)) {
            // console.log(pathname)

            const key = prefix + pathname.slice(1)
            const meta = { type: "user" }
            element.utags = { key, meta }

            return true
          }

          if (/^\/channel\/[\w-]+$/.test(pathname)) {
            // console.log(pathname, element)

            const key = prefix + pathname.slice(1)
            const meta = { type: "channel" }
            element.utags = { key, meta }

            return true
          }
        }

        return false
      }
    ) as HTMLAnchorElement[]
  },
  excludeSelectors: [...defaultSite.excludeSelectors],
  addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
    // profile header
    const element = $(
      "#inner-header-container #container.ytd-channel-name #text"
    )
    if (element) {
      const title = element.textContent!.trim()
      const key = getUserProfileUrl(location.href)
      if (title && key) {
        const meta = { title }
        element.utags = { key, meta }
        matchedNodesSet.add(element)
      }
    }
  },
}

export default site
