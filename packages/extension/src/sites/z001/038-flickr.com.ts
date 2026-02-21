import { $, $$, doc, setAttribute } from 'browser-extension-utils'
import styleText from 'data-text:./038-flickr.com.scss'
import { getTrimmedTitle } from 'utags-utils'

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from '../../modules/visited'
import { setUtags } from '../../utils/dom-utils'
import { getUtagsTitle, setUtagsAttributes } from '../../utils/index'

export default (() => {
  // Constants
  const CANONICAL_BASE_URL = 'https://www.flickr.com/'
  const FLICKR_DOMAIN_REGEX = /^https?:\/\/flickr\.com/
  const USER_PROFILE_EXACT_REGEX = /^(photos|people)\/[\w-@]+\/$/
  const USER_PROFILE_REGEX = /^(photos|people)\/[\w-@]+\//
  const USER_PROFILE_EXTRACT_REGEX = /^((photos|people)\/[\w-@]+\/).*/
  const GROUP_EXACT_REGEX = /^(groups)\/[\w-]+\/$/
  const GROUP_REGEX = /^(groups)\/[\w-]+\//
  const GROUP_EXTRACT_REGEX = /^((groups)\/[\w-]+\/).*/

  /**
   * Normalize URL to canonical format
   * @param url - The URL to normalize
   * @returns Normalized URL with HTTPS and www prefix
   */
  function getCanonicalUrl(url: string): string {
    // Handle flickr.com without www
    if (FLICKR_DOMAIN_REGEX.test(url)) {
      return url.replace(FLICKR_DOMAIN_REGEX, CANONICAL_BASE_URL.slice(0, -1))
    }

    return url
  }

  /**
   * Extract user profile URL from a given URL
   * @param url - The URL to process
   * @param exact - Whether to match exact profile URLs only (ending with /)
   * @returns User profile URL or undefined if not a valid profile URL
   */
  function getUserProfileUrl(url: string, exact = false): string | undefined {
    const normalizedUrl = getCanonicalUrl(url)

    if (!normalizedUrl.startsWith(CANONICAL_BASE_URL)) {
      return undefined
    }

    const pathSegment = normalizedUrl.slice(CANONICAL_BASE_URL.length)
    const targetRegex = exact ? USER_PROFILE_EXACT_REGEX : USER_PROFILE_REGEX

    if (targetRegex.test(pathSegment)) {
      const match = USER_PROFILE_EXTRACT_REGEX.exec(pathSegment)
      return match ? CANONICAL_BASE_URL + match[1] : undefined
    }

    return undefined
  }

  /**
   * Extract user profile URL from a given URL
   * @param url - The URL to process
   * @param exact - Whether to match exact profile URLs only (ending with /)
   * @returns User profile URL or undefined if not a valid profile URL
   */
  function getGroupUrl(url: string, exact = false): string | undefined {
    const normalizedUrl = getCanonicalUrl(url)

    if (!normalizedUrl.startsWith(CANONICAL_BASE_URL)) {
      return undefined
    }

    const pathSegment = normalizedUrl.slice(CANONICAL_BASE_URL.length)
    const targetRegex = exact ? GROUP_EXACT_REGEX : GROUP_REGEX

    if (targetRegex.test(pathSegment)) {
      const match = GROUP_EXTRACT_REGEX.exec(pathSegment)
      return match ? CANONICAL_BASE_URL + match[1] : undefined
    }

    return undefined
  }

  return {
    matches: /flickr\.com/,
    preProcess() {
      let key = getUserProfileUrl(location.href)
      // if (key) {
      //   // profile header
      //   const element =
      //     $(".user-profile-names .username") ||
      //     $(
      //       ".user-profile-names .user-profile-names__primary,.user-profile-names .user-profile-names__secondary"
      //     )
      //   if (element) {
      //     const title = element.textContent!.trim()
      //     if (title) {
      //       const meta = { title, type: "user" }
      //       setUtags(element, key, meta)
      //       matchedNodesSet.add(element)
      //     }
      //   }
      // }

      key = getGroupUrl(location.href)
      if (key) {
        const element = $('h1.group-title')
        const titleElement = $('h1.group-title .group-title-holder')
          ?.childNodes[0]
        if (element && titleElement) {
          const title = titleElement.textContent!.trim()
          if (title) {
            setUtagsAttributes(element, { key, title, type: 'group' })
          }
        }
      }
    },
    listNodesSelectors: [
      // ".topic-list .topic-list-body tr",
      // // replies
      // ".topic-area .topic-post",
      // // search results
      // ".search-results .fps-result",
      // // categories
      // ".column .latest-topic-list .latest-topic-list-item",
    ],
    conditionNodesSelectors: [
      // topic title
      // ".topic-list .topic-list-body tr .title",
      // // category
      // ".topic-list .topic-list-body tr .badge-category__wrapper",
      // // tag
      // ".topic-list .topic-list-body tr .discourse-tag",
      // // author
      // ".topic-list .topic-list-body tr .posters a:first-of-type",
      // // mobile - author
      // ".mobile-view .topic-list a[data-user-card]",
      // // replies
      // ".topic-area .topic-post:nth-of-type(n+2) .topic-meta-data:not(.embedded-reply) .names a",
      // // search results
      // ".search-results .fps-result .search-link",
      // ".search-results .fps-result .badge-category__wrapper",
      // ".search-results .fps-result .discourse-tag",
      // // Maybe it's the author of the post, not the author of the topic.
      // // ".search-results .fps-result .author a",
      // // categories
      // ".column .latest-topic-list .latest-topic-list-item .main-link .title",
      // ".column .latest-topic-list .latest-topic-list-item .main-link .badge-category__wrapper",
      // ".column .latest-topic-list .latest-topic-list-item .main-link .discourse-tag",
    ],

    validate(element: HTMLAnchorElement, href: string) {
      href = getCanonicalUrl(href)

      if (!href.startsWith(CANONICAL_BASE_URL)) {
        return true
      }

      const key = getUserProfileUrl(href, true)
      if (key) {
        const titleElement = $(
          'p[data-a-target="preview-card-channel-link"] p',
          element
        )
        const title = getTrimmedTitle(titleElement || element)

        if (!title) {
          return false
        }

        const titleLowerCase = title.toLowerCase()
        if (titleLowerCase.startsWith('more')) {
          return false
        }

        if (element.closest('[data-a-target="preview-card-image-link"]')) {
          return false
        }

        const meta = { type: 'user', title }

        setUtags(element, key, meta)
        setAttribute(element, 'data-utags', element.dataset.utags || '')

        return true
      }

      const title = getUtagsTitle(element)

      if (!title) {
        return false
      }

      const titleLowerCase = title.toLowerCase()
      if (
        titleLowerCase.startsWith('more') ||
        titleLowerCase.startsWith('edit') ||
        /^[\d,.]+(m|h|d|mo|k)?$/.test(titleLowerCase) ||
        /^\d+( (mins?|hours?|days?|months?|years?) ago)?$/.test(titleLowerCase)
      ) {
        return false
      }

      return true
    },
    // refer: https://github.com/utags/utags/issues/70
    excludeSelectors: [
      '.global-nav',
      '#global-nav',
      '.logo a',
      '.gn-link span',
      '.gn-link',
      'footer',
      '[role="navigation"]',
      '[aria-label="Tabs"]',
      'footer .lang-switcher',
      '.gift-pro-link',
      '.pagination-view',
      '.Paginator',
      '.navigate-target',
      '.more-link',
      '.view-more-link',
      '.view-all',
      '.droparound.menu',
      '.user-account-card-droparound',
      '.person-card-view .links.secondary',
      '.photo-sidebar-toggle-view',
      '.attribution-info .username',
      '.photo-license-info',
      '[href*="upgrade/pro"]',
      '[href*="/login"]',
      '[href*="/logout"]',
      '[href*="/sign-up"]',
      '[href$="/relationship/"]',
      '[href$="?editAvatar"]',
      '[href="/recent.gne"]',
      '[href^="/search/"]',
      '[href*="/groups_join.gne"]',
      '.sn-avatar',
      'h5.tag-list-header',
      '.cookie-banner-view',
      '.cookie-banner-message',
      'span.edit_relationship',
      '.tag-section-header',
      '.nav-links',
      // Albums
      '.photo-list-album-view',
      // Profiles
      '.contact-list-num',
      '.contact-list-table th',
      '.bio-infos-container .archives-link',
      '[href*="/ignore.gne"]',
      '.context-list .context-item.link',
      '.metadata-container .followers',
      ".LinksNew span a[data-track='ContactsSubnav-photos_of_contacts']",
      ".LinksNew a[data-track='ContactsSubnav-send_invites']",
      ".LinksNewP [data-track='ContactsSubnav-add_contacts']",
      "[href^='/people'][href$='/ignore/']",
      '#personmenu_button_bar .candy_menu #person_menu_you_div a.block',
      '.contact-list-header',
      '#Feeds',
      '.Butt',
      '.tabs',
      '.refresh-suggestions-container',
      '.suggestions .stats',
      '.jump-list-container',
      '.tag-list-zeus a[href$="/edit/"]',
      '.tag-list-zeus a[href$="/delete/"]',
      '.scTopCrumbShareBreadcrumbs',
      '.vsComments',
      // AD
      'a[href*="utm_source=flickr&utm_medium=affiliate"]',
      // groups
      '.since-link',
      '.butt',
      '.add-topic',
      '.groups-members',
      'a[data-track="groupDiscussionTopicReplyCountClick"]',
      '.pro-badge-new',
      '.pro-badge-legacy',
      // https://www.flickr.com/help/forum/en-us/
      'a[href*="?change_lang="]',
      '.forumSearch form',
      '.TopicListing small a',
      '#DiscussTopic .Said small a',
      '.TopicReply .Said small a',
      // groups (deprecated view)
      '.group-blast-zeus',
      '.hide-link',
      '[data-track="join-group"]',
      '.set-desc.group-desc .short a',
      '#feeds-xml a',
      '.slideshow-bottom a',
    ],
    getStyle: () => styleText,
    getCanonicalUrl,
  }
})()
