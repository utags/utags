import { $, $$ } from 'browser-extension-utils'
import styleText from 'data-text:./014-tiktok.com.scss'
import { getTrimmedTitle } from 'utags-utils'

import { setUtags } from '../../utils/dom-utils'
import { setUtagsAttributes } from '../../utils/index'
import defaultSite from '../default'

export default (() => {
  const prefix = 'https://www.tiktok.com/'

  function getUserProfileUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(23)
      if (exact) {
        if (/^@[\w.-]+([?#].*)?$/.test(href2)) {
          return prefix + href2.replace(/(^@[\w.-]+).*/, '$1')
        }
      } else if (/^@[\w.-]+/.test(href2)) {
        return prefix + href2.replace(/(^@[\w.-]+).*/, '$1')
      }
    }

    return undefined
  }

  return {
    matches: /tiktok\.com/,
    preProcess() {
      // profile header
      const element = $('h1[data-e2e="user-title"]')
      if (element) {
        const title = getTrimmedTitle(element)
        const key = getUserProfileUrl(location.href)
        if (title && key) {
          setUtagsAttributes(element, { key, type: 'user' })
        }
      }
    },
    listNodesSelectors: [
      '.css-ulyotp-DivCommentContentContainer',
      '.css-1gstnae-DivCommentItemWrapper',
      '.css-x6y88p-DivItemContainerV2',
    ],
    conditionNodesSelectors: [
      '.css-ulyotp-DivCommentContentContainer a[href^="/@"]',
      '.css-1gstnae-DivCommentItemWrapper a[href^="/@"]',
      '.css-x6y88p-DivItemContainerV2 a[href^="/@"]',
    ],
    validate(element: HTMLAnchorElement, href: string) {
      if (!href.startsWith(prefix)) {
        return true
      }

      const key = getUserProfileUrl(href, true)
      if (key) {
        const titleElement = $('h3,[data-e2e="browse-username"]', element)
        const title = getTrimmedTitle(titleElement || element)

        if (!title) {
          return false
        }

        const meta = { type: 'user', title }

        setUtags(element, key, meta)
        // element.dataset.utags = element.dataset.utags || ""

        return true
      }

      return false
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '.avatar-anchor',
      '[data-e2e*="avatar"]',
      '[data-e2e="user-card-nickname"]',
    ],
    validMediaSelectors: [
      '[data-e2e="browse-bluev"]',
      '[data-e2e="recommend-card"]',
    ],
    getStyle: () => styleText,
  }
})()
