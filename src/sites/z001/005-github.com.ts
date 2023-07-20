import { $$ } from "browser-extension-utils"

import defaultSite from "../default"

const site = {
  matches: /github\.com/,
  listNodesSelectors: [],
  conditionNodesSelectors: [],
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    // "#nav",
    // "#header",
    // "#subnav",
    // ".mobile_comments",
    // ".description_present",
    // ".morelink",
    // ".user_tree",
    // ".dropdown_parent",
    // 'a[href^="/login"]',
    // 'a[href^="/logout"]',
    // 'a[href^="/u#"]',
    // 'a[href$="/save"]',
    // 'a[href$="/hide"]',
    // 'a[href$="/suggest"]',
  ],
  getMatchedNodes() {
    // TODO: add type. user/org, repo
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href
        if (/^https:\/\/github\.com\/\w+$/.test(href)) {
          return true
        }

        return false
      }
    )
  },
}

export default site
