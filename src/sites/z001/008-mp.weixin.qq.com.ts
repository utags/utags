import { $ } from 'browser-extension-utils'

export default (() => {
  function getCanonicalUrl(url: string) {
    if (url.startsWith('http://mp.weixin.qq.com')) {
      url = url.replace(/^http:/, 'https:')
    }

    if (url.startsWith('https://mp.weixin.qq.com/s/')) {
      url = url.replace(/(\/s\/[\w-]+).*/, '$1')
    }

    if (url.startsWith('https://mp.weixin.qq.com/') && url.includes('#')) {
      url = url.replace(/#.*/, '')
    }

    return url
  }

  return {
    matches: /mp\.weixin\.qq\.com/,
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      const element = $('h1.rich_media_title')
      if (element) {
        const title = element.textContent!.trim()
        if (title) {
          const key = getCanonicalUrl(location.href)
          const meta = { title }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    },
    getCanonicalUrl,
  }
})()
