import { $, $$, doc } from 'browser-extension-utils'
import styleText from 'data-text:./012-misskon.com.scss'
import { getTrimmedTitle } from 'utags-utils'

import { addVisited, setVisitedAvailable } from '../../modules/visited'
import { setUtagsAttributes } from '../../utils/index'
import defaultSite from '../default'

// Wordpress site
export default (() => {
  const prefix = `https://misskon.com/`

  function getCanonicalUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = getCategoryUrl(url)
      if (href2) {
        return href2
      }
    }

    return url
  }

  function getCategoryUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (/^tag\/[^/?#]+/.test(href2)) {
        // /tag/abc -> /tag/abc/
        return prefix + href2.replace(/^(tag\/[^/?#]+).*/, '$1') + '/'
      }
    }

    return undefined
  }

  return {
    matches: /misskon\.com/,
    preProcess() {
      setVisitedAvailable(true)

      {
        const key = location.href
        // Post page
        const element = $('article.post h1.post-title.entry-title')
        if (element) {
          setUtagsAttributes(element, { key, type: 'post' })
          addVisited(key)
        }
      }

      {
        const key = getCategoryUrl(location.href)
        if (key) {
          // Tag page
          const element = $('.content .page-head h1.page-title')
          if (element) {
            setUtagsAttributes(element, { key, type: 'tag' })
          }
        }
      }

      {
        // Aside > Don’t miss out
        const elements = $$(
          'aside .widget-container > .post-thumbnail a'
        ) as HTMLAnchorElement[]
        for (const element of elements) {
          // Set title for thumbnail to prevent excluded
          const title = getTrimmedTitle(element) || element.title
          const key = element.href
          if (title && key) {
            setUtagsAttributes(element, { key, title, type: 'post' })
          }
        }
      }
    },
    listNodesSelectors: [
      // Posts
      'article.item-list',
      // Aside > Don’t miss out
      'aside .widget-container > .post-thumbnail',
      // Aside > Don’t miss out
      'aside .widget-container > .post-thumbnail + h3',
      // Aside > Recent posts
      'aside .widget-container li',
      // Post page > View more
      '.yarpp a.yarpp-thumbnail',
    ],
    conditionNodesSelectors: [
      // Posts > tag
      'article.item-list .post-box-title a',
      // Posts > tag
      'article.item-list a[rel="tag"]',
      // Aside > Don’t miss out
      'aside .widget-container > .post-thumbnail a',
      // Aside > Don’t miss out
      'aside .widget-container > .post-thumbnail + h3 a',
      // Aside > Recent posts
      'aside .widget-container li h3 a',
      // Post page > View more
      '.yarpp a.yarpp-thumbnail .yarpp-thumbnail-title',
    ],
    validate(element: HTMLAnchorElement, href: string) {
      if (!href.startsWith(prefix)) {
        return true
      }

      if (element.matches('a.yarpp-thumbnail')) {
        const targetElement = $('.yarpp-thumbnail-title', element)
        if (targetElement && targetElement !== element) {
          setUtagsAttributes(targetElement, { key: href })
          return false
        }
      }

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      'header',
      '.page-link',
      '.pagination',
      '.post-meta .post-comments',
      '.shortc-button',
      '.calendar_wrap',
    ],
    validMediaSelectors: [
      // Aside > Don’t miss out
      'aside .widget-container > .post-thumbnail a img',
    ],
    postProcess() {
      const isDarkMode = false
      doc.documentElement.dataset.utags_darkmode = isDarkMode ? '1' : '0'
    },
    getStyle: () => styleText,
    getCanonicalUrl,
  }
})()
