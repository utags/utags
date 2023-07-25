import { $, $$ } from "browser-extension-utils"

import defaultSite from "../default"

const prefix = "https://www.tiktok.com/"

function getUserProfileUrl(url: string) {
  if (url.startsWith(prefix)) {
    const href2 = url.slice(23)
    if (/^@[\w.]+/.test(href2)) {
      return prefix + href2.replace(/(^@[\w.]+).*/, "$1")
    }
  }

  return undefined
}

const site = {
  matches: /tiktok\.com/,
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href
        if (href.startsWith(prefix)) {
          const pathname = element.pathname
          if (/^\/@[\w.]+$/.test(pathname)) {
            const titleElement = $("h3", element)
            let title: string | undefined
            if (titleElement) {
              title = titleElement.textContent!
            }

            const key = prefix + pathname.slice(1)
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
      }
    ) as HTMLAnchorElement[]
  },
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    ".avatar-anchor",
    '[data-e2e*="avatar"]',
    '[data-e2e="user-card-nickname"]',
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
}

export default site
