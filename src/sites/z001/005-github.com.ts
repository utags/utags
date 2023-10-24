import { $$ } from "browser-extension-utils"
import styleText from "data-text:./005-github.com.scss"

import defaultSite from "../default"

const noneUsers = new Set([
  "about",
  "pricing",
  "security",
  "login",
  "logout",
  "signup",
  "explore",
  "topics",
  "trending",
  "collections",
  "events",
  "sponsors",
  "features",
  "enterprise",
  "team",
  "customer-stories",
  "readme",
  "premium-support",
  "sitemap",
  "git-guides",
  "open-source",
  "marketplace",
  "codespaces",
  "issues",
  "pulls",
  "discussions",
  "dashboard",
  "account",
  "new",
  "notifications",
  "settings",
  "feedback",
  "organizations",
  "github-copilot",
  "search",
])

const prefix = "https://github.com/"

function getUserProfileUrl(href: string) {
  if (href.startsWith(prefix)) {
    const href2 = href.slice(19)

    let username = ""
    if (/^[\w-]+$/.test(href2)) {
      username = /^([\w-]+)$/.exec(href2)![1]
    }

    if (/(author%3A|author=)[\w-]+/.test(href2)) {
      username = /(author%3A|author=)([\w-]+)/.exec(href2)![2]
    }

    if (username && !noneUsers.has(username)) {
      return prefix + username
    }
  }

  return undefined
}

function getRepoUrl(href: string) {
  if (href.startsWith(prefix)) {
    const href2 = href.slice(19)

    if (/^[\w-]+\/[\w-.]+(\?.*)?$/.test(href2)) {
      const username = /^([\w-]+)/.exec(href2)![1]
      if (username && !noneUsers.has(username)) {
        return prefix + href2.replace(/(^[\w-]+\/[\w-.]+).*/, "$1")
      }
    }
  }

  return undefined
}

function getTopicsUrl(href: string) {
  if (href.startsWith(prefix)) {
    const href2 = href.slice(19)

    if (/^topics\/[\w-.]+(\?.*)?$/.test(href2)) {
      return prefix + href2.replace(/(^topics\/[\w-.]+).*/, "$1")
    }
  }

  return undefined
}

const site = {
  matches: /github\.com/,
  listNodesSelectors: [],
  conditionNodesSelectors: [],
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href

        if (href.startsWith(prefix)) {
          if (/since|until/.test(href)) {
            return false
          }

          let key = getUserProfileUrl(href)
          if (key) {
            const username = /^https:\/\/github\.com\/([\w-]+)$/.exec(key)![1]
            const title = username
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            return true
          }

          key = getRepoUrl(href)
          if (key) {
            const title = key.replace(prefix, "")
            const meta = { title, type: "repo" }
            element.utags = { key, meta }
            return true
          }

          key = getTopicsUrl(href)
          if (key) {
            const text = element.textContent!.trim()
            if (text === "#") {
              return false
            }

            const title = key.replace(prefix, "")
            const meta = { title, type: "topic" }
            element.utags = { key, meta }
            return true
          }

          return false
        }

        return true
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
    ".subnav-links",
    ".btn",
    ".filter-item",
  ],
  validMediaSelectors: [
    // Repo icon
    "svg.octicon-repo",
  ],
  getStyle: () => styleText,
}

export default site
