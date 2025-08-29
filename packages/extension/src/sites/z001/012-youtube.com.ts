import { $, $$, getAttribute } from 'browser-extension-utils'
import styleText from 'data-text:./012-youtube.com.scss'

import defaultSite from '../default'

export default (() => {
  const prefix = 'https://www.youtube.com/'
  const prefix2 = 'https://m.youtube.com/'

  function getUserProfileUrl(href: string) {
    if (href.startsWith(prefix) || href.startsWith(prefix2)) {
      const href2 = href.startsWith(prefix2) ? href.slice(22) : href.slice(24)
      if (/^@[\w-]+/.test(href2)) {
        return prefix + href2.replace(/(^@[\w-]+).*/, '$1')
      }

      if (/^channel\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/(^channel\/[\w-]+).*/, '$1')
      }
    }

    return undefined
  }

  function getVideoUrl(href: string) {
    if (href.startsWith(prefix) || href.startsWith(prefix2)) {
      const href2 = href.startsWith(prefix2) ? href.slice(22) : href.slice(24)
      if (href2.includes('&lc=')) {
        return undefined
      }

      if (/^watch\?v=[\w-]+/.test(href2)) {
        return prefix + href2.replace(/(watch\?v=[\w-]+).*/, '$1')
      }

      if (/^shorts\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/(^shorts\/[\w-]+).*/, '$1')
      }
    }

    return undefined
  }

  return {
    matches: /youtube\.com/,
    validate(element: HTMLAnchorElement) {
      const hrefAttr = getAttribute(element, 'href')
      if (!hrefAttr || hrefAttr === 'null' || hrefAttr === '#') {
        return false
      }

      const href = element.href
      if (href.startsWith(prefix) || href.startsWith(prefix2)) {
        const pathname = element.pathname
        if (/^\/@[\w-]+$/.test(pathname)) {
          // console.log(pathname)

          const key = prefix + pathname.slice(1)
          const meta = { type: 'user' }
          element.utags = { key, meta }

          return true
        }

        if (/^\/channel\/[\w-]+$/.test(pathname)) {
          // console.log(pathname, element)

          const key = prefix + pathname.slice(1)
          const meta = { type: 'channel' }
          element.utags = { key, meta }

          return true
        }

        const key = getVideoUrl(href)
        if (key) {
          let title: string | undefined
          const titleElement = $('#video-title', element)
          if (titleElement) {
            title = titleElement.textContent!
          }

          const meta = title ? { title, type: 'video' } : { type: 'video' }
          element.utags = { key, meta }

          return true
        }
      }

      return false
    },
    excludeSelectors: [...defaultSite.excludeSelectors],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      let key = getUserProfileUrl(location.href)
      if (key) {
        // profile header
        const element = $(
          '#inner-header-container #container.ytd-channel-name #text'
        )
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }

      key = getVideoUrl(location.href)
      if (key) {
        // video title or shorts title
        const element = $(
          '#title h1.ytd-watch-metadata,ytd-reel-video-renderer[is-active] h2.title'
        )
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: 'video' }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getStyle: () => styleText,
  }
})()
