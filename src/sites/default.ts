import styleText from "data-text:./default.scss"

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
  excludeSelectors: [".browser_extension_settings_container", "a a"],
  getCanonicalUrl,
  getStyle: () => styleText,
}

export default site
