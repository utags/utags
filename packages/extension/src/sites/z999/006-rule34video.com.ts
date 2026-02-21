import { $, setAttribute } from 'browser-extension-utils'
import styleText from 'data-text:./006-rule34video.com.scss'
import { getTrimmedTitle } from 'utags-utils'

import { setUtags } from '../../utils/dom-utils'
import { setUtagsAttributes } from '../../utils/index'
import defaultSite from '../default'

export default (() => {
  const prefix = location.origin + '/'

  function getModelUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (/^models\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/^(models\/[\w-]+).*/, '$1') + '/'
      }
    }

    return undefined
  }

  function getMemberUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (/^members\/\d+/.test(href2)) {
        return prefix + href2.replace(/^(members\/\d+).*/, '$1') + '/'
      }
    }

    return undefined
  }

  function getCategoryUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (/^categories\/[\w-]+/.test(href2)) {
        return prefix + href2.replace(/^(categories\/[\w-]+).*/, '$1') + '/'
      }
    }

    return undefined
  }

  function getVideoUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (/^video\/\d+(\/[\w-]+)?/.test(href2)) {
        return prefix + href2.replace(/^(video\/\d+(\/[\w-]+)?).*/, '$1') + '/'
      }
    }

    return undefined
  }

  return {
    matches: /rule34video\.com|rule34gen\.com/,
    preProcess() {
      let key = getModelUrl(location.href)
      if (key) {
        // title
        const element = $('.brand_inform .title')
        if (element) {
          setUtagsAttributes(element, { key, type: 'model' })
        }
      }

      key = getMemberUrl(location.href)
      if (key) {
        // title
        const element = $('.channel_logo .title')
        if (element) {
          setUtagsAttributes(element, { key, type: 'user' })
        }
      }

      key = getCategoryUrl(location.href)
      if (key) {
        // title
        const element = $('.brand_inform .title')
        if (element) {
          setUtagsAttributes(element, { key, type: 'category' })
        }
      }

      key = getVideoUrl(location.href)
      if (key) {
        // title
        const element = $('h1.title_video')
        if (element) {
          setUtagsAttributes(element, { key, type: 'video' })
        }
      }
    },
    listNodesSelectors: [
      //
      '.list-comments .item',
      '.thumbs .item',
    ],
    conditionNodesSelectors: [
      //
      '.list-comments .item .comment-info .inner a',
      '.thumbs .item a.th',
    ],
    validate(element: HTMLAnchorElement, href: string) {
      if (!href.startsWith(prefix)) {
        if ($('header', element.parentElement!)) {
          // AD
          const key = href.replace(/(https?:\/\/[^/]+\/).*/, '$1')
          const meta = { type: 'AD', title: 'AD' }

          setUtags(element, key, meta)
          setAttribute(element, 'data-utags', element.dataset.utags || '')
        }

        return true
      }

      const key = getVideoUrl(href)
      if (key) {
        const titleElement = $('.thumb_title', element)
        const title = titleElement
          ? getTrimmedTitle(titleElement)
          : getTrimmedTitle(element)

        if (!title) {
          return false
        }

        const meta = { type: 'video', title }

        setUtags(element, key, meta)
        setAttribute(element, 'data-utags', element.dataset.utags || '')

        return true
      }

      setAttribute(element, 'data-utags', element.dataset.utags || '')

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '.header',
      '.btn_more',
      '.tabs-menu',
      '.pagination',
      '.headline',
      '.prev',
      '.next',
      '.btn',
      '.all',
      '.tag_item_suggest',
      'a[href*="download"]',
      '.list-comments .wrap_image',
    ],
    getStyle: () => styleText,
  }
})()
