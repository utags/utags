import { $, $$ } from 'browser-extension-utils'
import { getTrimmedTitle } from 'utags-utils'

import { setUtags } from '../../utils/dom-utils'
import defaultSite from '../default'

export default (() => {
  const prefix = 'https://www.zhihu.com/'

  function getUserProfileUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(22)
      if (exact) {
        if (/^people\/[\w-]+(\?.*)?$/.test(href2)) {
          return prefix + href2.replace(/^(people\/[\w-]+).*/, '$1')
        }
      } else if (/^people\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/^(people\/[\w-]+).*/, '$1')
      }
    }

    return undefined
  }

  return {
    matches: /zhihu\.com/,
    validate(element: HTMLAnchorElement) {
      if ($('.avatar', element)) {
        return false
      }

      const href = element.href

      if (!href.includes('zhihu.com')) {
        return true
      }

      if (href.startsWith(prefix + 'people/')) {
        const key = getUserProfileUrl(href, true)
        if (key) {
          const titleElement = $('.name', element)
          let title: string | undefined
          if (titleElement) {
            title = titleElement.textContent!
          }

          const meta = { type: 'user' }
          if (title) {
            meta.title = title
          }

          setUtags(element, key, meta)
          // element.dataset.utags = element.dataset.utags || ""

          return true
        }
      }

      return false
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '.NumberBoard',
      '.ProfileMain-tabs',
      '.Profile-lightList',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      const key = getUserProfileUrl(location.href)
      if (key) {
        // profile header
        const element = $('h1.ProfileHeader-title .ProfileHeader-name')
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
  }
})()
