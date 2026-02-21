import { $, $$, doc, hasClass } from 'browser-extension-utils'
import styleText from 'data-text:./033-nodeseek.com.scss'
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
  const prefix = location.origin + '/'

  function getUserProfileUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()
      if (exact) {
        if (/^space\/\d+([?#].*)?$/.test(href2)) {
          return prefix + href2.replace(/^(space\/\d+).*/, '$1')
        }
      } else if (/^space\/\d+/.test(href2)) {
        return prefix + href2.replace(/^(space\/\d+).*/, '$1')
      }
    }

    return undefined
  }

  function getPostUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()
      if (exact) {
        if (/^post-\d+-\d+([?#].*)?$/.test(href2)) {
          return prefix + href2.replace(/^(post-\d+)-.*/, '$1') + '-1'
        }
      } else if (/^post-\d+-\d+/.test(href2)) {
        return prefix + href2.replace(/^(post-\d+)-.*/, '$1') + '-1'
      }
    }

    return undefined
  }

  function getCategoryUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()
      if (exact) {
        if (/^categories\/[\w-]+([?#].*)?$/.test(href2)) {
          return prefix + href2.replace(/^(categories\/[\w-]+).*/, '$1')
        }
      } else if (/^categories\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/^(categories\/[\w-]+).*/, '$1')
      }
    }

    return undefined
  }

  return {
    matches: /www\.nodeseek\.com|www\.deepflood\.com/,
    preProcess() {
      setVisitedAvailable(true)

      const isDarkMode = hasClass(doc.body, 'dark-layout')
      doc.documentElement.dataset.utags_darkmode = isDarkMode ? '1' : '0'

      let key = getUserProfileUrl(location.href)
      if (key) {
        // profile header
        const element = $('h1.username')
        if (element) {
          const title = getDirectChildText(element)
          setUtagsAttributes(element, { key, title, type: 'user' })
        }
      }

      key = getPostUrl(location.href)
      if (key) {
        addVisited(key)
      }
    },
    listNodesSelectors: [
      'ul.post-list li.post-list-item',
      // comments
      'ul.comments li.content-item',
    ],
    conditionNodesSelectors: [
      // topic title
      'ul.post-list li.post-list-item .post-title a',
      'ul.post-list li.post-list-item .info-author a',
      'ul.post-list li.post-list-item a.post-category',

      // comments
      'ul.comments li.content-item a.author-name',
    ],
    validate(element: HTMLAnchorElement, href: string) {
      if (!href.startsWith(prefix)) {
        return true
      }

      let key = getUserProfileUrl(href, true)
      if (key) {
        const title = getUtagsTitle(element)

        if (!title) {
          return false
        }

        const meta = { type: 'user', title }

        setUtags(element, key, meta)

        return true
      }

      key = getPostUrl(href, true)
      if (key) {
        const title = getTrimmedTitle(element)
        if (!title || /^#\d+$/.test(title)) {
          return false
        }

        const meta = { type: 'post', title }
        setUtags(element, key, meta)
        markElementWhetherVisited(key, element)

        return true
      }

      key = getCategoryUrl(href)
      if (key) {
        const title = getTrimmedTitle(element)
        if (!title) {
          return false
        }

        const meta = { type: 'category', title }
        setUtags(element, key, meta)

        return true
      }

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      'header',
      '[aria-label="pagination"]',
      'a[href="/signIn.html"]',
      'a[href="/register.html"]',
      `a[href^="/notification"]`,
      '.info-last-comment-time',
      '.floor-link',
      '.avatar-wrapper',
      // Tabs
      '.select-item',
      '.card-item',
      '.nsk-new-member-board',
      '.hover-user-card .user-stat',
      '.btn',
    ],
    validMediaSelectors: ['svg.iconpark-icon'],
    getStyle: () => styleText,
  }
})()
