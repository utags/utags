export const messages = {
  'settings.enableCurrentSite': '在目前網站啟用小魚標籤',
  'settings.showHidedItems': "顯示被隱藏的內容 (新增了 'block', 'hide', '隱藏'等標籤的內容)",
  'settings.noOpacityEffect': "移除半透明效果 (新增了 'sb', '忽略', '標題黨'等標籤的內容)",
  'settings.useVisitedFunction': '在目前網站啟用瀏覽內容標記功能',
  'settings.displayEffectOfTheVisitedContent': '目前網站的已瀏覽內容的顯示效果',
  'settings.displayEffectOfTheVisitedContent.recordingonly': '僅儲存記錄，不顯示標記',
  'settings.displayEffectOfTheVisitedContent.showtagonly': '僅顯示標記',
  'settings.displayEffectOfTheVisitedContent.changecolor': '變更標題顏色',
  'settings.displayEffectOfTheVisitedContent.translucent': '半透明',
  'settings.displayEffectOfTheVisitedContent.hide': '隱藏',
  'settings.pinnedTags': '在下方新增要置頂的標籤，以逗號分隔',
  'settings.pinnedTagsDefaultValue': '收藏, block, sb, 封鎖, 隱藏, 已讀, 忽略, 標題黨, 推廣, 關注',
  'settings.pinnedTagsPlaceholder': 'foo, bar',
  'settings.emojiTags': '在下方新增表情符號標籤，以逗號分隔',
  'settings.customStyle': '啟用全域自訂樣式',
  'settings.customStyleCurrentSite': '啟用目前網站的自訂樣式',
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
  'settings.customStyleExamples': '範例',
  'settings.customStyleExamplesContent': `<p>自訂樣式範例</p>
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
  /* 清單中含有 'bar' 標籤的項目的背景色 */
  background-color: aqua;
}

body {
  /* 瀏覽過的貼文的標題顏色 */
  --utags-visited-title-color: red;
}

/* 深色模式 */
[data-utags_darkmode="1"] body {
  /* 瀏覽過的貼文的標題顏色 */
  --utags-visited-title-color: yellow;
}
</pre>
  </p>
  <p><a href="https://github.com/utags/utags/tree/main/custom-style-examples">更多範例</a></p>
  `,
  'settings.useSimplePrompt': '使用簡單方式新增標籤',
  'settings.openTagsPage': '標籤清單',
  'settings.openDataPage': '匯出資料/匯入資料',
  'settings.title': '🏷️ 小魚標籤 (UTags) - 為連結新增使用者標籤',
  'settings.information': '變更設定後，重新載入頁面即可生效',
  'settings.report': '回報問題',
  'prompt.addTags': '[UTags] 請輸入標籤，多個標籤以逗號分隔',
  'prompt.pinnedTags': '置頂',
  'prompt.mostUsedTags': '最近常用',
  'prompt.recentAddedTags': '最新新增',
  'prompt.emojiTags': '符號',
  'prompt.copy': '複製',
  'prompt.cancel': '取消',
  'prompt.ok': '確認',
  'prompt.settings': '設定',
  'prompt.addTagsToCurrentPage': '為目前網頁新增標籤',
}

export default messages
