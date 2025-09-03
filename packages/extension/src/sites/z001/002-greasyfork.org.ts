import { $ } from 'browser-extension-utils'
import styleText from 'data-text:./002-greasyfork.org.scss'

import defaultSite from '../default'

export default (() => {
  function getScriptUrl(url: string) {
    return getCanonicalUrl(url.replace(/(scripts\/\d+)(.*)/, '$1'))
  }

  function getCanonicalUrl(url: string) {
    if (/(greasyfork|sleazyfork)\.org/.test(url)) {
      url = url.replace(
        /((greasyfork|sleazyfork)\.org\/)(\w{2}(-\w{2})?)(\/|$)/,
        '$1'
      )
      if (url.includes('/scripts/')) {
        return url.replace(/(scripts\/\d+)([^/]*)/, '$1')
      }

      if (url.includes('/users/')) {
        return url.replace(/(users\/\d+)(.*)/, '$1')
      }
    }

    return url
  }

  return {
    matches: /(greasyfork|sleazyfork)\.org/,
    listNodesSelectors: ['.script-list > li', '.discussion-list-container'],
    conditionNodesSelectors: [
      // script title
      '.script-list li .script-link',
      // script author
      '.script-list li .script-list-author a',
      '.discussion-list-container .script-link',
      '.discussion-list-container .discussion-title',
      // Discussion author
      '.discussion-list-container .discussion-meta-item:nth-child(2) > a',
    ],
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '.sidebar',
      '.pagination',
      '.sign-out-link,.sign-in-link',
      '.with-submenu',
      '#script-links.tabs',
      '#install-area',
      '.self-link',
      '.discussion-subscribe',
      '.discussion-unsubscribe',
      // History > version numbers
      '.history_versions .version-number',
      'a[href*="show_all_versions"]',
      'a[href*="/reports/new"]',
      'a[href*="/conversations/new"]',
      'a[href*="/discussions/mark_all_read"]',
      'a[href*="/discussions/new"]',
      // Show results for all languages OR Show xxx results only
      'div.sidebarred-main-content > p:nth-child(3) > a',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      if (location.pathname.includes('/scripts/')) {
        // script name
        const element = $('#script-info header h2')
        if (element) {
          const title = element.textContent
          if (title) {
            const key = getScriptUrl(location.href)
            const meta = { title }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      } else if (location.pathname.includes('/users/')) {
        // user name
        const element = $('#about-user h2')
        if (element) {
          const title = element.textContent
          if (title) {
            const key = getCanonicalUrl(location.href)
            const meta = { title }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getCanonicalUrl,
    getStyle: () => styleText,
  }
})()
