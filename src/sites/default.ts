import { deleteUrlParameters } from "../utils"

export const getCanonicalUrl = (url: string) =>
  deleteUrlParameters(url, [
    // common useless parameters
    "utm_campaign",
    "utm_source",
    "utm_medium",
  ])

const site = {
  matches: /.*/,
  matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
  excludeSelectors: [".browser_extension_settings_container"],
  getCanonicalUrl,
}

export default site
