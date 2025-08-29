import { $, $$ } from 'browser-extension-utils'
import styleText from 'data-text:./028-nga.cn.scss'

import defaultSite from '../default'

export default (() => {
  const prefix = location.origin + '/'

  function getUserProfileUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()
      if (/^nuke\.php\?func=ucp&uid=\d+/.test(href2)) {
        return prefix + href2.replace(/^(nuke\.php\?func=ucp&uid=\d+).*/, '$1')
      }
    }

    return undefined
  }

  return {
    matches: /bbs\.nga\.cn|nga\.178\.com|ngabbs\.com/,
    validate(element: HTMLAnchorElement) {
      const href = element.href

      if (!href.startsWith(prefix)) {
        return true
      }

      const key = getUserProfileUrl(href)
      if (key) {
        const title = element.textContent
        if (!title) {
          return false
        }

        const meta = { type: 'user', title }

        element.utags = { key, meta }
        element.dataset.utags = element.dataset.utags || ''

        return true
      }

      return false
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '.xxxxxxxxxx',
      '.xxxxxxxxxx',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      const key = getUserProfileUrl(location.href)
      if (key) {
        // user name
        const label = $(
          '#ucpuser_info_blockContent > div > span > div:nth-child(2) > div:nth-child(3) > label'
        )
        if (label) {
          const title = label.textContent.trim()
          if (title === '用 户 名') {
            const element = label.nextElementSibling as HTMLElement
            if (element) {
              const title = element.textContent.trim()
              if (title) {
                const meta = { title, type: 'user' }
                element.utags = { key, meta }
                matchedNodesSet.add(element)
              }
            }
          }
        }
      }
    },
    getStyle: () => styleText,
  }
})()
