import { $, $$, isVisible } from "browser-extension-utils"
import styleText from "data-text:./022-podcasts.google.com.scss"

import defaultSite from "../default"

const prefix = "https://podcasts.google.com/"

function getEpisodeUrl(url: string, exact = false) {
  if (url.startsWith(prefix)) {
    const href2 = url.slice(28)
    if (exact) {
      if (/^feed\/\w+\/episode\/\w+(\?.*)?$/.test(href2)) {
        return prefix + href2.replace(/^(feed\/\w+\/episode\/\w+).*/, "$1")
      }
    } else if (/^feed\/\w+\/episode\/\w+/.test(href2)) {
      return prefix + href2.replace(/^(feed\/\w+\/episode\/\w+).*/, "$1")
    }
  }

  return undefined
}

function getFeedUrl(url: string) {
  if (url.startsWith(prefix)) {
    const href2 = url.slice(28)
    if (/^feed\/\w+(\?.*)?$/.test(href2)) {
      return prefix + href2.replace(/^(feed\/\w+).*/, "$1")
    }
  }

  return undefined
}

function getCanonicalUrl(url: string) {
  if (url.startsWith(prefix)) {
    let url2 = getFeedUrl(url)
    if (url2) {
      return url2
    }

    url2 = getEpisodeUrl(url)
    if (url2) {
      return url2
    }
  }

  return url
}

const site = {
  matches: /podcasts\.google\.com/,
  matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    "header",
    "gm-coplanar-drawer",
  ],
  addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
    let key = getEpisodeUrl(location.href)
    if (key) {
      // episode title
      const element = $("h5")
      if (element) {
        const title = element.textContent!.trim()
        if (title) {
          const meta = { title, type: "episode" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    }

    key = getFeedUrl(location.href)
    if (key) {
      for (const container of $$("[data-encoded-feed]")) {
        if (isVisible(container)) {
          // feed title
          const element = $(
            "div:first-child > div:first-child > div:first-child > div:first-child",
            container
          )
          if (element) {
            const title = element.textContent!.trim()
            if (title) {
              const meta = { title, type: "feed" }
              element.utags = { key, meta }
              matchedNodesSet.add(element)
            }
          }
        }
      }
    }

    for (const element of $$('a[role="listitem"]') as HTMLAnchorElement[]) {
      const key = getEpisodeUrl(element.href)
      const titleElement = $(
        'div[role="navigation"] div div[role="presentation"]',
        element
      )
      if (key && titleElement) {
        const title = titleElement.textContent!
        const meta = { title, type: "episode" }

        titleElement.utags = { key, meta }
        titleElement.dataset.utags_node_type = "link"
        matchedNodesSet.add(titleElement)
      }
    }

    for (const element of $$(
      'a[href^="./feed/"]:not(a[href*="/episode/"])'
    ) as HTMLAnchorElement[]) {
      if (!isVisible(element)) {
        continue
      }

      const key = getFeedUrl(element.href)
      const titleElement = $("div > div", element)
      if (titleElement) {
        const title = titleElement.textContent!
        const meta = { title, type: "feed" }

        titleElement.utags = { key, meta }
        titleElement.dataset.utags_node_type = "link"
        matchedNodesSet.add(titleElement)
      }
    }
  },
  getCanonicalUrl,
  getStyle: () => styleText,
}

export default site
