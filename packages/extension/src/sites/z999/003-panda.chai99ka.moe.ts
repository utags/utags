import { $, $$ } from 'browser-extension-utils'
import styleText from 'data-text:./003-panda.chai99ka.moe.scss'
import { getTrimmedTitle } from 'utags-utils'

import { setUtags } from '../../utils/dom-utils'
import { setUtagsAttributes } from '../../utils/index'
import defaultSite from '../default'

export default (() => {
  const prefix = 'https://panda.chaika.moe/'

  function getPostUrl(url: string, exact = false) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(25)
      if (exact) {
        if (/^archive\/\d+\/(\?.*)?$/.test(href2)) {
          return prefix + href2.replace(/^(archive\/\d+\/).*/, '$1')
        }
      } else if (/^archive\/\d+\//.test(href2)) {
        return prefix + href2.replace(/^(archive\/\d+\/).*/, '$1')
      }
    }

    return undefined
  }

  return {
    matches: /panda\.chaika\.moe/,
    preProcess() {
      const key = getPostUrl(location.href)
      if (key) {
        // post title
        const element = $('h5')
        if (element) {
          setUtagsAttributes(element, { key, type: 'post' })
        }
      }

      // https://panda.chaika.moe/?view=cover
      for (const element of $$('.gallery a.cover') as HTMLAnchorElement[]) {
        const key = element.href
        const titleElement = $('.cover-title', element)
        if (titleElement) {
          setUtagsAttributes(titleElement, { key, type: 'post' })
        }
      }

      // https://panda.chaika.moe/?view=extended
      for (const element of $$(
        '.td-extended > a[href^="/archive/"]'
      ) as HTMLAnchorElement[]) {
        const key = element.href
        const titleElement = $('h5', element.parentElement!.parentElement!)
        if (titleElement) {
          setUtagsAttributes(titleElement, { key, type: 'post' })
        }
      }
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '.navbar',
      'th',
      '.pagination',
      '.btn',
      '.caption',
    ],
    getStyle: () => styleText,
  }
})()
