import { $$ } from "browser-extension-utils"

import { getFirstHeadElement } from "../../utils"
import defaultSite from "../default"

function getUserProfileUrl(href: string) {
  if (
    href.startsWith("https://www.facebook.com/") ||
    href.startsWith("https://m.facebook.com/")
  ) {
    const href2 = href.startsWith("https://m.facebook.com/")
      ? href.slice(23)
      : href.slice(25)
    if (/^[\w.]+/.test(href2)) {
      return "https://www.facebook.com/" + href2.replace(/(^[\w.]+).*/, "$1")
    }
  }

  return undefined
}

const site = {
  matches: /facebook\.com/,
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href
        if (
          href.startsWith("https://www.facebook.com/") ||
          href.startsWith("https://m.facebook.com/")
        ) {
          const pathname = element.pathname
          if (/^\/[\w.]+$/.test(pathname)) {
            if (
              /^\/(policies|events|profile\.php|permalink\.php|photo\.php|\w+\.php)$/.test(
                pathname
              )
            ) {
              return false
            }
            // console.log(pathname)

            const key = "https://www.facebook.com" + pathname
            const meta = { type: "user" }
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
    const element = getFirstHeadElement("h1")
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
}

export default site
