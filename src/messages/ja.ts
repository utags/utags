export const messages = {
  'settings.enableCurrentSite': '現在のウェブサイトでUTagsを有効にする',
  'settings.showHidedItems': "非表示のアイテムを表示する（'block'、'hide'、'隠す'などのタグが付いたコンテンツ）",
  'settings.noOpacityEffect': "透明度効果を無効にする（'sb'、'無視'、'釣りタイトル'などのタグが付いたコンテンツ）",
  'settings.useVisitedFunction': '現在のウェブサイトで閲覧コンテンツのタグ機能を有効にする',
  'settings.displayEffectOfTheVisitedContent': '閲覧済みコンテンツの表示効果',
  'settings.displayEffectOfTheVisitedContent.recordingonly': '記録のみ保存、マークは表示しない',
  'settings.displayEffectOfTheVisitedContent.showtagonly': 'マークのみ表示',
  'settings.displayEffectOfTheVisitedContent.changecolor': 'タイトルの色を変更',
  'settings.displayEffectOfTheVisitedContent.translucent': '半透明',
  'settings.displayEffectOfTheVisitedContent.hide': '非表示',
  'settings.pinnedTags': 'ピン留めしたいタグをカンマ区切りで追加してください',
  'settings.pinnedTagsDefaultValue': 'お気に入り, block, sb, ブロック, 非表示, 既読, 無視, 釣りタイトル, 宣伝, フォロー',
  'settings.pinnedTagsPlaceholder': 'foo, bar',
  'settings.emojiTags': '絵文字タグをカンマ区切りで追加してください',
  'settings.customStyle': 'すべてのウェブサイトでカスタムスタイルを有効にする',
  'settings.customStyleCurrentSite': '現在のウェブサイトでカスタムスタイルを有効にする',
  'settings.customStyleDefaultValue': `/* カスタムスタイル */
body {
  /* タグのテキスト色 */
  --utags-text-tag-color: white;
  /* タグの境界線色 */
  --utags-text-tag-border-color: red;
  /* タグの背景色 */
  --utags-text-tag-background-color: red;
}

/* 'TEST'ラベルのタグスタイル */
.utags_text_tag[data-utags_tag="TEST"] {
  /* タグのテキスト色 */
  --utags-text-tag-color: white;
  /* タグの境界線色 */
  --utags-text-tag-border-color: orange;
  /* タグの背景色 */
  --utags-text-tag-background-color: orange;
}`,
  'settings.customStyleExamples': '例',
  'settings.customStyleExamplesContent': `<p>カスタムスタイルの例</p>
  <p>
  <pre>/* カスタムスタイル */
body {
  /* タグのテキスト色 */
  --utags-text-tag-color: white;
  /* タグの境界線色 */
  --utags-text-tag-border-color: red;
  /* タグの背景色 */
  --utags-text-tag-background-color: red;
}

/* 'TEST'ラベルのタグスタイル */
.utags_text_tag[data-utags_tag="TEST"] {
  /* タグのテキスト色 */
  --utags-text-tag-color: white;
  /* タグの境界線色 */
  --utags-text-tag-border-color: orange;
  /* タグの背景色 */
  --utags-text-tag-background-color: orange;
}

[data-utags_list_node*=",bar,"] {
  /* リスト内の'bar'タグを含む項目の背景色 */
  background-color: aqua;
}

body {
  /* 閲覧済み投稿のタイトル色 */
  --utags-visited-title-color: red;
}

/* ダークモード */
[data-utags_darkmode="1"] body {
  /* 閲覧済み投稿のタイトル色 */
  --utags-visited-title-color: yellow;
}
</pre>
  </p>
  <p><a href="https://github.com/utags/utags/tree/main/custom-style-examples">その他の例</a></p>
  `,
  'settings.useSimplePrompt': 'シンプルな方法でタグを追加する',
  'settings.openTagsPage': 'タグリスト',
  'settings.openDataPage': 'データのエクスポート/インポート',
  'settings.title': '🏷️ 小魚タグ (UTags) - リンクにユーザータグを追加',
  'settings.information': '設定を変更した後、ページを再読み込みすると有効になります',
  'settings.report': '問題を報告',
  'prompt.addTags': '[UTags] タグを入力してください。複数のタグはカンマで区切ってください',
  'prompt.pinnedTags': 'ピン留め',
  'prompt.mostUsedTags': '最近よく使用',
  'prompt.recentAddedTags': '最新追加',
  'prompt.emojiTags': '絵文字',
  'prompt.copy': 'コピー',
  'prompt.cancel': 'キャンセル',
  'prompt.ok': '確認',
  'prompt.settings': '設定',
  'prompt.addTagsToCurrentPage': '現在のページにタグを追加',
}

export default messages
