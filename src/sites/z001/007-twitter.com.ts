import { $$ } from "browser-extension-utils"

import defaultSite from "../default"

const site = {
  matches: /twitter\.com/,
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href
        if (href.startsWith("https://twitter.com/")) {
          // Remove "https://twitter.com/"
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
}

export default site
