import {
  $,
  $$,
  addElement,
  doc,
  getAttribute,
  isUrl,
  uniq,
} from 'browser-extension-utils'
import { getTrimmedTitle, trimTitle } from 'utags-utils'

import {
  deleteElementUtags,
  getElementUtags,
  hasElementUtags,
  setElementUtags,
} from '../modules/dom-reference-manager'
import type { UserTag, UserTagMeta, UtagsHTMLElement } from '../types'
import { findElementsInShadowRoots } from '../utils/shadow-root-traverser'
import defaultSite from './default'
import v2ex from './z001/001-v2ex'
import greasyforkOrg from './z001/002-greasyfork.org'
import hackerNews from './z001/003-news.ycombinator.com'
import lobsters from './z001/004-lobste.rs'
import github from './z001/005-github.com'
import reddit from './z001/006-reddit.com'
import twitter from './z001/007-twitter.com'
import weixin from './z001/008-mp.weixin.qq.com'
import instagram from './z001/009-instagram.com'
import threads from './z001/010-threads.com'
import facebook from './z001/011-facebook.com'
import youtube from './z001/012-youtube.com'
import bilibili from './z001/013-bilibili.com'
import tiktok from './z001/014-tiktok.com'
import _52pojie from './z001/015-52pojie.cn'
import juejin from './z001/016-juejin.cn'
import zhihu from './z001/017-zhihu.com'
import xiaohongshu from './z001/018-xiaohongshu.com'
import weibo from './z001/019-weibo.com'
import sspai from './z001/020-sspai.com'
import douyin from './z001/021-douyin.com'
import podcasts_google_com from './z001/022-podcasts.google.com'
import rebang_today from './z001/023-rebang.today'
import myanimelist_net from './z001/024-myanimelist.net'
import douban from './z001/025-douban.com'
import pixiv from './z001/026-pixiv.net'
import discourse from './z001/027-discourse'
import nga from './z001/028-nga.cn'
import dlsite_com from './z001/029-dlsite.com'
import keylol_com from './z001/030-keylol.com'
import tampermonkey_net_cn from './z001/031-tampermonkey.net.cn'
import flarum from './z001/032-flarum'
import nodeseek_com from './z001/033-nodeseek.com'
import inoreader_com from './z001/034-inoreader.com'
import zhipin_com from './z001/035-zhipin.com'
import twitch_tv from './z001/036-twitch.tv'
import yamibo_com from './z001/037-yamibo.com'
import flickr_com from './z001/038-flickr.com'
import ruanyifeng_com from './z001/039-ruanyifeng.com'
import _2libra_com from './z001/040-2libra.com'
import toutiao_com from './z001/041-toutiao.com'
import pxxnhub from './z999/001-pxxnhub.com'
import ehentxx from './z999/002-e-hentxx.org'
import panda_chaika_moe from './z999/003-panda.chaika.moe'
import dmm_co_jp from './z999/004-dmm.co.jp'
import kemono_su from './z999/005-kemono.su'
import rule34video_com from './z999/006-rule34video.com'
import xsijishe from './z999/007-xsijishe.net'
import simpcity from './z999/008-simpcity.cr'
import hotgirl_asia from './z999/009-hotgirl.asia'
import nhentai_net from './z999/010-nhentai.net'

type Site = {
  matches: RegExp
  listNodesSelectors?: string[]
  conditionNodesSelectors?: string[]
  matchedNodesSelectors?: string[]
  validate?: (element: UtagsHTMLElement, href: string) => boolean
  map?: (element: UtagsHTMLElement) => UtagsHTMLElement
  excludeSelectors?: string[]
  validMediaSelectors?: string[]
  addExtraMatchedNodes?: (matchedNodesSet: Set<UtagsHTMLElement>) => void
  getCanonicalUrl?: (
    url: string
  ) => string | { url: string; domainChanged: boolean }
  getStyle?: () => string
  preProcess?: () => void
  postProcess?: () => void
}

const sites: Site[] = [
  github,
  v2ex,
  twitter,
  reddit,
  greasyforkOrg,
  hackerNews,
  lobsters,
  weixin,
  instagram,
  threads,
  facebook,
  youtube,
  bilibili,
  tiktok,
  _52pojie,
  juejin,
  zhihu,
  xiaohongshu,
  weibo,
  sspai,
  douyin,
  podcasts_google_com,
  rebang_today,
  myanimelist_net,
  douban,
  pixiv,
  discourse,
  nga,
  keylol_com,
  tampermonkey_net_cn,
  flarum,
  nodeseek_com,
  inoreader_com,
  zhipin_com,
  twitch_tv,
  yamibo_com,
  flickr_com,
  ruanyifeng_com,
  _2libra_com,
  toutiao_com,
  pxxnhub,
  ehentxx,
  panda_chaika_moe,
  dlsite_com,
  dmm_co_jp,
  kemono_su,
  rule34video_com,
  xsijishe,
  simpcity,
  hotgirl_asia,
  nhentai_net,
]

const BASE_EXCLUDE_SELECTOR =
  '.utags_text_tag,.browser_extension_settings_container,a a,[data-utags_exclude]'
const getCanonicalUrlFunctionList = [defaultSite, ...sites]
  .map((site) => site.getCanonicalUrl)
  .filter((v) => typeof v === 'function')

function siteForExtensions(hostname: string): Site {
  const allowSites = [
    //
    /pipecraft\.net/,
  ]
  for (const s of allowSites) {
    if (s.test(hostname)) {
      return defaultSite
    }
  }

  return {} as Site
}

function matchedSite(hostname: string) {
  for (const s of sites) {
    if (s.matches.test(hostname)) {
      return s
    }
  }

  if (
    // eslint-disable-next-line n/prefer-global/process
    process.env.PLASMO_TARGET === 'chrome-mv3' ||
    // eslint-disable-next-line n/prefer-global/process
    process.env.PLASMO_TARGET === 'firefox-mv2'
  ) {
    return siteForExtensions(hostname)
  }

  return defaultSite
}

function joinSelectors(selectors: string[] | undefined) {
  return selectors ? selectors.join(',') : undefined
}

const hostname = location.hostname
const currentSite: Site = matchedSite(hostname)

const listNodesSelector = joinSelectors(currentSite.listNodesSelectors)

const conditionNodesSelector = joinSelectors(
  currentSite.conditionNodesSelectors
)

const matchedNodesSelector = joinSelectors(
  currentSite.matchedNodesSelectors ||
    (currentSite.matches ? defaultSite.matchedNodesSelectors : undefined)
)

const excludeSelector = joinSelectors([
  BASE_EXCLUDE_SELECTOR,
  ...(currentSite.excludeSelectors || []),
])

const validMediaSelector = joinSelectors(currentSite.validMediaSelectors)

const validateFunction = currentSite.validate || defaultSite.validate
const mappingFunction =
  typeof currentSite.map === 'function' ? currentSite.map : undefined

// console.log([
//   currentSite,
//   "listNodesSelector: " + listNodesSelector,
//   "conditionNodesSelector: " + conditionNodesSelector,
//   "matchedNodesSelector: " + matchedNodesSelector,
//   "excludeSelector: " + excludeSelector,
//   "validMediaSelector: " + validMediaSelector,
// ])

export function getListNodes() {
  if (typeof currentSite.preProcess === 'function') {
    currentSite.preProcess()
  }

  if (typeof currentSite.getStyle === 'function' && !$('#utags_site_style')) {
    const styleText = currentSite.getStyle()
    if (styleText) {
      addElement(doc.head, 'style', {
        textContent: styleText,
        id: 'utags_site_style',
      })
    }
  }

  return listNodesSelector ? $$(listNodesSelector) : []
}

export function getConditionNodes() {
  return conditionNodesSelector ? $$(conditionNodesSelector) : []
}

export function getCanonicalUrl(url: string | undefined) {
  if (!url) {
    return undefined
  }

  for (const getCanonicalUrlFunc of getCanonicalUrlFunctionList) {
    if (getCanonicalUrlFunc) {
      const newUrl: string | { url: string; domainChanged: boolean } =
        getCanonicalUrlFunc(url)

      if (typeof newUrl === 'object') {
        if (newUrl.domainChanged) {
          return getCanonicalUrl(newUrl.url)
        }

        url = newUrl.url
      } else {
        url = newUrl
      }
    }
  }

  return url
}

// pre-validation function
// check href attribute and protocol
const preValidate = (element: HTMLElement) => {
  if (!element) {
    return false
  }

  if (element.tagName === 'A') {
    let href = getAttribute(element, 'href')
    if (!href) {
      return false
    }

    href = href.trim()
    if (href.length === 0 || href === '#') {
      return false
    }

    const protocol = (element as HTMLAnchorElement).protocol
    if (protocol !== 'http:' && protocol !== 'https:') {
      return false
    }
  }

  return true
}

// post-validation function
// check title and media object
const isValidUtagsElement = (element: HTMLElement) => {
  if (element.dataset.utags !== undefined) {
    return true
  }

  if (!element.textContent) {
    return false
  }

  if (!getTrimmedTitle(element)) {
    return false
  }

  // TODO: there may be more than one media object
  const media = $(
    'img,svg,audio,video,button,.icon,[style*="background-image"]',
    element
  )

  if (media) {
    if (!validMediaSelector) {
      return false
    }

    if (!media.closest(validMediaSelector)) {
      return false
    }
  }

  return true
}

// check parent element and ancestor elements
const isExcludedUtagsElement = (element: HTMLElement) => {
  if (!doc.body.contains(element)) {
    return false
  }

  return excludeSelector ? Boolean(element.closest(excludeSelector)) : false
}

const addMatchedNodes = (matchedNodesSet: Set<UtagsHTMLElement>) => {
  if (!matchedNodesSelector) {
    return
  }

  const elements = $$(matchedNodesSelector)

  // const foundElements: Element[] = findElementsInShadowRoots(
  //   matchedNodesSelector,
  //   document.documentElement,
  //   {
  //     maxDepth: 50,
  //     includeTags: [
  //       //
  //       'shreddit-feed',
  //       'shreddit-post',
  //     ],
  //   }
  // )
  // elements.push(...Array.from(foundElements as HTMLElement[]))

  if (elements.length === 0) {
    return
  }

  const process = (element: UtagsHTMLElement) => {
    if (!preValidate(element)) {
      // It's not a candidate
      deleteElementUtags(element)
      return
    }

    const href = element.href || element.dataset.utags_link
    // check url
    if (!href || !validateFunction(element, href)) {
      // It's not a candidate
      deleteElementUtags(element)
      return
    }

    if (mappingFunction) {
      // Map to another element, which could be a child, parent, or sibling element.
      const newElement = mappingFunction(element)
      if (newElement && newElement !== element) {
        process(newElement)
        return
      }
    }

    if (isExcludedUtagsElement(element) || !isValidUtagsElement(element)) {
      // It's not a candidate
      deleteElementUtags(element)
      return
    }

    const originalKey = href
    let utags = getElementUtags(element)
    // vue 等框架会重复利用 element 对象，只修改 href 属性。每次需要验证 href 值是否与缓存的 utags.originalKey 值一致
    if (!utags || (utags.originalKey && utags.originalKey !== originalKey)) {
      utags = { key: '', meta: {} }
    }

    const key = utags.key || getCanonicalUrl(originalKey)
    if (!key) {
      return
    }

    const title =
      trimTitle(element.dataset.utags_title) || getTrimmedTitle(element)
    const meta: UserTagMeta = {}
    if (title && !isUrl(title)) {
      meta.title = title
    }

    const type = element.dataset.utags_type
    if (type) {
      meta.type = type
    }

    if (utags.meta?.title) {
      utags.meta.title = trimTitle(utags.meta.title)
    }

    // Store utags data in WeakMap instead of directly on the element
    setElementUtags(element, {
      key,
      originalKey,
      meta: utags.meta ? Object.assign(meta, utags.meta) : meta,
    })

    matchedNodesSet.add(element)
  }

  for (const element of elements) {
    try {
      process(element)
    } catch (error) {
      console.error(error)
    }
  }
}

export function matchedNodes() {
  // console.time('matchedNodes')
  const matchedNodesSet = new Set<UtagsHTMLElement>()

  try {
    addMatchedNodes(matchedNodesSet)
  } catch (error) {
    console.error(error)
  }

  if (typeof currentSite.addExtraMatchedNodes === 'function') {
    try {
      currentSite.addExtraMatchedNodes(matchedNodesSet)
    } catch (error) {
      console.error(error)
    }
  }

  try {
    const currentPageLink = $('#utags_current_page_link') as UtagsHTMLElement
    if (currentPageLink) {
      const key = getCanonicalUrl(currentPageLink.href)
      if (key) {
        const title = getTrimmedTitle(currentPageLink)
        const description = currentPageLink.dataset.utags_description
        // Build meta object only with properties that have values
        const meta: { title?: string; description?: string } = {}
        if (title) meta.title = title
        if (description) meta.description = description

        setElementUtags(currentPageLink, {
          key,
          meta,
        })
        matchedNodesSet.add(currentPageLink)
      }
    }
  } catch (error) {
    console.error(error)
  }

  // 添加 data-utags_primary_link 属性强制允许使用 utags
  // const array = $$("[data-utags_primary_link]") as HTMLAnchorElement[]
  // for (const element of array) {
  //   if (!element.utags) {
  //     const key = getCanonicalUrl(element.href)
  //     const title = element.textContent!
  //     const meta = {}
  //     if (!isUrl(title)) {
  //       meta.title = title
  //     }

  //     setUtags(element, key, meta)
  //   }

  //   matchedNodesSet.add(element)
  // }

  if (typeof currentSite.postProcess === 'function') {
    try {
      currentSite.postProcess()
    } catch (error) {
      console.error(error)
    }
  }

  // Debug
  // if (0) {
  //   let list = uniq(
  //     $$("a[href]:not(.utags_text_tag)")
  //       .map((v: HTMLAnchorElement) => v.href)
  //       .sort()
  //       .filter((v) => v && !v.includes(hostname))
  //   )
  //   console.log(list)

  //   list = uniq(
  //     $$("a[href]:not(.utags_text_tag)")
  //       .map((v: HTMLAnchorElement) => v.href)
  //       .sort()
  //       .filter((v) => v?.includes(hostname))
  //   )
  //   console.log(list)

  //   list = uniq(
  //     $$("a[href]:not(.utags_text_tag)")
  //       .map((v: HTMLAnchorElement) => v.href)
  //       .sort()
  //       .filter((v) => v?.includes(hostname))
  //       .filter((v) => v.includes("?"))
  //   )
  //   console.log(list)
  // }

  // console.timeEnd('matchedNodes')
  return [...matchedNodesSet]
}
