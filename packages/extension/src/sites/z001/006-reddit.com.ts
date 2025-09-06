import { $, $$ } from 'browser-extension-utils'
import styleText from 'data-text:./006-reddit.com.scss'
import { getTrimmedTitle } from 'utags-utils'

import { createTimeout } from '../../modules/timer-manager'
import { setUtags } from '../../utils/dom-utils'
import defaultSite from '../default'

export default (() => {
  const prefix = 'https://www.reddit.com/'

  function getCanonicalUrl(url: string) {
    if (url.startsWith(prefix)) {
      let href2 = getUserProfileUrl(url, true)
      if (href2) {
        return href2
      }

      href2 = getCommunityUrl(url, true)
      if (href2) {
        return href2
      }

      href2 = getCommentsUrl(url, true)
      if (href2) {
        return href2
      }
    }

    return url
  }

  function getUserProfileUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (exact) {
        if (/^(user|u)\/[\w-]+\/?([?#].*)?$/.test(href2)) {
          return (
            prefix +
            'user/' +
            href2.replace(/^(user|u)\/([\w-]+).*/, '$2') +
            '/'
          )
        }
      } else if (/^(user|u)\/[\w-]+/.test(href2)) {
        return (
          prefix + 'user/' + href2.replace(/^(user|u)\/([\w-]+).*/, '$2') + '/'
        )
      }
    }

    return undefined
  }

  function getCommunityUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (exact) {
        if (/^r\/\w+\/?(#.*)?$/.test(href2)) {
          return prefix + href2.replace(/^(r\/\w+).*/, '$1') + '/'
        }
      } else if (/^r\/\w+/.test(href2)) {
        return prefix + href2.replace(/^(r\/\w+).*/, '$1') + '/'
      }
    }

    return undefined
  }

  function getCommentsUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (exact) {
        if (/^(r\/\w+\/comments\/\w+(\/([^/]*\/?)?)?)$/.test(href2)) {
          return (
            prefix +
            href2.replace(/^(r\/\w+\/comments\/\w+(\/([^/]*)?)?).*/, '$1') +
            '/'
          )
        }
      } else if (/^(r\/\w+\/comments\/\w+(\/([^/]*)?)?).*/.test(href2)) {
        return (
          prefix +
          href2.replace(/^(r\/\w+\/comments\/\w+(\/([^/]*)?)?).*/, '$1') +
          '/'
        )
      }
    }

    return undefined
  }

  return {
    matches: /reddit\.com/,
    listNodesSelectors: [
      'shreddit-feed article',
      'shreddit-feed shreddit-ad-post',
      'shreddit-comment',
      'shreddit-comment-tree-ad',
      'shreddit-comments-page-ad',
    ],
    conditionNodesSelectors: [
      'shreddit-feed article a[data-testid="subreddit-name"]',
      'shreddit-feed article a[slot="title"]',
      'shreddit-feed article [slot="authorName"] a',
      'shreddit-feed shreddit-ad-post a',
      'shreddit-comment faceplate-hovercard a',
      'shreddit-comment [noun="comment_author"] a',
      // Promoted
      'shreddit-comment-tree-ad .promoted-name-container a',
      'shreddit-comments-page-ad .promoted-name-container a',
    ],
    validate(element: HTMLAnchorElement) {
      const href = element.href
      if (!href.startsWith(prefix)) {
        return true
      }

      if ($('time,faceplate-number', element)) {
        return false
      }

      let key = getUserProfileUrl(href, true)
      if (key) {
        const title = getTrimmedTitle(element)
        if (!title) {
          return false
        }

        const meta = { type: 'user', title }

        setUtags(element, key, meta)
        element.dataset.utags = element.dataset.utags || ''

        return true
      }

      key = getCommunityUrl(href, true)
      if (key) {
        const title = getTrimmedTitle(element)
        if (!title) {
          return false
        }

        const meta = { type: 'community', title }

        setUtags(element, key, meta)
        element.dataset.utags = element.dataset.utags || ''

        return true
      }

      key = getCommentsUrl(href, true)
      if (key) {
        const title = getTrimmedTitle(element)
        if (!title) {
          return false
        }

        const meta = { type: 'comments', title }

        setUtags(element, key, meta)
        element.dataset.utags = element.dataset.utags || ''

        return true
      }

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      'a[data-testid="comment_author_icon"]',
      '#shreddit-skip-link',
      // text body of discussion in the list
      'a[slot="text-body"]',
      'a[slot="full-post-link"]',
      '[slot="post-media-container"] a.inset-0',
      '[bundlename="shreddit_sort_dropdown"]',
      '[slot="tabs"]',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      // profile header
      let element = $('[data-testid="profile-main"] .w-full p')
      if (element) {
        const title = getTrimmedTitle(element)
        const key = getUserProfileUrl(location.href)
        if (title && key) {
          const meta = { title, type: 'user' }
          setUtags(element, key, meta)
          matchedNodesSet.add(element)
        }
      }

      element = $('.w-full h1')
      if (element) {
        const title = getTrimmedTitle(element)
        const key = getCommunityUrl(location.href)
        if (title && key) {
          const meta = { title, type: 'community' }
          setUtags(element, key, meta)
          matchedNodesSet.add(element)
        }
      }

      element = $('h1[slot="title"]')
      if (element) {
        const title = getTrimmedTitle(element)
        const key = getCommentsUrl(location.href, true)
        if (title && key) {
          const meta = { title, type: 'comments' }
          setUtags(element, key, meta)
          matchedNodesSet.add(element)
        }
      }
    },
    getStyle: () => styleText,
    postProcess() {
      createTimeout(() => {
        for (const element of $$(`[data-utags_list_node*=",hide,"],
    [data-utags_list_node*=",隐藏,"],
    [data-utags_list_node*=",屏蔽,"],
    [data-utags_list_node*=",不再显示,"],
    [data-utags_list_node*=",block,"]`)) {
          element.setAttribute('collapsed', '')
        }
      }, 1000)
    },
    getCanonicalUrl,
  }
})()
