---
sidebar_position: 3
---

# 快速入门

本章节将帮助您快速上手 UTags，包括安装、基本设置和首次使用指南。

## 安装指南

### 浏览器扩展安装

UTags 支持多种主流浏览器，您可以通过以下链接安装浏览器扩展：

- **Chrome**：[Chrome Web Store](https://chromewebstore.google.com/detail/utags-add-usertags-to-lin/kofjcnaphffjoookgahgjidofbdplgig)
- **Firefox**：[Firefox Add-ons](https://addons.mozilla.org/firefox/addon/utags/)
- **Edge**：[Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/utags-add-usertags-to-l/bhlbflbehfoccjjenpekilgabbjjnphe)

安装步骤：

1. 点击上述对应浏览器的链接
2. 在扩展商店页面点击"添加到浏览器"或"安装"按钮
3. 确认安装
4. 安装完成后，浏览器工具栏会出现 UTags 图标

![浏览器扩展安装截图](url)

### 用户脚本安装

如果您使用的是支持用户脚本的浏览器或已安装用户脚本管理器（如 Tampermonkey、Violentmonkey 或 Greasemonkey），可以通过以下步骤安装 UTags 用户脚本：

1. 确保您已安装用户脚本管理器
2. 访问 [Greasy Fork - UTags](https://greasyfork.org/scripts/460718-utags-add-usertags-to-links)
3. 点击"安装此脚本"按钮
4. 在弹出的用户脚本管理器窗口中确认安装

### 网页应用访问

UTags 网页应用（书签管理器）不需要安装，您可以直接通过以下链接访问：

- 主站：[https://utags.link](https://utags.link/)
- 备用站点：
  - [https://utags.top](https://utags.top/)
  - [https://utags.github.io](https://utags.github.io/)

您也可以将网页应用添加到主屏幕，实现类似原生应用的体验：

1. 访问 UTags 网页应用
2. 在浏览器菜单中选择"添加到主屏幕"或"安装应用"
3. 按照提示完成安装

## 基本设置

### 浏览器扩展/用户脚本设置

1. 点击浏览器工具栏中的 UTags 图标，或在使用用户脚本时点击页面上出现的 UTags 图标
2. 在弹出的菜单中选择"设置"
3. 在设置页面中，您可以配置以下选项：
   - **数据同步**：选择数据同步方式（本地、GitHub 或 WebDAV）
   - **标签显示**：自定义标签的显示方式和样式
   - **特殊标签**：配置特殊标签的行为
   - **语言**：选择界面语言
   - **快捷键**：设置键盘快捷键

### 网页应用设置

1. 访问 UTags 网页应用
2. 点击右上角的设置图标
3. 在设置页面中，您可以配置以下选项：
   - **数据同步**：选择数据同步方式（本地、GitHub 或 WebDAV）
   - **界面主题**：选择亮色或暗色主题
   - **标签显示**：自定义标签的显示方式
   - **语言**：选择界面语言
   - **数据导入/导出**：导入或导出书签数据

## 首次使用指南

### 使用浏览器扩展/用户脚本添加标签

1. 访问任何支持的网站（如 Twitter、Reddit、GitHub 等）
2. 将鼠标悬停在用户名、帖子标题或链接上
3. 点击出现的 🏷️ 标签图标
4. 在弹出的输入框中输入标签，多个标签用逗号分隔
5. 按回车键或点击确认按钮保存标签

![添加标签截图](url)

### 使用网页应用管理书签

1. 访问 UTags 网页应用
2. 点击"添加书签"按钮
3. 输入书签 URL、标题和标签
4. 点击保存
5. 使用左侧的标签筛选面板筛选书签

### 特殊标签使用

特殊标签可以实现特定的筛选效果：

- `block`：屏蔽带有此标签的内容
- `hide`：隐藏带有此标签的内容
- `favorite` 或 `★`：将内容标记为收藏
- `read`：将内容标记为已读

### 数据同步设置

为了在多设备间同步您的标签数据，建议设置数据同步：

1. 在浏览器扩展/用户脚本或网页应用的设置中选择"数据同步"
2. 选择同步方式：
   - **GitHub**：需要 GitHub 账号和个人访问令牌
   - **WebDAV**：需要 WebDAV 服务器地址、用户名和密码
3. 按照提示完成同步设置

## 下一步

现在您已经了解了 UTags 的基本安装和使用方法。接下来，您可以：

- 阅读[浏览器扩展/用户脚本使用指南](./extension-guide.md)，了解更多标签功能
- 阅读[网页应用使用指南](./webapp-guide.md)，掌握高级书签管理技巧
- 探索[数据同步](./data-sync.md)章节，设置多设备同步
- 查看[高级功能](./advanced-features.md)，发掘 UTags 的全部潜力
