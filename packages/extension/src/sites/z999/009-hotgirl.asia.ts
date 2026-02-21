import { $, $$, doc, setAttribute } from 'browser-extension-utils'
import styleText from 'data-text:./009-hotgirl.asia.scss'
import { getTrimmedTitle } from 'utags-utils'

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from '../../modules/visited'
import { setUtags } from '../../utils/dom-utils'
import { setUtagsAttributes } from '../../utils/index'
import defaultSite from '../default'

export default (() => {
  const prefix = 'https://hotgirl.asia/'

  function getVideoUrl(url: string, exact = false): string | undefined {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (exact) {
        if (/^videos\/[\w-]+\/?$/.test(href2)) {
          return prefix + href2.replace(/^(videos\/[\w-]+)\/?.*/, '$1/')
        }
      } else if (/^videos\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/^(videos\/[\w-]+)\/?.*/, '$1/')
      }
    }

    return undefined
  }

  return {
    matches: /hotgirl\.asia/,
    preProcess() {
      setVisitedAvailable(true)

      const href = location.href
      const key = getVideoUrl(href)
      if (key) {
        const element = $('.mvic-desc h3')
        if (element) {
          setUtagsAttributes(element, { key, type: 'video' })
          addVisited(key)
          markElementWhetherVisited(key, element)
        }
      }
    },
    listNodesSelectors: [
      // Vidio thumb
      '.vl-item',
    ],
    conditionNodesSelectors: [
      // Vidio thumb title
      '.vl-item a',
    ],
    validate(element: HTMLAnchorElement, href: string) {
      if (!href.startsWith(prefix)) {
        return true
      }

      const key = getVideoUrl(href)
      if (key) {
        const title = getTrimmedTitle(element)
        if (!title) {
          return false
        }

        const meta = { type: 'video', title }
        setUtags(element, key, meta)
        markElementWhetherVisited(key, element)
        setAttribute(element, 'data-utags', element.dataset.utags || '')
        if ($('.vli-info h2', element)) {
          element.dataset.utags_position_selector = '.vli-info h2'
        }

        return true
      }

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      'header',
      'nav',
      '#bar-player',
      '.player_nav',
      '.breadcrumb',
      // '.notices',
      // '.avatar',
      // '.p-breadcrumbs',
      // '.tabs',
      // '.structItem-pageJump',
      // '.structItem-startDate',
      // '.filterBar',
      // // Add to filter label
      // '.labelLink',
      // // Home page
      // 'h2.block-header',
      // '.button',
      // '.actionBar-action',
      // '.reactionsBar-link',
      // '.shareButtons',
      // // 帖子标题下的作者名。第一楼有作者，无需在这里再显示标签
      // '.p-description',
      // '.uix_mobileNodeTitle',
      // '[data-template="account_preferences"]',
      // 'a[href^="/login/"]',
      // 'a[href^="/logout/"]',
      // 'a[href^="/lost-password/"]',
      // 'a[href^="/online/"]',
      // 'a[href^="/direct-messages/"]',
      // 'a[href^="/account/"]',
    ],
    validMediaSelectors: [
      // Vidio thumb
      '.vl-item',
    ],
    postProcess() {
      const isDarkMode = true
      doc.documentElement.dataset.utags_darkmode = isDarkMode ? '1' : '0'
    },
    getStyle: () => styleText,
  }
})()
