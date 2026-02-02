import { getSettingsValue } from 'browser-extension-settings'
import { $, $$, createHTML, getAttribute } from 'browser-extension-utils'
import styleText from 'data-text:./001-pxxnhub.com.scss'
import { getTrimmedTitle } from 'utags-utils'

import { getStarIconSvg } from '../../modules/star-icon'
import { getBookmark } from '../../storage/bookmarks'
import type { UserTagMeta } from '../../types'
import { containsStarRatingTag, removeStarRatingTags } from '../../utils'
import { setUtags } from '../../utils/dom-utils'
import defaultSite from '../default'

export default (() => {
  // 'or'
  // eslint-disable-next-line no-restricted-globals
  const xx = atob('b3I=')
  // magix to define pxxnhub.com
  const hostname = `p${xx}nhub.com`
  const prefix = `https://www.${hostname}/`

  function getUserProfileUrl(href: string, exact = false) {
    if (href.includes(hostname)) {
      const index = href.indexOf(hostname) + 12
      const href2 = href.slice(index)

      if (exact) {
        if (/^(model|users)\/[\w-]+(\?.*)?$/.test(href2)) {
          return prefix + href2.replace(/(^(model|users)\/[\w-]+).*/, '$1')
        }
      } else if (/^(model|users)\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/(^(model|users)\/[\w-]+).*/, '$1')
      }
    }

    return undefined
  }

  function getChannelUrl(href: string, exact = false) {
    if (href.includes(hostname)) {
      const index = href.indexOf(hostname) + 12
      const href2 = href.slice(index)

      if (exact) {
        if (/^channels\/[\w-]+(\?.*)?$/.test(href2)) {
          return prefix + href2.replace(/(^channels\/[\w-]+).*/, '$1')
        }
      } else if (/^channels\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/(^channels\/[\w-]+).*/, '$1')
      }
    }

    return undefined
  }

  function getVideoUrl(href: string) {
    if (href.includes(hostname)) {
      const index = href.indexOf(hostname) + 12
      const href2 = href.slice(index)

      if (/^view_video.php\?viewkey=\w+/.test(href2)) {
        return prefix + href2.replace(/(view_video.php\?viewkey=\w+).*/, '$1')
      }
    }

    return undefined
  }

  function getCategoryUrl(href: string) {
    if (href.includes(hostname)) {
      const index = href.indexOf(hostname) + 12
      const href2 = href.slice(index)

      if (href2 === 'hd') {
        return prefix + href2
      }

      if (/^categories\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/(^categories\/[\w-]+).*/, '$1')
      }

      if (/^video\?c=\d+/.test(href2)) {
        return prefix + href2.replace(/(^video\?c=\d+).*/, '$1')
      }

      // video/incategories/18-25/babe
      if (/^video\/incategories(?:\/[\w-]+){2}/.test(href2)) {
        return (
          prefix +
          href2.replace(/(^video\/incategories(?:\/[\w-]+){2}).*/, '$1')
        )
      }
    }

    return undefined
  }

  return {
    // magix to match pxxnhub.com
    matches: /p[ro_][r_]nhub\.com/,
    listNodesSelectors: [
      // Search result
      'ul.search-video-thumbs li',

      // Related videos
      'ul.videos li',

      // Comments
      '.videoViewPage .commentBlock',

      // Categories
      'ul.categoriesListSection li',
    ],
    conditionNodesSelectors: [
      // Search result
      // Channel
      'ul.search-video-thumbs li .usernameWrap a',
      // Video title
      'ul.search-video-thumbs li .vidTitleWrapper a',

      // Related videos
      'ul.videos li .usernameWrap a',
      'ul.videos li .vidTitleWrapper a',

      // Channel > Videos
      'ul.videos li .title a',

      // Comments
      '.videoViewPage .commentBlock .usernameWrap a',

      // Categories
      'ul.categoriesListSection li .categoryTitleWrapper a',
    ],
    validate(element: HTMLAnchorElement, href: string) {
      const hrefAttr = getAttribute(element, 'href')
      if (!hrefAttr || hrefAttr === 'null' || hrefAttr === '#') {
        return false
      }

      let key = getChannelUrl(href, true)
      if (key) {
        const meta = { type: 'channel' }
        setUtags(element, key, meta)
        return true
      }

      key = getUserProfileUrl(href, true)
      if (key) {
        const meta = { type: 'user' }
        setUtags(element, key, meta)
        return true
      }

      key = getVideoUrl(href)
      if (key) {
        let title: string | undefined
        const titleElement = $('#video-title', element)
        if (titleElement) {
          title = titleElement.textContent!
        }

        const meta = title ? { title, type: 'video' } : { type: 'video' }
        setUtags(element, key, meta)

        return true
      }

      key = getCategoryUrl(href)
      if (key) {
        const meta = { type: 'category' }
        setUtags(element, key, meta)
        return true
      }

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '.networkBarWrapper',
      '#headerWrapper',
      '#headerMenuContainer',
      '#mainMenuProfile',
      '#mainMenuAmateurModelProfile',
      '#countryRedirectMessage',
      'aside#leftMenu',
      '.profileSubNav',
      '.subFilterList',
      '.greyButton',
      '.orangeButton',
      // Login, Sign up
      'a[onclick]',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      let key = getUserProfileUrl(location.href)
      if (key) {
        // profile header
        const element = $('.name h1')
        if (element) {
          const title = getTrimmedTitle(element)
          if (title) {
            const meta = { title, type: 'user' }
            setUtags(element, key, meta)
            matchedNodesSet.add(element)
          }
        }
      }

      key = getChannelUrl(location.href)
      if (key) {
        // video title or shorts title
        const element = $('.title h1')
        if (element && !$('a', element)) {
          const title = getTrimmedTitle(element)
          if (title) {
            const meta = { title, type: 'channel' }
            setUtags(element, key, meta)
            matchedNodesSet.add(element)
          }
        }
      }

      key = getVideoUrl(location.href)
      if (key) {
        // video title or shorts title
        const element = $('h1.title')
        if (element) {
          const title = getTrimmedTitle(element)
          if (title) {
            const meta = { title, type: 'video' }
            setUtags(element, key, meta)
            matchedNodesSet.add(element)
          }
        }
      }
    },
    postProcess() {
      const host = location.host
      const enableQuickStar = getSettingsValue(`enableQuickStar_${host}`)
      if (!enableQuickStar) {
        return
      }

      const bookmarkButton = `<div class="utags_custom_btn utags_custom_bookmark_btn videoCtaPill icon-wrapper favorite-wrapper tooltipTrig" data-label="star" data-title="Add star">
                                ${getStarIconSvg(20)}
                                <span>Star</span>
                              </div>`
      const favoriteButton = $('.favorite-wrapper')
      const key = getVideoUrl(location.href)
      if (favoriteButton && key) {
        let bookmarkElement: HTMLElement | undefined
        // Check if bookmark button already exists after this favorite button
        const nextElement = favoriteButton.nextElementSibling
        const isBookmarkButton = nextElement?.classList.contains(
          'utags_custom_bookmark_btn'
        )

        if (isBookmarkButton) {
          bookmarkElement = nextElement as HTMLElement
        } else {
          // Insert bookmark button after each favorite button
          favoriteButton.insertAdjacentHTML(
            'afterend',
            createHTML(bookmarkButton)
          )
          bookmarkElement = favoriteButton.nextElementSibling as HTMLElement
        }

        if (bookmarkElement) {
          const type = 'video'
          const titleElement = $('.title h1')
          const title = titleElement
            ? getTrimmedTitle(titleElement)
            : document.title

          const meta: UserTagMeta = { type }
          if (title) meta.title = title
          const bookmark = getBookmark(key)
          const tags = bookmark.tags || []
          const hasStar = containsStarRatingTag(tags)
          const tobeTags = hasStar ? removeStarRatingTags(tags) : ['★', ...tags]
          bookmarkElement.dataset.utags_key = key
          bookmarkElement.dataset.utags_meta = JSON.stringify(meta)
          bookmarkElement.dataset.utags_tags = tobeTags.join(',')

          if (hasStar) {
            bookmarkElement.classList.add('starred')
          } else {
            bookmarkElement.classList.remove('starred')
          }
        }
      }
    },
    getStyle: () => styleText,
  }
})()
