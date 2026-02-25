import { $, $$, setAttribute } from 'browser-extension-utils'
import styleText from 'data-text:./042-discuz.scss'
import { getTrimmedTitle } from 'utags-utils'

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from '../../modules/visited'
import { deleteUrlParameters } from '../../utils'
import { setUtags } from '../../utils/dom-utils'
import { ancestorTextIncludes, setUtagsAttributes } from '../../utils/index'
import defaultSite from '../default'

// Class
export function Discuz(options?: {
  matchesPatternValue?: RegExp
  normalizeDomainFn?: (url: string) => string
  validateDefaultReturnValue?: boolean
}) {
  const { matchesPatternValue, normalizeDomainFn, validateDefaultReturnValue } =
    options || {}
  const matchesPattern =
    matchesPatternValue ||
    /bbs\.tampermonkey\.net\.cn|bbs\.yamibo\.com|(www\.)?tsdm39\.com/
  const currentPrefix = location.origin + '/'
  const normalizeDomain =
    typeof normalizeDomainFn === 'function'
      ? normalizeDomainFn
      : function (url: string) {
          return url.replace('https://tsdm39.com', 'https://www.tsdm39.com')
        }

  const normalizedPrefix = normalizeDomain(currentPrefix)

  function getCanonicalUrl(url: string, hostname: string) {
    if (!matchesPattern.test(hostname)) {
      return url
    }

    url = normalizeDomain(url)
    const prefix = normalizeDomain(`https://${hostname}/`)

    let href2 = getUserProfileUrl(prefix, url, true)
    if (href2) {
      return href2
    }

    href2 = getPostUrl(prefix, url)
    if (href2) {
      return href2
    }

    return url
  }

  // https://example.com/forum.php?mod=forumdisplay&fid=5&filter=typeid&typeid=4
  function getUserProfileUrl(prefix: string, url: string, exact = false) {
    if (url.startsWith(prefix)) {
      url = deleteUrlParameters(url, 'do')
      const href2 = url.slice(prefix.length).toLowerCase()
      if (exact) {
        // 个人主页
        // https://example.com/?1234567
        if (/^\?\d+(=)?(#.*)?$/.test(href2)) {
          return (
            prefix + href2.replace(/^\?(\d+).*/, 'home.php?mod=space&uid=$1')
          )
        }

        // https://example.com/space-uid-1234567.html
        if (/^space-uid-\d+\.html([?#].*)?$/.test(href2)) {
          return (
            prefix +
            href2.replace(/^space-uid-(\d+).*/, 'home.php?mod=space&uid=$1')
          )
        }

        // [O] https://example.com/home.php?mod=space&uid=234567
        // [X] https://example.com/home.php?mod=space&uid=1404208&do=friend&view=me&from=space
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

  function getPostUrl(prefix: string, url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()

      // https://example.com/thread-1234567-1-1.html
      if (/^thread(?:-\d+){3}\.html([?#].*)?$/.test(href2)) {
        return (
          prefix +
          href2.replace(/^thread-(\d+).*/, 'forum.php?mod=viewthread&tid=$1')
        )
      }

      // https://example.com/forum.php?mod=redirect&tid=1234567&goto=lastpost#lastpost
      if (/^forum\.php\?mod=redirect&tid=\d+([&#].*)?$/.test(href2)) {
        return (
          prefix +
          href2.replace(
            /^forum\.php\?mod=redirect&tid=(\d+).*/,
            'forum.php?mod=viewthread&tid=$1'
          )
        )
      }

      // https://example.com/forum.php?mod=viewthread&tid=1234567
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

  // Class fields
  this.matches = matchesPattern

  this.preProcess = () => {
    setVisitedAvailable(true)

    const href = normalizeDomain(location.href)
    let key = getUserProfileUrl(normalizedPrefix, href)
    if (key) {
      // profile header
      const element =
        $('.user-profile-names .username') ||
        $(
          '.user-profile-names .user-profile-names__primary,.user-profile-names .user-profile-names__secondary'
        )
      if (element) {
        setUtagsAttributes(element, { key, type: 'user' })
      }
    }

    key = getPostUrl(normalizedPrefix, href)
    if (key) {
      const element = $('#thread_subject')
      if (element) {
        setUtagsAttributes(element, { key, type: 'post' })
        addVisited(key)
        markElementWhetherVisited(key, element)
      }
    }
  }

  this.listNodesSelectors = [
    //
    '#threadlist table tbody',
    '#postlist .comiis_vrx',
    // 四级社 > comments
    '#postlist .otherfloor',
    // 四级社
    '.nex_forum_lists',
  ]
  this.conditionNodesSelectors = [
    // bbs.tampermonkey.net.cn
    '#threadlist table tbody h2 a',
    // bbs.tampermonkey.net.cn
    '#threadlist table tbody .km_user a',
    '#threadlist table tbody a[href*="&filter=typeid&typeid="]',
    '#threadlist table tbody a[href*="thread-"]',
    // www.tsdm39.com
    '#threadlist table tbody a[href*="forum.php?mod=viewthread&tid="]',
    '#threadlist table tbody a[href*="space-uid-"]',
    // www.tsdm39.com
    '#threadlist table tbody a[href*="home.php?mod=space&uid="]',
    '#postlist .comiis_vrx .authi a',
    // 四级社 > comments
    '#postlist .otherfloor .authi a',
    // 四级社
    // author
    '.nex_forum_lists .nex_threads_author a',
    // 四级社
    // post title
    '.nex_forum_lists .nex_forumtit_top a',
  ]
  this.validate = (element: HTMLAnchorElement, href: string) => {
    if (!href.startsWith(currentPrefix)) {
      return true
    }

    href = normalizeDomain(href)

    let key = getUserProfileUrl(normalizedPrefix, href, true)
    if (key) {
      let title = getTrimmedTitle(element)
      if (!title) {
        return false
      }

      // 个人主页的标题是用户ID
      if (/^https:\/\/bbs\.tampermonkey\.net\.cn\/\?\d+$/.test(title)) {
        const titleElement = $('#uhd h2')
        if (titleElement) {
          title = getTrimmedTitle(titleElement)
        }
      }

      if (/^\d+$/.test(title) && ancestorTextIncludes(element, '积分', 2)) {
        return false
      }

      const meta = href === title ? { type: 'user' } : { type: 'user', title }

      setUtags(element, key, meta)
      setAttribute(element, 'data-utags', element.dataset.utags || '')
      return true
    }

    key = getPostUrl(normalizedPrefix, href)
    if (key) {
      const title = getTrimmedTitle(element)
      if (!title) {
        return false
      }

      if (
        title === 'New' ||
        title === '置顶' ||
        /^\d+$/.test(title) ||
        /^\d{4}(?:-\d{1,2}){2} \d{2}:\d{2}(:\d{2})?$/.test(title)
      ) {
        return false
      }

      // 最后回复于
      // 最后发表
      if ($('span[title^="20"]', element)) {
        return false
      }

      if (ancestorTextIncludes(element, '最后回复于', 1)) {
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

    if (
      title === 'New' ||
      title === '置顶'
      //  || /^\d+$/.test(title)
    ) {
      return false
    }

    return validateDefaultReturnValue !== false
  }

  this.excludeSelectors = [
    ...defaultSite.excludeSelectors,
    '#hd',
    // bbs.tampermonkey.net.cn
    '.comiis_pgs',
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
    // 'a[href*="goto=lastpost#lastpost"]',
    // 只看该作者
    'a[href*="forum.php?mod=viewthread&tid="][href*="&authorid="]',
    // 只看大图
    'a[href*="forum.php?mod=viewthread&tid="][href*="&from=album"]',
    // 倒序浏览
    'a[href*="forum.php?mod=viewthread&tid="][href*="&ordertype="]',
    'a[onclick*="copyThreadUrl"]',
    'a[onclick*="setCopy"]',
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
    'td.plc .po.hin',
    'td.pls .tns',
    'ul.comiis_o',
    // 四级社
    // 详情按钮
    '.nex_member_more',
    // 四级社
    // 详情按钮
    '.nex_member_hids',
    'a[onclick*="showMenu"]',
    'a[onclick*="showWindow"]',
    // 换行问题 CSS 搞不定
    '.toplist_7ree',
    // www.yamibo.com
    'nav',
    '.btn',
  ]
  this.getStyle = () => styleText
  this.getCanonicalUrl = getCanonicalUrl
}

const discuz = new Discuz()
export default discuz
