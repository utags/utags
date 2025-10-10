export const messages = {
  'settings.enableCurrentSite': '在當前網站啟用小魚標籤',
  'settings.showHidedItems': "顯示被隱藏的內容 (加上了 'block', 'hide', '隱藏'等標籤的內容)",
  'settings.noOpacityEffect': "去除半透明效果 (加上了 'sb', '忽略', '標題黨'等標籤的內容)",
  'settings.useVisitedFunction': '在當前網站啟用瀏覽內容標記功能',
  'settings.displayEffectOfTheVisitedContent': '當前網站的已瀏覽內容的展示效果',
  'settings.displayEffectOfTheVisitedContent.recordingonly': '只保存記錄，不顯示標記',
  'settings.displayEffectOfTheVisitedContent.showtagonly': '只顯示標記',
  'settings.displayEffectOfTheVisitedContent.changecolor': '更改標題顏色',
  'settings.displayEffectOfTheVisitedContent.translucent': '半透明',
  'settings.displayEffectOfTheVisitedContent.hide': '隱藏',
  'settings.pinnedTags': '在下面添加要置頂的標籤，以逗號分隔',
  'settings.pinnedTagsDefaultValue': '收藏, block, sb, 屏蔽, 隱藏, 已閱, 忽略, 標題黨, 推廣, 關注',
  'settings.pinnedTagsPlaceholder': 'foo, bar',
  'settings.emojiTags': '在下面添加表情符號標籤，以逗號分隔',
  'settings.customStyle': '啟用全域自訂樣式',
  'settings.customStyleCurrentSite': '啟用當前網站的自訂樣式',
  'settings.customStyleDefaultValue': `/* 自訂樣式 */
body {
  /* 標籤文字顏色 */
  --utags-text-tag-color: white;
  /* 標籤邊框顏色 */
  --utags-text-tag-border-color: red;
  /* 標籤背景顏色 */
  --utags-text-tag-background-color: red;
}

/* 標籤為 'TEST' 的標籤樣式 */
.utags_text_tag[data-utags_tag="TEST"] {
  /* 標籤文字顏色 */
  --utags-text-tag-color: white;
  /* 標籤邊框顏色 */
  --utags-text-tag-border-color: orange;
  /* 標籤背景顏色 */
  --utags-text-tag-background-color: orange;
}`,
  'settings.customStyleExamples': '示例',
  'settings.customStyleExamplesContent': `<p>自訂樣式示例</p>
  <p>
  <pre>/* 自訂樣式 */
body {
  /* 標籤文字顏色 */
  --utags-text-tag-color: white;
  /* 標籤邊框顏色 */
  --utags-text-tag-border-color: red;
  /* 標籤背景顏色 */
  --utags-text-tag-background-color: red;
}

/* 標籤為 'TEST' 的標籤樣式 */
.utags_text_tag[data-utags_tag="TEST"] {
  /* 標籤文字顏色 */
  --utags-text-tag-color: white;
  /* 標籤邊框顏色 */
  --utags-text-tag-border-color: orange;
  /* 標籤背景顏色 */
  --utags-text-tag-background-color: orange;
}

[data-utags_list_node*=",bar,"] {
  /* 列表中含有 'bar' 標籤的條目的背景色 */
  background-color: aqua;
}

body {
  /* 瀏覽過的帖子的標題顏色 */
  --utags-visited-title-color: red;
}

/* 深色模式 */
[data-utags_darkmode="1"] body {
  /* 瀏覽過的帖子的標題顏色 */
  --utags-visited-title-color: yellow;
}
</pre>
  </p>
  <p><a href="https://github.com/utags/utags/tree/main/custom-style-examples">更多示例</a></p>
  `,
  'settings.enableTagStyleInPrompt': '標籤輸入視窗啟用標籤樣式',
  'settings.useSimplePrompt': '使用簡單方式添加標籤',
  'settings.openTagsPage': '標籤列表',
  'settings.openDataPage': '匯出資料/匯入資料',
  'settings.title': '🏷️ 小魚標籤 (UTags) - 為連結添加用戶標籤',
  'settings.information': '更改設定後，重新載入頁面即可生效',
  'settings.report': '回饋問題',
  'prompt.addTags': '[UTags] 請輸入標籤，多個標籤以逗號分隔',
  'prompt.pinnedTags': '置頂',
  'prompt.mostUsedTags': '最近常用',
  'prompt.recentAddedTags': '最新添加',
  'prompt.emojiTags': '符號',
  'prompt.copy': '複製',
  'prompt.cancel': '取消',
  'prompt.ok': '確認',
  'prompt.settings': '設定',
  'menu.addTagsToCurrentPage': '為當前網頁添加標籤',
  'menu.modifyCurrentPageTags': '修改當前網頁標籤',
  'menu.addQuickTag': '為當前網頁添加 {tag} 標籤',
  'menu.removeQuickTag': '刪除當前網頁的 {tag} 標籤',
  'menu.bookmarkList': '書籤管理器',
  'menu.hideAllTags': '隱藏所有標籤',
  'menu.unhideAllTags': '取消隱藏所有標籤',
  'settings.enableQuickStar': '啟用快速添加星標',
  'settings.quickTags': '快捷標籤',
  'settings.quickTagsPlaceholder': '★, ⭐, 💎',
}

export default messages
