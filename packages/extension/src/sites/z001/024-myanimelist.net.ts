import styleText from 'data-text:./024-myanimelist.net.scss'

import defaultSite from '../default'

export default (() => {
  return {
    matches: /myanimelist\.net/,
    listNodesSelectors: [],
    conditionNodesSelectors: [],
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '#headerSmall',
      '#menu',
      '#nav',
      '.header',
      '#status-menu',
      'a[href^="/sns/register/"]',
      'a[href^="/logout"]',
      'a[href*="/membership?"]',
      'a[href*="/login.php"]',
      'a[href*="/register.php"]',
      'a[href*="/dbchanges.php"]',
      'a[href*="/editprofile.php"]',
      'a[href*="go=write"]',
      'a[href^="/ownlist/anime/add?"]',
      '[class*="btn-"]',
      '[class*="icon-"]',
      '[rel*="sponsored"]',
    ],
    getStyle: () => styleText,
  }
})()
