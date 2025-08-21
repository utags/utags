import { $, $$, hasClass } from 'browser-extension-utils'
import styleText from 'data-text:./018-xiaohongshu.com.scss'

import defaultSite from '../default'

export default (() => {
  const prefix = 'https://www.xiaohongshu.com/'

  function getCanonicalUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      // https://www.xiaohongshu.com/search_result?keyword=abcd&type=54&source=web_note_detail_r10
      if (href2.startsWith('search_result') && href2.includes('keyword')) {
        return (
          prefix +
          'search_result/?' +
          href2.replace(/.*?(keyword=[^&]*).*/, '$1') +
          '&type=54'
        )
      }
    }

    return url
  }

  function getUserProfileUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(28)
      if (exact) {
        if (/^user\/profile\/\w+(\?.*)?$/.test(href2)) {
          return prefix + href2.replace(/^(user\/profile\/\w+).*/, '$1')
        }
      } else if (/^user\/profile\/\w+/.test(href2)) {
        return prefix + href2.replace(/^(user\/profile\/\w+).*/, '$1')
      }
    }

    return undefined
  }

  // 2024年开始小红书需要 xsec_token 参数才可以访问。目前先只打标签，无法访问的问题日后通过其他方式实现可访问。比如破解参数生成，或通过中转站。
  function getPostUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(28)
      if (/^explore\/\w+/.test(href2)) {
        return prefix + href2.replace(/^(explore\/\w+).*/, '$1')
      }

      if (/^user\/profile\/\w+\/\w+/.test(href2)) {
        return (
          prefix +
          'explore/' +
          href2.replace(/^user\/profile\/\w+\/(\w+).*/, '$1')
        )
      }

      if (/^search_result\/\w+/.test(href2)) {
        return (
          prefix + 'explore/' + href2.replace(/^search_result\/(\w+).*/, '$1')
        )
      }
    }

    return undefined
  }

  return {
    matches: /www\.xiaohongshu\.com/,
    listNodesSelectors: [
      '.feeds-container section',
      // replies
      '.comment-item',
    ],
    conditionNodesSelectors: [
      // author
      '.feeds-container section .author-wrapper .author',
      '.feeds-container section .cover',
      // replies
      '.comment-item .author-wrapper .author a',
    ],
    validate(element: HTMLAnchorElement) {
      const href = element.href

      if (!href.startsWith(prefix)) {
        return true
      }

      let key = getUserProfileUrl(href, true)
      if (key) {
        const titleElement =
          (hasClass(element, 'name') ? element : $('.name', element)) || element
        let title: string | undefined
        if (titleElement) {
          title = titleElement.textContent!.trim()
        }

        if (!title) {
          return false
        }

        const meta = { type: 'user', title }
        element.utags = { key, meta }
        element.dataset.utags = element.dataset.utags || ''

        return true
      }

      key = getPostUrl(href)
      if (key) {
        const meta = { type: 'post' }

        if (hasClass(element, 'cover')) {
          const sibling = element.nextElementSibling as HTMLElement
          if (sibling && hasClass(sibling, 'footer')) {
            const titleElement = $('.title span', sibling)
            if (titleElement) {
              const title = titleElement.textContent!.trim()
              if (title) {
                meta.title = title
              }
            }

            // 没有标题的笔记
            element.dataset.utags = element.dataset.utags || ''
          }
        }

        element.utags = { key, meta }
        return true
      }

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '.side-bar',
      '.dropdown-nav',
      '.dropdown-container',
      '.interaction-info',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      let key = getUserProfileUrl(location.href)
      if (key) {
        // profile header
        const element = $('.user-info .user-name')
        if (element) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title, type: 'user' }
            element.utags = { key, meta }
            element.dataset.utags_node_type = 'link'
            matchedNodesSet.add(element)
          }
        }
      }

      key = getPostUrl(location.href)
      if (key) {
        // post title
        const element = $('.note-content .title')
        if (element) {
          const title = element.textContent!.trim()
          if (title) {
            const meta = { title, type: 'post' }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getCanonicalUrl,
    getStyle: () => styleText,
  }
})()
