# UTags - Add usertags to links

Allow users to add custom tags to links. For example, you can add tags to forum members or posts.

**UTags** = **Usertags**。**Userscript**, **Userstyle** 可以让用户自定义网站的功能和样式，**Usertags** 允许用户自定义网站的标签。

目前支持的网站

- [www.v2ex.com](https://www.v2ex.com/)
- [greasyfork.org](https://greasyfork.org/) and [sleazyfork.org](https://sleazyfork.org/)
- [hacker news](https://news.ycombinator.com/) (news.ycombinator.com)
- [lobste.rs](https://lobste.rs/)
- [github.com](https://github.com/)
- [www.reddit.com](https://www.reddit.com/)
- [twitter.com](https://twitter.com/)
- [mp.weixin.qq.com](https://mp.weixin.qq.com/)
- [www.instagram.com](https://www.instagram.com/)
- [www.threads.net](https://www.threads.net/)
- [www.facebook.com](https://www.facebook.com/)
- [www.youtube.com](https://www.youtube.com/)
- [www.bilibili.com](https://www.bilibili.com/)
- [www.tiktok.com](https://www.tiktok.com/)
- [www.52pojie.cn](https://www.52pojie.cn/)
- [juejin.cn](https://juejin.cn/)
- And more. Click [here](https://greasyfork.org/scripts/460718-utags-add-usertags-to-links/feedback) to add more sites.

## Usage

- 鼠标移到帖子标题或用户名上面，旁边会出现标签 🏷️ 图标，点击图标添加标签
  ![screenshots](https://greasyfork.s3.us-east-2.amazonaws.com/5lso2l5779ompdep7mmvkivsyxin)

- 多个标签用逗号分隔（半角逗号符号、全角逗号符号都可以）
  ![screenshots](https://greasyfork.s3.us-east-2.amazonaws.com/quyien946y8bbpdtdi0tyf0pbsmf)

- 帖子标题，用户名，节点都可以添加标签
  ![screenshots](https://greasyfork.s3.us-east-2.amazonaws.com/h5x46uh3w12bfyhtfyo1wdip0xu4)

- 特殊标签有特殊效果，比如：sb, block, 标题党, 推广, 无聊, 忽略, 已阅, hide, 隐藏, 不再显示, 热门, 收藏, 关注, 稍后阅读等
  ![screenshots](https://greasyfork.s3.us-east-2.amazonaws.com/568f6cu7je6isfx858kuyjorfl5n)

## 手机版截图

- 主题列表

![screenshots](https://i.imgur.com/RBpOdzL.jpeg)

![screenshots](https://i.imgur.com/byywcBy.jpeg)

![screenshots](https://i.imgur.com/YdilUsi.jpeg)

- 评论区

![screenshots](https://i.imgur.com/smU24o8.jpeg)

![screenshots](https://i.imgur.com/coLUFOj.jpeg)

![screenshots](https://i.imgur.com/vwtalwQ.jpeg)

- 功能设置

![screenshots](https://i.imgur.com/SYbJxGe.jpeg)

- 视频版演示

📺 [YouTube](https://www.youtube.com/watch?v=zlNqk0nhLdI)

## Twitter.com Screenshots

![screenshots](https://assets.bestxtools.com/i/vrnci)

---

![screenshots](https://assets.bestxtools.com/i/huzhd)

---

![screenshots](https://assets.bestxtools.com/i/otxvl)

## Threads.net Screenshots

![screenshots](https://assets.bestxtools.com/i/irrgl)

---

![screenshots](https://assets.bestxtools.com/i/trwns)

---

![screenshots](https://assets.bestxtools.com/i/zvpbo)

---

![screenshots](https://assets.bestxtools.com/i/pckyc)

## 功能特点

- 在浏览的页面可以直接添加标签，保存标签时不会刷新页面
- 不仅可以给用户打标签，还可以给帖子（主题）和节点打标签
- 在[标签列表](https://utags.pipecraft.net/tags/)页面，可以看到有标签的用户和帖子，按更新顺序排序
- 支持 Vimium 扩展，点击 'f' 键，标签图标按钮也会有提示，可以快速添加标签
- 支持[数据导出、导入](https://utags.pipecraft.net/data/)
- 支持导入 [v2ex user tag](https://greasyfork.org/scripts/437891-v2ex-user-tag) 油猴脚本的数据
- 除了 V2EX，以后还会支持更多的网站
- 与 V2EX Plus, V2EX Polish, V2EX 超级增强, [V2EX.REP](https://greasyfork.org/zh-CN/scripts/466589-v2ex-rep) 等插件兼容
- 支持 V2EX 手机网页版
- 兼容以下用户脚本管理器
  - Tampermonkey (推荐)
  - Violentmonkey
  - Greasemonkey
  - Userscripts (Safari)

### 彩蛋

- 标签设置为 'sb'，该用户的帖子或评论都会半透明显示，可以方便跳过价值低的内容
- 标签设置为 'block'，该用户的帖子或评论都会被隐藏，眼不见，心不烦
- 更多特殊标签，比如：标题党, 推广, 无聊, 忽略, 已阅, hide, 隐藏, 不再显示, 热门, 收藏, 关注, 稍后阅读

## Roadmap

- 网页内所有链接显示添加标签按钮
- 支持自定义网站规则
- 支持自定义标签样式
- 展示其他用户们的标签内容
- 多设备数据同步

More information: [https://github.com/utags/utags](https://github.com/utags/utags)

## Release Notes

- 0.7.5
  - Handle default site rules for chrome extension and firefox addon
  - Add option to enable/disable utags on current site
  - Update bilibili, github selectors
- 0.7.3
  - Update bilibili selectors
  - Update merging logic
- 0.7.2
  - Apply utags to 52pojie.cn
  - Apply utags to juejin.cn
- 0.7.1
  - Apply utags to tiktok.com
  - Apply utags to bilibili.com
  - Apply utags to youtube.com
  - Apply utags to facebook.com
- 0.7.0
  - Apply utags to threads.net
  - Apply utags to instagram.com
  - Apply utags to mp.weixin.qq.com
- 0.6.7
  - Apply utags to twitter.com
- 0.6.6
  - \[github\] Match username in issues, PRs and commits
  - Prevent utags elements from being remade when the tags have not changed
- 0.6.5
  - Apply utags to reddit.com
- 0.6.4
  - Apply utags to github.com
- 0.6.3
  - Apply utags to lobste.rs
  - Move focus on utags elements through the TAB key
  - Show utags with vimium hint marker on Firefox
- 0.6.0
  - Apply utags to hacker news (news.ycombinator.com)
- 0.5.2
  - Improve performance
  - Prevent tag content from being copied together when copying HTML text
- 0.5.1
  - \[V2EX\] 调整主题页主题标签的显示位置
  - \[V2EX\] 允许给回复添加标签
- 0.5.0
  - Apply utags to greasyfork.org and sleazyfork.org
  - \[V2EX\] 允许给所有外部链接添加标签
- 0.4.5
  - Cancel the delay effect of showing the tag button when clicking on the blank area
  - When the same area is clicked continuously, hide the tag button
- 0.4.1
  - Update tag icons and styles
- 0.4.0
  - Support mobile devices
- 0.3.1
  - Improve accessibility, fix v2ex 超级增强 issues
- 0.3.0
  - 修复楼中楼回复模式时，隐藏或半透明效果影响整个楼的问题
- 0.2.1
  - Add links to tags page and data import/export page in settings
- 0.2.0
  - Enable setting whether to show hidden items and whether to disable opacity effects
- 0.1.10
  - Compatible with script managers such as Violentmonkey, Greasemonkey(Firefox), Userscripts(Safari)
- 0.1.5
  - Add more special tags, such as 标题党, 推广, 无聊, 忽略, 已阅, hide, 隐藏, 不再显示, 热门, 收藏, 关注, 稍后阅读
  - Update www.v2ex.com matching rules to support more pages
- 0.1.4
  - Enable add tags to node links of www.v2ex.com
- 0.1.2
  - Solve the issue that the Firefox browser does not support the special functions of tags such as 'sb' and 'block'
- 0.1.0
  - Refactor code based on [Plasmo](https://www.plasmo.com/). Browser extensions are also available.
- 0.0.2
  - Various domain names of www.v2ex.com are supported
  - Added [data import/export page](https://utags.pipecraft.net/data/)
- 0.0.1
  - Support [www.v2ex.com](https://www.v2ex.com/) site, add or display tags on member or post links
  - Added [list page](https://utags.pipecraft.net/tags/) with tagged links

## License

Copyright (c) 2023 [Pipecraft](https://www.pipecraft.net). Licensed under the [MIT License](https://github.com/utags/utags/blob/main/LICENSE).

## >\_

[![Pipecraft](https://img.shields.io/badge/site-pipecraft-brightgreen)](https://www.pipecraft.net)
[![UTags](https://img.shields.io/badge/site-UTags-brightgreen)](https://utags.pipecraft.net)
[![DTO](https://img.shields.io/badge/site-DTO-brightgreen)](https://dto.pipecraft.net)
[![BestXTools](https://img.shields.io/badge/site-bestxtools-brightgreen)](https://www.bestxtools.com)
