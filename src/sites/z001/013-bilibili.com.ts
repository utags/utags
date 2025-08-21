import { $, $$, addEventListener, runOnce } from 'browser-extension-utils'
import styleText from 'data-text:./013-bilibili.com.scss'

export default (() => {
  const prefix = 'https://www.bilibili.com/'
  const prefix2 = 'https://space.bilibili.com/'
  const prefix3 = 'https://m.bilibili.com/'

  function getUserProfileUrl(href: string) {
    if (href.startsWith(prefix2)) {
      const href2 = href.slice(27)
      if (/^\d+/.test(href2)) {
        return prefix2 + href2.replace(/(^\d+).*/, '$1')
      }
    }

    if (href.startsWith(prefix3 + 'space/')) {
      const href2 = href.slice(29)
      if (/^\d+/.test(href2)) {
        return prefix2 + href2.replace(/(^\d+).*/, '$1')
      }
    }

    return undefined
  }

  function getVideoUrl(href: string) {
    if (
      href.startsWith(prefix + 'video/') ||
      href.startsWith(prefix3 + 'video/')
    ) {
      const href2 = href.startsWith(prefix3) ? href.slice(23) : href.slice(25)
      if (/^video\/\w+/.test(href2)) {
        return prefix + href2.replace(/^(video\/\w+).*/, '$1')
      }
    }

    return undefined
  }

  return {
    matches: /bilibili\.com|biligame\.com/,
    excludeSelectors: ['*'],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      // runOnce("site:window:error", () => {
      //   addEventListener(
      //     window,
      //     "error",
      //     (error) => {
      //       console.error(error)
      //       // error.preventDefault()
      //       // error.stopPropagation()
      //       // error.stopImmediatePropagation()
      //     },
      //     true
      //   )
      // })

      if (location.href.startsWith(prefix + 'video/')) {
        // Must wait until video ready
        if ($('.bpx-state-loading')) {
          return
        }

        const img = $('.bpx-player-follow-face') as HTMLImageElement
        const img2 = $('img.video-capture-img') as HTMLImageElement
        if (!img?.src || !img2?.src) {
          return
        }
      }

      const elements = $$(
        '.user-name[data-user-id],.sub-user-name[data-user-id],.jump-link.user[data-user-id]'
      )
      for (const element of elements) {
        const userId = element.dataset.userId
        if (!userId) {
          return false
        }

        const title = element.textContent!.trim()
        const key = prefix2 + userId
        const meta = { title, type: 'user' }
        element.utags = { key, meta }
        element.dataset.utags_node_type = 'link'
        matchedNodesSet.add(element)
      }

      const elements2 = $$('.upname a,a.bili-video-card__info--owner')
      for (const element of elements2) {
        const href = element.href as string
        if (href.startsWith(prefix2)) {
          const key = getUserProfileUrl(href)
          if (key) {
            const nameElement = $(
              '.name,.bili-video-card__info--author',
              element
            )
            if (nameElement) {
              const title = nameElement.textContent
              const meta = { title, type: 'user' }
              nameElement.utags = { key, meta }
              nameElement.dataset.utags_node_type = 'link'
              matchedNodesSet.add(nameElement)
            }
          }
        }
      }

      const elements3 = $$(
        [
          'a.up-name',
          'a.card-user-name',
          '.usercard-wrap .user .name',
          '.comment-list .user .name',
          '.user-card .user .name',
          'a[data-usercard-mid]',
          'a.user-name',
          '.user-name a',
          'a[href^="https://space.bilibili.com/"]',
          'a.staff-name',
        ].join(',')
      )
      for (const element of elements3) {
        const href = element.href as string
        if (href.startsWith(prefix2)) {
          const key = getUserProfileUrl(href)
          if (key) {
            let title = element.textContent!.trim()
            if (title) {
              title = title.replace(/^@/, '')
              const meta = { title, type: 'user' }
              element.utags = { key, meta }
              matchedNodesSet.add(element)
            }
          }
        }
      }

      if (
        location.href.startsWith(prefix2) ||
        location.href.startsWith(prefix3 + 'space/')
      ) {
        // profile header
        const element = $('#h-name,.m-space-info .name')
        if (element) {
          const title = element.textContent!.trim()
          const key = getUserProfileUrl(location.href)
          if (title && key) {
            const meta = { title, type: 'user' }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }

      // video title
      const element = $('h1.video-title,h1.title-text')
      if (element) {
        const title = element.textContent!.trim()
        const key = getVideoUrl(location.href)
        if (title && key) {
          const meta = { title, type: 'video' }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }

      const elements4 = $$(
        '.bili-video-card__info--right a,.video-page-card-small .info a,.video-page-operator-card-small .info a'
      ) as HTMLAnchorElement[]
      for (const element of elements4) {
        const key = getVideoUrl(element.href)
        if (key) {
          const title = element.textContent!.trim()
          const target =
            element.parentElement!.tagName === 'H3'
              ? element.parentElement!
              : element

          if (title) {
            const meta = { title, type: 'video' }
            target.utags = { key, meta }
            target.dataset.utags_node_type = 'link'
            matchedNodesSet.add(target)
          }
        }
      }
    },
    getStyle: () => styleText,
  }
})()
