import {
  $,
  $$,
  getAttribute,
  hasClass,
  setAttribute,
} from 'browser-extension-utils'
import styleText from 'data-text:./005-kemono.su.scss'
import { getTrimmedTitle } from 'utags-utils'

import { setUtags } from '../../utils/dom-utils'
import { getHrefAttribute, setUtagsAttributes } from '../../utils/index'
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
    preProcess() {
      // Posts > search
      // Posts > popular
      for (const element of $$('.post-card[data-user]')) {
        const service = getAttribute(element, 'data-service')
        const user = getAttribute(element, 'data-user')
        if (service && user) {
          const href = `${prefix}${service}/user/${user}`
          if (location.href !== href) {
            setUtagsAttributes(element, { key: href, type: 'user' })
          }
        }
      }

      const key = getPostUrl(location.href)
      if (key) {
        // post title
        const element = $('h1.post__title,h1.scrape__title')
        if (element) {
          setUtagsAttributes(element, { key, type: 'post' })
        }
      }
    },
    listNodesSelectors: [
      // Artists
      '.card-list__items > a.user-card',
      '.post-card',
    ],
    conditionNodesSelectors: [
      // Artists
      '.card-list__items > a.user-card',
      '.post-card a',
      // post card with user id
      '.post-card[data-user]',
    ],
    validate(element: HTMLAnchorElement, href: string) {
      const hrefAttr = getHrefAttribute(element)

      // Comments
      if (!hrefAttr || hrefAttr.startsWith('#')) {
        return false
      }

      if (!href.startsWith(prefix)) {
        return true
      }

      if (
        hasClass(element, 'user-card') ||
        hasClass(element, 'user-header__avatar') ||
        element.closest('.post-card')
      ) {
        setAttribute(element, 'data-utags', element.dataset.utags || '')
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
      '.paginator small',
      '.paginator menu',
      '.paginator [aria-current="page"]',
      '.post__nav-links',
      '.scrape__nav-links',
      '.tabs',
      '.user-header__actions',
      '.posts-board__sidebar',
      '#add-new-link',
      'a[href^="/authentication/"]',
      '#announcement-banner',
    ],
    getStyle: () => styleText,
  }
})()
