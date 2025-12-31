import { getSettingsValue } from 'browser-extension-settings'
import { $, $$, createHTML, doc } from 'browser-extension-utils'
import styleText from 'data-text:./027-discourse.scss'
import { getTrimmedTitle } from 'utags-utils'

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from '../../modules/visited'
import { getBookmark } from '../../storage/bookmarks'
import type { UserTagMeta, UtagsHTMLElement } from '../../types'
import { containsStarRatingTag, removeStarRatingTags } from '../../utils'
import { removeUtags, setUtags } from '../../utils/dom-utils'

export default (() => {
  const prefix = location.origin + '/'
  const host = location.host

  const getUserProfileUrl = (url: string, exact = false) => {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()
      if (exact) {
        if (/^u\/[\w.-]+([?#].*)?$/.test(href2)) {
          return prefix + href2.replace(/^(u\/[\w.-]+).*/, '$1')
        }
      } else if (/^u\/[\w.-]+/.test(href2)) {
        return prefix + href2.replace(/^(u\/[\w.-]+).*/, '$1')
      }
    }

    return undefined
  }

  function getPostUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()
      if (exact) {
        if (/^t\/[^/]+\/\d+(\/\d+)?([?#].*)?$/.test(href2)) {
          return prefix + href2.replace(/^(t\/[^/]+\/\d+).*/, '$1')
        }
      } else if (/^t\/[^/]+\/\d+?/.test(href2)) {
        return prefix + href2.replace(/^(t\/[^/]+\/\d+).*/, '$1')
      }
    }

    return undefined
  }

  function getCommentUrl(url: string, floor: number) {
    const postUrl = getPostUrl(url)
    if (!postUrl) {
      return
    }

    return floor <= 1 ? postUrl : `${postUrl}/${floor}`
  }

  function getCategoryUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()
      if (exact) {
        if (/^c\/[\w-]+(\/[\w-]+)?\/\d+([?#].*)?$/.test(href2)) {
          return prefix + href2.replace(/^(c\/[\w-]+(\/[\w-]+)?\/\d+).*/, '$1')
        }
      } else if (/^c\/[\w-]+(\/[\w-]+)?\/\d+?/.test(href2)) {
        return prefix + href2.replace(/^(c\/[\w-]+(\/[\w-]+)?\/\d+).*/, '$1')
      }
    }

    return undefined
  }

  function getTagUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()
      if (exact) {
        if (/^tag\/[^/?#]+([?#].*)?$/.test(href2)) {
          return prefix + href2.replace(/^(tag\/[^/?#]+).*/, '$1')
        }
      } else if (/^tag\/[^/?#]+?/.test(href2)) {
        return prefix + href2.replace(/^(tag\/[^/?#]+).*/, '$1')
      }
    }

    return undefined
  }

  return {
    matches:
      /meta\.discourse\.org|^linux\.do$|^idcflare\.com|meta\.appinn\.net|community\.openai\.com|community\.cloudflare\.com|community\.wanikani\.com|forum\.cursor\.com|www\.nodeloc\.com|forum\.obsidian\.md|forum-zh\.obsidian\.md|www\.uscardforum\.com/,
    preProcess() {
      setVisitedAvailable(true)
    },
    listNodesSelectors: [
      '.topic-list .topic-list-body tr',
      // replies
      '.topic-area .topic-post',
      // search results
      '.search-results .fps-result',
      // categories
      '.column .latest-topic-list .latest-topic-list-item',
    ],
    conditionNodesSelectors: [
      // topic title
      '.topic-list .topic-list-body tr .title',
      // category
      '.topic-list .topic-list-body tr .badge-category__wrapper',
      // tag
      '.topic-list .topic-list-body tr .discourse-tag',
      // author
      '.topic-list .topic-list-body tr .posters a:first-of-type',
      // mobile - author
      '.mobile-view .topic-list a[data-user-card]',

      // replies
      '.topic-area .topic-post:nth-of-type(n+2) .topic-meta-data:not(.embedded-reply) .names a',

      // search results
      '.search-results .fps-result .search-link',
      '.search-results .fps-result .badge-category__wrapper',
      '.search-results .fps-result .discourse-tag',
      // Maybe it's the author of the post, not the author of the topic.
      // ".search-results .fps-result .author a",

      // categories
      '.column .latest-topic-list .latest-topic-list-item .main-link .title',
      '.column .latest-topic-list .latest-topic-list-item .main-link .badge-category__wrapper',
      '.column .latest-topic-list .latest-topic-list-item .main-link .discourse-tag',
    ],
    validate(element: HTMLAnchorElement) {
      const href = element.href

      if (!href.startsWith(prefix)) {
        return true
      }

      let key = getUserProfileUrl(href, true)
      if (key) {
        // span.username -> https://meta.discourse.org/u
        const titleElement = $('span.username', element)
        const title = getTrimmedTitle(titleElement || element)
        if (
          !title &&
          !element.closest('.topic-list tr .posters a:first-of-type') &&
          !element.closest('.bookmark-list tr a.avatar') &&
          // https://linux.do/u/neo/activity/reactions
          !element.closest(
            '.user-content .user-stream-item__header a.avatar-link'
          ) &&
          // https://linux.do/u/neo/activity/likes-given
          !element.closest(
            '.user-content .filter-1 .post-list-item .post-list-item__header a.avatar-link'
          ) &&
          !element.closest('.column .latest-topic-list .topic-poster a') &&
          !element.closest('.search-results .author a')
        ) {
          return false
        }

        const meta = title ? { type: 'user', title } : { type: 'user' }

        setUtags(element, key, meta)
        element.dataset.utags = element.dataset.utags || ''

        if (element.closest('.topic-body .names a')) {
          element.dataset.utags_position_selector = '.topic-body .names'
        } else if (element.closest('.user-card .names a')) {
          element.dataset.utags_position_selector = '.user-card .names'
        } else if ($('span.username', element)) {
          element.dataset.utags_position_selector = 'span.username'
        }

        return true
      }

      key = getPostUrl(href)
      if (key) {
        const title = getTrimmedTitle(element)

        if (
          element.closest('.mobile-view .topic-list a[data-user-card]') &&
          element.dataset.userCard
        ) {
          const title = element.dataset.userCard
          key = prefix + 'u/' + title.toLowerCase()
          const meta = { type: 'user', title }

          setUtags(element, key, meta)
          element.dataset.utags = element.dataset.utags || ''
          return true
        }

        if (!title) {
          return false
        }

        if (
          element.closest('header .topic-link') &&
          getComputedStyle(element).display === 'inline'
        ) {
          element.dataset.utags_flag = 'inline'
        }

        const meta = { type: 'post', title }
        setUtags(element, key, meta)
        markElementWhetherVisited(key, element)

        element.dataset.utags = element.dataset.utags || ''

        return true
      }

      key = getCategoryUrl(href)
      if (key) {
        const title = getTrimmedTitle(element)
        if (!title) {
          return false
        }

        const meta = { type: 'category', title }
        setUtags(element, key, meta)

        if (element.closest('.column .category-list .category-title-link')) {
          element.dataset.utags_position_selector =
            '.category-text-title .category-name'
        }

        return true
      }

      key = getTagUrl(href)
      if (key) {
        const title = getTrimmedTitle(element)
        if (!title) {
          return false
        }

        const meta = { type: 'tag', title }
        setUtags(element, key, meta)
        return true
      }

      return true
    },
    excludeSelectors: [
      '.topic-map',
      '.names .second',
      '.names .user-group',
      '.post-activity',
      '.topic-last-activity',
      '.topic-item-stats .activity',
      '.topic-post-badges',
      '.topic-excerpt',
      '.topic-list-category-expert-tags',
      '.list-vote-count',
      '.post-date',
      '.category__badges',
      '.badge-posts',
      '.topic-timeline',
      '.with-timeline',
      '.sidebar-wrapper',
      // 跳到帖子的原始位置
      '.topic-meta-data .post-link-arrow',
      '#skip-link',
      '#navigation-bar',
      '.user-navigation',
      '.search-menu',
      'footer.category-topics-count',
      '[role="tablist"]',
      '.nav.nav-pills',
      '.btn',
      '.custom-header-links',
      // reply area and topic editor
      '.reply-area[role="dialog"]',
      // chat
      '.chat-time',
    ],
    validMediaSelectors: [
      'a img.emoji',
      'a svg.svg-string',
      '.category-title-link',
      '.topic-list tr .posters a:first-of-type',
      '.search-results .author a .avatar',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<UtagsHTMLElement>) {
      const isDarkMode =
        doc.documentElement.dataset.themeType === 'dark' ||
        // linux.do
        ($('header picture > source') as HTMLLinkElement)?.media === 'all'
      doc.documentElement.dataset.utags_darkmode = isDarkMode ? '1' : '0'

      let key = getUserProfileUrl(location.href)
      if (key) {
        // Clear cache
        let index = 0
        for (const element of $$(
          '.user-profile-names .username,.user-profile-names .user-profile-names__primary,.user-profile-names .user-profile-names__secondary'
        ) as UtagsHTMLElement[]) {
          index++
          if (key !== element.dataset.utags_key || index === 2) {
            delete element.dataset.utags
            removeUtags(element)
          }
        }

        // profile header
        const element: UtagsHTMLElement =
          ($('.user-profile-names .username') as UtagsHTMLElement) ||
          ($(
            '.user-profile-names .user-profile-names__primary,.user-profile-names .user-profile-names__secondary'
          ) as UtagsHTMLElement)
        if (element) {
          const title = getTrimmedTitle(element)
          if (title) {
            const meta = { title, type: 'user' }
            setUtags(element, key, meta)
            element.dataset.utags_key = key
            matchedNodesSet.add(element)
          }
        }
      }

      key = getPostUrl(location.href)
      if (key) {
        addVisited(key)
      }

      // Leader board
      for (const element of $$('.leaderboard div[data-user-card]')) {
        const title = element.dataset.userCard
        if (title) {
          key = prefix + 'u/' + title.toLowerCase()
          const meta = { type: 'user', title }

          setUtags(element, key, meta)
          element.dataset.utags = element.dataset.utags || ''
          element.dataset.utags_node_type = 'link'
          element.dataset.utags_position_selector = element.closest('.winner')
            ? '.winner'
            : '.user__name'
          matchedNodesSet.add(element)
        }
      }

      // chat
      for (const element of $$('.chat-message span[data-user-card]')) {
        const title = element.dataset.userCard
        if (title) {
          key = prefix + 'u/' + title.toLowerCase()
          const meta = { type: 'user', title }

          setUtags(element, key, meta)
          element.dataset.utags = element.dataset.utags || ''
          element.dataset.utags_node_type = 'link'

          matchedNodesSet.add(element)
        }
      }
    },
    postProcess() {
      const enableQuickStar = getSettingsValue(`enableQuickStar_${host}`)
      if (!enableQuickStar) {
        return
      }

      const bookmarkButton = `<button class="utags_custom_btn btn no-text btn-icon fk-d-menu__trigger bookmark-menu-trigger post-action-menu__bookmark btn-flat bookmark widget-button bookmark-menu__trigger btn-icon no-text" aria-expanded="false" title="将此帖子加入 UTags 书签" data-identifier="bookmark-menu" data-trigger="" type="button">
<svg class="fa d-icon d-icon-bookmark svg-icon svg-string" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><use href="#star"></use></svg>      <span aria-hidden="true">
        </span>
    </button>`
      // 所有楼层
      const copyLinkButtons = $$(
        '[data-post-number] .actions .post-action-menu__copy-link'
      )
      for (const button of copyLinkButtons) {
        let bookmarkElement: HTMLElement | undefined
        // Check if bookmark button already exists before this copy link button
        const prevElement = button.previousElementSibling
        const isBookmarkButton = prevElement?.classList.contains(
          'bookmark-menu-trigger'
        )

        if (isBookmarkButton) {
          bookmarkElement = prevElement as HTMLElement
        } else {
          // Insert bookmark button before each copy link button
          button.insertAdjacentHTML('beforebegin', createHTML(bookmarkButton))
          bookmarkElement = button.previousElementSibling as HTMLElement
        }

        if (bookmarkElement) {
          const postNumberElement: HTMLElement =
            button.closest('[data-post-number]')!
          const postNumber = Number(postNumberElement?.dataset.postNumber || 1)
          const key = getCommentUrl(location.href, postNumber)
          if (key) {
            const type = postNumber > 1 ? 'comment' : 'topic'
            const titleElement = $(
              '#topic-title .fancy-title,h1.header-title .topic-link'
            )
            const title = titleElement
              ? getTrimmedTitle(titleElement)
              : document.title
            const formattedTitle =
              postNumber > 1 ? `回复 #${postNumber} >> ${title}` : title
            const postContentElement = $(
              '.post__contents .cooked',
              postNumberElement
            )
            const description = postContentElement
              ? getTrimmedTitle(postContentElement)
              : ''
            const formattedDescription =
              description.length > 1000
                ? description.slice(0, 1000)
                : description
            const meta: UserTagMeta = { type }
            if (formattedTitle) meta.title = formattedTitle
            if (formattedDescription) meta.description = formattedDescription
            const bookmark = getBookmark(key)
            const tags = bookmark.tags || []
            const hasStar = containsStarRatingTag(tags)
            const tobeTags = hasStar
              ? removeStarRatingTags(tags)
              : ['★', ...tags]
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
      }
    },
    getStyle: () => styleText,
  }
})()
