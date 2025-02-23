import { $, $$ } from "browser-extension-utils"
import styleText from "data-text:./002-e-hentai.org.scss"

import type { UserTag } from "../../types"
import { getFirstHeadElement } from "../../utils"
import defaultSite from "../default"

const prefix = "https://e-hentai.org/"
const prefix2 = "https://exhentai.org/"

function getPostUrl(url: string) {
  if (url.startsWith(prefix)) {
    const href2 = url.slice(21)
    if (/^g\/\w+/.test(href2)) {
      return prefix + href2.replace(/^(g\/\w+\/\w+\/).*/, "$1")
    }
  }

  if (url.startsWith(prefix2)) {
    const href2 = url.slice(21)
    if (/^g\/\w+/.test(href2)) {
      return prefix2 + href2.replace(/^(g\/\w+\/\w+\/).*/, "$1")
    }
  }

  return undefined
}

function isImageViewUrl(url: string) {
  if (url.startsWith(prefix)) {
    const href2 = url.slice(21)
    return /^s\/\w+/.test(href2)
  }

  if (url.startsWith(prefix2)) {
    const href2 = url.slice(21)
    return /^s\/\w+/.test(href2)
  }

  return false
}

const site = {
  matches: /e-hentai\.org|exhentai\.org/,
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)")
      .filter((element: HTMLAnchorElement) => {
        const href = element.href
        if (href.startsWith(prefix) || href.startsWith(prefix2)) {
          const key = getPostUrl(href)
          if (key) {
            const titleElement = $(".glink", element)
            let title: string | undefined
            if (titleElement) {
              title = titleElement.textContent!
            }

            const meta = { type: "post" }
            if (title) {
              meta.title = title
            }

            element.utags = { key, meta }
            return true
          }

          if (isImageViewUrl(href)) {
            return false
          }
        }

        return true
      })
      .map((element: HTMLAnchorElement) => {
        // Extened view
        const titleElement = $(".gl4e.glname .glink", element)
        if (titleElement) {
          titleElement.utags = element.utags as UserTag
          titleElement.dataset.utags = titleElement.dataset.utags || ""
          titleElement.dataset.utags_node_type = "link"
          return titleElement
        }

        return element
      }) as HTMLAnchorElement[]
  },
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    "#nb",
    ".searchnav",
    ".gtb",
    'a[href*="report=select"]',
    'a[href*="act=expunge"]',
  ],
  addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
    const key = getPostUrl(location.href)
    if (key) {
      // post title
      const element = getFirstHeadElement()
      if (element) {
        const title = element.textContent!.trim()
        if (title) {
          const meta = { title, type: "post" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    }
  },
  getStyle: () => styleText,
}

export default site
