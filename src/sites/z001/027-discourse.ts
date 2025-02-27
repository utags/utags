import { $, $$, doc } from "browser-extension-utils"
import styleText from "data-text:./027-discourse.scss"

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from "../../modules/visited"
import type { UserTagMeta, UtagsHTMLElement } from "../../types"

export default (() => {
  const prefix = location.origin + "/"

  const getUserProfileUrl = (url: string, exact = false) => {
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
        if (/^t\/[^/]+\/\d+(\/\d+)?([?#].*)?$/.test(href2)) {
          return prefix + href2.replace(/^(t\/[^/]+\/\d+).*/, "$1")
        }
      } else if (/^t\/[^/]+\/\d+?/.test(href2)) {
        return prefix + href2.replace(/^(t\/[^/]+\/\d+).*/, "$1")
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

  return {
    matches:
      /meta\.discourse\.org|linux\.do|meta\.appinn\.net|community\.openai\.com|community\.cloudflare\.com|community\.wanikani\.com/,
    preProcess() {
      setVisitedAvailable(true)
    },
    listNodesSelectors: [
      ".topic-list .topic-list-body tr",
      // replies
      ".topic-area .topic-post",
      // search results
      ".search-results .fps-result",
    ],
    conditionNodesSelectors: [
      // topic title
      ".topic-list .topic-list-body tr .title",
      // category
      ".topic-list .topic-list-body tr .badge-category__wrapper",
      // tag
      ".topic-list .topic-list-body tr .discourse-tag",
      // author
      ".topic-list .topic-list-body tr .posters a:first-of-type",
      // mobile - author
      ".mobile-view .topic-list a[data-user-card]",

      // replies
      ".topic-area .topic-post:nth-of-type(n+2) .names a",

      // search results
      ".search-results .fps-result .author a",
      ".search-results .fps-result .search-link",
      ".search-results .fps-result .badge-category__wrapper",
      ".search-results .fps-result .discourse-tag",
    ],
    validate(element: HTMLAnchorElement) {
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
          // https://linux.do/u/neo/activity/reactions
          !element.closest(
            ".user-content .user-stream-item__header a.avatar-link"
          ) &&
          // https://linux.do/u/neo/activity/likes-given
          !element.closest(
            ".user-content .filter-1 .post-list-item .post-list-item__header a.avatar-link"
          ) &&
          !element.closest(".column .latest-topic-list .topic-poster a") &&
          !element.closest(".search-results .author a")
        ) {
          return false
        }

        const meta = { type: "user", title }

        element.utags = { key, meta }
        element.dataset.utags = element.dataset.utags || ""

        if (element.closest(".topic-body .names a")) {
          element.dataset.utags_position_selector = ".topic-body .names"
        } else if (element.closest(".user-card .names a")) {
          element.dataset.utags_position_selector = ".user-card .names"
        }

        return true
      }

      key = getPostUrl(href)
      if (key) {
        const title = element.textContent!.trim()

        if (
          element.closest(".mobile-view .topic-list a[data-user-card]") &&
          element.dataset.userCard
        ) {
          const title = element.dataset.userCard
          key = prefix + "u/" + title.toLowerCase()
          const meta = { type: "user", title }

          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""
          return true
        }

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
        markElementWhetherVisited(key, element)

        element.dataset.utags = element.dataset.utags || ""

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

        if (element.closest(".column .category-list .category-title-link")) {
          element.dataset.utags_position_selector =
            ".category-text-title .category-name"
        }

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

      return true
    },
    excludeSelectors: [
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
      // 跳到帖子的原始位置
      ".topic-meta-data .post-link-arrow",
      "#skip-link",
      "#navigation-bar",
      ".user-navigation",
      ".search-menu",
      "footer.category-topics-count",
      '[role="tablist"]',
      ".nav.nav-pills",
      ".btn",
      // chat
      ".chat-time",
    ],
    validMediaSelectors: [
      "a img.emoji",
      "a svg.svg-string",
      ".category-title-link",
      ".topic-list tr .posters a:first-of-type",
      ".search-results .author a .avatar",
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<UtagsHTMLElement>) {
      const isDarkMode = $("header picture > source")?.media === "all"
      doc.documentElement.dataset.utags_darkmode = isDarkMode ? "1" : "0"

      let key = getUserProfileUrl(location.href)
      if (key) {
        // Clear cache
        for (const element of $$(
          ".user-profile-names .username,.user-profile-names .user-profile-names__primary,.user-profile-names .user-profile-names__secondary"
        ) as UtagsHTMLElement[]) {
          delete element.dataset.utags
          delete element.utags
        }

        // profile header
        const element: UtagsHTMLElement =
          ($(".user-profile-names .username") as UtagsHTMLElement) ||
          ($(
            ".user-profile-names .user-profile-names__primary,.user-profile-names .user-profile-names__secondary"
          ) as UtagsHTMLElement)
        if (element) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }

      key = getPostUrl(location.href)
      if (key) {
        addVisited(key)
      }

      // Leader board
      for (const element of $$(".leaderboard div[data-user-card]")) {
        const title = element.dataset.userCard
        if (title) {
          key = prefix + "u/" + title.toLowerCase()
          const meta = { type: "user", title }

          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""
          element.dataset.utags_node_type = "link"
          element.dataset.utags_position_selector = element.closest(".winner")
            ? ".winner"
            : ".user__name"
          matchedNodesSet.add(element)
        }
      }

      // chat
      for (const element of $$(".chat-message span[data-user-card]")) {
        const title = element.dataset.userCard
        if (title) {
          key = prefix + "u/" + title.toLowerCase()
          const meta = { type: "user", title }

          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""
          element.dataset.utags_node_type = "link"

          matchedNodesSet.add(element)
        }
      }
    },
    getStyle: () => styleText,
  }
})()
