import {
  $,
  $$,
  addElement,
  getAttribute,
  isUrl,
  uniq,
} from 'browser-extension-utils'
import { getTrimmedTitle, trimTitle } from 'utags-utils'

import type { UserTag, UserTagMeta, UtagsHTMLElement } from '../types'
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
import threads from './z001/010-threads.net'
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
import pxxnhub from './z999/001-pxxnhub.com'
import ehentxx from './z999/002-e-hentxx.org'
import panda_chaika_moe from './z999/003-panda.chaika.moe'
import dmm_co_jp from './z999/004-dmm.co.jp'
import kemono_su from './z999/005-kemono.su'
import rule34video_com from './z999/006-rule34video.com'

type Site = {
  matches: RegExp
  listNodesSelectors?: string[]
  conditionNodesSelectors?: string[]
  matchedNodesSelectors?: string[]
  validate?: (element: UtagsHTMLElement) => boolean
  map?: (element: UtagsHTMLElement) => UtagsHTMLElement
  excludeSelectors?: string[]
  validMediaSelectors?: string[]
  addExtraMatchedNodes?: (matchedNodesSet: Set<UtagsHTMLElement>) => void
  getCanonicalUrl?: (url: string) => string
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
  pxxnhub,
  ehentxx,
  panda_chaika_moe,
  dlsite_com,
  dmm_co_jp,
  kemono_su,
  rule34video_com,
]

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

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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

const excludeSelector = joinSelectors(currentSite.excludeSelectors)

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
      addElement('style', {
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
      url = getCanonicalUrlFunc(url)
    }
  }

  return url
}

// pre-validation function
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

  if (
    element.closest('.utags_text_tag,.browser_extension_settings_container,a a')
  ) {
    return false
  }

  return true
}

// post-validation function
const isValidUtagsElement = (element: HTMLElement) => {
  if (element.dataset.utags !== undefined) {
    return true
  }

  if (!element.textContent) {
    return false
  }

  if (!element.textContent.trim()) {
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

const isExcludedUtagsElement = (element: HTMLElement) => {
  return excludeSelector ? Boolean(element.closest(excludeSelector)) : false
}

const addMatchedNodes = (matchedNodesSet: Set<UtagsHTMLElement>) => {
  if (!matchedNodesSelector) {
    return
  }

  const elements = $$(matchedNodesSelector)

  if (elements.length === 0) {
    return
  }

  const process = (element: UtagsHTMLElement) => {
    if (!preValidate(element) || !validateFunction(element)) {
      // It's not a candidate
      delete element.utags
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
      delete element.utags
      return
    }

    const utags: UserTag = element.utags! || {}
    const key = utags.key || getCanonicalUrl(element.href)
    if (!key) {
      return
    }

    const title = getTrimmedTitle(element)
    const meta: UserTagMeta = {}
    if (title && !isUrl(title)) {
      meta.title = title
    }

    if (utags.meta?.title) {
      utags.meta.title = trimTitle(utags.meta.title)
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    element.utags = {
      key,
      meta: utags.meta ? Object.assign(meta, utags.meta) : meta,
    } as UserTag

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
  const matchedNodesSet = new Set<UtagsHTMLElement>()

  addMatchedNodes(matchedNodesSet)

  if (typeof currentSite.addExtraMatchedNodes === 'function') {
    currentSite.addExtraMatchedNodes(matchedNodesSet)
  }

  const currentPageLink = $('#utags_current_page_link') as UtagsHTMLElement
  if (currentPageLink) {
    const key = getCanonicalUrl(location.href)
    if (key) {
      const title = getTrimmedTitle(currentPageLink)
      currentPageLink.utags = {
        key,
        meta: title ? { title } : {},
      }
      matchedNodesSet.add(currentPageLink)
    }
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

  //     element.utags = { key, meta }
  //   }

  //   matchedNodesSet.add(element)
  // }

  if (typeof currentSite.postProcess === 'function') {
    currentSite.postProcess()
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

  return [...matchedNodesSet]
}
