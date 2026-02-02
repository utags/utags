# RELEASE NOTES

## v0.26

- Integrate Discuz! sites support and merge existing implementations.
- Support new website: www.tsdm39.com.
- Add comprehensive test cases for `getCanonicalUrl` function.
- Optimize `MutationObserver` to monitor changes in `data-utags_*` attributes, ensuring tags update when these attributes change dynamically.
- Ensure elements with `data-utags_link` are correctly matched even when custom site selectors are defined.

## v0.25

- Recalculate tag positions when the "Show hidden items" setting is toggled to ensure correct display.
- Optimize tag position updating: automatically hide tags if their target elements are invisible.
- Refactor Vimium hint marker detection logic.
- Add special tag filtering functionality for kemono.cr website
- Add special tag filtering functionality for www.pixiv.net website
- Support the hidden image feature of [Bobby's Pixiv Utils](https://greasyfork.org/scripts/525211-bobby-s-pixiv-utils) on pixiv.net.
- Add support for custom attributes: `data-utags_link`, `data-utags_title`, `data-utags_type`, `data-utags_exclude`, etc.
- Apply utags to nhentai.net
- Apply utags to hitomi.la
- Optimize the synchronization of visited link status: ensure real-time updates across tabs and delay UI updates when the page is hidden to improve performance.

## v0.24

- Fix the issue where `document.documentElement` attributes (like `data-utags`) are removed by some websites (e.g., hydration processes).
- Watch for `href` attribute changes on anchor tags to trigger tag updates, improving support for single-page applications (SPAs).
- Ensure the `utags_style` element is automatically restored if removed, guaranteeing consistent UI styling.
- When toggling "Hide/Unhide All Tags", apply the change to all iframes in the page as well.

## v0.23

- Optimize GM.\* API fallback logic.
- Improve compatibility with script managers such as Greasymonkey, quoid-userscripts, Stay, etc.
- Improve keyboard interaction for Escape and Tab keys.
- Fix Safari issue where closing the tag input panel scrolls page to bottom.
- Add colored console prefix for UTags logs. The prefix [utags] is now styled with color #ff6361 and includes timestamp plus time delta for debug/log/info, while warn/error and other methods use a simple colored prefix.
- Silence verbose logging in production: when PLASMO_TAG='prod', disable debug/log/info to reduce noise.
- Rename initialization helper from useGlobalConsole to setupConsole and improve documentation comments; injecting the console wrapper affects only the content script scope and does not interfere with the host page.

## v0.22

- Removed `// @noframes` and enabled `all_frames: true` to allow UTags to run within iframes, improving compatibility with the utags-shortcuts extension and userscripts.
- Updated the settings module.

## v0.21

- Optimize remote version anomaly handling: after confirmation, perform first-merge (`lastSyncTime=0`, prefer newer data) or cancel to disable sync.
- Add menu command to hide/unhide all tags, with dynamic title and multi-language support.

## v0.20

- Add shadowRoot traversal functionality to support finding and tagging elements within Shadow DOM
- Optimize bilibili.com website support, improving tag functionality compatibility and performance on the platform
- Add special tag filtering and quick star functionality for pornhub.com website
- Add special tag filtering and quick star functionality for youtube.com website, optimize username matching logic
- Add new special tags starting with exclamation marks: !, !!, !!!, !important for priority marking

## v0.19

- Optimize data sync logic, solve data inconsistency problem
- Update dmm.co.jp site support
- Add language switching functionality
- Support for more languages including Japanese, Korean, German, French, Spanish, Italian, Portuguese, Russian, Vietnamese, and Traditional Chinese
- Add menu command to tag current page
- Add quick tag menu commands for faster tag management - configure custom quick tags in settings and access them via right-click context menu with ➕/➖ icons
- Add support for star special tags (★★★, ★★, ★, ☆☆☆, ☆☆, ☆) with priority sorting
- Add new setting option "Enable tag styling in tag input window" for enhanced tag input experience
- Add quick star feature for linux.do website - enable quick star addition in settings for faster bookmarking
- Improve userscript availability detection and error handling in sync adapter

## v0.18

### 🌐 New Website Support

- **Twitch** (twitch.tv) - Tag management for streaming platform
- **Yamibo** (bbs.yamibo.com) - Forum content tagging
- **Flickr** (flickr.com) - Photo sharing platform tag functionality
- **Ruan YiFeng's Blog** (ruanyifeng.com) - Tech blog tag management

### ✨ Core Feature Enhancements

#### V2EX Platform Optimization

- Support for special tag functionality on **VXNA** and **Planet** pages
- Effectively filter out uninteresting blog sources to improve browsing experience

#### GitHub Ecosystem Deep Integration

- **File Management**: Support for tagging GitHub files and folders, building personal favorites
- **Issue Enhancements**: Display relevant tags next to issue titles on detail pages

## v0.9.5

- Add emoji tags 👍
- Increase the size of the list of candidate tags
- Enable the select/find feature on the tag management page
- Use CSS custom properties to define the width of the text tag border

## v0.9.4

- Update selectors for GitHub, now can add tags to issues, pulls and discussions
- Define utags font-size and icon size with CSS custom properties

## v0.9.3

- Update selectors and style
- Apply utags to douban.com
- Apply utags to myanimelist.net
- Change the injection moment to 'document_start'

## v0.9.1

- Add the copy button in the prompt UI

## v0.9.0

- Use advanced tag input prompt UI
- Define utags ul styles with css custom properties

## v0.8.10

- Apply utags to rebang.today

## v0.8.9

- Update bilibili.com, greasyfork.org, youtube.com, douyin.com, pornhub.com style and matching rules

## v0.8.8

- Apply utags to podcasts.google.com
- Apply utags to douyin.com
- Apply utags to sspai.com

## v0.8.7

- Apply utags to weibo.com, weibo.cn
- Apply utags to pornhub.com

## v0.8.6

- Apply utags to xiaohongshu.com

## v0.8.5

- Apply utags to zhihu.com

## v0.8.4

- Fix a bug on YouTube, compare keys when reusing utags elements
- Update youtube selectors and style

## v0.8.0

- Implement multi-language support, currently supports English and Chinese

## v0.7.6

- use svg element instead of background-image with data: url to fix CSP issue
- (v2ex): handle cited replies generated by ve2x.rep userscript

## v0.7.5

- Handle default site rules for chrome extension and firefox addon
- Add option to enable/disable utags on current site
- Update bilibili, github selectors

## v0.7.2

- Apply utags to 52pojie.cn
- Apply utags to juejin.cn

## v0.7.1

- Apply utags to tiktok.com
- Apply utags to bilibili.com
- Apply utags to youtube.com
- Apply utags to facebook.com

## v0.7.0

- Apply utags to threads.net
- Apply utags to instagram.com
- Apply utags to mp.weixin.qq.com

## v0.6.7

- Apply utags to twitter.com

## v0.6.6

- \[github\] Match username in issues, PRs and commits
- Prevent utags elements from being remade when the tags have not changed

## v0.6.5

- Apply utags to reddit.com

## v0.6.4

- Apply utags to github.com

## v0.6.3

- Apply utags to lobste.rs
- Move focus on utags elements through the TAB key
- Show utags with vimium hint marker on Firefox

## v0.6.0

- Apply utags to hacker news (news.ycombinator.com)

## v0.5.2

- Improve performance
- Prevent tag content from being copied together when copying HTML text

## v0.5.1

- \[V2EX\] 调整主题页主题标签的显示位置
- \[V2EX\] 允许给回复添加标签

## v0.5.0

- Apply utags to greasyfork.org and sleazyfork.org
- \[V2EX\] 允许给所有外部链接添加标签

## v0.4.5

- Cancel the delay effect of showing the tag button when clicking on the blank area
- When the same area is clicked continuously, hide the tag button

## v0.4.1

- Update tag icons and styles

## v0.4.0

- Support mobile devices

## v0.3.1

- Improve accessibility, fix v2ex 超级增强 issues

## v0.3.0

- 修复楼中楼回复模式时，隐藏或半透明效果影响整个楼的问题

## v0.2.1

- Add links to tags page and data import/export page in settings

## v0.2.0

- Enable setting whether to show hidden items and whether to disable opacity effects

## v0.1.10

- Compatible with script managers such as Violentmonkey, Greasemonkey(Firefox), Userscripts(Safari)

## v0.1.6

- Rebase on utags/browser-extension-starter@v2

## v0.1.5

- Add more special tags, such as 标题党, 推广, 无聊, 忽略, 已阅, hide, 隐藏, 不再显示, 热门, 收藏, 关注, 稍后阅读
- Update www.v2ex.com matching rules to support more pages

## v0.1.4

- Enable add tags to node links of www.v2ex.com

## v0.1.3

- Ensure storage behavior is consistent across Chrome extensions, Firefox extensions and Userscript.

## v0.1.2

- Solve the issue that the Firefox browser does not support the special functions of tags such as 'sb' and 'block'

## v0.1.0

- Refactor code based on [Plasmo](https://www.plasmo.com/). Browser extensions are also available.

## v0.0.2

- Various domain names of www.v2ex.com are supported
- Added [data import/export page](https://utags.pipecraft.net/data/)

## v0.0.1

- Support www.v2ex.com site, add or display tags on member or post links
- Added [list page](https://utags.pipecraft.net/tags/) with tagged links
