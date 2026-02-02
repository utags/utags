import { $, $$, hasClass } from 'browser-extension-utils'
import { getTrimmedTitle } from 'utags-utils'

import { setUtags } from '../../utils/dom-utils'
import defaultSite from '../default'

export default (() => {
  const prefix = 'https://weibo.com/'
  const prefix2 = 'https://m.weibo.cn/'

  function getCanonicalUrl(url: string) {
    if (url.startsWith(prefix) || url.startsWith(prefix2)) {
      const href2 = getUserProfileUrl(url, true)
      if (href2) {
        return href2
      }
    }

    return url
  }

  function getUserProfileUrl(url: string, exact = false) {
    if (url.startsWith(prefix) || url.startsWith(prefix2)) {
      const href2 = url.startsWith(prefix2) ? url.slice(19) : url.slice(18)
      if (exact) {
        if (/^u\/\d+(\?.*)?$/.test(href2)) {
          return prefix + href2.replace(/^(u\/\d+).*/, '$1')
        }

        if (/^profile\/\d+(\?.*)?$/.test(href2)) {
          return prefix + 'u/' + href2.replace(/^profile\/(\d+).*/, '$1')
        }

        if (/^\d+(\?.*)?$/.test(href2)) {
          return prefix + 'u/' + href2.replace(/^(\d+).*/, '$1')
        }
      } else {
        if (/^u\/\d+/.test(href2)) {
          return prefix + href2.replace(/^(u\/\d+).*/, '$1')
        }

        if (/^profile\/\d+/.test(href2)) {
          return prefix + 'u/' + href2.replace(/^profile\/(\d+).*/, '$1')
        }

        if (/^\d+/.test(href2)) {
          return prefix + 'u/' + href2.replace(/^(\d+).*/, '$1')
        }
      }
    }

    return undefined
  }

  return {
    matches: /weibo\.com|weibo\.cn/,
    validate(element: HTMLAnchorElement, href: string) {
      if (!href.includes('weibo.com') && !href.includes('weibo.cn')) {
        return true
      }

      const key = getUserProfileUrl(href, true)
      if (key) {
        const meta = { type: 'user' }
        setUtags(element, key, meta)
        if ($('.m-icon.vipicon', element)) {
          element.dataset.utags = element.dataset.utags || ''
        }

        return true
      }

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '[class^="Frame_side_"]',
      'a[href*="promote.biz.weibo.cn"]',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      const key = getUserProfileUrl(location.href)
      if (key) {
        // profile header
        const element = $(
          '[class^="ProfileHeader_name_"],.profile-cover .mod-fil-name .txt-shadow'
        )
        if (element) {
          const title = getTrimmedTitle(element)
          if (title) {
            const meta = { title, type: 'user' }
            setUtags(element, key, meta)
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getCanonicalUrl,
  }
})()
