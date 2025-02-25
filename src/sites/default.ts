import styleText from "data-text:./default.scss"

import { deleteUrlParameters } from "../utils"

const site = {
  matches: /.*/,
  matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
  validate(element: HTMLElement) {
    return true
  },
  excludeSelectors: [
    // ".browser_extension_settings_container",
    // ".utags_text_tag",
    // "a a",
    // 'a[href^="javascript:"]',
    // 'a[href="#"]',
    // 'a[href=""]',
  ],
  getCanonicalUrl: (url: string) =>
    deleteUrlParameters(url, [
      // common useless parameters
      "utm_campaign",
      "utm_source",
      "utm_medium",
    ]),
  getStyle: () => styleText,
}

export default site
