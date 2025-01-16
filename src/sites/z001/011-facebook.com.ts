import { $, $$ } from "browser-extension-utils"
import styleText from "data-text:./011-facebook.com.scss"

import { getFirstHeadElement, getUrlParameters } from "../../utils"
import defaultSite from "../default"

const prefix = location.origin + "/"

function getUserProfileUrl(href: string, exact = false) {
  if (href.startsWith(prefix)) {
    const href2 = href.slice(prefix.length).toLowerCase()
    // https://www.facebook.com/profile.php?id=123456789
    if (href2.startsWith("profile.php")) {
      const parameters = getUrlParameters(href, ["id", "sk"])
      if (parameters.id && !parameters.sk) {
        return (
          "https://www.facebook.com/profile.php?id=" + (parameters.id as string)
        )
      }
    }
    // https://www.facebook.com/123456789/ => https://www.facebook.com/profile.php?id=123456789
    else if (/^\d+\/?([?#].*)?$/.test(href2)) {
      return (
        "https://www.facebook.com/profile.php?id=" +
        href2.replace(/^(\d+).*/, "$1")
      )
    }
    // https://www.facebook.com/messages/t/123456789/ => https://www.facebook.com/profile.php?id=123456789
    else if (/^messages\/t\/\d+\/?([?#].*)?$/.test(href2)) {
      return (
        "https://www.facebook.com/profile.php?id=" +
        href2.replace(/^messages\/t\/(\d+).*/, "$1")
      )
    }
    // https://www.facebook.com/friends/requests/?profile_id=123456789 => https://www.facebook.com/profile.php?id=123456789
    // https://www.facebook.com/friends/suggestions/?profile_id=123456789 => https://www.facebook.com/profile.php?id=123456789
    else if (
      href2.startsWith("friends/requests/?profile_id=") ||
      href2.startsWith("friends/suggestions/?profile_id=")
    ) {
      const parameters = getUrlParameters(href, ["profile_id"])
      if (parameters.profile_id) {
        return (
          "https://www.facebook.com/profile.php?id=" +
          (parameters.profile_id as string)
        )
      }
    }
    // https://www.facebook.com/nickname
    else if (
      ((exact && /^[\w.]+([?#].*)?$/.test(href2)) ||
        (!exact && /^[\w.]+/.test(href2))) &&
      !/^(policies|events|ads|business|privacy|help|friends|messages|profile\.php|permalink\.php|photo\.php|\w+\.php)\b/.test(
        href2
      )
    ) {
      return "https://www.facebook.com/" + href2.replace(/(^[\w.]+).*/, "$1")
    }
  }

  return undefined
}

const site = {
  matches: /^(www|m)\.facebook\.com$/,
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href

        if (
          !href.startsWith("https://www.facebook.com/") &&
          !href.startsWith("https://m.facebook.com/") &&
          !href.startsWith("https://l.facebook.com/")
        ) {
          return true
        }

        const key = getUserProfileUrl(href, true)
        if (key) {
          const title = element.textContent!.trim()
          if (!title) {
            return false
          }

          if ($("svg,img", element)) {
            element.dataset.utags_position = "LB"
          }

          const meta = { type: "user", title }
          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""

          return true
        }

        // element.dataset.utags_other = "1"
        // return false
        return false
      }
    ) as HTMLAnchorElement[]
  },
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    'div[data-pagelet="ProfileTabs"]',
  ],
  addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
    // profile header
    const element = getFirstHeadElement('div[role="main"] h1')
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
  getStyle: () => styleText,
}

export default site
