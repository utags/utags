import { $, $$ } from "browser-extension-utils"

const site = {
  getListNodes() {
    const patterns = [".box .cell"]
    return $$(patterns.join(","))
  },
  getConditionNodes() {
    const patterns = [
      ".box .cell .topic-link", // 帖子标题
      ".item_hot_topic_title a", // 右边栏标题
      '.box .cell .topic_info strong:first-of-type a[href*="/member/"]', // 帖子作者
      ".box .cell .topic_info .node", // 帖子节点
      '#Main strong a.dark[href*="/member/"]', // 评论者
    ]
    return $$(patterns.join(","))
  },
  matchedNodes() {
    const patterns = [
      // 所有页面帖子链接
      'a[href*="/t/"]',
      // 所有页面用户链接
      'a[href*="/member/"]',
      // 所有页面节点链接
      'a[href*="/go/"]',
      // TODO: 测试一段时间没问题时，下面都可以删掉
      // '.topic_info a[href*="/member/"]', // 帖子作者，最后回复者
      // "a.topic-link", // 帖子标题
      // ".box .cell .topic_info .node", // 帖子节点
      // ".item_hot_topic_title a", // 右边栏标题
      // '#Main strong a.dark[href*="/member/"]', // 评论者
      // '.topic_content a[href*="/member/"]', // 帖子内容中 @用户
      // '.topic_content a[href*="/t/"]', // 帖子内容中帖子链接
      // '.reply_content a[href*="/member/"]', // 回复内容中 @用户
      // '.reply_content a[href*="/t/"]', // 回复内容中帖子链接
      // '.header small a[href*="/member/"]', // 帖子详细页作者
      // '.header a[href*="/go/"]', // 帖子详细页节点
      // '.dock_area a[href*="/member/"]', // 个人主页回复列表作者
      // '.dock_area a[href*="/t/"]', // 个人主页回复列表帖子标题
    ]
    const elements = $$(patterns.join(","))

    const excludePatterns = [
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
    ]
    const excludeElements = new Set($$(excludePatterns.join(",")))

    function getCanonicalUrl(url: string) {
      return url
        .replace(/[?#].*/, "")
        .replace(/(\w+\.)?v2ex.com/, "www.v2ex.com")
    }

    const nodes = [...elements].map((element: HTMLAnchorElement) => {
      if (excludeElements.has(element)) {
        return {}
      }

      if (element.querySelector("img")) {
        return {}
      }

      const key = getCanonicalUrl(element.href)
      const title = element.textContent
      const meta = { title }
      element.utags = { key, meta }
      return element
    })

    if (location.pathname.includes("/member/")) {
      // 个人主页
      const profile = $("h1")
      if (profile) {
        const username = profile.textContent
        if (username) {
          const key = `https://www.v2ex.com/member/${username}`
          const meta = { title: username }
          profile.utags = { key, meta }
          nodes.push(profile)
        }
      }
    }

    if (location.pathname.includes("/t/")) {
      // 帖子详细页
      const header = $(".topic_content")
      if (header) {
        const key = getCanonicalUrl("https://www.v2ex.com" + location.pathname)
        const title = $("h1").textContent
        const meta = { title }
        header.utags = { key, meta }
        nodes.push(header)
      }
    }

    if (location.pathname.includes("/go/")) {
      // 节点页面
      const header = $(".cell_ops.flex-one-row input")
      if (header) {
        const key = getCanonicalUrl("https://www.v2ex.com" + location.pathname)
        const title = document.title.replace(/.*›\s*/, "").trim()
        const meta = { title }
        header.utags = { key, meta }
        nodes.push(header)
      }
    }

    return nodes
  },
}

export default site
