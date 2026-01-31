import { $, $$, doc, hasClass } from 'browser-extension-utils'
import styleText from 'data-text:./011-hitomi.la.scss'
import { getTrimmedTitle } from 'utags-utils'

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from '../../modules/visited'
import { setUtags } from '../../utils/dom-utils'
import defaultSite from '../default'

export default (() => {
  const prefix = 'https://hitomi.la/'
  const galleryExcludePrefixPattern = /^(reader|tag|artist|group|type|series)/

  function getCanonicalUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = getGalleryUrl(url, true)
      if (href2) {
        return href2
      }
    }

    return url
  }

  function getGalleryUrl(url: string, exact = false): string | undefined {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)

      if (galleryExcludePrefixPattern.test(href2)) {
        return undefined
      }

      if (exact) {
        if (/^(\w+)\/([^/]+-)?(\d+\.html)$/.test(href2)) {
          return (
            prefix + href2.replace(/^(\w+)\/([^/]+-)?(\d+\.html).*/, '$1/$3')
          )
        }
      } else if (/^(\w+)\/([^/]+-)?(\d+\.html).*/.test(href2)) {
        return prefix + href2.replace(/^(\w+)\/([^/]+-)?(\d+\.html).*/, '$1/$3')
      }
    }

    return undefined
  }

  return {
    matches: /hitomi\.la/,
    preProcess() {
      setVisitedAvailable(true)

      const href = location.href
      const key = getGalleryUrl(href)
      if (key) {
        const element = $('h1#gallery-brand a')
        if (element) {
          ;(element as any).href = key
          element.dataset.utags_link = key
          element.dataset.utags_type = 'gallery'
          addVisited(key)
          markElementWhetherVisited(key, element)
        }
      }
    },
    listNodesSelectors: [
      // thumb
      '.gallery-content > div',
    ],
    conditionNodesSelectors: [
      // thumb title
      '.gallery-content > div a',
    ],
    validate(element: HTMLAnchorElement) {
      const href = element.href

      if (!href.startsWith(prefix)) {
        return true
      }

      const key = getGalleryUrl(href, true)
      if (key) {
        const title = getTrimmedTitle(element)
        if (!title) {
          return false
        }

        const meta = { type: 'gallery', title }
        setUtags(element, key, meta)
        markElementWhetherVisited(key, element)
        element.dataset.utags = element.dataset.utags || ''

        return true
      }

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      'header',
      'nav',
      '.navbar',
      '.page-container',
      '.page-content',
      '.simplePagerNav',
      '#read-online-button',
      '#dl-button',
    ],
    postProcess() {
      const isDarkMode = false
      doc.documentElement.dataset.utags_darkmode = isDarkMode ? '1' : '0'
    },
    getStyle: () => styleText,
    getCanonicalUrl,
  }
})()
