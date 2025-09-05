import { $$ } from 'browser-extension-utils'
import styleText from 'data-text:./030-keylol.com.scss'

import { setUtags } from '../../utils/dom-utils'
import defaultSite from '../default'

export default (() => {
  const prefix = location.origin + '/'

  function getUserProfileUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()
      if (exact) {
        // https://keylol.com/?1234567
        if (/^\?\d+(#.*)?$/.test(href2)) {
          return (
            prefix + href2.replace(/^\?(\d+).*/, 'home.php?mod=space&uid=$1')
          )
        }

        // https://keylol.com/suid-1234567
        if (/^suid-\d+(#.*)?$/.test(href2)) {
          return (
            prefix + href2.replace(/^suid-(\d+).*/, 'home.php?mod=space&uid=$1')
          )
        }

        // https://keylol.com/home.php?mod=space&uid=234567
        if (/^home\.php\?mod=space&uid=\d+(#.*)?$/.test(href2)) {
          return (
            prefix +
            href2.replace(
              /^home\.php\?mod=space&uid=(\d+).*/,
              'home.php?mod=space&uid=$1'
            )
          )
        }
      } else if (/^u\/[\w.-]+/.test(href2)) {
        return prefix + href2.replace(/^(u\/[\w.-]+).*/, '$1')
      }
    }

    return undefined
  }

  return {
    // Discuz
    matches: /keylol\.com/,
    validate(element: HTMLAnchorElement) {
      const href = element.href

      if (!href.startsWith(prefix)) {
        return true
      }

      const key = getUserProfileUrl(href, true)
      if (key) {
        const title = element.textContent
        if (!title) {
          return false
        }

        const meta = { type: 'user', title }

        setUtags(element, key, meta)
        element.dataset.utags = element.dataset.utags || ''
        return true
      }

      return false
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      'nav',
      'header',
      '#pgt',
      '#fd_page_bottom',
      '#visitedforums',
      '#pt',
    ],
    getStyle: () => styleText,
  }
})()
