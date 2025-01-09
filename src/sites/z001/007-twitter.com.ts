import { $$, setStyle } from "browser-extension-utils"

import defaultSite from "../default"

const prefix = "https://x.com/"
const prefix2 = "https://twitter.com/"

const site = {
  matches: /x\.com|twitter\.com/,
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href
        if (href.startsWith(prefix) || href.startsWith(prefix2)) {
          // Remove prefix
          const href2 = href.startsWith(prefix2)
            ? href.slice(20)
            : href.slice(14)
          if (/^\w+$/.test(href2)) {
            if (
              /^(home|explore|notifications|messages|tos|privacy)$/.test(href2)
            ) {
              return false
            }

            const textContent = element.textContent || ""
            if (!textContent.startsWith("@")) {
              return false
            }
            // console.log(href2)

            const parent = element.parentElement!
            setStyle(parent, { display: "flex", flexDirection: "row" })
            const parentSibling = parent.nextSibling as HTMLElement
            if (
              // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
              parentSibling &&
              parentSibling.textContent &&
              parentSibling.textContent.includes("·")
            ) {
              // 增加用户名与时间之间的距离，否则点击按钮时，会点击到时间链接
              setStyle(parentSibling, {
                paddingLeft: "10px",
                paddingRight: "10px",
              })
            }

            const meta = { type: "user" }
            element.utags = { meta }

            return true
          }
        }

        return false
      }
    ) as HTMLAnchorElement[]
  },
  excludeSelectors: [...defaultSite.excludeSelectors],
  addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
    // profile header
    const elements = $$('[data-testid="UserName"] span')
    for (const element of elements) {
      const title = element.textContent!.trim()
      if (!title || !title.startsWith("@")) {
        continue
      }

      const key = prefix + title.slice(1)
      const meta = { title, type: "user" }
      element.utags = { key, meta }
      matchedNodesSet.add(element)
    }
  },
}

export default site
