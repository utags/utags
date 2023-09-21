import { $$, createElement } from "browser-extension-utils"
import styleText from "data-text:./023-rebang.today.scss"

import defaultSite from "../default"

/* eslint-disable @typescript-eslint/naming-convention */
const nodeNameMap = {
  知乎: "zhihu",
  微博: "weibo",
  IT之家: "ithome",
  虎扑: "hupu",
  豆瓣社区: "douban-community",
  虎嗅: "huxiu",
  少数派: "sspai",
  网易新闻: "ne-news",
  澎湃新闻: "thepaper",
  小红书: "xiaohongshu",
  "36氪": "36kr",
  今日头条: "toutiao",
  爱范儿: "ifanr",
  豆瓣书影音: "douban-media",
  什么值得买: "smzdm",
  百度: "baidu",
  百度贴吧: "baidu-tieba",
  吾爱破解: "52pojie",
  观风闻: "guancha-user",
  雪球: "xueqiu",
  东方财富: "eastmoney",
  新浪财经: "sina-fin",
  蓝点网: "landian",
  小众软件: "appinn",
  反斗限免: "apprcn",
  NGA社区: "nga",
  游民星空: "gamersky",
  喷嚏网: "penti",
  沙雕新闻: "shadiao-news",
  抖音: "douyin",
  哔哩哔哩: "bilibili",
  直播吧: "zhibo8",
  掘金: "juejin",
  技术期刊: "journal-tech",
  开发者头条: "toutiaoio",
  GitHub: "github",
  AcFun: "acfun",
  宽带山: "kds",
  V2EX: "v2ex",
  格隆汇: "gelonghui",
  第一财经: "diyicaijing",
  InfoQ: "infoq",
  CSDN: "csdn",
}
/* eslint-enable @typescript-eslint/naming-convention */

const site = {
  matches: /rebang\.today/,
  preProcess() {
    const nodes = $$(":not(a) > .arco-tag-content")
    for (const node of nodes) {
      const name = node.textContent
      if (name && !node.closest("a")) {
        const nodeId = nodeNameMap[name] as string
        if (nodeId) {
          const a = createElement("a", {
            href: "https://rebang.today/home?tab=" + nodeId,
          })
          node.after(a)
          a.append(node)
        }
      }
    }
  },
  listNodesSelectors: [
    ".w-screen ul:not(.utags_ul) > li",
    "aside .w-full .select-none",
  ],
  conditionNodesSelectors: [
    '[data-utags_list_node] [data-utags]:not([href^="https://www.v2ex.com/member/"])',
    '[data-utags_list_node] a[href^="https://www.v2ex.com/member/"][data-utags].hidden',
  ],
  matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    "header",
    // V2EX comment count
    ".absolute.rounded-xl",
    // GitHub description
    "ul li h1 + p a",
  ],
  validMediaSelectors: [
    // 微博
    ".text-text-100",
    // 技术期刊 > 博主头像
    ".items-center .rounded-full",
    'a[href^="https://github.com/"] svg',
    'a[href^="https://space.bilibili.com/"] img',
    'a[href^="https://toutiao.io/subjects/"] img',
    "svg.arco-icon",
  ],
  getStyle: () => styleText,
}

export default site
