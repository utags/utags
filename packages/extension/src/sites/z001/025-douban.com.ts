import { deleteUrlParameters } from '../../utils'
import defaultSite from '../default'

export default (() => {
  function getCanonicalUrl(url: string) {
    if (url.includes('douban.com')) {
      return deleteUrlParameters(url, [
        'ref',
        'dcs',
        'dcm',
        'from',
        'from_',
        'dt_time_source',
        'target_user_id',
        '_dtcc',
        '_i',
      ])
    }

    return url
  }

  return {
    matches: /douban\.com/,
    listNodesSelectors: [],
    conditionNodesSelectors: [],
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '.tabs',
      'a[href*="/accounts/login?"]',
      'a[href*="/passport/login?"]',
      'a[href*="/register?"]',
    ],
    getCanonicalUrl,
  }
})()
