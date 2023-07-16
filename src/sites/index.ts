import { $, $$, getAttribute, isUrl } from "browser-extension-utils"

import defaultSite from "./default"
import greasyforkOrg from "./greasyfork.org"
import v2ex from "./v2ex"

type Site = {
  matches: RegExp
  listNodesSelectors?: string[]
  getListNodes?: () => HTMLElement[]
  conditionNodesSelectors?: string[]
  getConditionNodes?: () => HTMLElement[]
  includeSelectors?: string[]
  excludeSelectors?: string[]
  addExtraMatchedNodes?: (matchedNodesSet: Set<HTMLElement>) => void
  getCanonicalUrl?: (url: string) => string
}

const sites: Site[] = [v2ex, greasyforkOrg]

function matchedSite(hostname: string) {
  for (const site of sites) {
    if (site.matches.test(hostname)) {
      return site
    }
  }

  return defaultSite as Site
}

const hostname = location.hostname
const site: Site = matchedSite(hostname)

export function getListNodes() {
  if (typeof site.getListNodes === "function") {
    return site.getListNodes()
  }

  if (site.listNodesSelectors) {
    return $$(site.listNodesSelectors.join(","))
  }

  return []
}

export function getConditionNodes() {
  if (typeof site.getConditionNodes === "function") {
    return site.getConditionNodes()
  }

  if (site.conditionNodesSelectors) {
    return $$(site.conditionNodesSelectors.join(","))
  }

  return []
}

function getCanonicalUrl(url: string) {
  if (typeof site.getCanonicalUrl === "function") {
    return site.getCanonicalUrl(url)
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
  const includeSelectors = site.includeSelectors

  if (!includeSelectors || includeSelectors.length === 0) {
    return
  }

  const elements = $$(includeSelectors.join(",")) as HTMLAnchorElement[]
  console.log("matchedNodes", elements)

  if (elements.length === 0) {
    return
  }

  const excludeSelectors = site.excludeSelectors || []
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

  if (typeof site.addExtraMatchedNodes === "function") {
    site.addExtraMatchedNodes(matchedNodesSet)
  }

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

  console.log([...matchedNodesSet])
  return [...matchedNodesSet]
}
