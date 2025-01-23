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

function getPostUrl(url: string, exact = false) {
  if (url.startsWith(prefix)) {
    const href2 = url.slice(prefix.length).toLowerCase()
    if (exact) {
      if (/^t\/[\w-]+\/\d+(\/\d+)?([?#].*)?$/.test(href2)) {
        return prefix + href2.replace(/^(t\/[\w-]+\/\d+).*/, "$1")
      }
    } else if (/^t\/[\w-]+\/\d+?/.test(href2)) {
      return prefix + href2.replace(/^(t\/[\w-]+\/\d+).*/, "$1")
    }
  }

  return undefined
}

function getCategoryUrl(url: string, exact = false) {
  if (url.startsWith(prefix)) {
    const href2 = url.slice(prefix.length).toLowerCase()
    if (exact) {
      if (/^c\/[\w-]+(\/[\w-]+)?\/\d+([?#].*)?$/.test(href2)) {
        return prefix + href2.replace(/^(c\/[\w-]+(\/[\w-]+)?\/\d+).*/, "$1")
      }
    } else if (/^c\/[\w-]+(\/[\w-]+)?\/\d+?/.test(href2)) {
      return prefix + href2.replace(/^(c\/[\w-]+(\/[\w-]+)?\/\d+).*/, "$1")
    }
  }

  return undefined
}

function getTagUrl(url: string, exact = false) {
  if (url.startsWith(prefix)) {
    const href2 = url.slice(prefix.length).toLowerCase()
    if (exact) {
      if (/^tag\/[^/?#]+([?#].*)?$/.test(href2)) {
        return prefix + href2.replace(/^(tag\/[^/?#]+).*/, "$1")
      }
    } else if (/^tag\/[^/?#]+?/.test(href2)) {
      return prefix + href2.replace(/^(tag\/[^/?#]+).*/, "$1")
    }
  }

  return undefined
}

const site = {
  matches:
    /meta\.discourse\.org|linux\.do|meta\.appinn\.net|community\.openai\.com|community\.cloudflare\.com/,
  listNodesSelectors: [
    ".topic-list tr",
    // replies
    ".topic-area .topic-post",
    // search results
    ".search-results .fps-result",
  ],
  conditionNodesSelectors: [
    // topic title
    ".topic-list tr .title",
    // category
    ".topic-list tr .badge-category__wrapper",
    // tag
    ".topic-list tr .discourse-tag",
    // author
    ".topic-list tr .posters a:first-of-type",

    // replies
    ".topic-area .topic-post:nth-of-type(n+2) .names a",

    // search results
    ".search-results .fps-result .author a",
    ".search-results .fps-result .search-link",
    ".search-results .fps-result .badge-category__wrapper",
    ".search-results .fps-result .discourse-tag",
  ],
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href

        if (!href.startsWith(prefix)) {
          return true
        }

        let key = getUserProfileUrl(href, true)
        if (key) {
          const title = element.textContent!.trim()
          if (
            !title &&
            !element.closest(".topic-list tr .posters a:first-of-type") &&
            !element.closest(".bookmark-list tr a.avatar") &&
            !element.closest(
              ".user-content .user-stream-item__header a.avatar-link"
            ) &&
            !element.closest(".column .latest-topic-list .topic-poster a") &&
            !element.closest(".search-results .author a")
          ) {
            return false
          }

          const meta = { type: "user", title }

          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""

          return true
        }

        key = getPostUrl(href)
        if (key) {
          const title = element.textContent!.trim()
          if (!title) {
            return false
          }

          if (
            element.closest("header .topic-link") &&
            getComputedStyle(element).display === "inline"
          ) {
            element.dataset.utags_flag = "inline"
          }

          const meta = { type: "post", title }
          element.utags = { key, meta }
          return true
        }

        key = getCategoryUrl(href)
        if (key) {
          const title = element.textContent!.trim()
          if (!title) {
            return false
          }

          const meta = { type: "category", title }
          element.utags = { key, meta }
          return true
        }

        key = getTagUrl(href)
        if (key) {
          const title = element.textContent!.trim()
          if (!title) {
            return false
          }

          const meta = { type: "tag", title }
          element.utags = { key, meta }
          return true
        }

        return false
      }
    ) as HTMLAnchorElement[]
  },
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    ".topic-map",
    ".names .second",
    ".post-activity",
    ".topic-last-activity",
    ".topic-item-stats .activity",
    ".topic-post-badges",
    ".topic-excerpt",
    ".topic-list-category-expert-tags",
    ".list-vote-count",
    ".post-date",
    ".category__badges",
    ".badge-posts",
    ".topic-timeline",
    ".with-timeline",
    ".sidebar-wrapper",
    "#skip-link",
    "#navigation-bar",
  ],
  validMediaSelectors: [
    "a img.emoji",
    "a svg.svg-string",
    ".category-title-link",
    ".topic-list tr .posters a:first-of-type",
    ".search-results .author a .avatar",
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
        const title = element.textContent!.trim().trim()
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
