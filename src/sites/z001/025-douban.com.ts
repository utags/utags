import { deleteUrlParameters } from "../../utils"
import defaultSite from "../default"

function getCanonicalUrl(url: string) {
  if (url.includes("douban.com")) {
    return deleteUrlParameters(url, [
      "ref",
      "dcs",
      "dcm",
      "from",
      "from_",
      "dt_time_source",
      "target_user_id",
      "_dtcc",
      "_i",
    ])
  }

  return url
}

const site = {
  matches: /douban\.com/,
  listNodesSelectors: [],
  conditionNodesSelectors: [],
  matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    ".tabs",
    'a[href*="/accounts/login?"]',
    'a[href*="/passport/login?"]',
    'a[href*="/register?"]',
  ],
  getCanonicalUrl,
}

export default site
