import { $$ } from "browser-extension-utils"

import defaultSite from "../default"

const site = {
  matches: /github\.com/,
  listNodesSelectors: [],
  conditionNodesSelectors: [],
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href

        if (href.startsWith("https://github.com/")) {
          if (/since|until/.test(href)) {
            return false
          }

          if (/^https:\/\/github\.com\/[\w-]+$/.test(href)) {
            const username = /^https:\/\/github\.com\/([\w-]+)$/.exec(href)![1]
            if (!/about|pricing|security/.test(username)) {
              const meta = { type: "user" }
              element.utags = { meta }
            }

            return true
          }

          if (/(author%3A|author=)[\w-]+/.test(href)) {
            const username = /(author%3A|author=)([\w-]+)/.exec(href)![2]
            const key = `https://github.com/${username}`
            const title = username
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            return true
          }
        }

        return false
      }
    ) as HTMLAnchorElement[]
  },
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    // User popup
    'section[aria-label~="User"] .Link--secondary',
    // Repo popup
    ".Popover-message .Link--secondary",
    ".IssueLabel",
  ],
}

export default site
