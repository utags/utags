import { $, $$, setStyle } from "browser-extension-utils"

import defaultSite from "../default"

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

const site = {
  matches: /threads\.net/,
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href
        if (href.startsWith("https://www.threads.net/")) {
          // Remove "https://www.threads.net/"
          const href2 = href.slice(24)
          // console.log(href2)
          if (/^@[\w.]+$/.test(href2)) {
            const sibling = element.nextElementSibling as HTMLAnchorElement
            // Tabs
            // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
            if (sibling && sibling.href && sibling.href.includes("replies")) {
              return false
            }

            const parant = element.parentElement!
            setStyle(parant, { display: "flex" })

            const meta = { type: "user" }
            element.utags = { meta }

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
    const element = $("h2+div>div>span")
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
}

export default site
