import { $ } from "browser-extension-utils"

import defaultSite from "../default"

function getCanonicalUrl(url: string) {
  if (url.startsWith("https://mp.weixin.qq.com/s/")) {
    url = url.replace(/(\/s\/[\w-]+).*/, "$1")
  }

  return url
}

const site = {
  matches: /mp\.weixin\.qq\.com/,
  matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
  excludeSelectors: [...defaultSite.excludeSelectors],
  addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
    const element = $("h1.rich_media_title")
    if (element) {
      const title = element.textContent!.trim()
      if (title) {
        const key = getCanonicalUrl(location.href)
        const meta = { title }
        element.utags = { key, meta }
        matchedNodesSet.add(element)
      }
    }
  },
}

export default site
