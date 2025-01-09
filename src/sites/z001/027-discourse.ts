import { $, $$, hasClass } from "browser-extension-utils"
import styleText from "data-text:./027-discourse.scss"

import defaultSite from "../default"

const prefix = location.origin + "/"
const hostname = location.hostname

function getUserProfileUrl(url: string, exact = false) {
  if (url.startsWith(prefix)) {
    const href2 = url.slice(prefix.length).toLowerCase()
    if (exact) {
      if (/^u\/[\w.-]+([?#].*)?$/.test(href2)) {
        return prefix + href2.replace(/^(u\/[\w.-]+).*/, "$1")
      }
    } else if (/^u\/[\w.-]+/.test(href2)) {
      return prefix + href2.replace(/^(u\/[\w.-]+).*/, "$1")
    }
  }

  return undefined
}

const site = {
  matches: /linux\.do|meta\.appinn\.net/,
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href

        if (!href.startsWith(prefix)) {
          return true
        }

        const key = getUserProfileUrl(href, true)
        if (key) {
          const title = element.textContent!
          if (!title) {
            return false
          }

          const meta = { type: "user", title }

          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""

          return true
        }

        // key = getPostUrl(href)
        // if (key) {
        //   const meta = { type: "post" }
        //   element.utags = { key, meta }
        //   return true
        // }

        return false
      }
    ) as HTMLAnchorElement[]
  },
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    ".topic-map",
    ".names .second",
  ],
  addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
    const key = getUserProfileUrl(location.href)
    if (key) {
      // profile header
      const element =
        $(".user-profile-names .username") ||
        $(
          ".user-profile-names .user-profile-names__primary,.user-profile-names .user-profile-names__secondary"
        )
      if (element) {
        const title = element.textContent!.trim()
        if (title) {
          const meta = { title, type: "user" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    }
  },
  getStyle: () => styleText,
}

export default site
