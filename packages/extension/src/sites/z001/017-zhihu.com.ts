import { $, $$ } from 'browser-extension-utils'
import styleText from 'data-text:./017-zhihu.com.scss'
import { getTrimmedTitle } from 'utags-utils'

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from '../../modules/visited'
import { setUtags } from '../../utils/dom-utils'
import { getUrlParameters } from '../../utils/index'
import defaultSite from '../default'

export default (() => {
  const prefix = 'https://www.zhihu.com/'
  const prefix2 = 'https://zhuanlan.zhihu.com/'

  function getCanonicalUrl(url: string) {
    // url = deleteUrlParameters(url, '*')
    if (url.startsWith('https://link.zhihu.com/')) {
      const params = getUrlParameters(url, ['target'])
      if (params.target) {
        try {
          url = decodeURIComponent(params.target)
          return { url, domainChanged: true }
        } catch {}
      }

      return url
    }

    if (url.startsWith(prefix)) {
      const href2 = getUserProfileUrl(url, true)
      if (href2) {
        return href2
      }
    }

    if (url.startsWith(prefix2)) {
      const href2 = getPostUrl(url, true)
      if (href2) {
        return href2
      }
    }

    return url
  }

  function getPostUrl(url: string, exact = false) {
    if (url.startsWith(prefix2)) {
      const href2 = url.slice(prefix2.length)
      if (exact) {
        if (/^p\/\d+(\?.*)?$/.test(href2)) {
          return prefix2 + href2.replace(/^(p\/\d+).*/, '$1')
        }
      } else if (/^p\/\d+/.test(href2)) {
        return prefix2 + href2.replace(/^(p\/\d+).*/, '$1')
      }
    }

    return undefined
  }

  function getUserProfileUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(22)
      if (exact) {
        if (/^(?:people|org)\/[\w-]+(\?.*)?$/.test(href2)) {
          return prefix + href2.replace(/^((?:people|org)\/[\w-]+).*/, '$1')
        }
      } else if (/^(?:people|org)\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/^((?:people|org)\/[\w-]+).*/, '$1')
      }
    }

    return undefined
  }

  return {
    matches: /zhihu\.com/,
    validate(element: HTMLAnchorElement, href: string) {
      if ($('.avatar', element)) {
        return false
      }

      if (
        !href.includes('zhihu.com') ||
        href.startsWith('https://link.zhihu.com/')
      ) {
        return true
      }

      let key = getUserProfileUrl(href, true)
      if (key) {
        const titleElement = $('.name', element)
        let title: string | undefined
        if (titleElement) {
          title = titleElement.textContent!
        }

        const meta: Record<string, any> = { type: 'user' }
        if (title) {
          meta.title = title
        }

        setUtags(element, key, meta)
        // element.dataset.utags = element.dataset.utags || ""

        return true
      }

      key = getPostUrl(href)
      if (key) {
        const titleElement = $('h1.PostItem-Title,.LinkCard-title', element)
        const title = getTrimmedTitle(titleElement || element)
        if (!title) {
          return false
        }

        const meta = { type: 'post', title }
        setUtags(element, key, meta)
        markElementWhetherVisited(key, element)
        setAttribute(element, 'data-utags', element.dataset.utags || '')

        return true
      }

      if (href.startsWith(prefix)) {
        const href2 = href.slice(prefix.length)
        if (/^(question|collection|column)\//.test(href2)) {
          const titleElement = $('h1.PostItem-Title,.LinkCard-title', element)
          const title = getTrimmedTitle(titleElement || element)
          if (!title) {
            return false
          }

          const meta = { title }
          setUtags(element, '', meta)

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
      '.QuestionMainAction',
      '.ContentItem-time',
    ],
    validMediaSelectors: [
      // post card
      'a.LinkCard',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      let key = getPostUrl(location.href)
      if (key) {
        addVisited(key)
        const element = $('h1.Post-Title')
        if (element) {
          const title = getTrimmedTitle(element)
          if (title) {
            const meta = { title, type: 'post' }
            setUtags(element, key, meta)
            element.dataset.utags_node_type = 'link'
            matchedNodesSet.add(element)
            markElementWhetherVisited(key, element)
          }
        }
      }

      key = getUserProfileUrl(location.href)
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
    getStyle: () => styleText,
    getCanonicalUrl,
  }
})()
