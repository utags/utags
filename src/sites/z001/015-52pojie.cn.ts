import { addStyle, runOnce } from "browser-extension-utils"

import defaultSite from "../default"

const site = {
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
    "#hd",
    "#pt",
    "#pgt",
    // 右边工具栏
    "#jz52top",
  ],
  addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
    // TODO: Needs refactoring
    // Add style
    runOnce("site:addStyle", () => {
      addStyle(`
.fl cite,
.tl cite {
  white-space: break-spaces;
}
.favatar .pi .authi a {
  line-height: 16px;
}
.favatar .pi {
  height: auto;
}
      `)
    })
  },
}

export default site
