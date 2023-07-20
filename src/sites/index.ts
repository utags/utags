import { $, $$, getAttribute, isUrl } from "browser-extension-utils"

import defaultSite from "./default"
import v2ex from "./z001/001-v2ex"
import greasyforkOrg from "./z001/002-greasyfork.org"
import hackerNews from "./z001/003-news.ycombinator.com"
import lobsters from "./z001/004-lobste.rs"
import github from "./z001/005-github.com"

type Site = {
  matches: RegExp
  listNodesSelectors?: string[]
  getListNodes?: () => HTMLElement[]
  conditionNodesSelectors?: string[]
  getConditionNodes?: () => HTMLElement[]
  matchedNodesSelectors?: string[]
  getMatchedNodes?: () => HTMLAnchorElement[]
  excludeSelectors?: string[]
  addExtraMatchedNodes?: (matchedNodesSet: Set<HTMLElement>) => void
  getCanonicalUrl?: (url: string) => string
}

const sites: Site[] = [
  github,
  v2ex,
  greasyforkOrg,
  //
  hackerNews,
  lobsters,
]

function matchedSite(hostname: string) {
  for (const s of sites) {
    if (s.matches.test(hostname)) {
      return s
    }
  }

  return defaultSite as Site
}

const hostname = location.hostname
const currentSite: Site = matchedSite(hostname)

export function getListNodes() {
  if (typeof currentSite.getListNodes === "function") {
    return currentSite.getListNodes()
  }

  if (currentSite.listNodesSelectors) {
    return $$(currentSite.listNodesSelectors.join(",") || "none")
  }

  return []
}

export function getConditionNodes() {
  if (typeof currentSite.getConditionNodes === "function") {
    return currentSite.getConditionNodes()
  }

  if (currentSite.conditionNodesSelectors) {
    return $$(currentSite.conditionNodesSelectors.join(",") || "none")
  }

  return []
}

function getCanonicalUrl(url: string) {
  if (typeof currentSite.getCanonicalUrl === "function") {
    return currentSite.getCanonicalUrl(url)
  }

  return url
}

const isValidUtagsElement = (element: HTMLAnchorElement) => {
  if ($("img,svg,audio,video", element)) {
    return false
  }

  let href = getAttribute(element, "href")
  if (!href) {
    return false
  }

  href = href.trim()
  if (href.length === 0 || href === "#") {
    return false
  }

  const protocol = element.protocol
  if (protocol !== "http:" && protocol !== "https:") {
    return false
  }

  return true
}

const isExcluedUtagsElement = (
  element: HTMLElement,
  excludeSelector: string
) => {
  return excludeSelector ? Boolean(element.closest(excludeSelector)) : false
}

const addMatchedNodes = (matchedNodesSet: Set<HTMLElement>) => {
  let elements: HTMLAnchorElement[]
  if (typeof currentSite.getMatchedNodes === "function") {
    elements = currentSite.getMatchedNodes()
  } else {
    const matchedNodesSelectors = currentSite.matchedNodesSelectors

    if (!matchedNodesSelectors || matchedNodesSelectors.length === 0) {
      return
    }

    elements = $$(
      matchedNodesSelectors.join(",") || "none"
    ) as HTMLAnchorElement[]
  }

  if (elements.length === 0) {
    return
  }

  const excludeSelectors = currentSite.excludeSelectors || []
  const excludeSelector = excludeSelectors.join(",")

  for (const element of elements) {
    if (
      !isValidUtagsElement(element) ||
      isExcluedUtagsElement(element, excludeSelector)
    ) {
      // It's not a candidate
      element.utags = {}
      continue
    }

    const key = getCanonicalUrl(element.href)
    const title = element.textContent!.trim()
    const meta = {}
    if (title && !isUrl(title)) {
      meta.title = title
    }

    element.utags = { key, meta }

    matchedNodesSet.add(element)
  }
}

export function matchedNodes() {
  const matchedNodesSet = new Set<HTMLElement>()

  addMatchedNodes(matchedNodesSet)

  if (typeof currentSite.addExtraMatchedNodes === "function") {
    currentSite.addExtraMatchedNodes(matchedNodesSet)
  }

  // 添加 data-utags_primary_link 属性强制允许使用 utags
  // const array = $$("[data-utags_primary_link]") as HTMLAnchorElement[]
  // for (const element of array) {
  //   if (!element.utags) {
  //     const key = getCanonicalUrl(element.href)
  //     const title = element.textContent!
  //     const meta = {}
  //     if (!isUrl(title)) {
  //       meta.title = title
  //     }

  //     element.utags = { key, meta }
  //   }

  //   matchedNodesSet.add(element)
  // }

  return [...matchedNodesSet]
}
