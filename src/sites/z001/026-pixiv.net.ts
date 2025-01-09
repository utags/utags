import { $, $$, hasClass } from "browser-extension-utils"
import styleText from "data-text:./026-pixiv.net.scss"

import defaultSite from "../default"

const prefix = "https://www.pixiv.net/"

function getUserProfileUrl(url: string, exact = false) {
  if (url.startsWith(prefix)) {
    let href2 = url.slice(22)
    if (href2.startsWith("en/")) {
      href2 = href2.slice(3)
    }

    if (exact) {
      if (/^users\/\d+([?#].*)?$/.test(href2)) {
        return prefix + href2.replace(/^(users\/\d+).*/, "$1")
      }
    } else if (/^users\/\d+/.test(href2)) {
      return prefix + href2.replace(/^(users\/\d+).*/, "$1")
    }
  }

  return undefined
}

const site = {
  matches: /pixiv\.net/,
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href

        if (!href.includes("www.pixiv.net")) {
          return true
        }

        const key = getUserProfileUrl(href, true)
        if (key) {
          const title = element.textContent!
          if (
            !title ||
            /プロフィールを見る|View Profile|프로필 보기|查看个人资料|查看個人資料|ホーム|Home|홈|主页|首頁/.test(
              title
            )
          ) {
            return false
          }

          const meta = { type: "user", title }

          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""

          return true
        }

        // key = getPostUrl(href)
        // if (key) {
        //   const meta = { type: "post" }
        //   element.utags = { key, meta }
        //   return true
        // }

        return false
      }
    ) as HTMLAnchorElement[]
  },
  excludeSelectors: [...defaultSite.excludeSelectors, "#xxxxxxx"],
  addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
    const key = getUserProfileUrl(location.href)
    if (key) {
      // profile header
      const element = $("h1")
      if (element) {
        const title = element.textContent!.trim()
        if (title) {
          const meta = { title, type: "user" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    }
  },
  getStyle: () => styleText,
}

export default site
