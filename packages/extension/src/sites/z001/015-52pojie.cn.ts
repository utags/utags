import styleText from 'data-text:./015-52pojie.cn.scss'

import defaultSite from '../default'

export default (() => {
  return {
    // Discuz
    matches: /52pojie\.cn/,
    matchedNodesSelectors: [
      'a[href*="home.php?mod=space&uid="]',
      'a[href*="home.php?mod=space&username="]',
      // 'a[href*="thread-"]',
      // 'a[href*="forum-"]',
    ],
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '#hd',
      '#pt',
      '#pgt',
      // 右边工具栏
      '#jz52top',
    ],
    getStyle: () => styleText,
  }
})()
