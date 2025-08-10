import { $, $$, doc, hasClass } from "browser-extension-utils"
import styleText from "data-text:./032-flarum.scss"

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from "../../modules/visited"
import defaultSite from "../default"

export default (() => {
  const prefix = location.origin + "/"

  function getUserProfileUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()
      if (exact) {
        if (/^u\/[\w-]+([?#].*)?$/.test(href2)) {
          return prefix + href2.replace(/^(u\/[\w-]+).*/, "$1")
        }
      } else if (/^u\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/^(u\/[\w-]+).*/, "$1")
      }
    }

    return undefined
  }

  function getPostUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()
      if (exact) {
        if (/^d\/\d+(?:-[^/?]+)?(?:\/\d+)?([?#].*)?$/.test(href2)) {
          return prefix + href2.replace(/^(d\/\d+).*/, "$1")
        }
      } else if (/^d\/\d+(?:-[^/?]+)?/.test(href2)) {
        return prefix + href2.replace(/^(d\/\d+).*/, "$1")
      }
    }

    return undefined
  }

  function getTagUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()
      if (exact) {
        if (/^t\/[\w-]+([?#].*)?$/.test(href2)) {
          return prefix + href2.replace(/^(t\/[\w-]+).*/, "$1")
        }
      } else if (/^t\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/^(t\/[\w-]+).*/, "$1")
      }
    }

    return undefined
  }

  return {
    matches:
      /discuss\.flarum\.org|discuss\.flarum\.org\.cn|yuanliao\.info|veryfb\.com|kater\.me|bbs\.viva-la-vita\.org/,
    preProcess() {
      setVisitedAvailable(true)
    },
    listNodesSelectors: [
      "ul.DiscussionList-discussions li",
      ".hotDiscussion-content ul li",
      // replies
      ".PostStream .PostStream-item",
    ],
    conditionNodesSelectors: [
      // topic title
      "ul.DiscussionList-discussions li a",
      ".hotDiscussion-content ul li a",

      // replies
      ".PostStream .PostStream-item .PostUser-name a",
    ],
    validate(element: HTMLAnchorElement) {
      const href = element.href

      if (!href.startsWith(prefix)) {
        return true
      }

      let key = getUserProfileUrl(href, true)
      if (key) {
        // ".GroupList-UserList-user .username" => example.com/groups page
        const titleElement = $(".GroupList-UserList-user .username", element)
        const title = (titleElement || element).textContent!.trim()

        // if (!title) {
        //   return false
        // }

        const meta = { type: "user", title }

        element.utags = { key, meta }
        element.dataset.utags = element.dataset.utags || ""

        if (titleElement) {
          element.dataset.utags_position_selector =
            ".GroupList-UserList-user .username"
        } else if (element.closest(".PostUser .PostUser-name")) {
          element.dataset.utags_position_selector = ".PostUser"
        }

        return true
      }

      key = getPostUrl(href, true)
      if (key) {
        const titleElement =
          $(".DiscussionListItem-title", element) ||
          $(".TagTile-lastPostedDiscussion-title", element)
        const title = (titleElement || element).textContent!.trim()
        if (!title) {
          return false
        }

        const meta = { type: "post", title }
        element.utags = { key, meta }
        element.dataset.utags = element.dataset.utags || ""
        markElementWhetherVisited(key, element)
        if (titleElement) {
          element.dataset.utags_position_selector = hasClass(
            element,
            "TagTile-lastPostedDiscussion"
          )
            ? "time"
            : ".item-terminalPost"
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
        element.dataset.utags = element.dataset.utags || ""
        return true
      }

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      "header.App-header",
      ".sideNav",
      ".PostMention",
      ".Post-mentionedBy",
      ".Post-mentionedBy-preview",
      ".PostMention-preview",
      ".Dropdown-menu",
      ".Button",
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      const isDarkMode = $('meta[name="color-scheme"]')?.content === "dark"
      doc.documentElement.dataset.utags_darkmode = isDarkMode ? "1" : "0"

      let key = getPostUrl(location.href)
      if (key) {
        addVisited(key)

        const element = $(".item-title h1")
        if (element) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title, type: "post" }
            element.utags = { key, meta }
            element.dataset.utags_node_type = "link"
            matchedNodesSet.add(element)
            markElementWhetherVisited(key, element)
          }
        }
      }

      key = getTagUrl(location.href)
      if (key) {
        const element = $("h1.Hero-title")
        if (element) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title, type: "tag" }
            element.utags = { key, meta }
            element.dataset.utags_node_type = "link"
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getStyle: () => styleText,
  }
})()
