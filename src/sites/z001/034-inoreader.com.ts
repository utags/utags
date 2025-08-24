import { $, $$, doc, hasClass } from 'browser-extension-utils'
import styleText from 'data-text:./034-inoreader.com.scss'

import defaultSite from '../default'

export default (() => {
  const prefix = location.origin + '/'

  function getArticleUrl(url: string) {
    if (url.startsWith(prefix)) {
      const href2 = url.slice(prefix.length).toLowerCase()
      if (/^article\/\w+(-[^?#]*)?([?#].*)?$/.test(href2)) {
        return prefix + href2.replace(/^(article\/\w+)-.*/, '$1')
      }
    }

    return undefined
  }

  return {
    matches: /\w+\.inoreader\.com/,
    listNodesSelectors: [
      // ".article_tile",
      // ".article_magazine",
      '.ar',
    ],
    conditionNodesSelectors: [
      // Card view
      '.article_tile .article_tile_footer_feed_title a',
      '.article_tile a.article_title_link',
      // Magazine view
      '.article_magazine .article_magazine_feed_title a',
      '.article_magazine a.article_magazine_title_link',
      // Column view
      '.ar .column_view_title a',
      // List view
      '.ar .article_title_wrapper a',
      // Expanded view
      '.ar.article_card .article_sub_title a',
      '.ar.article_card a.article_title_link',
    ],
    validate(element: HTMLAnchorElement) {
      const href = element.href

      if (!href.startsWith(prefix)) {
        return true
      }

      if (element.closest('#search_content .featured_category')) {
        element.dataset.utags_position_selector = 'span'
      }

      const key = getArticleUrl(href)
      if (key) {
        const title = element.textContent.trim()
        if (!title) {
          return false
        }

        const meta = { type: 'article', title }
        element.utags = { key, meta }
        element.dataset.utags = element.dataset.utags || ''

        if (element.closest('.search_feed_article')) {
          element.dataset.utags_position_selector = 'h6'
        }

        return true
      }

      return true
    },
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      '#side-nav',
      'a[href^="/preferences"]',
      'a[href^="/upgrade"]',
      'a[href^="/login"]',
      'a[href^="/signup"]',
      'a[href^="/sign_up"]',
      'a[href^="/forgot-password"]',
      '#preference-section-content',
      '#preference-section-settings',
      '.inno_tabs_tab',
      '.profile_checklist',
      '.gadget_overview_feed_title',
      '.header_name',
    ],
    addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
      const key = getArticleUrl(location.href)
      if (key) {
        const element = $('.article_full_contents div.article_title')
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: 'article' }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    postProcess() {
      const isDarkMode = hasClass(doc.body, 'theme_dark')
      doc.documentElement.dataset.utags_darkmode = isDarkMode ? '1' : '0'
    },
    getStyle: () => styleText,
  }
})()
