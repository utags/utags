import defaultSite from '../default'

export default (() => {
  return {
    matches: /lobste\.rs|dto\.pipecraft\.net|tilde\.news|journalduhacker\.net/,
    listNodesSelectors: [],
    conditionNodesSelectors: [],
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '#nav',
      '#header',
      '#subnav',
      '.mobile_comments',
      '.description_present',
      '.morelink',
      '.user_tree',
      '.dropdown_parent',
      'a[href^="/login"]',
      'a[href^="/logout"]',
      'a[href^="/u#"]',
      'a[href$="/save"]',
      'a[href$="/hide"]',
      'a[href$="/suggest"]',
    ],
  }
})()
