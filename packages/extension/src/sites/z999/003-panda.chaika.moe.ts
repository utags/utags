import { $, $$ } from 'browser-extension-utils'
import styleText from 'data-text:./003-panda.chaika.moe.scss'
import { getTrimmedTitle } from 'utags-utils'

import { setUtags } from '../../utils/dom-utils'
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
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '.navbar',
      'th',
      '.pagination',
      '.btn',
      '.caption',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      const key = getPostUrl(location.href)
      if (key) {
        // post title
        const element = $('h5')
        if (element) {
          const title = getTrimmedTitle(element)
          if (title) {
            const meta = { title, type: 'post' }
            setUtags(element, key, meta)
            matchedNodesSet.add(element)
          }
        }
      }

      for (const element of $$('.gallery a.cover') as HTMLAnchorElement[]) {
        const key = element.href
        const titleElement = $('.cover-title', element)
        if (titleElement) {
          const title = getTrimmedTitle(titleElement)
          const meta = { title, type: 'post' }

          setUtags(titleElement, key, meta)
          titleElement.dataset.utags_node_type = 'link'
          matchedNodesSet.add(titleElement)
        }
      }

      for (const element of $$(
        '.td-extended > a[href^="/archive/"]'
      ) as HTMLAnchorElement[]) {
        const key = element.href
        const titleElement = $('h5', element.parentElement!.parentElement!)
        if (titleElement) {
          const title = titleElement.textContent
          const meta = { title, type: 'post' }

          setUtags(titleElement, key, meta)
          titleElement.dataset.utags_node_type = 'link'
          matchedNodesSet.add(titleElement)
        }
      }
    },
    getStyle: () => styleText,
  }
})()
