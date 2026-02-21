import { $, $$, doc, hasClass, setAttribute } from 'browser-extension-utils'
import styleText from 'data-text:./041-toutiao.com.scss'
import { getTrimmedTitle } from 'utags-utils'

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from '../../modules/visited'
import { setUtags } from '../../utils/dom-utils'
import { deleteUrlParameters, setUtagsAttributes } from '../../utils/index'
import defaultSite from '../default'

export default (() => {
  const prefix = 'https://www.toutiao.com/'

  function normalizeDomain(url: string) {
    if (!url.startsWith(prefix) && url.includes('toutiao.com')) {
      return url.replace(/^https:\/\/(m\.)?toutiao\.com\/?/, prefix)
    }

    return url
  }

  function getCanonicalUrl(url: string) {
    url = normalizeDomain(url)

    if (url.startsWith(prefix)) {
      url = deleteUrlParameters(url, '*')
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

  function getPostUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (exact) {
        if (/^(?:article|trending)\/\d+\/?$/.test(href2)) {
          return prefix + href2.replace(/^((?:article|trending)\/\d+).*/, '$1/')
        }
      } else if (/^(?:article|trending)\/\d+\/?/.test(href2)) {
        return prefix + href2.replace(/^((?:article|trending)\/\d+).*/, '$1/')
      }
    }

    return undefined
  }

  function getVideoUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (exact) {
        if (/^video\/\d+\/?$/.test(href2)) {
          return prefix + href2.replace(/^(video\/\d+).*/, '$1/')
        }
      } else if (/^video\/\d+\/?/.test(href2)) {
        return prefix + href2.replace(/^(video\/\d+).*/, '$1/')
      }
    }

    return undefined
  }

  function getUserProfileUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (exact) {
        if (/^c\/user\/(\d+|token\/[^/]+)\/?$/.test(href2)) {
          return (
            prefix +
            href2.replace(/^c\/user\/(\d+|token\/[^/]+).*/, 'c/user/$1/')
          )
        }
      } else if (/^c\/user\/(\d+|token\/[^/]+)/.test(href2)) {
        return (
          prefix + href2.replace(/^c\/user\/(\d+|token\/[^/]+).*/, 'c/user/$1/')
        )
      }
    }

    return undefined
  }

  return {
    matches: /toutiao\.com/,
    preProcess() {
      setVisitedAvailable(true)

      let href = normalizeDomain(location.href)

      if (!href.startsWith(prefix)) {
        return
      }

      href = deleteUrlParameters(href, '*')

      let key = getPostUrl(href)
      if (key) {
        const element = $('h2.title,.article-content h1')
        if (element) {
          setUtagsAttributes(element, { key, type: 'news' })
          addVisited(key)
          markElementWhetherVisited(key, element)
        }
      }

      key = getVideoUrl(href)
      if (key) {
        const element = $('.ttp-video-extras-title h1')
        if (element) {
          setUtagsAttributes(element, { key, type: 'video' })
          addVisited(key)
          markElementWhetherVisited(key, element)
        }
      }

      key = getUserProfileUrl(href)
      if (key) {
        const element = $('.profile-info-wrapper .name')
        if (element) {
          setUtagsAttributes(element, { key, type: 'user' })
        }
      }
    },
    // listNodesSelectors: [
    //   // Post list
    //   '[data-main-left] ul.card li',
    //   // Comments
    //   '[data-main-left].utags_no_hide > div > div.card article',
    //   // Comments Flat view
    //   '[data-main-left]:not(.utags_no_hide) > div > div.card',
    //   // Right sidebar
    //   '[data-right-sidebar] .card-body > h4 + div > div',
    // ],
    // conditionNodesSelectors: [
    //   // Post list
    //   '[data-main-left] ul.card li a:not(time + div a):not(.utags_text_tag)',
    //   // Comments
    //   '[data-main-left].utags_no_hide > div > div.card article address > div > a[rel="author"]',
    //   // Comments Flat view
    //   '[data-main-left]:not(.utags_no_hide) > div > div.card article address > div > a[rel="author"]',
    //   // Right sidebar
    //   '[data-right-sidebar] .card-body > h4 + div > div a',
    // ],
    validate(element: HTMLAnchorElement, href: string) {
      href = normalizeDomain(href)

      if (!href.startsWith(prefix)) {
        return true
      }

      href = deleteUrlParameters(href, '*')

      let key = getPostUrl(href)
      if (key) {
        // 右侧栏 > 头条热榜
        const titleElement = $('.news-title', element)
        const title = getTrimmedTitle(titleElement || element)
        if (!title) {
          return false
        }

        const meta = { type: 'news', title }
        setUtags(element, key, meta)
        markElementWhetherVisited(key, element)
        setAttribute(element, 'data-utags', element.dataset.utags || '')

        return true
      }

      key = getVideoUrl(href)
      if (key) {
        // 右侧栏 > 头条热榜
        const titleElement = $('.news-title', element)
        const title = getTrimmedTitle(titleElement || element)
        if (!title) {
          return false
        }

        const meta = { type: 'video', title }
        setUtags(element, key, meta)
        markElementWhetherVisited(key, element)
        setAttribute(element, 'data-utags', element.dataset.utags || '')

        return true
      }

      key = getUserProfileUrl(href)
      if (key) {
        const title = getTrimmedTitle(element)
        if (
          !title ||
          title.startsWith('粉丝') ||
          title.startsWith('关注') ||
          title.startsWith('赞')
        ) {
          return false
        }

        const meta = { type: 'user', title }
        setUtags(element, key, meta)
        setAttribute(element, 'data-utags', element.dataset.utags || '')

        return true
      }

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '.toutiao-header',
      '.ttp-site-header',
      '.main-nav-wrapper',
      '[aria-label^="评论数"]',
      '.action-item',
    ],
    postProcess() {
      // const isDarkMode = false
      // doc.documentElement.dataset.utags_darkmode = isDarkMode ? '1' : '0'
    },
    getStyle: () => styleText,
    getCanonicalUrl,
  }
})()
