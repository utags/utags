import { $, $$ } from 'browser-extension-utils'
import styleText from 'data-text:./007-xsijishe.net.scss'
import { getTrimmedTitle } from 'utags-utils'

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from '../../modules/visited'
import { deleteUrlParameters } from '../../utils'
import { setUtags } from '../../utils/dom-utils'
import defaultSite from '../default'

export default (() => {
  // https://47447.net/
  const prefix = 'https://xsijishe.net/'

  function normalizeDomain(url: string) {
    if (
      !url.startsWith(prefix) &&
      /xsijishe\.\w+|sjs47\.\w+|sjslt\.cc/.test(url)
    ) {
      return url.replace(
        /^https:\/\/(xsijishe\.\w+|sjs47\.\w+|sjslt\.cc)\/?/,
        prefix
      )
    }

    return url
  }

  function getCanonicalUrl(url: string) {
    url = normalizeDomain(url)
    if (url.startsWith(prefix)) {
      let href2 = getUserProfileUrl(url, true)
      if (href2) {
        return href2
      }

      href2 = getPostUrl(url)
      if (href2) {
        return href2
      }
    }

    return url
  }

  // https://xsijishe.net/forum.php?mod=forumdisplay&fid=5&filter=typeid&typeid=4
  // https://xsijishe.net/forum.php?mod=forumdisplay&fid=5&filter=typeid&typeid=4
  function getUserProfileUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      url = deleteUrlParameters(url, 'do')
      const href2 = url.slice(prefix.length).toLowerCase()
      if (exact) {
        // https://xsijishe.net/?1234567
        if (/^\?\d+(=)?(#.*)?$/.test(href2)) {
          return (
            prefix + href2.replace(/^\?(\d+).*/, 'home.php?mod=space&uid=$1')
          )
        }

        // https://xsijishe.net/space-uid-1234567.html
        if (/^space-uid-\d+\.html([?#].*)?$/.test(href2)) {
          return (
            prefix +
            href2.replace(/^space-uid-(\d+).*/, 'home.php?mod=space&uid=$1')
          )
        }

        // https://xsijishe.net/home.php?mod=space&uid=234567
        if (/^home\.php\?mod=space&uid=\d+(#.*)?$/.test(href2)) {
          return (
            prefix +
            href2.replace(
              /^home\.php\?mod=space&uid=(\d+).*/,
              'home.php?mod=space&uid=$1'
            )
          )
        }
      } else if (/^u\/[\w.-]+/.test(href2)) {
        return prefix + href2.replace(/^(u\/[\w.-]+).*/, '$1')
      }
    }

    return undefined
  }

  function getPostUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()

      // https://xsijishe.net/thread-1234567-1-1.html
      if (/^thread(?:-\d+){3}\.html([?#].*)?$/.test(href2)) {
        return (
          prefix +
          href2.replace(/^thread-(\d+).*/, 'forum.php?mod=viewthread&tid=$1')
        )
      }

      // https://xsijishe.net/forum.php?mod=redirect&tid=1234567&goto=lastpost#lastpost
      if (/^forum\.php\?mod=redirect&tid=\d+([&#].*)?$/.test(href2)) {
        return (
          prefix +
          href2.replace(
            /^forum\.php\?mod=redirect&tid=(\d+).*/,
            'forum.php?mod=viewthread&tid=$1'
          )
        )
      }

      // https://xsijishe.net/forum.php?mod=viewthread&tid=1234567
      if (/^forum\.php\?mod=viewthread&tid=\d+([&#].*)?$/.test(href2)) {
        return (
          prefix +
          href2.replace(
            /^forum\.php\?mod=viewthread&tid=(\d+).*/,
            'forum.php?mod=viewthread&tid=$1'
          )
        )
      }
    }

    return undefined
  }

  return {
    // Discuz
    matches: /xsijishe\.\w+|sjs47\.\w+|sjslt\.cc/,
    preProcess() {
      setVisitedAvailable(true)
    },
    listNodesSelectors: [
      //
      '#threadlist table tbody',
      '#postlist .comiis_vrx',
      '.nex_forum_lists',
    ],
    conditionNodesSelectors: [
      //
      // "#threadlist table tbody h2 a",
      '#threadlist table tbody a[href*="&filter=typeid&typeid="]',
      '#threadlist table tbody a[href^="thread-"]',
      '#threadlist table tbody a[href^="space-uid-"]',
      // "#threadlist table tbody .km_user a",
      '#postlist .comiis_vrx .authi a',
      // author
      '.nex_forum_lists .nex_threads_author a',
      // post title
      '.nex_forum_lists .nex_forumtit_top a',
    ],
    validate(element: HTMLAnchorElement, href: string) {
      href = normalizeDomain(href)

      if (!href.startsWith(prefix)) {
        return true
      }

      let key = getUserProfileUrl(href, true)
      if (key) {
        const title = getTrimmedTitle(element)
        if (!title) {
          return false
        }

        if (
          /^\d+$/.test(title) &&
          element.parentElement!.parentElement!.textContent.includes('积分')
        ) {
          return false
        }

        const meta = href === title ? { type: 'user' } : { type: 'user', title }

        setUtags(element, key, meta)
        element.dataset.utags = element.dataset.utags || ''
        return true
      }

      key = getPostUrl(href)
      if (key) {
        const title = getTrimmedTitle(element)
        if (!title) {
          return false
        }

        if (
          title === 'New' ||
          title === '置顶' ||
          /^\d+$/.test(title) ||
          /^\d{4}(?:-\d{1,2}){2} \d{2}:\d{2}$/.test(title)
        ) {
          return false
        }

        // 最后回复于
        if ($('span[title^="20"]', element)) {
          return false
        }

        if (element.parentElement!.textContent.includes('最后回复于')) {
          return false
        }

        const meta = href === title ? { type: 'post' } : { type: 'post', title }

        setUtags(element, key, meta)
        markElementWhetherVisited(key, element)

        return true
      }

      const title = getTrimmedTitle(element)
      if (!title) {
        return false
      }

      if (title === 'New' || title === '置顶' || /^\d+$/.test(title)) {
        return false
      }

      return false
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '#hd',
      '.oyheader',
      '#scrolltop',
      '#fd_page_bottom',
      '#visitedforums',
      '#pt',
      '.tps',
      '.pgbtn',
      '.pgs',
      '#f_pst',
      'a[href*="member.php?mod=logging"]',
      'a[href*="member.php?mod=register"]',
      'a[href*="login/oauth/"]',
      'a[href*="mod=spacecp&ac=usergroup"]',
      'a[href*="home.php?mod=spacecp"]',
      'a[href*="goto=lastpost#lastpost"]',
      'a[onclick*="copyThreadUrl"]',
      '#gadmin_menu',
      '#guser_menu',
      '#gupgrade_menu',
      '#gmy_menu',
      '.showmenu',
      // Tabs
      'ul.tb.cl',
      '.comiis_irbox_tit',
      '#thread_types',
      '#threadlist .th',
      '#filter_special_menu',
      'a[title="RSS"]',
      '.fa_fav',
      '.p_pop',
      '.comiis_topinfo',
      '.bm .bm_h .kmfz',
      'td.num a',
      'td.plc .pi',
      'td.plc .po.hin',
      'td.pls .tns',
      'ul.comiis_o',
      // 详情按钮
      '.nex_member_more',
      // 详情按钮
      '.nex_member_hids',
      'a[onclick*="showMenu"]',
      'a[onclick*="showWindow"]',
      // 换行问题 CSS 搞不定
      '.toplist_7ree',
      'nav',
      '.btn',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      const href = normalizeDomain(location.href)
      let key = getUserProfileUrl(href)
      if (key) {
        // profile header
        const element =
          $('.user-profile-names .username') ||
          $(
            '.user-profile-names .user-profile-names__primary,.user-profile-names .user-profile-names__secondary'
          )
        if (element) {
          const title = getTrimmedTitle(element)
          if (title) {
            const meta = { title, type: 'user' }
            setUtags(element, key, meta)
            matchedNodesSet.add(element)
          }
        }
      }

      key = getPostUrl(href)
      if (key) {
        addVisited(key)

        const element = $('#thread_subject')
        if (element) {
          const title = getTrimmedTitle(element)
          if (title) {
            const meta = { title, type: 'post' }
            setUtags(element, key, meta)
            element.dataset.utags_node_type = 'link'
            matchedNodesSet.add(element)
            markElementWhetherVisited(key, element)
          }
        }
      }
    },
    getStyle: () => styleText,
    getCanonicalUrl,
  }
})()
