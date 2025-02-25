import { $, $$ } from "browser-extension-utils"
import styleText from "data-text:./031-tampermonkey.net.cn.scss"

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from "../../modules/visited"
import { deleteUrlParameters } from "../../utils"
import defaultSite from "../default"

export default (() => {
  const prefix = "https://bbs.tampermonkey.net.cn/"

  function getCanonicalUrl(url: string) {
    if (url.startsWith(prefix)) {
      let href2 = getUserProfileUrl(url, true)
      if (href2) {
        return href2
      }

      href2 = getPostUrl(url, true)
      if (href2) {
        return href2
      }
    }

    return url
  }

  function getUserProfileUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      url = deleteUrlParameters(url, "do")
      const href2 = url.slice(prefix.length).toLowerCase()
      if (exact) {
        // https://bbs.tampermonkey.net.cn/?1234567
        if (/^\?\d+(#.*)?$/.test(href2)) {
          return (
            prefix + href2.replace(/^\?(\d+).*/, "home.php?mod=space&uid=$1")
          )
        }

        // https://bbs.tampermonkey.net.cn/space-uid-1234567.html
        if (/^space-uid-\d+\.html([?#].*)?$/.test(href2)) {
          return (
            prefix +
            href2.replace(/^space-uid-(\d+).*/, "home.php?mod=space&uid=$1")
          )
        }

        // https://bbs.tampermonkey.net.cn/home.php?mod=space&uid=234567
        if (/^home\.php\?mod=space&uid=\d+(#.*)?$/.test(href2)) {
          return (
            prefix +
            href2.replace(
              /^home\.php\?mod=space&uid=(\d+).*/,
              "home.php?mod=space&uid=$1"
            )
          )
        }
      } else if (/^u\/[\w.-]+/.test(href2)) {
        return prefix + href2.replace(/^(u\/[\w.-]+).*/, "$1")
      }
    }

    return undefined
  }

  function getPostUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()

      // https://bbs.tampermonkey.net.cn/thread-1234567-1-1.html
      if (/^thread(?:-\d+){3}\.html([?#].*)?$/.test(href2)) {
        return (
          prefix +
          href2.replace(/^thread-(\d+).*/, "forum.php?mod=viewthread&tid=$1")
        )
      }

      // https://bbs.tampermonkey.net.cn/forum.php?mod=redirect&tid=1234567&goto=lastpost#lastpost
      if (/^forum\.php\?mod=redirect&tid=\d+([&#].*)?$/.test(href2)) {
        return (
          prefix +
          href2.replace(
            /^forum\.php\?mod=redirect&tid=(\d+).*/,
            "forum.php?mod=viewthread&tid=$1"
          )
        )
      }

      // https://bbs.tampermonkey.net.cn/forum.php?mod=viewthread&tid=1234567
      if (/^forum\.php\?mod=viewthread&tid=\d+(#.*)?$/.test(href2)) {
        return (
          prefix +
          href2.replace(
            /^forum\.php\?mod=viewthread&tid=(\d+).*/,
            "forum.php?mod=viewthread&tid=$1"
          )
        )
      }
    }

    return undefined
  }

  return {
    // Discuz
    matches: /bbs\.tampermonkey\.net\.cn/,
    preProcess() {
      setVisitedAvailable(true)
    },
    listNodesSelectors: [
      //
      "#threadlist table tbody",
      "#postlist .comiis_vrx",
    ],
    conditionNodesSelectors: [
      //
      "#threadlist table tbody h2 a",
      "#threadlist table tbody .km_user a",
      "#postlist .comiis_vrx .authi a",
    ],
    validate(element: HTMLAnchorElement) {
      const href = element.href

      if (!href.startsWith(prefix)) {
        return true
      }

      let key = getUserProfileUrl(href, true)
      if (key) {
        let title = element.textContent!.trim()
        if (!title) {
          return false
        }

        if (/^https:\/\/bbs\.tampermonkey\.net\.cn\/\?\d+$/.test(title)) {
          const titleElement = $("#uhd h2")
          if (titleElement) {
            title = titleElement.textContent!.trim()
          }
        }

        if (
          /^\d+$/.test(title) &&
          element.parentElement!.parentElement!.textContent!.includes("积分")
        ) {
          return false
        }

        const meta = href === title ? { type: "user" } : { type: "user", title }

        element.utags = { key, meta }
        element.dataset.utags = element.dataset.utags || ""
        return true
      }

      key = getPostUrl(href)
      if (key) {
        const title = element.textContent!.trim()
        if (!title) {
          return false
        }

        if (
          title === "New" ||
          title === "置顶" ||
          /^\d+$/.test(title) ||
          /^\d{4}(?:-\d{1,2}){2} \d{2}:\d{2}$/.test(title)
        ) {
          return false
        }

        // 最后回复于
        if ($('span[title^="20"]', element)) {
          return false
        }

        if (element.parentElement!.textContent!.includes("最后回复于")) {
          return false
        }

        const meta = href === title ? { type: "post" } : { type: "post", title }

        element.utags = { key, meta }
        markElementWhetherVisited(key, element)

        return true
      }

      const title = element.textContent!.trim()
      if (!title) {
        return false
      }

      if (title === "New" || title === "置顶" || /^\d+$/.test(title)) {
        return false
      }

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      "#hd",
      ".comiis_pgs",
      "#scrolltop",
      "#fd_page_bottom",
      "#visitedforums",
      "#pt",
      ".tps",
      ".pgbtn",
      ".pgs",
      "#f_pst",
      'a[href*="member.php?mod=logging"]',
      'a[href*="member.php?mod=register"]',
      'a[href*="login/oauth/"]',
      'a[href*="mod=spacecp&ac=usergroup"]',
      'a[href*="home.php?mod=spacecp"]',
      "#gadmin_menu",
      "#guser_menu",
      "#gupgrade_menu",
      "#gmy_menu",
      ".showmenu",
      // Tabs
      "ul.tb.cl",
      ".comiis_irbox_tit",
      "#thread_types",
      "#filter_special_menu",
      'a[title="RSS"]',
      ".fa_fav",
      ".p_pop",
      ".comiis_topinfo",
      ".bm .bm_h .kmfz",
      "td.num a",
      "td.plc .pi",
      "td.plc .po.hin",
      "td.pls .tns",
      "ul.comiis_o",
      'a[onclick*="showMenu"]',
      'a[onclick*="showWindow"]',
      // 换行问题 CSS 搞不定
      ".toplist_7ree",
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      let key = getUserProfileUrl(location.href)
      if (key) {
        // profile header
        const element =
          $(".user-profile-names .username") ||
          $(
            ".user-profile-names .user-profile-names__primary,.user-profile-names .user-profile-names__secondary"
          )
        if (element) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }

      key = getPostUrl(location.href)
      if (key) {
        addVisited(key)

        const element = $("#thread_subject")
        if (element) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title, type: "post" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getStyle: () => styleText,
    getCanonicalUrl,
  }
})()
