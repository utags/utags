import { $$, getAttribute } from "browser-extension-utils"
import styleText from "data-text:./004-dmm.co.jp.scss"

import defaultSite from "../default"

const prefix = "https://www.dmm.co.jp/"

const site = {
  matches: /dmm\.co\.jp/,
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href
        const hrefAttr = getAttribute(element, "href")

        if (hrefAttr.startsWith("#")) {
          return false
        }

        if (!href.startsWith(prefix)) {
          return true
        }

        if (href.includes("/=/")) {
          return true
        }

        return false
      }
    ) as HTMLAnchorElement[]
  },
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    "header",
    ".localNav-list",
    ".m-leftNavigation",
    ".l-areaSideNavColumn",
    ".top-leftcolumn",
    ".top-rightcolumn",
    ".d-btn-xhi-st",
    ".headingTitle__txt--more",
    ".recommendCapt__txt",
    ".circleFanButton__content",
    ".displayFormat",
    ".pageNationList",
    ".nav-text-container",
    ".sub-nav-link",
  ],
  getStyle: () => styleText,
}

export default site
