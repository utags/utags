import { $, $$, doc, hasClass } from 'browser-extension-utils'
import styleText from 'data-text:./036-twitch.tv.scss'
import { getTrimmedTitle } from 'utags-utils'

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from '../../modules/visited'
import type { UserTagMeta, UtagsHTMLElement } from '../../types'
import { setUtags } from '../../utils/dom-utils'

export default (() => {
  const prefix = location.origin + '/'

  const getUserProfileUrl = (url: string, exact = false) => {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()
      if (/^(directory|videos)/.test(href2)) {
        return undefined
      }

      if (exact) {
        if (/^\w+$/.test(href2)) {
          return prefix + href2.replace(/^(\w+).*/, '$1')
        }
      } else if (/^\w+/.test(href2)) {
        return prefix + href2.replace(/^(\w+).*/, '$1')
      }
    }

    return undefined
  }

  function getVideoUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()
      if (exact) {
        if (/^videos\/\d+([?#].*)?$/.test(href2)) {
          return prefix + href2.replace(/^(videos\/\d+).*/, '$1')
        }
      } else if (/^videos\/\d+/.test(href2)) {
        return prefix + href2.replace(/^(videos\/\d+).*/, '$1')
      }
    }

    return undefined
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
    matches: /twitch\.tv/,
    preProcess() {
      setVisitedAvailable(true)
    },
    listNodesSelectors: [
      // videos
      '.tw-tower [data-a-target^="video-tower-card-"]',
      '.tw-transition-group .tw-transition',
    ],
    conditionNodesSelectors: [
      // videos
      '.tw-tower [data-a-target^="video-tower-card-"] a',
      '.tw-transition-group .tw-transition a',
    ],
    validate(element: HTMLAnchorElement) {
      const href = element.href

      if (!href.startsWith(prefix)) {
        return true
      }

      let key = getUserProfileUrl(href, true)
      if (key) {
        const titleElement = $(
          'p[data-a-target="preview-card-channel-link"] p',
          element
        )
        const title = getTrimmedTitle(titleElement || element)

        if (!title) {
          return false
        }

        if (element.closest('[data-a-target="preview-card-image-link"]')) {
          return false
        }

        const meta = { type: 'user', title }

        setUtags(element, key, meta)
        element.dataset.utags = element.dataset.utags || ''

        // if (element.closest(".topic-body .names a")) {
        //   element.dataset.utags_position_selector = ".topic-body .names"
        // } else if (element.closest(".user-card .names a")) {
        //   element.dataset.utags_position_selector = ".user-card .names"
        // } else if ($("span.username", element)) {
        //   element.dataset.utags_position_selector = "span.username"
        // }

        return true
      }

      key = getVideoUrl(href)
      if (key) {
        const title = getTrimmedTitle(element)

        if (!title) {
          return false
        }

        if (element.closest('[data-a-target="preview-card-image-link"]')) {
          return false
        }

        const meta = { type: 'video', title }
        setUtags(element, key, meta)
        markElementWhetherVisited(key, element)

        element.dataset.utags = element.dataset.utags || ''

        return true
      }

      // key = getCategoryUrl(href)
      // if (key) {
      //   const title = element.textContent!.trim()
      //   if (!title) {
      //     return false
      //   }

      //   const meta = { type: "category", title }
      //   setUtags(element, key, meta)

      //   if (element.closest(".column .category-list .category-title-link")) {
      //     element.dataset.utags_position_selector =
      //       ".category-text-title .category-name"
      //   }

      //   return true
      // }

      // key = getTagUrl(href)
      // if (key) {
      //   const title = element.textContent!.trim()
      //   if (!title) {
      //     return false
      //   }

      //   const meta = { type: "tag", title }
      //   setUtags(element, key, meta)
      //   return true
      // }

      return true
    },
    excludeSelectors: [
      '.top-nav__overflow-menu',
      //
    ],
    validMediaSelectors: [
      // "a img.emoji",
      // "a svg.svg-string",
      // ".category-title-link",
      // ".topic-list tr .posters a:first-of-type",
      // ".search-results .author a .avatar",
      // '[data-a-target="preview-card-image-link"]'
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<UtagsHTMLElement>) {
      const isDarkMode = hasClass(doc.documentElement, 'tw-root--theme-dark')
      doc.documentElement.dataset.utags_darkmode = isDarkMode ? '1' : '0'

      let key = getVideoUrl(location.href)
      if (key) {
        addVisited(key)

        const element = $('[data-a-target="stream-title"]')
        if (element) {
          const title = getTrimmedTitle(element)
          if (title) {
            const meta = { title, type: 'video' }
            setUtags(element, key, meta)
            matchedNodesSet.add(element)
            markElementWhetherVisited(key, element)
          }
        }
      }

      // Chat
      for (const element of $$(
        '[data-test-selector="chat-room-component-layout"] [data-test-selector="message-username"]'
      )) {
        const id = element.dataset.aUser
        const title = getTrimmedTitle(element)
        if (id && title) {
          key = prefix + id.toLowerCase()
          const meta = { type: 'user', title }

          setUtags(element, key, meta)
          element.dataset.utags = element.dataset.utags || ''
          element.dataset.utags_node_type = 'link'

          matchedNodesSet.add(element)
        }
      }
    },
    getStyle: () => styleText,
  }
})()
