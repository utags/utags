import { $, $$ } from "browser-extension-utils"
import styleText from "data-text:./010-threads.net.scss"

import defaultSite from "../default"

export default (() => {
  function getUserProfileUrl(url: string) {
    if (url.startsWith("https://www.threads.net/")) {
      const href2 = url.slice(24)
      if (/^@[\w.]+/.test(href2)) {
        return (
          "https://www.threads.net/" +
          href2.replace(/(^@[\w.]+).*/, "$1").toLowerCase()
        )
      }
    }

    return undefined
  }

  return {
    matches: /threads\.net/,
    validate(element: HTMLAnchorElement) {
      const href = element.href
      if (href.startsWith("https://www.threads.net/")) {
        // Remove "https://www.threads.net/"
        const href2 = href.slice(24)
        // console.log(href2)
        if (/^@[\w.]+$/.test(href2)) {
          const meta = { type: "user" }
          element.utags = { meta }

          return true
        }
      }

      return false
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      // Tabs
      '[role="tablist"]',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      // profile header
      const element = $("h1+div>div>span,h2+div>div>span")
      if (element) {
        const title = element.textContent!.trim()
        const key = getUserProfileUrl(location.href)
        if (title && key && key === "https://www.threads.net/@" + title) {
          const meta = { title, type: "user" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    },
    getStyle: () => styleText,
  }
})()
