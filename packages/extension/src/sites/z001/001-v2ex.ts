import { $, $$, createElement, parseInt10 } from 'browser-extension-utils'
import styleText from 'data-text:./001-v2ex.scss'
import { getTrimmedTitle } from 'utags-utils'

import {
  addVisited,
  markElementWhetherVisited,
  setVisitedAvailable,
} from '../../modules/visited'
import { setUtags } from '../../utils/dom-utils'
import { setUtagsAttributes } from '../../utils/index'
import defaultSite from '../default'

export default (() => {
  function getCanonicalUrl(url: string) {
    // https://links.pipecraft.net/www.v2ex.com/
    // => https://www.v2ex.com/
    if (url.startsWith('https://links.pipecraft')) {
      url = url.replace('https://links.pipecraft.net/', 'https://')
    }

    // TODO: /member/XXX 转为小写。但会影响已添加到的数据。需要做一个 migration

    if (url.includes('v2ex.com')) {
      return url
        .replace(/[?#].*/, '')
        .replace(/(\w+\.)?v2ex.com/, 'www.v2ex.com')
    }

    // https://global.v2ex.co/
    if (url.includes('v2ex.co')) {
      return url
        .replace(/[?#].*/, '')
        .replace(/(\w+\.)?v2ex.co/, 'www.v2ex.com')
    }

    return url
  }

  function cloneWithoutCitedReplies(element: HTMLElement) {
    const newElement = element.cloneNode(true) as HTMLElement
    for (const cell of $$('.cell', newElement)) {
      cell.remove()
    }

    return newElement
  }

  return {
    matches: /v2ex\.com|v2hot\.|v2ex\.co/,
    preProcess() {
      setVisitedAvailable(true)

      if (location.pathname.includes('/member/')) {
        // 个人主页
        const profile = $('.content h1')
        if (profile) {
          const username = profile.textContent
          if (username) {
            const key = `https://www.v2ex.com/member/${username}`
            setUtagsAttributes(profile, { key, type: 'user' })
          }
        }
      }

      if (location.pathname.includes('/t/')) {
        // 帖子详细页
        const header = $('.header h1')
        if (header) {
          const key = getCanonicalUrl(
            'https://www.v2ex.com' + location.pathname
          )
          setUtagsAttributes(header, { key, type: 'topic' })
          addVisited(key)
          markElementWhetherVisited(key, header)
        }

        const main = $('#Main') || $('.content')
        const replyElements = $$(
          '.box .cell[id^="r_"],.box .cell[id^="related_r_"]',
          main
        )
        for (const reply of replyElements) {
          const replyId = reply.id.replace('related_', '')
          const floorNoElement = $('.no', reply)
          const replyContentElement = $('.reply_content', reply)
          const agoElement = $('.ago,.fade.small', reply)
          if (replyId && floorNoElement && replyContentElement && agoElement) {
            let newAgoElement = $('a', agoElement)
            if (!newAgoElement) {
              newAgoElement = createElement('a', {
                textContent: agoElement.textContent,
                href: '#' + replyId,
              })
              agoElement.textContent = ''
              agoElement.append(newAgoElement)
            }

            const floorNo = parseInt10(floorNoElement.textContent || '1', 1)
            const pageNo = Math.floor((floorNo - 1) / 100) + 1
            const key =
              getCanonicalUrl('https://www.v2ex.com' + location.pathname) +
              '?p=' +
              String(pageNo) +
              '#' +
              replyId
            const title = getTrimmedTitle(
              cloneWithoutCitedReplies(replyContentElement)
            )

            setUtagsAttributes(newAgoElement, { key, title, type: 'reply' })
          }
        }

        // v2ex 超级增强回复
        // const replyElements2 = $$(".my-box .comment", main)
        // for (const reply of replyElements2) {
        //   const replyId = reply.id // 目前 v2ex 超级增强版本无法获得 ID
        //   const floorNoString = reply.dataset.floor
        //   const replyContentElement = $(".reply_content", reply)
        //   const agoElement = $(".ago", reply)
        //   if (replyId && floorNoString && replyContentElement && agoElement) {
        //     let newAgoElement = $("a", agoElement)
        //     if (!newAgoElement) {
        //       newAgoElement = createElement("a", {
        //         textContent: agoElement.textContent,
        //         href: "#" + replyId,
        //       })
        //       agoElement.textContent = ""
        //       agoElement.append(newAgoElement)
        //     }

        //     const floorNo = parseInt10(floorNoString, 1)
        //     const pageNo = Math.floor((floorNo - 1) / 100) + 1
        //     const key =
        //       getCanonicalUrl("https://www.v2ex.com" + location.pathname) +
        //       "?p=" +
        //       String(pageNo) +
        //       "#" +
        //       replyId
        //     const title =
        //       cloneWithoutCitedReplies(replyContentElement).textContent
        //     const meta = { title, type: "reply" }
        //     setUtags(newAgoElement, key, meta)
        //     matchedNodesSet.add(newAgoElement)
        //   }
        // }
      }

      if (location.pathname.includes('/go/')) {
        // 节点页面
        const header = $('.title .node-breadcrumb')
        if (header) {
          const key = getCanonicalUrl(
            'https://www.v2ex.com' + location.pathname
          )
          setUtagsAttributes(header, { key, type: 'node' })
        }
      }

      if (location.pathname.includes('/tag/')) {
        // 标签页面
        const header = $('.box .header > span')
        if (header) {
          const key = getCanonicalUrl(
            'https://www.v2ex.com' + location.pathname
          )
          header.dataset.utags_flag = 'tag_page'
          setUtagsAttributes(header, { key, type: 'tag' })
        }
      }
    },
    listNodesSelectors: [
      '.box .cell',
      // v2ex 超级增强
      '.my-box .comment',
    ],
    conditionNodesSelectors: [
      // 帖子标题
      '.box .cell .topic-link',
      // 右边栏标题
      '.item_hot_topic_title a',
      // 帖子作者
      '.box .cell .topic_info strong:first-of-type a[href*="/member/"]',
      // 帖子节点
      '.box .cell .topic_info .node',
      // VXNA 作者
      '.xna-source-author a',
      // VXNA 博客
      '.xna-entry-source a',
      // planet site address
      '.planet-site-address a',
      // 回复者
      '.box .cell strong a.dark[href*="/member/"]',
      // 回复内容标签
      '.box .cell .ago a',
      // 回复内容标签(手机网页版)
      '.box .cell .fade.small a',
      // 回复者 (v2ex 超级增强)
      '.comment .username',
      // 回复内容标签 (v2ex 超级增强)
      '.comment .ago',
    ],
    matchedNodesSelectors: [
      // 所有页面帖子链接
      'a[href*="/t/"]',
      // 所有页面用户链接
      'a[href*="/member/"]',
      // 所有页面节点链接
      'a[href*="/go/"]',
      // planet 链接
      'a[href*="/planet/"]',
      // 所有外部链接
      'a[href^="https://"]:not([href*="v2ex.com"])',
      'a[href^="http://"]:not([href*="v2ex.com"])',
      // 帖子标签
      '.box .cell .fr .tag',
      '.box .inner .tag',
    ],
    excludeSelectors: [
      ...defaultSite.excludeSelectors,
      // 导航栏
      '.site-nav a',
      // 标签栏
      '.cell_tabs a',
      // 标签栏
      '.tab-alt-container a',
      // 标签栏
      '#SecondaryTabs a',
      // 分页
      'a.page_normal,a.page_current',
      // 回复数量
      'a.count_livid',
      // v2ex 超级增强脚本添加的元素
      '.post-item a.post-content',
      // planet 帖子时间
      '.planet-post-time',
    ],
    getStyle: () => styleText,
    getCanonicalUrl,
    postProcess() {
      for (const element of $$('a[href*="/t/"]') as HTMLAnchorElement[]) {
        const key = getCanonicalUrl(element.href)

        markElementWhetherVisited(key, element)
      }
    },
  }
})()
