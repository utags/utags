import { $$ } from "browser-extension-utils"

import defaultSite from "../default"

const site = {
  matches: /reddit\.com/,
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href
        const textContent = element.textContent || ""
        if (/^https:\/\/www\.reddit\.com\/user\/\w+\/$/.test(href)) {
          if (/overview/i.test(textContent)) {
            return false
          }

          return true
        }

        if (/^https:\/\/www\.reddit\.com\/r\/\w+\/$/.test(href)) {
          if (/posts/i.test(textContent)) {
            return false
          }

          return true
        }

        return false
      }
    ) as HTMLAnchorElement[]
  },
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    'a[data-testid="comment_author_icon"]',
  ],
}

export default site
