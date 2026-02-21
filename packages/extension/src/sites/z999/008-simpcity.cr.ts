import { $, $$, doc, setAttribute } from 'browser-extension-utils'
import styleText from 'data-text:./008-simpcity.cr.scss'
import { getTrimmedTitle } from 'utags-utils'

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from '../../modules/visited'
import { setUtags } from '../../utils/dom-utils'
import {
  getDirectChildText,
  getUtagsTitle,
  setUtagsAttributes,
} from '../../utils/index'
import defaultSite from '../default'

export default (() => {
  const prefix = 'https://simpcity.cr/'

  function normalizeDomain(url: string) {
    if (!url.startsWith(prefix) && url.includes('simpcity')) {
      return url.replace(/^https:\/\/simpcity\.\w+\/?/, prefix)
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
        if (/^threads\/[\w-%]+\.\d+\/?$/.test(href2)) {
          return prefix + href2.replace(/^(threads\/[\w-%]+\.\d+).*/, '$1/')
        }
      } else if (/^threads\/[\w-%]+\.\d+/.test(href2)) {
        return prefix + href2.replace(/^(threads\/[\w-%]+\.\d+).*/, '$1/')
      }
    }

    return undefined
  }

  function getUserProfileUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (exact) {
        if (/^members\/[\w-]+\.\d+\/?$/.test(href2)) {
          return prefix + href2.replace(/^(members\/[\w-]+\.\d+).*/, '$1/')
        }
      } else if (/^members\/[\w-]+\.\d+/.test(href2)) {
        return prefix + href2.replace(/^(members\/[\w-]+\.\d+).*/, '$1/')
      }
    }

    return undefined
  }

  return {
    // simpcity.cr | simpcity.ax | ...
    matches: /simpcity\.\w+/,
    preProcess() {
      setVisitedAvailable(true)

      const href = normalizeDomain(location.href)
      let key = getPostUrl(href)
      if (key) {
        const element = $('h1.p-title-value')
        if (element) {
          const title = getDirectChildText(element)
          if (title) {
            setUtagsAttributes(element, { key, title, type: 'post' })
            addVisited(key)
            markElementWhetherVisited(key, element)
          }
        }
      }

      key = getUserProfileUrl(href)
      if (key) {
        const element = $('h1.memberHeader-name')
        if (element) {
          setUtagsAttributes(element, { key, type: 'user' })
        }
      }
    },
    listNodesSelectors: [
      // Post list
      '.structItem--thread',
      // Comments
      'article.message--post[itemtype="https://schema.org/Comment"]',
    ],
    conditionNodesSelectors: [
      // Post list
      '.structItem--thread .structItem-cell--main a',
      // Comments
      'article.message--post[itemtype="https://schema.org/Comment"] .message-userDetails a.username',
    ],
    validate(element: HTMLAnchorElement, href: string) {
      href = normalizeDomain(href)

      if (!href.startsWith(prefix)) {
        return true
      }

      let key = getPostUrl(href)
      if (key) {
        if ($('time', element)) {
          return false
        }

        const title = getUtagsTitle(element)
        if (!title) {
          return false
        }

        const meta = { type: 'post', title }
        setUtags(element, key, meta)
        markElementWhetherVisited(key, element)
        setAttribute(element, 'data-utags', element.dataset.utags || '')

        return true
      }

      key = getUserProfileUrl(href)
      if (key) {
        const title = getTrimmedTitle(element)
        if (!title) {
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
      'header',
      'nav',
      '.p-sectionLinks',
      '.notices',
      '.avatar',
      '.p-breadcrumbs',
      '.tabs',
      '.structItem-pageJump',
      '.structItem-startDate',
      '.filterBar',
      // Add to filter label
      '.labelLink',
      // Home page
      'h2.block-header',
      '.button',
      '.actionBar-action',
      '.reactionsBar-link',
      '.shareButtons',
      // 帖子标题下的作者名。第一楼有作者，无需在这里再显示标签
      '.p-description',
      '.uix_mobileNodeTitle',
      '[data-template="account_preferences"]',
      'a[href^="/login/"]',
      'a[href^="/logout/"]',
      'a[href^="/lost-password/"]',
      'a[href^="/online/"]',
      'a[href^="/direct-messages/"]',
      'a[href^="/account/"]',
    ],
    postProcess() {
      const isDarkMode = true
      doc.documentElement.dataset.utags_darkmode = isDarkMode ? '1' : '0'
    },
    getStyle: () => styleText,
    getCanonicalUrl,
  }
})()
