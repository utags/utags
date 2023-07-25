import { $$ } from "browser-extension-utils"

import defaultSite from "../default"

const prefix = "https://twitter.com/"

const site = {
  matches: /twitter\.com/,
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href
        if (href.startsWith(prefix)) {
          // Remove prefix
          const href2 = href.slice(20)
          if (/^\w+$/.test(href2)) {
            if (
              /^(home|explore|notifications|messages|tos|privacy)$/.test(href2)
            ) {
              return false
            }

            const textContent = element.textContent || ""
            if (!textContent.startsWith("@")) {
              return false
            }
            // console.log(href2)

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
    const elements = $$('[data-testid="UserName"] span')
    for (const element of elements) {
      const title = element.textContent!.trim()
      if (!title || !title.startsWith("@")) {
        continue
      }

      const key = prefix + title.slice(1)
      const meta = { title, type: "user" }
      element.utags = { key, meta }
      matchedNodesSet.add(element)
    }
  },
}

export default site
