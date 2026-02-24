import { $, $$, doc, setAttribute } from 'browser-extension-utils'
import styleText from 'data-text:./011-hito99mi.la.scss'
import { getTrimmedTitle } from 'utags-utils'

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from '../../modules/visited'
import { xmxi } from '../../utils/atob'
import { setUtags } from '../../utils/dom-utils'
import { setUtagsAttributes } from '../../utils/index'
import defaultSite from '../default'

export default (() => {
  const prefix = `https://hito${xmxi}.la/`
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

      // https://hitomi.la/imageset/%E7%A5%9E%E5%A5%87%E7%81%AB%E9%9B%9E-%E6%97%A5%E6%9C%AC%E8%AA%9E-3767194.html
      // https://hitomi.la/doujinshi/adventurous-affair-english-3767175.html
      // ->
      // https://hitomi.la/imageset/3767194.html
      // https://hitomi.la/doujinshi/3767175.html
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
          setUtagsAttributes(element, { key, type: 'gallery' })
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
    validate(element: HTMLAnchorElement, href: string) {
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
        setAttribute(element, 'data-utags', element.dataset.utags || '')

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
