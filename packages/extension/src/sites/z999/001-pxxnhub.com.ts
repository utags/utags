import { $, $$, getAttribute } from 'browser-extension-utils'
import styleText from 'data-text:./001-pxxnhub.com.scss'

import defaultSite from '../default'

export default (() => {
  // 'or'
  // eslint-disable-next-line no-restricted-globals
  const xx = atob('b3I=')
  // magix to define pxxnhub.com
  const hostname = `p${xx}nhub.com`
  const prefix = `https://www.${hostname}/`

  function getUserProfileUrl(href: string, exact = false) {
    if (href.includes(hostname)) {
      const index = href.indexOf(hostname) + 12
      const href2 = href.slice(index)

      if (exact) {
        if (/^(model|users)\/[\w-]+(\?.*)?$/.test(href2)) {
          return prefix + href2.replace(/(^(model|users)\/[\w-]+).*/, '$1')
        }
      } else if (/^(model|users)\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/(^(model|users)\/[\w-]+).*/, '$1')
      }
    }

    return undefined
  }

  function getChannelUrl(href: string, exact = false) {
    if (href.includes(hostname)) {
      const index = href.indexOf(hostname) + 12
      const href2 = href.slice(index)

      if (exact) {
        if (/^channels\/[\w-]+(\?.*)?$/.test(href2)) {
          return prefix + href2.replace(/(^channels\/[\w-]+).*/, '$1')
        }
      } else if (/^channels\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/(^channels\/[\w-]+).*/, '$1')
      }
    }

    return undefined
  }

  function getVideoUrl(href: string) {
    if (href.includes(hostname)) {
      const index = href.indexOf(hostname) + 12
      const href2 = href.slice(index)

      if (/^view_video.php\?viewkey=\w+/.test(href2)) {
        return prefix + href2.replace(/(view_video.php\?viewkey=\w+).*/, '$1')
      }
    }

    return undefined
  }

  return {
    // magix to match pxxnhub.com
    matches: /p[ro_][r_]nhub\.com/,
    validate(element: HTMLAnchorElement) {
      const hrefAttr = getAttribute(element, 'href')
      if (!hrefAttr || hrefAttr === 'null' || hrefAttr === '#') {
        return false
      }

      const href = element.href

      let key = getChannelUrl(href, true)
      if (key) {
        const meta = { type: 'channel' }
        element.utags = { key, meta }
        return true
      }

      key = getUserProfileUrl(href, true)
      if (key) {
        const meta = { type: 'user' }
        element.utags = { key, meta }
        return true
      }

      key = getVideoUrl(href)
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

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '.networkBarWrapper',
      '#headerWrapper',
      '#headerMenuContainer',
      '#mainMenuProfile',
      '#mainMenuAmateurModelProfile',
      '#countryRedirectMessage',
      'aside#leftMenu',
      '.profileSubNav',
      '.subFilterList',
      '.greyButton',
      '.orangeButton',
      `${xx}xxxxx`,
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      let key = getUserProfileUrl(location.href)
      if (key) {
        // profile header
        const element = $('.name h1')
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: 'user' }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }

      key = getChannelUrl(location.href)
      if (key) {
        // video title or shorts title
        const element = $('.title h1')
        if (element && !$('a', element)) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: 'channel' }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }

      key = getVideoUrl(location.href)
      if (key) {
        // video title or shorts title
        const element = $('h1.title')
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
