import {
  $,
  $$,
  addElement,
  doc,
  getAttribute,
  isUrl,
  runWhenBodyExists,
  uniq,
} from 'browser-extension-utils'
import { getTrimmedTitle, trimTitle } from 'utags-utils'

import {
  deleteElementUtags,
  getElementUtags,
  hasElementUtags,
  setElementUtags,
} from '../modules/dom-reference-manager'
import {
  debugScannerDifference,
  UTagsScanner,
  type UTagsScannerOptions,
} from '../modules/utags-scanner'
import type { UserTag, UserTagMeta, UtagsHTMLElement } from '../types'
import { cleanupUtags } from '../utils/index'
import defaultSite from './default'
import utags_pipecraft_net from './z001/000-utags.pipecraft.net'
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
import rebang_today from './z001/023-rebang.today'
import myanimelist_net from './z001/024-myanimelist.net'
import douban from './z001/025-douban.com'
import pixiv from './z001/026-pixiv.net'
import discourse from './z001/027-discourse'
import nga from './z001/028-nga.cn'
import dlsite_com from './z001/029-dlsite.com'
import keylol_com from './z001/030-keylol.com'
import flarum from './z001/032-flarum'
import nodeseek_com from './z001/033-nodeseek.com'
import inoreader_com from './z001/034-inoreader.com'
import zhipin_com from './z001/035-zhipin.com'
import twitch_tv from './z001/036-twitch.tv'
import flickr_com from './z001/038-flickr.com'
import ruanyifeng_com from './z001/039-ruanyifeng.com'
import _2libra_com from './z001/040-2libra.com'
import toutiao_com from './z001/041-toutiao.com'
import discuz from './z001/042-discuz'
import pxxnhub from './z999/001-pxxnhub.com'
import ehentxx from './z999/002-e-hentxx.org'
import panda_chai99ka_moe from './z999/003-panda.chai99ka.moe'
import dmm_co_jp from './z999/004-dxx.co.jp'
import kemoxx_su from './z999/005-kemoxx.su'
import rule99video_com from './z999/006-rule99video.com'
import xsi77jishe_net from './z999/007-xsi77jishe.net'
import simpxxcity from './z999/008-simpxxcity.cr'
import hotgixx_asia from './z999/009-hotgixx.asia'
import nhentxx_net from './z999/010-nhentxx.net'
import hito99mi_la from './z999/011-hito99mi.la'
import misskon_com from './z999/012-misskon.com'

type Site = {
  matches: RegExp
  listNodesSelectors?: string[]
  conditionNodesSelectors?: string[]
  matchedNodesSelectors?: string[]
  validate?: (element: UtagsHTMLElement, href: string) => boolean
  excludeSelectors?: string[]
  validMediaSelectors?: string[]
  getCanonicalUrl?: (
    url: string,
    hostname: string
  ) => string | { url: string; domainChanged: boolean }
  getStyle?: () => string
  preProcess?: () => void
  postProcess?: () => void
}

const sites: Site[] = [
  utags_pipecraft_net,
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
  rebang_today,
  myanimelist_net,
  douban,
  pixiv,
  discourse,
  nga,
  keylol_com,
  flarum,
  nodeseek_com,
  inoreader_com,
  zhipin_com,
  twitch_tv,
  flickr_com,
  ruanyifeng_com,
  _2libra_com,
  toutiao_com,
  discuz,
  pxxnhub,
  ehentxx,
  panda_chai99ka_moe,
  dlsite_com,
  dmm_co_jp,
  kemoxx_su,
  rule99video_com,
  xsi77jishe_net,
  simpxxcity,
  hotgixx_asia,
  nhentxx_net,
  hito99mi_la,
  misskon_com,
]

const BASE_EXCLUDE_SELECTOR = '[data-utags_exclude],svg'
const getCanonicalUrlFunctionList = [defaultSite, ...sites]
  .map((site) => site.getCanonicalUrl)
  .filter((v) => typeof v === 'function')

function matchedSite(hostname: string) {
  for (const s of sites) {
    if (s.matches.test(hostname)) {
      return s
    }
  }

  return defaultSite
}

function joinSelectors(selectors: string[] | undefined) {
  return selectors
    ? selectors
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .join(',')
    : undefined
}

const hostname = location.hostname
const currentSite: Site = matchedSite(hostname)

const listNodesSelector = joinSelectors(currentSite.listNodesSelectors)

const conditionNodesSelector = joinSelectors(
  currentSite.conditionNodesSelectors
)

let matchedNodesSelector = joinSelectors(
  currentSite.matchedNodesSelectors &&
    currentSite.matchedNodesSelectors.length > 0
    ? [...currentSite.matchedNodesSelectors, '[data-utags_link]']
    : [...defaultSite.matchedNodesSelectors, 'a[href]']
)

let scannerInstance: UTagsScanner | undefined
let lastScanDomOptions: ScanDomOptions | undefined

export function isScannerBusy() {
  return Boolean(scannerInstance?.isScanning || scannerInstance?.isCleaning)
}

export const updateMatchedNodesSelector = (customSelector: string) => {
  const nextMatchedNodesSelector = joinSelectors(
    currentSite.matchedNodesSelectors &&
      currentSite.matchedNodesSelectors.length > 0
      ? [
          ...currentSite.matchedNodesSelectors,
          '[data-utags_link]',
          customSelector,
        ]
      : [...defaultSite.matchedNodesSelectors, 'a[href]', customSelector]
  )

  if (nextMatchedNodesSelector === matchedNodesSelector) {
    return
  }

  matchedNodesSelector = nextMatchedNodesSelector
  if (scannerInstance) {
    scannerInstance.updateConfig(createUTagsScannerOptions(lastScanDomOptions))
  }
}

const excludeSelector = joinSelectors([
  BASE_EXCLUDE_SELECTOR,
  ...(currentSite.excludeSelectors || []),
])

const validMediaSelector = joinSelectors(currentSite.validMediaSelectors)

const validateFunction = currentSite.validate || defaultSite.validate

// console.log([
//   currentSite,
//   "listNodesSelector: " + listNodesSelector,
//   "conditionNodesSelector: " + conditionNodesSelector,
//   "matchedNodesSelector: " + matchedNodesSelector,
//   "excludeSelector: " + excludeSelector,
//   "validMediaSelector: " + validMediaSelector,
// ])

export function getCurrentSiteStyle(): string | undefined {
  if (typeof currentSite.getStyle === 'function') {
    return currentSite.getStyle()
  }

  return undefined
}

export function getListNodes() {
  if (typeof currentSite.preProcess === 'function') {
    currentSite.preProcess()
  }

  // Style injection is centrally managed by style-manager

  return listNodesSelector ? $$(listNodesSelector) : []
}

export function getConditionNodes() {
  return conditionNodesSelector ? $$(conditionNodesSelector) : []
}

export function getCanonicalUrl(url: string | undefined) {
  if (!url) {
    return undefined
  }

  try {
    const hostname = new URL(url).hostname

    for (const getCanonicalUrlFunc of getCanonicalUrlFunctionList) {
      if (getCanonicalUrlFunc) {
        const newUrl: string | { url: string; domainChanged: boolean } =
          getCanonicalUrlFunc(url, hostname)

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
  } catch (error) {
    console.error('Error in getCanonicalUrl:', error)
    return undefined
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

  if (element.hasAttribute('data-utags_title')) {
    if (!trimTitle(element.dataset.utags_title)) {
      return false
    }
  } else {
    if (!element.textContent) {
      return false
    }

    if (!getTrimmedTitle(element)) {
      return false
    }
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

export function updateElementUtagsMeta(
  element: UtagsHTMLElement,
  key: string,
  originalKey: string,
  existingMeta?: UserTagMeta
) {
  const meta: UserTagMeta = {}

  const title =
    trimTitle(element.dataset.utags_title) || getTrimmedTitle(element)
  if (title && !isUrl(title)) {
    meta.title = title
  }

  const type = element.dataset.utags_type
  if (type) {
    meta.type = type
  }

  setElementUtags(element, {
    key,
    originalKey,
    meta: existingMeta ? Object.assign(meta, existingMeta) : meta,
  })
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
      cleanupUtags(element)
      return
    }

    // dataset.utags_link takes precedence over the href attribute; normalized href can be saved in dataset.utags_link.
    const href = element.dataset.utags_link || element.href
    // check url
    if (!href || typeof href !== 'string' || !validateFunction(element, href)) {
      // It's not a candidate
      cleanupUtags(element)
      return
    }

    if (isExcludedUtagsElement(element) || !isValidUtagsElement(element)) {
      // It's not a candidate
      cleanupUtags(element)
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
      // It's not a candidate
      cleanupUtags(element)
      return
    }

    updateElementUtagsMeta(element, key, originalKey, utags.meta)

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
  // const matchedNodesSet = new Set<UtagsHTMLElement>()

  // try {
  //   addMatchedNodes(matchedNodesSet)
  // } catch (error) {
  //   console.error(error)
  // }

  // try {
  //   const currentPageLink = $('#utags_current_page_link') as UtagsHTMLElement
  //   if (currentPageLink) {
  //     const key = getCanonicalUrl(currentPageLink.href)
  //     if (key) {
  //       const title = getTrimmedTitle(currentPageLink)
  //       const description = currentPageLink.dataset.utags_description
  //       // Build meta object only with properties that have values
  //       const meta: { title?: string; description?: string } = {}
  //       if (title) meta.title = title
  //       if (description) meta.description = description

  //       setElementUtags(currentPageLink, {
  //         key,
  //         meta,
  //       })
  //       matchedNodesSet.add(currentPageLink)
  //     }
  //   }
  // } catch (error) {
  //   console.error(error)
  // }

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
  return []
}

export type ScanDomOptions = {
  onNodeMatched?: (node: HTMLElement) => void
  onScanCompleted?: (nodes: HTMLElement[]) => void
}

function createUTagsScannerOptions(
  options?: ScanDomOptions
): UTagsScannerOptions {
  return {
    include: matchedNodesSelector
      ? matchedNodesSelector.split(',')
      : // : ['[data-utags_link]', '[data-utags]', 'a[href*="github"]', 'a'],
        undefined,
    ignore: ['[data-utags_ignore]'],
    exclude: excludeSelector
      ? excludeSelector.split(',')
      : ['[data-utags_exclude]'],
    onBeforeMatch(node: Element, action: 'add' | 'delete', debug = false) {
      const htmlNode = node as HTMLElement
      if (action === 'add') {
        if (!(node instanceof HTMLElement)) {
          return false
        }

        const element = node
        if (!preValidate(element)) {
          // It's not a candidate
          cleanupUtags(element)
          return false
        }

        // dataset.utags_link takes precedence over the href attribute; normalized href can be saved in dataset.utags_link.
        const href =
          element.dataset.utags_link || (element as HTMLAnchorElement).href
        // check url
        if (
          !href ||
          typeof href !== 'string' ||
          (!validateFunction(element, href) &&
            !element.closest('#utags_current_page_link'))
        ) {
          // It's not a candidate
          cleanupUtags(element)
          return false
        }

        if (!isValidUtagsElement(element)) {
          // It's not a candidate
          cleanupUtags(element)
          return false
        }

        const originalKey = href
        let utags = getElementUtags(element)
        // vue 等框架会重复利用 element 对象，只修改 href 属性。每次需要验证 href 值是否与缓存的 utags.originalKey 值一致
        if (
          !utags ||
          (utags.originalKey && utags.originalKey !== originalKey)
        ) {
          utags = { key: '', meta: {} }
        }

        const key = utags.key || getCanonicalUrl(originalKey)
        if (!key) {
          // It's not a candidate
          cleanupUtags(element)
          return false
        }

        updateElementUtagsMeta(element, key, originalKey, utags.meta)

        if (!debug) {
          // eslint-disable-next-line n/prefer-global/process
          if (process.env.PLASMO_TAG !== 'prod') {
            htmlNode.style.outline = '2px solid gold'
          }

          // element.dataset.utags_absolute = '1'
          if (options?.onNodeMatched) {
            options.onNodeMatched(element)
          }

          if (
            conditionNodesSelector &&
            element.matches(conditionNodesSelector) &&
            element.dataset.utags_condition_node === undefined
          ) {
            element.dataset.utags_condition_node = ''
          }
        }
      } else if (action === 'delete') {
        cleanupUtags(htmlNode)
        // eslint-disable-next-line n/prefer-global/process
        if (process.env.PLASMO_TAG !== 'prod' && !debug)
          htmlNode.style.outline = ''
      }
    },
  }
}

export function scanDom(options?: ScanDomOptions) {
  lastScanDomOptions = options
  console.debug('UTagsScanner start', matchedNodesSelector, excludeSelector)
  const initialOptions = createUTagsScannerOptions(options)

  let debugTimeout: ReturnType<typeof setTimeout>
  let currentResult: Element[] | undefined
  const scanner = new UTagsScanner((list, stats) => {
    console.debug(
      'UTagsScanner callback',
      `Matches: ${list.length} | ActiveTime: ${stats.pureScanDuration.toFixed(2)}ms`
    )
    currentResult = list

    if (options?.onScanCompleted) {
      options.onScanCompleted(list as HTMLElement[])
    }

    // eslint-disable-next-line n/prefer-global/process
    if (process.env.PLASMO_TAG !== 'prod') {
      clearTimeout(debugTimeout)
      debugTimeout = setTimeout(() => {
        if (scanner.isScanning || scanner.isCleaning) {
          // 又有节点添加或删除，等待下一次扫描完成
        } else {
          debugScannerDifference(scanner)
        }
      }, 100)
    }
  }, initialOptions)
  scannerInstance = scanner

  if (document.body) {
    scanner.start(document.body)
  } else {
    runWhenBodyExists(() => {
      scanner.start(document.body)
    })
  }
}
