# UTags - Add usertags to links

> English | [中文](README-zh-CN.md)

Allow users to add custom tags to links.

## 小鱼标签 (UTags) - 为链接添加用户标签

此扩展/油猴脚本允许用户为网站的链接添加自定义标签。比如，可以给论坛的用户或帖子添加标签。

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
- [zhihu.com](https://www.zhihu.com/)
- [xiaohongshu.com](https://www.xiaohongshu.com/)
- [pornhub.com](https://www.pornhub.com/)
- [weibo.com](https://weibo.com/), [weibo.cn](https://weibo.cn/)
- [sspai.com](https://sspai.com/)
- [douyin.com](https://www.douyin.com/)
- [podcasts.google.com](https://podcasts.google.com/)
- [rebang.today](https://rebang.today/)
- [myanimelist.net](https://myanimelist.net/)
- [douban.com](https://www.douban.com/)
- And more. Click [here](https://greasyfork.org/scripts/460718-utags-add-usertags-to-links/feedback) to add more sites.

## 安装

- 类 Chrome 浏览器: 即将上架 Chrome 商店
- Edge 浏览器: 即将上架 Edge 商店
- Firefox 浏览器: 已上架 [Firefox Addon 商店](https://addons.mozilla.org/firefox/addon/utags/)，[点击这里](https://addons.mozilla.org/firefox/addon/utags/)安装。
- 油猴脚本: [https://greasyfork.org/scripts/460718-utags-add-usertags-to-links](https://greasyfork.org/scripts/460718-utags-add-usertags-to-links)
- [手动安装浏览器扩展](manual-installation.md)

## 使用方法

- 鼠标移到帖子标题或用户名的上面，会显示标签图标。
  ![screenshots](assets/screenshots-01.png)

- 点击标签图标，输入标签，用逗号分开多个标签。
  ![screenshots](assets/screenshots-02.png)

- 帖子标题，用户名都可以设置标签。
  ![screenshots](assets/screenshots-03.png)

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

---

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
- 不仅可以给用户打标签，还可以给帖子和节点打标签
- 在[标签列表](https://utags.pipecraft.net/tags/)页面，可以看到有标签的用户和帖子，按更新顺序排序
- 支持 Vimium 扩展，点击 'f' 键，标签图标按钮也会有提示，可以快速添加标签
- 支持[数据导出、导入](https://utags.pipecraft.net/data/)
- 支持导入 [v2ex user tag](https://greasyfork.org/scripts/437891-v2ex-user-tag) 油猴脚本的数据
- 除了 v2ex，以后还会支持更多的网站

### 彩蛋

- 标签设置为 'sb'，该用户的帖子或评论都会半透明显示，可以方便跳过价值低的内容
- 标签设置为 'block'，该用户的帖子或评论都会被隐藏，眼不见，心不烦
- 更多特殊标签，比如：标题党, 推广, 无聊, 忽略, 已阅, hide, 隐藏, 不再显示, 热门, 收藏, 关注, 稍后阅读

## Release Notes

- 0.9.5
  - Add emoji tags 👍
  - Increase the size of the list of candidate tags
  - Enable the select/find feature on the tag management page
  - Use CSS custom properties to define the width of the text tag border
- 0.9.4
  - Update selectors for GitHub, now can add tags to issues, pulls and discussions
  - Define utags font-size and icon size with CSS custom properties
- 0.9.3
  - Update selectors and style
  - Apply utags to douban.com
  - Apply utags to myanimelist.net
  - Change the injection moment to 'document_start'
- 0.9.1
  - Add the copy button in the prompt UI
- 0.9.0
  - Use advanced tag input prompt UI
  - Define utags ul styles with css custom properties
- 0.8.10
  - Apply utags to rebang.today
- 0.8.9
  - Update bilibili.com, greasyfork.org, youtube.com, douyin.com, pornhub.com style and matching rules
- 0.8.8
  - Apply utags to podcasts.google.com
  - Apply utags to douyin.com
  - Apply utags to sspai.com
- 0.8.7
  - Apply utags to weibo.com, weibo.cn
  - Apply utags to pornhub.com
- 0.8.6
  - Apply utags to xiaohongshu.com
- 0.8.5
  - Apply utags to zhihu.com
- 0.8.4
  - Fix a bug on YouTube, compare keys when reusing utags elements
  - Update youtube selectors and style
- 0.8.0
  - Implement multi-language support, currently supports English and Chinese
- 0.7.7
  - Update instagram.com, threads.net
  - Improve performance, update tags when document is not hidden
- 0.7.6
  - use svg element instead of background-image with data: url to fix CSP issue
  - (v2ex): handle cited replies generated by ve2x.rep userscript
- 0.7.5
  - Handle default site rules for chrome extension and firefox addon
  - Add option to enable/disable utags on current site
  - Update bilibili, github selectors
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
- 0.5.0
  - Apply utags to greasyfork.org and sleazyfork.org
  - \[V2EX\] 允许给所有外部链接添加标签
- 0.4.5
  - 取消点击空白区域时显示标签按钮的延迟效果
  - 连续点击区域相同时，隐藏标签按钮
- 0.4.1
  - 更新标签图标与样式
- 0.4.0
  - 支持触屏设备
- 0.3.1
  - 提高可访问性, 修改 v2ex 超级增强兼容问题
- 0.3.0
  - 修复楼中楼回复模式时，隐藏或半透明效果影响整个楼的问题
- 0.2.1
  - 设置中添加打开标签列表，导出数据/导入数据链接
- 0.2.0
  - 添加设置功能，可以设置是否显示被隐藏的内容，是否去除半透明效果
- 0.1.10
  - 兼容 Violentmonkey, Greasemonkey(Firefox), Userscripts(Safari) 等脚本管理器
- 0.1.5
  - 添加更多特殊标签，比如：标题党, 推广, 无聊, 忽略, 已阅, hide, 隐藏, 不再显示, 热门, 收藏, 关注, 稍后阅读
  - 修改 www.v2ex.com 匹配规则，支持更多页面，比如：提醒系统、账户余额等
- 0.1.4
  - 支持给 www.v2ex.com 节点添加标签
- 0.1.2
  - 解决 Firefox 浏览器不支持 'sb', 'block' 等标签的特殊功能的问题
- [See more](release-notes/readme.md)

## Roadmap

- 扩展实现 popup, option 页面功能
- 网页内所有链接显示添加标签按钮
- 支持自定义网站规则
- 支持自定义标签样式
- [列表页](https://utags.pipecraft.net/tags/)显示用户头像
- 展示其他用户们的标签内容
- 显示在哪个页面添加的标签
- 多设备数据同步

## Development

This extension/userscript is built from [Browser Extension Starter and Userscript Starter](https://github.com/utags/browser-extension-starter)

## Features

- One codebase for Chrome extesions, Firefox addons, Userscripts, Bookmarklets and simple JavaScript modules
- Live-reload and React HMR
- [Plasmo](https://www.plasmo.com/) - The Browser Extension Framework
- [esbuild](https://esbuild.github.io/) - Bundler
- React
- TypeScript
- [Prettier](https://github.com/prettier/prettier) - Code Formatter
- [XO](https://github.com/xojs/xo) - JavaScript/TypeScript linter

## Showcases

- [🏷️ UTags - Add usertags to links](https://github.com/utags/utags) - Allow users to add custom tags to links.
- [🔗 Links Helper](https://github.com/utags/links-helper) - Open external links in a new tab, open internal links matching the specified rules in a new tab, convert text to hyperlinks, convert image links to image tags, parse Markdown style links and image tags, parse BBCode style links and image tags

## How To Make A New Extension

1. Fork [this starter repo](https://github.com/utags/browser-extension-starter), and rename repo to your extension name

2. Clone your repo

3. Install dependencies

```bash
pnpm install
# or
npm install
```

## Getting Started

First, run the development server:

```bash
pnpm dev
# or
npm run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

You can start editing the popup by modifying `popup.tsx`. It should auto-update as you make changes. To add an options page, simply add a `options.tsx` file to the root of the project, with a react component default exported. Likewise to add a content page, add a `content.ts` file to the root of the project, importing some module and do some logic, then reload the extension on your browser.

For further guidance, [visit our Documentation](https://docs.plasmo.com/)

## Making production build

Run the following:

```bash
pnpm build
# or
npm run build
```

This should create a production bundle for your extension, ready to be zipped and published to the stores.

## Submit to the webstores

The easiest way to deploy your Plasmo extension is to use the built-in [bpp](https://bpp.browser.market) GitHub action. Prior to using this action however, make sure to build your extension and upload the first version to the store to establish the basic credentials. Then, simply follow [this setup instruction](https://docs.plasmo.com/framework/workflows/submit) and you should be on your way for automated submission!

## License

Copyright (c) 2023 [Pipecraft](https://www.pipecraft.net). Licensed under the [MIT License](LICENSE).

## >\_

[![Pipecraft](https://img.shields.io/badge/site-pipecraft-brightgreen)](https://www.pipecraft.net)
[![UTags](https://img.shields.io/badge/site-UTags-brightgreen)](https://utags.pipecraft.net)
[![DTO](https://img.shields.io/badge/site-DTO-brightgreen)](https://dto.pipecraft.net)
[![BestXTools](https://img.shields.io/badge/site-bestxtools-brightgreen)](https://www.bestxtools.com)
