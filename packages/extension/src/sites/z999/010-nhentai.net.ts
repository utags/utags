import { $, $$, doc, hasClass } from 'browser-extension-utils'
import styleText from 'data-text:./010-nhentai.net.scss'
import { getTrimmedTitle } from 'utags-utils'

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from '../../modules/visited'
import { setUtags } from '../../utils/dom-utils'
import defaultSite from '../default'

export default (() => {
  const prefix = 'https://nhentai.net/'

  function getGalleryUrl(url: string, exact = false): string | undefined {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (exact) {
        if (/^g\/\d+\/?$/.test(href2)) {
          return prefix + href2.replace(/^(g\/\d+)\/?.*/, '$1/')
        }
      } else if (/^g\/\d+/.test(href2)) {
        return prefix + href2.replace(/^(g\/\d+)\/?.*/, '$1/')
      }
    }

    return undefined
  }

  return {
    matches: /nhentai\.net/,
    preProcess() {
      setVisitedAvailable(true)

      const href = location.href
      const key = getGalleryUrl(href)
      if (key) {
        const element = $('h1.title')
        if (element) {
          ;(element as any).href = key
          element.dataset.utags_link = key
          element.dataset.utags_type = 'gallery'
          element.dataset.utags_node_type = 'link'
          addVisited(key)
          markElementWhetherVisited(key, element)
        }
      }
    },
    listNodesSelectors: [
      // thumb
      '.gallery',
    ],
    conditionNodesSelectors: [
      // thumb title
      '.gallery a.cover',
    ],
    validate(element: HTMLAnchorElement, href: string) {
      if (!href.startsWith(prefix)) {
        return true
      }

      const key = getGalleryUrl(href, true)
      if (key) {
        const titleElement = $('.caption', element)
        const title = getTrimmedTitle(titleElement || element)
        if (!title) {
          return false
        }

        const meta = { type: 'gallery', title }
        setUtags(element, key, meta)
        markElementWhetherVisited(key, element)
        element.dataset.utags = element.dataset.utags || ''
        if ($('.vli-info h2', element)) {
          element.dataset.utags_position_selector = '.vli-info h2'
        }

        return true
      }

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      'header',
      'nav',
      '.sort',
      '.alphabetical-pagination',
      '.pagination',
      'a[href^="/login/"]',
      'a[href^="/logout/"]',
      'a[href^="/reset/"]',
      'a[href^="/register/"]',
    ],
    validMediaSelectors: [
      // Vidio thumb
      '.gallery a.cover',
    ],
    postProcess() {
      const isDarkMode = true
      doc.documentElement.dataset.utags_darkmode = isDarkMode ? '1' : '0'
    },
    getStyle: () => styleText,
  }
})()
