import { $, $$, addEventListener, runOnce } from 'browser-extension-utils'
import styleText from 'data-text:./013-bilibili.com.scss'
import { getTrimmedTitle } from 'utags-utils'

import { setUtags } from '../../utils/dom-utils'
import { traverseAllShadowRoots } from '../../utils/shadow-root-traverser'

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
    // Exclude all, use addExtraMatchedNodes instead
    excludeSelectors: ['*'],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      // runOnce('site:window:error', () => {
      //   addEventListener(
      //     window,
      //     'error',
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

        const title = getTrimmedTitle(element)
        const key = prefix2 + userId
        const meta = { title, type: 'user' }
        setUtags(element, key, meta)
        element.dataset.utags_node_type = 'link'
        matchedNodesSet.add(element)
      }

      // 视频 up 主
      const elements2 = $$('.upname a,a.bili-video-card__info--owner')
      for (const element of elements2) {
        const href = (element as HTMLAnchorElement).href
        if (href.startsWith(prefix2)) {
          const key = getUserProfileUrl(href)
          if (key) {
            const nameElement = $(
              '.name,.bili-video-card__info--author',
              element
            )
            if (nameElement) {
              const title = getTrimmedTitle(nameElement)
              const meta = { title, type: 'user' }
              setUtags(nameElement, key, meta)
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
          // 首页特殊卡片
          '.floor-single-card a.sub-title'
        ].join(',')
      )
      for (const element of elements3) {
        const nameElement = $('.name,.bili-video-card__info--author', element)
        if (nameElement) {
          // 上面已经处理过的
          continue
        }

        const href = (element as HTMLAnchorElement).href
        if (href.startsWith(prefix2)) {
          const key = getUserProfileUrl(href)
          if (key) {
            let title = getTrimmedTitle(element)
            if (title) {
              title = title.replace(/^@/, '')
              const meta = { title, type: 'user' }
              setUtags(element, key, meta)
              matchedNodesSet.add(element)
            }
          }
        }
      }

      traverseAllShadowRoots(
        (shadowRoot, hostElement) => {
          // console.log('Found shadow root in:', hostElement.tagName, hostElement)
          const elements = $$(
            '[data-user-profile-id] a',
            shadowRoot as unknown as HTMLElement
          )
          for (const element of elements) {
            const href = (element as HTMLAnchorElement).href
            if (href.startsWith(prefix2)) {
              const key = getUserProfileUrl(href)
              if (key) {
                let title = getTrimmedTitle(element)
                if (title) {
                  title = title.replace(/^@/, '')
                  const meta = { title, type: 'user' }
                  setUtags(element, key, meta)
                  element.dataset.utags_absolute = '1'
                  matchedNodesSet.add(element)
                }
              }
            }
          }
        },
        document.documentElement,
        {
          maxDepth: 50,
          includeTags: [
            'bili-comments',
            'bili-comment-thread-renderer',
            'bili-comment-renderer',
            'bili-comment-replies-renderer',
            'bili-comment-reply-renderer',
            'bili-comment-user-info',
            'bili-rich-text',
            'bili-user-profile',
          ],
        }
      )

      if (
        location.href.startsWith(prefix2) ||
        location.href.startsWith(prefix3 + 'space/')
      ) {
        // profile header
        const element = $('#h-name,.m-space-info .name,.upinfo__main .nickname')
        if (element) {
          const title = getTrimmedTitle(element)
          const key = getUserProfileUrl(location.href)
          if (title && key) {
            const meta = { title, type: 'user' }
            setUtags(element, key, meta)
            element.dataset.utags_node_type = 'link'
            matchedNodesSet.add(element)
          }
        }
      }

      // video title
      const element = $('h1.video-title,h1.title-text')
      if (element) {
        const title = getTrimmedTitle(element)
        const key = getVideoUrl(location.href)
        if (title && key) {
          const meta = { title, type: 'video' }
          setUtags(element, key, meta)
          matchedNodesSet.add(element)
        }
      }

      const elements4 = $$(
        [
          '.bili-video-card__info--right a',
          '.video-page-card-small .info a',
          '.video-page-operator-card-small .info a',
          // 个人页面视频列表
          '.bili-video-card__title a',
          // 个人页面置顶视频
          '.top-section__content a.top-video__title',
        ].join(',')
      ) as HTMLAnchorElement[]
      for (const element of elements4) {
        const key = getVideoUrl(element.href)
        if (key) {
          const title = getTrimmedTitle(element)
          const target =
            element.parentElement!.tagName === 'H3'
              ? element.parentElement!
              : element

          if (title) {
            const meta = { title, type: 'video' }
            setUtags(target, key, meta)
            target.dataset.utags_node_type = 'link'
            matchedNodesSet.add(target)
          }
        }
      }
    },
    getStyle: () => styleText,
  }
})()
