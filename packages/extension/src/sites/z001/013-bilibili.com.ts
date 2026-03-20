import { $, $$, removeAttribute, setAttribute } from 'browser-extension-utils'
import styleText from 'data-text:./013-bilibili.com.scss'
import { getTrimmedTitle } from 'utags-utils'

import { setUtags } from '../../utils/dom-utils'
import { setUtagsAttributes } from '../../utils/index'

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

  function waitForVideoReady() {
    if (location.href.startsWith(prefix + 'video/')) {
      // Must wait until video ready
      if ($('.bpx-state-loading')) {
        setAttribute($('.right-container'), 'data-utags_exclude', '')
        setAttribute(
          $('h1.video-title,h1.title-text'),
          'data-utags_exclude',
          ''
        )
        return
      }

      if (!$('bili-comments')) {
        setAttribute($('.right-container'), 'data-utags_exclude', '')
        setAttribute(
          $('h1.video-title,h1.title-text'),
          'data-utags_exclude',
          ''
        )
        return
      }

      removeAttribute($('.right-container'), 'data-utags_exclude')
      removeAttribute($('h1.video-title,h1.title-text'), 'data-utags_exclude')
    }
  }

  return {
    matches: /bilibili\.com|biligame\.com/,
    preProcess() {
      waitForVideoReady()
      // ?? url?
      // profile header
      const element = $('h1[data-e2e="user-title"]')
      if (element) {
        const title = getTrimmedTitle(element)
        const key = getUserProfileUrl(location.href)
        if (title && key) {
          setUtagsAttributes(element, { key, type: 'user' })
        }
      }

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
            setUtagsAttributes(element, { key, type: 'user' })
          }
        }
      }

      // ?? which page?
      const elements = $$(
        '.user-name[data-user-id],.sub-user-name[data-user-id],.jump-link.user[data-user-id]'
      )
      for (const element of elements) {
        const userId = element.dataset.userId
        if (!userId) {
          return false
        }

        const key = prefix2 + userId
        setUtagsAttributes(element, { key, type: 'user' })
      }

      {
        // video title
        const element = $('h1.video-title,h1.title-text')
        if (element) {
          const title = getTrimmedTitle(element)
          const key = getVideoUrl(location.href)
          if (title && key) {
            setUtagsAttributes(element, { key, type: 'video' })
          }
        }
      }
    },
    listNodesSelectors: [
      // '.css-ulyotp-DivCommentContentContainer',
      // '.css-1gstnae-DivCommentItemWrapper',
      // '.css-x6y88p-DivItemContainerV2',
    ],
    conditionNodesSelectors: [
      // '.css-ulyotp-DivCommentContentContainer a[href^="/@"]',
      // '.css-1gstnae-DivCommentItemWrapper a[href^="/@"]',
      // '.css-x6y88p-DivItemContainerV2 a[href^="/@"]',
    ],
    validate(element: HTMLAnchorElement, href: string) {
      // element.dataset.utags_absolute = '1'
      if (
        !href.includes('bilibili.com') ||
        !(element instanceof HTMLAnchorElement)
      ) {
        return true
      }

      let key = getUserProfileUrl(href)
      if (key) {
        const titleElement = $('.name,.bili-video-card__info--author', element)
        const title = getTrimmedTitle(titleElement || element).replace(/^@/, '')

        if (!title) {
          return false
        }

        const targetElement = element.closest<HTMLElement>(
          '.video-page-card-small div.upname'
        )
        if (targetElement && targetElement !== element) {
          // A 标签后面显示 utags 会被隐藏。故把 utags 添加在 A 标签的父节点。
          setUtagsAttributes(targetElement, { key, type: 'user', title })
          return false
        }

        const meta = { type: 'user', title }

        setUtags(element, key, meta)
        // element.dataset.utags = element.dataset.utags || ""

        return true
      }

      key = getVideoUrl(href)
      if (key) {
        const titleElement = $('h3,[data-e2e="browse-username"]', element)
        const title = getTrimmedTitle(titleElement || element)

        if (!title) {
          return false
        }

        // 首页视频卡片
        // if (element.closest('h3.bili-video-card__info--tit')) {
        //   element.dataset.utags_position_selector = 'h3.bili-video-card__info--tit'
        // }
        // h3.bili-video-card__info--tit - 首页 视频卡片
        // .bili-video-card__details .bili-video-card__title - 个人主页 > 视频卡片
        const targetElement = element.closest<HTMLElement>(
          'h3.bili-video-card__info--tit,.bili-video-card__details .bili-video-card__title'
        )
        if (targetElement && targetElement !== element) {
          // A 标签后面显示 utags 会被隐藏。故把 utags 添加在 A 标签的父节点。
          setUtagsAttributes(targetElement, { key, type: 'video', title })
          return false
        }

        const meta = { type: 'video', title }

        setUtags(element, key, meta)
        // element.dataset.utags = element.dataset.utags || ""

        return true
      }

      return true
    },
    excludeSelectors: [
      '.bili-header',
      '.large-header',
      '.header-channel',
      '.nav-bar',
      '.primary-btn',
      'a.send-msg',
      'a.message',
      'a.message-btn',
      'a.up-avatar',
      '.player-wrap',
      '.video-toolbar-container',
      '.right-container-inner .ad-report',
      '.danmaku-box',
      '.slide-ad-exp',
      '.video-card-ad-small',
      '.rcmd-tab .video-pod',
      '.usercard-wrap .social',
      // 评论区用户卡片
      '#fans',
      '#follow',
      // old version
      '#navigator',
      '#navigator-fixed',
      '.h-action',
      '.h-f-btn',
      '.section-title',
      '.page-head',
      '.contribution-list',
      '.section.fav',
      '.fav-list-container',
      '.fav-play',
    ],
    validMediaSelectors: [
      // Validated user icon
      'svg.icon-up',
      'svg.bili-video-card__info--owner__up',
      'svg.bili-video-card__info--author-ico',
      '.upname svg',
    ],
    getStyle: () => styleText,
  }
})()
