import { $, $$, hasClass } from 'browser-extension-utils'
import styleText from 'data-text:./021-douyin.com.scss'
import { getTrimmedTitle } from 'utags-utils'

import {
  extractTrimmedTextWithImageAlt,
  getFirstHeadElement,
} from '../../utils'
import { setUtags } from '../../utils/dom-utils'
import defaultSite from '../default'

export default (() => {
  const prefix = 'https://www.douyin.com/'

  function getUserProfileUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(23)
      if (exact) {
        if (/^user\/[\w-]+(\?.*)?$/.test(href2)) {
          return prefix + href2.replace(/^(user\/[\w-]+).*/, '$1')
        }
      } else if (/^user\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/^(user\/[\w-]+).*/, '$1')
      }
    }

    return undefined
  }

  function getVideoUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(23)
      if (/^video\/\w+/.test(href2)) {
        return prefix + href2.replace(/^(video\/\w+).*/, '$1')
      }
    }

    return undefined
  }

  function getNoteUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(23)
      if (/^note\/\w+/.test(href2)) {
        return prefix + href2.replace(/^(note\/\w+).*/, '$1')
      }
    }

    return undefined
  }

  return {
    matches: /www\.douyin\.com/,
    listNodesSelectors: [
      // 视频评论区
      '[data-e2e="comment-item"]',
    ],
    conditionNodesSelectors: [
      // 视频评论区 > 用户名
      '[data-e2e="comment-item"] .comment-item-info-wrap a',
    ],
    validate(element: HTMLAnchorElement, href: string) {
      if (!href.includes('www.douyin.com')) {
        return true
      }

      let key = getUserProfileUrl(href, true)
      if (key) {
        const title = extractTrimmedTextWithImageAlt(element)
        if (!title) {
          return false
        }

        const meta = { type: 'user', title }
        setUtags(element, key, meta)
        return true
      }

      key = getVideoUrl(href)
      if (key) {
        const meta = { type: 'video' }
        setUtags(element, key, meta)
        return true
      }

      key = getNoteUrl(href)
      if (key) {
        const meta = { type: 'post' }
        setUtags(element, key, meta)
        return true
      }

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '[data-e2e="douyin-navigation"]',
    ],
    validMediaSelectors: [
      // 昵称中的 emoji 图片
      'img[src*="twemoji"]',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      let key = getUserProfileUrl(location.href)
      if (key) {
        // profile header
        const element = getFirstHeadElement('h1')
        if (element) {
          const title = extractTrimmedTextWithImageAlt(element)
          if (title) {
            const meta = { title, type: 'user' }
            setUtags(element, key, meta)
            matchedNodesSet.add(element)
          }
        }
      }

      key = getVideoUrl(location.href)
      if (key) {
        // post title
        const element = getFirstHeadElement('h1')
        if (element) {
          const title = getTrimmedTitle(element)
          const target = element.parentElement!.parentElement!
          if (title) {
            const meta = { title, type: 'video' }
            setUtags(target, key, meta)
            target.dataset.utags_node_type = 'link'
            matchedNodesSet.add(target)
          }
        }
      }

      key = getNoteUrl(location.href)
      if (key) {
        // post title
        const element = getFirstHeadElement('h1')
        if (element) {
          const title = getTrimmedTitle(element)
          if (title) {
            const meta = { title, type: 'post' }
            setUtags(element, key, meta)
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getStyle: () => styleText,
  }
})()
