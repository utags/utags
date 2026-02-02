import { $, $$, doc } from 'browser-extension-utils'
import styleText from 'data-text:./039-ruanyifeng.com.scss'
import { getTrimmedTitle } from 'utags-utils'

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from '../../modules/visited'
import type { UserTagMeta, UtagsHTMLElement } from '../../types'
import { setUtags } from '../../utils/dom-utils'

export default (() => {
  // Constants
  const CANONICAL_BASE_URL = 'https://www.ruanyifeng.com/'
  const BLOG_POST_PATTERN = /^blog\/\d{4}\/\d{2}\/[^/]+\.html/
  const BLOG_POST_EXACT_PATTERN = /^blog\/\d{4}\/\d{2}\/[^/]+\.html$/

  /**
   * Normalize URL to canonical format
   * @param url - The URL to normalize
   * @returns Normalized URL with HTTPS and www prefix
   */
  function getCanonicalUrl(url: string): string {
    // Handle ruanyifeng.com without www
    if (/^https?:\/\/ruanyifeng\.com/.test(url)) {
      return url.replace(
        /^https?:\/\/ruanyifeng\.com/,
        CANONICAL_BASE_URL.slice(0, -1)
      )
    }

    // Handle HTTP www version
    if (url.startsWith('http://www.ruanyifeng.com')) {
      return url.replace(
        'http://www.ruanyifeng.com',
        CANONICAL_BASE_URL.slice(0, -1)
      )
    }

    return url
  }

  /**
   * Extract and normalize blog post URL
   * @param url - The URL to process
   * @param exact - Whether to match exact pattern (with $ anchor)
   * @returns Normalized blog post URL or undefined if not a blog post
   */
  function getPostUrl(url: string, exact = false): string | undefined {
    const canonicalUrl = getCanonicalUrl(url)

    if (!canonicalUrl.startsWith(CANONICAL_BASE_URL)) {
      return undefined
    }

    const pathPart = canonicalUrl.slice(CANONICAL_BASE_URL.length).toLowerCase()
    const pattern = exact ? BLOG_POST_EXACT_PATTERN : BLOG_POST_PATTERN

    if (pattern.test(pathPart)) {
      // Extract clean blog post path
      const match = /^(blog\/\d{4}\/\d{2}\/[^/]+\.html)/.exec(pathPart)
      return match ? CANONICAL_BASE_URL + match[1] : undefined
    }

    return undefined
  }

  return {
    matches: /ruanyifeng\.com/,
    preProcess() {
      setVisitedAvailable(true)
    },
    listNodesSelectors: [
      // blog title
      'ul li.module-list-item',
      // related posts
      '#related_entries ul li',
    ],
    conditionNodesSelectors: [
      // blog title
      'ul li.module-list-item a',
      // related posts
      '#related_entries ul li a',
    ],
    validate(element: HTMLAnchorElement, href: string) {
      if (
        !href.startsWith(CANONICAL_BASE_URL) &&
        !href.startsWith(location.origin)
      ) {
        return true
      }

      const key = getPostUrl(href)
      if (key) {
        const title = getTrimmedTitle(element)

        if (!title) {
          return false
        }

        const meta = { title, type: 'post' }
        setUtags(element, key, meta)
        markElementWhetherVisited(key, element)

        element.dataset.utags = element.dataset.utags || ''

        return true
      }

      return true
    },
    excludeSelectors: [
      '.asset-more-link',
      '.asset-meta',
      '.comment-footer-inner',
      '#latest-comments',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<UtagsHTMLElement>) {
      const key = getPostUrl(location.href)
      if (key) {
        addVisited(key)
        const element = $('h1#page-title')
        if (element) {
          const title = getTrimmedTitle(element)
          if (title) {
            const meta = { title, type: 'post' }
            setUtags(element, key, meta)
            matchedNodesSet.add(element)
            markElementWhetherVisited(key, element)
          }
        }
      }
    },
    getStyle: () => styleText,
    getCanonicalUrl,
  }
})()
