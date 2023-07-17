import { $, $$, createElement, parseInt10 } from "browser-extension-utils"

import defaultSite from "./default"

function getCanonicalUrl(url: string) {
  return url.replace(/[?#].*/, "").replace(/(\w+\.)?v2ex.com/, "www.v2ex.com")
}

export function cloneWithoutCitedReplies(element: HTMLElement) {
  const newElement = element.cloneNode(true) as HTMLElement
  for (const cell of $$(".cell", newElement)) {
    cell.remove()
  }

  return newElement
}

const site = {
  matches: /v2ex\.com|v2hot\./,
  listNodesSelectors: [".box .cell"],
  // getListNodes() {
  //   const patterns = [".box .cell"]
  //   return $$(patterns.join(","))
  // },
  conditionNodesSelectors: [
    // 帖子标题
    ".box .cell .topic-link",
    // 右边栏标题
    ".item_hot_topic_title a",
    // 帖子作者
    '.box .cell .topic_info strong:first-of-type a[href*="/member/"]',
    // 帖子节点
    ".box .cell .topic_info .node",
    // 回复者
    '.box .cell strong a.dark[href*="/member/"]',
    // 回复内容标签
    ".box .cell .ago a",
    // 回复内容标签(手机网页版)
    ".box .cell .fade.small a",
  ],
  // getConditionNodes() {
  //   const patterns = [
  //     ".box .cell .topic-link", // 帖子标题
  //     ".item_hot_topic_title a", // 右边栏标题
  //     '.box .cell .topic_info strong:first-of-type a[href*="/member/"]', // 帖子作者
  //     ".box .cell .topic_info .node", // 帖子节点
  //     '#Main strong a.dark[href*="/member/"]', // 评论者
  //   ]
  //   return $$(patterns.join(","))
  // },
  includeSelectors: [
    // 所有页面帖子链接
    'a[href*="/t/"]',
    // 所有页面用户链接
    'a[href*="/member/"]',
    // 所有页面节点链接
    'a[href*="/go/"]',
    // 所有外部链接
    'a[href^="https://"]:not([href*="v2ex.com"])',
    'a[href^="http://"]:not([href*="v2ex.com"])',
  ],
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    // 导航栏
    ".site-nav a",
    // 标签栏
    ".cell_tabs a",
    // 标签栏
    ".tab-alt-container a",
    // 标签栏
    "#SecondaryTabs a",
    // 分页
    "a.page_normal,a.page_current",
    // 回复数量
    "a.count_livid",
    // v2ex 超级增强脚本添加的元素
    ".post-item a.post-content",
  ],
  addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
    if (location.pathname.includes("/member/")) {
      // 个人主页
      const profile = $("h1")
      if (profile) {
        const username = profile.textContent
        if (username) {
          const key = `https://www.v2ex.com/member/${username}`
          const meta = { title: username, type: "user" }
          profile.utags = { key, meta }
          matchedNodesSet.add(profile)
        }
      }
    }

    if (location.pathname.includes("/t/")) {
      // 帖子详细页
      const header = $(".header h1")
      if (header) {
        const key = getCanonicalUrl("https://www.v2ex.com" + location.pathname)
        const title = $("h1").textContent
        const meta = { title, type: "topic" }
        header.utags = { key, meta }
        matchedNodesSet.add(header)
      }

      const main = $("#Main") || $(".content")
      const replyElements = $$('.box .cell[id^="r_"]', main)
      for (const reply of replyElements) {
        const replyId = reply.id
        const floorNoElement = $(".no", reply)
        const replyContentElement = $(".reply_content", reply)
        const agoElement = $(".ago,.fade.small", reply)
        if (replyId && floorNoElement && replyContentElement && agoElement) {
          let newAgoElement = $("a", agoElement)
          if (!newAgoElement) {
            newAgoElement = createElement("a", {
              textContent: agoElement.textContent,
              href: "#" + replyId,
            })
            agoElement.textContent = ""
            agoElement.append(newAgoElement)
          }

          const floorNo = parseInt10(floorNoElement.textContent!, 1)
          const pageNo = Math.floor((floorNo - 1) / 100) + 1
          const key =
            getCanonicalUrl("https://www.v2ex.com" + location.pathname) +
            "?p=" +
            String(pageNo) +
            "#" +
            replyId
          const title =
            cloneWithoutCitedReplies(replyContentElement).textContent
          const meta = { title, type: "reply" }
          newAgoElement.utags = { key, meta }
          matchedNodesSet.add(newAgoElement)
        }
      }
    }

    if (location.pathname.includes("/go/")) {
      // 节点页面
      const header = $(".cell_ops.flex-one-row input")
      if (header) {
        const key = getCanonicalUrl("https://www.v2ex.com" + location.pathname)
        const title = document.title.replace(/.*›\s*/, "").trim()
        const meta = { title, type: "node" }
        header.utags = { key, meta }
        matchedNodesSet.add(header)
      }
    }
  },
  getCanonicalUrl,
}

export default site
