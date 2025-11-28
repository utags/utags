import { $, $$, doc, hasClass } from 'browser-extension-utils'
import styleText from 'data-text:./040-2libra.com.scss'
import { getTrimmedTitle } from 'utags-utils'

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from '../../modules/visited'
import { setUtags } from '../../utils/dom-utils'
import defaultSite from '../default'

export default (() => {
  const prefix = location.origin + '/'

  function getPostUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (exact) {
        if (/^(post|post-flat)(?:\/[\w-]+){2}$/.test(href2)) {
          return (
            prefix +
            href2.replace(/^(post|post-flat)\/([\w-]+\/[\w-]+).*/, 'post/$2')
          )
        }
      } else if (/^(post|post-flat)(?:\/[\w-]+){2}/.test(href2)) {
        return (
          prefix +
          href2.replace(/^(post|post-flat)\/([\w-]+\/[\w-]+).*/, 'post/$2')
        )
      }
    }

    return undefined
  }

  function getUserUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (exact) {
        if (/^user\/[\w-%]+(\/(post)?)?$/.test(href2)) {
          return prefix + href2.replace(/^(user\/[\w-%]+).*/, '$1/post')
        }
      } else if (/^user\/[\w-%]+/.test(href2)) {
        return prefix + href2.replace(/^(user\/[\w-%]+).*/, '$1/post')
      }
    }

    return undefined
  }

  return {
    matches: /2libra\.com/,
    preProcess() {
      setVisitedAvailable(true)

      if (
        location.pathname.startsWith('/post/') &&
        !location.pathname.startsWith('/post/hot/') &&
        !location.pathname.startsWith('/post/latest')
      ) {
        // 楼中楼回复模式添加 utags_no_hide 类名，防止被隐藏
        $('[data-main-left]')?.classList.add('utags_no_hide')
      }
    },
    listNodesSelectors: [
      // Post list
      '[data-main-left] ul.card li',
      // Comments
      '[data-main-left].utags_no_hide > div > div.card article',
      // Comments Flat view
      '[data-main-left]:not(.utags_no_hide) > div > div.card',
      // Right sidebar
      '[data-right-sidebar] .card-body > h4 + div > div',
    ],
    conditionNodesSelectors: [
      // Post list
      '[data-main-left] ul.card li a:not(time + div a):not(.utags_text_tag)',
      // Comments
      '[data-main-left].utags_no_hide > div > div.card article address > div > a[rel="author"]',
      // Comments Flat view
      '[data-main-left]:not(.utags_no_hide) > div > div.card article address > div > a[rel="author"]',
      // Right sidebar
      '[data-right-sidebar] .card-body > h4 + div > div a',
    ],
    validate(element: HTMLAnchorElement) {
      const href = element.href

      if (!href.startsWith(prefix)) {
        return true
      }

      let key = getPostUrl(href)
      if (key) {
        const title = getTrimmedTitle(element)
        if (!title) {
          return false
        }

        if (title === '最后回复') {
          return false
        }

        const meta = { type: 'post', title }
        setUtags(element, key, meta)
        markElementWhetherVisited(key, element)
        element.dataset.utags = element.dataset.utags || ''

        return true
      }

      key = getUserUrl(href)
      if (key) {
        const title = getTrimmedTitle(element)
        if (!title) {
          return false
        }

        const meta = { type: 'user', title }
        setUtags(element, key, meta)
        element.dataset.utags = element.dataset.utags || ''

        return true
      }

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '.node-parent-tabs',
      '.tabs',
      '.breadcrumbs',
      // 热榜标签，分页
      '.join',
      '.btn',
      'a[href^="/coins"]',
      'a[href^="/notifications"]',
      'a[href^="/post/hot/"]',
      'a[href$="/history"]',
      'a[href^="/auth"]',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      let key = getPostUrl(location.href)
      if (key) {
        addVisited(key)
        const element = $('[data-main-left] h1')
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

      key = getUserUrl(location.href)
      if (key) {
        const element = $(
          '[data-main-left] div.w-full > div.w-full > div:first-child > div'
        )
        if (element) {
          const title = getTrimmedTitle(element)
          if (title) {
            const meta = { title, type: 'user' }
            setUtags(element, key, meta)
            element.dataset.utags_node_type = 'link'
            matchedNodesSet.add(element)
          }
        }
      }
    },
    postProcess() {
      const theme = doc.documentElement.dataset.theme || ''
      const isDarkMode = [
        'dark',
        'forest',
        'synthwave',
        'halloween',
        'black',
        'luxury',
        'dracula',
        'business',
        'night',
        'coffee',
      ].includes(theme)
      doc.documentElement.dataset.utags_darkmode = isDarkMode ? '1' : '0'
    },
    getStyle: () => styleText,
  }
})()
