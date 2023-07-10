# 小鱼标签 (UTags) - 为链接添加用户标签

此插件允许用户为网站的链接添加自定义标签。比如，可以给论坛的用户、帖子、节点添加标签。支持 [www.v2ex.com](https://www.v2ex.com/)。陆续会支持更多网站。

**UTags** = **Usertags**。**Userscript**, **Userstyle** 可以让用户自定义网站的功能和样式，**Usertags** 允许用户自定义网站的标签。

目前支持的网站

- www.v2ex.com
- 更多网站会陆续支持

## 使用方法

- 鼠标移到帖子标题或用户名上面，旁边会出现标签 🏷️ 图标，点击图标添加标签
  ![screenshots](https://greasyfork.s3.us-east-2.amazonaws.com/5lso2l5779ompdep7mmvkivsyxin)

- 多个标签用逗号分隔（半角逗号符号、全角逗号符号都可以）
  ![screenshots](https://greasyfork.s3.us-east-2.amazonaws.com/quyien946y8bbpdtdi0tyf0pbsmf)

- 帖子标题，用户名，节点都可以添加标签
  ![screenshots](https://greasyfork.s3.us-east-2.amazonaws.com/h5x46uh3w12bfyhtfyo1wdip0xu4)

- 特殊标签有特殊效果，比如：sb, block, 标题党, 推广, 无聊, 忽略, 已阅, hide, 隐藏, 不再显示, 热门, 收藏, 关注, 稍后阅读等
  ![screenshots](https://greasyfork.s3.us-east-2.amazonaws.com/568f6cu7je6isfx858kuyjorfl5n)

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

## Roadmap

- 网页内所有链接显示添加标签按钮
- 支持更多的网站：
  - Next: hacker news, lobsters, [DTO](https://dto.pipecraft.net/), P\*Hub
- 支持自定义网站规则
- 支持自定义标签样式
- 展示其他用户们的标签内容
- 多设备数据同步

更多内容请访问 [https://github.com/utags/utags](https://github.com/utags/utags)

## 更新记录

### 0.1.10

- 兼容 Violentmonkey, Greasemonkey(Firefox), Userscripts(Safari) 等脚本管理器

### 0.1.5

- 添加更多特殊标签，比如：标题党, 推广, 无聊, 忽略, 已阅, hide, 隐藏, 不再显示, 热门, 收藏, 关注, 稍后阅读
- 修改 www.v2ex.com 匹配规则，支持更多页面，比如：提醒系统、账户余额等

### 0.1.4

- 支持给 www.v2ex.com 节点添加标签

### 0.1.2

- 解决 Firefox 浏览器不支持 'sb', 'block' 等标签的特殊功能的问题

### 0.1.0

- 基于 [Plasmo](https://www.plasmo.com/) 重构代码，提供浏览器扩展版本

### 0.0.2

- 支持 [www.v2ex.com](https://www.v2ex.com/) 网站的其他域名
- 新增[数据导入导出页面](https://utags.pipecraft.net/data/)

### 0.0.1

- 支持 [www.v2ex.com](https://www.v2ex.com/) 网站，可以在用户名或帖子旁边添加或显示标签
- 可以查看添加过标签的链接的[列表页面](https://utags.pipecraft.net/tags/)

## License

Copyright (c) 2023 [Pipecraft](https://www.pipecraft.net). Licensed under the [MIT License](https://github.com/utags/utags/blob/main/LICENSE).

## >\_

[![Pipecraft](https://img.shields.io/badge/site-pipecraft-brightgreen)](https://www.pipecraft.net)
[![UTags](https://img.shields.io/badge/site-UTags-brightgreen)](https://utags.pipecraft.net)
[![DTO](https://img.shields.io/badge/site-DTO-brightgreen)](https://dto.pipecraft.net)
[![BestXTools](https://img.shields.io/badge/site-bestxtools-brightgreen)](https://www.bestxtools.com)
