import { getSettingsValue } from 'browser-extension-settings'
import { $, $$, createHTML, getAttribute } from 'browser-extension-utils'
import styleText from 'data-text:./012-youtube.com.scss'
import { getTrimmedTitle } from 'utags-utils'

import { getStarIconSvg } from '../../modules/star-icon'
import { getBookmark } from '../../storage/bookmarks'
import type { UserTagMeta } from '../../types'
import { containsStarRatingTag, removeStarRatingTags } from '../../utils'
import { setUtags } from '../../utils/dom-utils'
import { setUtagsAttributes } from '../../utils/index'
import defaultSite from '../default'

export default (() => {
  const prefix = 'https://www.youtube.com/'
  const prefix2 = 'https://m.youtube.com/'

  function getUserProfileUrl(href: string, exact = false) {
    if (href.startsWith(prefix) || href.startsWith(prefix2)) {
      const href2 = href.startsWith(prefix2) ? href.slice(22) : href.slice(24)
      if (exact) {
        if (/^@[\w-.%]+$/.test(href2)) {
          return prefix + href2.replace(/(^@[\w-.%]+).*/, '$1')
        }
      } else if (/^@[\w-.%]+/.test(href2)) {
        return prefix + href2.replace(/(^@[\w-.%]+).*/, '$1')
      }
    }

    return undefined
  }

  function getChannelUrl(href: string, exact = false) {
    if (href.startsWith(prefix) || href.startsWith(prefix2)) {
      const href2 = href.startsWith(prefix2) ? href.slice(22) : href.slice(24)
      if (exact) {
        if (/^channel\/[\w-]+$/.test(href2)) {
          return prefix + href2.replace(/(^channel\/[\w-]+).*/, '$1')
        }
      } else if (/^channel\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/(^channel\/[\w-]+).*/, '$1')
      }
    }

    return undefined
  }

  function getVideoUrl(href: string) {
    if (href.startsWith(prefix) || href.startsWith(prefix2)) {
      const href2 = href.startsWith(prefix2) ? href.slice(22) : href.slice(24)
      if (href2.includes('&lc=')) {
        return undefined
      }

      if (/^watch\?v=[\w-]+/.test(href2)) {
        return prefix + href2.replace(/(watch\?v=[\w-]+).*/, '$1')
      }

      if (/^shorts\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/(^shorts\/[\w-]+).*/, '$1')
      }
    }

    return undefined
  }

  return {
    matches: /youtube\.com/,
    preProcess() {
      let key = getUserProfileUrl(location.href) || getChannelUrl(location.href)
      if (key) {
        // profile header
        const element = $(
          '#inner-header-container #container.ytd-channel-name #text,yt-page-header-renderer yt-content-metadata-view-model span > span'
        )
        if (element) {
          setUtagsAttributes(element, { key })
        }
      }

      key = getVideoUrl(location.href)
      if (key) {
        // video title or shorts title
        const element = $(
          '#title h1.ytd-watch-metadata,ytd-reel-video-renderer[is-active] h2.title'
        )
        if (element) {
          setUtagsAttributes(element, { key, type: 'video' })
        }
      }
    },
    listNodesSelectors: [
      // Main page
      'ytd-rich-item-renderer',

      // Search result
      'ytd-video-renderer',

      // Suggests
      'yt-lockup-view-model',
    ],
    conditionNodesSelectors: [
      // Main page
      // Title
      'ytd-rich-item-renderer a.yt-lockup-metadata-view-model__title',
      // Author
      'ytd-rich-item-renderer yt-content-metadata-view-model a',

      // Search result
      'ytd-video-renderer .ytd-video-renderer h3',
      'ytd-video-renderer .ytd-channel-name, a',

      // Suggests
      'yt-lockup-view-model h3.yt-lockup-metadata-view-model__heading-reset a',
    ],
    validate(element: HTMLAnchorElement, href: string) {
      if (href.startsWith(prefix) || href.startsWith(prefix2)) {
        let key = getUserProfileUrl(href, true)
        if (key) {
          const meta = { type: 'user' }
          setUtags(element, key, meta)

          return true
        }

        key = getChannelUrl(href, true)
        if (key) {
          const meta = { type: 'channel' }
          setUtags(element, key, meta)

          return true
        }

        key = getVideoUrl(href)
        if (key) {
          let title: string | undefined
          const titleElement = $('#video-title', element)
          if (titleElement) {
            title = getTrimmedTitle(titleElement)
          }

          const meta = title ? { title, type: 'video' } : { type: 'video' }
          setUtags(element, key, meta)

          return true
        }
      }

      return false
    },
    excludeSelectors: [...defaultSite.excludeSelectors],
    validMediaSelectors: [
      // Validated user icon
      'a span.ytSpecIconShapeHost svg',
    ],
    postProcess() {
      const host = location.host
      const enableQuickStar = getSettingsValue(`enableQuickStar_${host}`)
      if (!enableQuickStar) {
        return
      }

      const bookmarkButton = `<yt-button-view-model class="utags_custom_btn utags_custom_bookmark_btn ytd-menu-renderer">
      <button-view-model class="ytSpecButtonViewModelHost style-scope ytd-menu-renderer">
      <button class="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading yt-spec-button-shape-next--enable-backdrop-filter-experiment" title="Add star" aria-label="Add star" aria-disabled="false" style="">
      <div aria-hidden="true" class="yt-spec-button-shape-next__icon">
      <span class="ytIconWrapperHost" style="width: 24px; height: 24px;">
      <span class="yt-icon-shape ytSpecIconShapeHost">
      <div style="width: 100%; height: 100%; display: block; fill: currentcolor;">
      ${getStarIconSvg(22)}
      </div></span></span></div>
      <div class="yt-spec-button-shape-next__button-text-content">Star</div><yt-touch-feedback-shape style="border-radius: inherit;">
      <div aria-hidden="true" class="yt-spec-touch-feedback-shape yt-spec-touch-feedback-shape--touch-response">
      <div class="yt-spec-touch-feedback-shape__stroke"></div><div class="yt-spec-touch-feedback-shape__fill">
      </div></div></yt-touch-feedback-shape></button></button-view-model></yt-button-view-model>`
      // like dislike button
      const targetButton = $(
        'ytd-watch-metadata segmented-like-dislike-button-view-model'
      )
      const key = getVideoUrl(location.href)
      if (targetButton && key) {
        let bookmarkElement: HTMLElement | undefined
        // Check if bookmark button already exists after this favorite button
        const nextElement = targetButton.nextElementSibling
        const isBookmarkButton = nextElement?.classList.contains(
          'utags_custom_bookmark_btn'
        )

        if (isBookmarkButton) {
          bookmarkElement = nextElement as HTMLElement
        } else {
          // Insert bookmark button after each favorite button
          targetButton.insertAdjacentHTML(
            'afterend',
            createHTML(bookmarkButton)
          )
          bookmarkElement = targetButton.nextElementSibling as HTMLElement
        }

        if (bookmarkElement) {
          const type = 'video'
          const titleElement = $(
            '#title h1.ytd-watch-metadata,ytd-reel-video-renderer[is-active] h2.title'
          )
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
