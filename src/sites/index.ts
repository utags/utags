import { $$, isUrl } from "browser-extension-utils"

import v2ex from "./v2ex"

function matchedSite(hostname: string) {
  if (/v2ex\.com|v2hot\./.test(hostname)) {
    return v2ex
  }

  return null
}

export function getListNodes(hostname: string) {
  const site = matchedSite(hostname)
  if (site) {
    return site.getListNodes()
  }

  return []
}

export function getConditionNodes(hostname: string) {
  const site = matchedSite(hostname)
  if (site) {
    return site.getConditionNodes()
  }

  return []
}

function getCanonicalUrl(url: string) {
  return url
}

export function matchedNodes(hostname: string) {
  const site = matchedSite(hostname)
  const set = new Set()
  if (site) {
    const array = site.matchedNodes()
    for (const element of array) {
      set.add(element)
    }
  }

  const array = $$("[data-utags_primary_link]")
  for (const element of array) {
    if (!element.utags) {
      const key = getCanonicalUrl(element.href)
      const title = element.textContent
      const meta = {}
      if (!isUrl(title)) {
        meta.title = title
      }

      element.utags = { key, meta }
    }

    set.add(element)
  }

  // console.log(set)
  return [...set]
}
