# UTags - Add usertags to links

Allow users to add custom tags (labels) to links. For example, you can add tags to forum members or posts.

**UTags** = **Usertags**. **Userscript**, **Userstyle** allows users to customize the functionality and style of the site, **Usertags** allows users to customize the tags (labels) for the site.

Not it supports

- V2EX ([www.v2ex.com](https://www.v2ex.com/))
- Greasy Fork ([greasyfork.org](https://greasyfork.org/) and [sleazyfork.org](https://sleazyfork.org/))
- Hacker News ([news.ycombinator.com](https://news.ycombinator.com/))
- Lobsters ([lobste.rs](https://lobste.rs/))
- GitHub ([github.com](https://github.com/))
- Reddit ([www.reddit.com](https://www.reddit.com/))
- X(Twitter) ([x.com](https://x.com/) / [twitter.com](https://twitter.com/))
- Wechat ([mp.weixin.qq.com](https://mp.weixin.qq.com/))
- Instagram ([www.instagram.com](https://www.instagram.com/))
- Threads ([www.threads.net](https://www.threads.net/))
- Facebook ([www.facebook.com](https://www.facebook.com/))
- YouTube ([www.youtube.com](https://www.youtube.com/))
- Bilibili ([www.bilibili.com](https://www.bilibili.com/))
- TikTok ([www.tiktok.com](https://www.tiktok.com/))
- 52pojie ([www.52pojie.cn](https://www.52pojie.cn/))
- juejin ([juejin.cn](https://juejin.cn/))
- zhihu ([zhihu.com](https://www.zhihu.com/))
- xiaohongshu ([xiaohongshu.com](https://www.xiaohongshu.com/))
- PornHub ([pornhub.com](https://www.pornhub.com/))
- weibo ([weibo.com](https://weibo.com/), [weibo.cn](https://weibo.cn/))
- sspai ([sspai.com](https://sspai.com/))
- douyin ([douyin.com](https://www.douyin.com/))
- Google Podcasts ([podcasts.google.com](https://podcasts.google.com/))
- Rebang.Today ([rebang.today](https://rebang.today/))
- MyAnimeList ([myanimelist.net](https://myanimelist.net/))
- douban ([douban.com](https://www.douban.com/))
- And more. Click [here](https://greasyfork.org/scripts/460718-utags-add-usertags-to-links/feedback) to add more sites.

## Usage

- Move the mouse over the title of the post or the username, and a tag 🏷️ icon will appear next to it, click the icon to add tags
  ![screenshots](https://assets.bestxtools.com/i/nqpyh)

- Multiple tags are separated by commas
  ![screenshots](https://assets.bestxtools.com/i/iczcg)

- Tags can be added to post titles, usernames, and categories
  ![screenshots](https://greasyfork.s3.us-east-2.amazonaws.com/h5x46uh3w12bfyhtfyo1wdip0xu4)

- Some special tags have special effects, such as 'ignore', 'clickbait', 'promotion', 'block', 'hide', etc.
  ![screenshots](https://greasyfork.s3.us-east-2.amazonaws.com/568f6cu7je6isfx858kuyjorfl5n)

- Settings

![screenshots](https://i.imgur.com/SYbJxGe.jpeg)

- Video demo

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

## Features

- You can directly add tags to the browsed page, and the page will not be reloaded when you save the tag
- Tags can be added to post titles, usernames, and categories
- Support Vimium extension, click the 'f' key, the tag icon will also have a hint marker, you can quickly add tagss
- On the [tag list](https://utags.pipecraft.net/tags/) page, you can see tagged users and posts, sorted by update order
- Support [data export and import](https://utags.pipecraft.net/data/)
- Compatible with the following userscript managers
  - Tampermonkey (recommend)
  - Violentmonkey
  - Greasemonkey
  - Userscripts (Safari)

More information: [https://github.com/utags/utags](https://github.com/utags/utags)

## Release Notes

- 0.9.8
  - twitter.com -> x.com
  - fix github.com, threads.net, e-hentai.org issues
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

## Buy Me a Coffee

- [https://afdian.com/a/pipecraft](https://afdian.net/a/pipecraft)

## License

Copyright (c) 2023 [Pipecraft](https://www.pipecraft.net). Licensed under the [MIT License](https://github.com/utags/utags/blob/main/LICENSE).

## >\_

[![Pipecraft](https://img.shields.io/badge/site-pipecraft-brightgreen)](https://www.pipecraft.net)
[![UTags](https://img.shields.io/badge/site-UTags-brightgreen)](https://utags.pipecraft.net)
[![DTO](https://img.shields.io/badge/site-DTO-brightgreen)](https://dto.pipecraft.net)
[![BestXTools](https://img.shields.io/badge/site-bestxtools-brightgreen)](https://www.bestxtools.com)
