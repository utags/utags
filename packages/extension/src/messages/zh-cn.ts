export const messages = {
  'settings.enableCurrentSite': '在当前网站启用小鱼标签',
  'settings.enableCurrentSiteCustomRule': '启用当前网站的自定义匹配规则',
  'settings.customRuleValue': '自定义匹配规则',
  'settings.showHidedItems': "显示被隐藏的内容 (添加了 'block', 'hide', '隐藏'等标签的内容)",
  'settings.noOpacityEffect': "去除半透明效果 (添加了 'sb', '忽略', '标题党'等标签的内容)",
  'settings.useVisitedFunction': '在当前网站启用浏览内容标记功能',
  'settings.displayEffectOfTheVisitedContent': '当前网站的已浏览内容的展示效果',
  'settings.displayEffectOfTheVisitedContent.recordingonly': '只保存记录，不显示标记',
  'settings.displayEffectOfTheVisitedContent.showtagonly': '只显示标记',
  'settings.displayEffectOfTheVisitedContent.changecolor': '更改标题颜色',
  'settings.displayEffectOfTheVisitedContent.translucent': '半透明',
  'settings.displayEffectOfTheVisitedContent.hide': '隐藏',
  'settings.pinnedTags': '在下面添加要置顶的标签，以逗号分隔',
  'settings.pinnedTagsDefaultValue': '收藏, block, sb, 屏蔽, 隐藏, 已阅, 忽略, 标题党, 推广, 关注',
  'settings.pinnedTagsPlaceholder': 'foo, bar',
  'settings.emojiTags': '在下面添加表情符号标签，以逗号分隔',
  'settings.customStyle': '启用全局自定义样式',
  'settings.customStyleCurrentSite': '启用当前网站的自定义样式',
  'settings.customStyleDefaultValue': `/* 自定义样式 */
body {
  /* 标签文字颜色 */
  --utags-text-tag-color: white;
  /* 标签边框颜色 */
  --utags-text-tag-border-color: red;
  /* 标签背景颜色 */
  --utags-text-tag-background-color: red;
}

/* 标签为 'TEST' 的标签样式 */
.utags_text_tag[data-utags_tag="TEST"] {
  /* 标签文字颜色 */
  --utags-text-tag-color: white;
  /* 标签边框颜色 */
  --utags-text-tag-border-color: orange;
  /* 标签背景颜色 */
  --utags-text-tag-background-color: orange;
}`,
  'settings.customStyleExamples': '示例',
  'settings.customStyleExamplesContent': `<p>自定义样式示例</p>
  <p>
  <pre>/* 自定义样式 */
body {
  /* 标签文字颜色 */
  --utags-text-tag-color: white;
  /* 标签边框颜色 */
  --utags-text-tag-border-color: red;
  /* 标签背景颜色 */
  --utags-text-tag-background-color: red;
}

/* 标签为 'TEST' 的标签样式 */
.utags_text_tag[data-utags_tag="TEST"] {
  /* 标签文字颜色 */
  --utags-text-tag-color: white;
  /* 标签边框颜色 */
  --utags-text-tag-border-color: orange;
  /* 标签背景颜色 */
  --utags-text-tag-background-color: orange;
}

[data-utags_list_node*=",bar,"] {
  /* 列表中含有 'bar' 标签的条目的背景色 */
  background-color: aqua;
}

body {
  /* 浏览过的帖子的标题颜色 */
  --utags-visited-title-color: red;
}

/* 深色模式 */
[data-utags_darkmode="1"] body {
  /* 浏览过的帖子的标题颜色 */
  --utags-visited-title-color: yellow;
}
</pre>
  </p>
  <p><a href="https://github.com/utags/utags/tree/main/custom-style-examples">更多示例</a></p>
  `,
  'settings.enableTagStyleInPrompt': '标签输入窗口启用标签样式',
  'settings.useSimplePrompt': '使用简单方式添加标签',
  'settings.openTagsPage': '标签列表',
  'settings.openDataPage': '导出数据/导入数据',
  'settings.title': '🏷️ 小鱼标签 (UTags) - 为链接添加用户标签',
  'settings.information': '更改设置后，重新加载页面即可生效',
  'settings.report': '反馈问题',
  'prompt.addTags': '[UTags] 请输入标签，多个标签以逗号分隔',
  'prompt.pinnedTags': '置顶',
  'prompt.mostUsedTags': '最近常用',
  'prompt.recentAddedTags': '最新添加',
  'prompt.emojiTags': '符号',
  'prompt.copy': '复制',
  'prompt.cancel': '取消',
  'prompt.ok': '确认',
  'prompt.settings': '设置',
  'menu.addTagsToCurrentPage': '为当前网页添加标签',
  'menu.modifyCurrentPageTags': '修改当前网页标签',
  'menu.addQuickTag': '为当前网页添加 {tag} 标签',
  'menu.removeQuickTag': '删除当前网页的 {tag} 标签',
  'menu.bookmarkList': '书签管理器',
  'menu.hideAllTags': '隐藏所有标签',
  'menu.unhideAllTags': '取消隐藏所有标签',
  'settings.quickTags': '快捷标签',
  'settings.quickTagsPlaceholder': '★, ⭐, 💎',
  'settings.enableQuickStar': '启用快速添加星标',
  'settings.enableVimiumHint': '使用 Vimium / Vimium C 快捷键提示时自动显示标签图标',
}

export default messages
