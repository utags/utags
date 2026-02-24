import { $ } from 'browser-extension-utils'
import styleText from 'data-text:./004-dxx.co.jp.scss'
import { getTrimmedTitle } from 'utags-utils'

import { setUtags } from '../../utils/dom-utils'
import { setUtagsAttributes } from '../../utils/index'
import defaultSite from '../default'

export default (() => {
  const prefix = 'https://www.dmm.co.jp/'

  /**
   * Convert DMM URL to canonical format
   * Transforms old format URLs to new format while preserving query parameters
   */
  function getCanonicalUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (href2.includes('/=/')) {
        return prefix + href2.replace(/\?.*/, '')
      }
    }

    // Convert old format to new format
    // https://www.dmm.co.jp/digital/videoa/-/list/?actress=1037568
    // => https://video.dmm.co.jp/av/list/?actress=1037568
    if (url.includes('www.dmm.co.jp/digital/videoa/-/list/')) {
      return url.replace(
        'https://www.dmm.co.jp/digital/videoa/-/list/',
        'https://video.dmm.co.jp/av/list/'
      )
    }

    // Convert old DMM detail URLs to new video content format
    // https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=tek00086/?i3_ref=list&i3_ord=1&i3_pst=1
    // => https://video.dmm.co.jp/av/content/?id=tek00086
    if (url.includes('www.dmm.co.jp/digital/videoa/-/detail/=/cid=')) {
      const cidMatch = /cid=([^&?/]+)/.exec(url)
      if (cidMatch && cidMatch[1]) {
        return `https://video.dmm.co.jp/av/content/?id=${cidMatch[1]}`
      }
    }

    // Clean up video content URLs by keeping only the id parameter
    // https://video.dmm.co.jp/av/content/?id=kwbd00232&i3_ref=list&i3_ord=2&i3_pst=1&dmmref=video_list
    // => https://video.dmm.co.jp/av/content/?id=kwbd00232
    if (url.includes('video.dmm.co.jp/av/content/') && url.includes('?')) {
      const urlObj = new URL(url)
      const idParam = urlObj.searchParams.get('id')
      if (idParam) {
        return `https://video.dmm.co.jp/av/content/?id=${idParam}`
      }
    }

    return url
  }

  function getProductUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (href2.includes('/detail/=/cid=')) {
        return prefix + href2.replace(/\?.*/, '')
      }
    }

    return undefined
  }

  function getMakerUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length)
      if (href2.includes('/list/=/article=maker/id=')) {
        return prefix + href2.replace(/\?.*/, '')
      }
    }

    return undefined
  }

  function getVideoActressUrl(url: string) {
    const normalizedUrl = getCanonicalUrl(url)
    if (normalizedUrl.startsWith('https://video.dmm.co.jp/av/list/?actress=')) {
      // https://video.dmm.co.jp/av/list/?actress=1037568
      return normalizedUrl
    }

    return undefined
  }

  function getVideoProductUrl(url: string) {
    const normalizedUrl = getCanonicalUrl(url)
    if (normalizedUrl.startsWith('https://video.dmm.co.jp/av/content/?id=')) {
      // https://video.dmm.co.jp/av/content/?id=kwbd00232
      return normalizedUrl
    }

    return undefined
  }

  return {
    matches: /dmm\.co\.jp/,
    preProcess() {
      let key = getProductUrl(location.href)
      if (key) {
        // post title
        const element = $('h1.productTitle__txt')
        if (element) {
          setUtagsAttributes(element, { key })
        }
      }

      key = getMakerUrl(location.href)
      if (key) {
        // post title
        const element = $('.circleProfile__name span')
        if (element) {
          setUtagsAttributes(element, { key })
        }
      }

      key = getVideoProductUrl(location.href)
      if (key) {
        // post title
        const element = $('main h1')
        if (element) {
          setUtagsAttributes(element, { key })
        }
      }
    },
    validate(element: HTMLAnchorElement, href: string) {
      if (!href.startsWith(prefix)) {
        return true
      }

      if (href.includes('/=/')) {
        const key = getProductUrl(href)
        if (key) {
          const titleElement = $(
            '.mainListLinkWork__txt,.responsive-name',
            element
          )
          const title = titleElement
            ? getTrimmedTitle(titleElement)
            : getTrimmedTitle(element)
          if (title) {
            const meta = { title, type: 'product' }
            setUtags(element, key, meta)
          }
        }

        return true
      }

      let key = getVideoActressUrl(href)
      if (key) {
        const titleElement = $('div > div > p', element)
        const title = titleElement
          ? getTrimmedTitle(titleElement)
          : getTrimmedTitle(element)
        if (title) {
          const meta = { title }
          setUtags(element, key, meta)
          element.dataset.utags_position_selector = 'div > div > p'
          return true
        }
      }

      key = getVideoProductUrl(href)
      if (key) {
        const titleElement = $('div > div > p', element)
        const title = titleElement
          ? getTrimmedTitle(titleElement)
          : getTrimmedTitle(element)
        if (title) {
          const meta = { title }
          setUtags(element, key, meta)
          element.dataset.utags_position_selector = 'div > div > p'
          return true
        }
      }

      return false
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      'header',
      '.localNav-list',
      '.m-leftNavigation',
      '.l-areaSideNavColumn',
      '.top-leftcolumn',
      '.top-rightcolumn',
      '.d-btn-xhi-st',
      '.headingTitle__txt--more',
      '.recommendCapt__txt',
      '.circleFanButton__content',
      '.displayFormat',
      '.pageNationList',
      '.nav-text-container',
      '.sub-nav-link',
      '.m-listHeader',
      '.dcd-review__rating_map',
      '.dcd-review_boxpagenation',
      '.sampleButton',
      '.right_navi_link',
      '[data-e2eid="search-form"]',
      '[data-e2eid="pagination"]',
    ],
    validMediaSelectors: [
      '.mainList',
      '.pickup .fn-responsiveImg',
      '#l-areaRecommendProduct',
      '[data-e2eid="list-actress-root"] li a',
      '[href^="/av/content/?id="]',
    ],
    getCanonicalUrl,
    getStyle: () => styleText,
  }
})()
