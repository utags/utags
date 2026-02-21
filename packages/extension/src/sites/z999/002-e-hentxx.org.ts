import { $, $$ } from 'browser-extension-utils'
import styleText from 'data-text:./002-e-hentxx.org.scss'
import { getTrimmedTitle } from 'utags-utils'

import type { UserTagMeta, UtagsHTMLElement } from '../../types'
import { getFirstHeadElement } from '../../utils'
import { getUtags, setUtags } from '../../utils/dom-utils'
import { setUtagsAttributes } from '../../utils/index'
import defaultSite from '../default'

export default (() => {
  // eslint-disable-next-line no-restricted-globals
  const xx = atob('YWk=')
  const prefix = `https://e-hent${xx}.org/`
  const prefix2 = `https://exhent${xx}.org/`

  function getPostUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(21)
      if (/^g\/\w+/.test(href2)) {
        return prefix + href2.replace(/^(g\/\w+\/\w+\/).*/, '$1')
      }
    }

    if (url.startsWith(prefix2)) {
      const href2 = url.slice(21)
      if (/^g\/\w+/.test(href2)) {
        return prefix2 + href2.replace(/^(g\/\w+\/\w+\/).*/, '$1')
      }
    }

    return undefined
  }

  function isImageViewUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(21)
      return /^s\/\w+/.test(href2)
    }

    if (url.startsWith(prefix2)) {
      const href2 = url.slice(21)
      return /^s\/\w+/.test(href2)
    }

    return false
  }

  return {
    matches: /(e-hen|exhen)tai\.org/,
    preProcess() {
      const key = getPostUrl(location.href)
      if (key) {
        // post title
        const element = getFirstHeadElement() as UtagsHTMLElement
        if (element) {
          setUtagsAttributes(element, { key, type: 'post' })
        }
      }
    },
    validate(element: UtagsHTMLElement) {
      if (element.tagName !== 'A') {
        return true
      }

      const href = element.href
      if (href && (href.startsWith(prefix) || href.startsWith(prefix2))) {
        const key = getPostUrl(href)
        if (key) {
          const titleElement = $('.glink', element)
          let title: string | undefined
          if (titleElement) {
            title = titleElement.textContent!
          }

          const meta: UserTagMeta = { type: 'post' }
          if (title) {
            meta.title = title
          }

          setUtags(element, key, meta)
          return true
        }

        if (isImageViewUrl(href)) {
          return false
        }
      }

      return true
    },
    map(element: UtagsHTMLElement) {
      // Extened view
      const titleElement = $('.gl4e.glname .glink', element) as UtagsHTMLElement
      if (titleElement) {
        const utags = getUtags(element)
        if (utags) {
          setUtags(titleElement, utags)
        }

        titleElement.dataset.utags = titleElement.dataset.utags || ''
        titleElement.dataset.utags_node_type = 'link'
        return titleElement
      }

      return undefined
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '#nb',
      '.searchnav',
      '.gtb',
      'a[href*="report=select"]',
      'a[href*="act=expunge"]',
    ],
    getStyle: () => styleText,
  }
})()
