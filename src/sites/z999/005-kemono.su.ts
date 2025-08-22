import { $, getAttribute, hasClass } from 'browser-extension-utils'
import styleText from 'data-text:./005-kemono.su.scss'

import defaultSite from '../default'

export default (() => {
  const prefix = location.origin + '/'

  function getPostUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (/^\w+\/user\/\w+\/post\/\w+/.test(href2)) {
        return prefix + href2.replace(/^(\w+\/user\/\w+\/post\/\w+).*/, '$1')
      }
    }

    return undefined
  }

  return {
    matches: /kemono\.su|kemono\.cr|coomer\.su|coomer\.st|nekohouse\.su/,
    validate(element: HTMLAnchorElement) {
      const hrefAttr = getAttribute(element, 'href')

      // Comments
      if (hrefAttr.startsWith('#')) {
        return false
      }

      const href = element.href

      if (!href.startsWith(prefix)) {
        return true
      }

      if (
        hasClass(element, 'user-card') ||
        hasClass(element, 'user-header__avatar') ||
        element.closest('.post-card')
      ) {
        element.dataset.utags = element.dataset.utags || ''
      }

      return true
    },
    validMediaSelectors: [
      '.user-header .user-header__avatar',
      '.user-header .user-header__profile',
      '.user-card',
      '.post-card__image',
      '.post-card',
    ],
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '.global-sidebar',
      '.paginator',
      '.post__nav-links',
      '.scrape__nav-links',
      '.tabs',
      '.user-header__actions',
      '.posts-board__sidebar',
      '#add-new-link',
      'a[href^="/authentication/"]',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      const key = getPostUrl(location.href)
      if (key) {
        // post title
        const element = $('h1.post__title,h1.scrape__title')
        if (element) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title, type: 'post' }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getStyle: () => styleText,
  }
})()
