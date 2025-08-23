export const messages = {
  'settings.enableCurrentSite': '현재 웹사이트에서 UTags 활성화',
  'settings.showHidedItems': "숨겨진 항목 표시 ('block', 'hide', '숨김' 등의 태그가 있는 콘텐츠)",
  'settings.noOpacityEffect': "투명도 효과 제거 ('sb', '무시', '낚시제목' 등의 태그가 있는 콘텐츠)",
  'settings.useVisitedFunction': '현재 웹사이트에서 브라우징 콘텐츠 태그 기능 활성화',
  'settings.displayEffectOfTheVisitedContent': '방문한 콘텐츠의 표시 효과',
  'settings.displayEffectOfTheVisitedContent.recordingonly': '기록만 저장, 마크 표시 안함',
  'settings.displayEffectOfTheVisitedContent.showtagonly': '마크만 표시',
  'settings.displayEffectOfTheVisitedContent.changecolor': '제목 색상 변경',
  'settings.displayEffectOfTheVisitedContent.translucent': '반투명',
  'settings.displayEffectOfTheVisitedContent.hide': '숨김',
  'settings.pinnedTags': '고정할 태그를 쉼표로 구분하여 추가하세요',
  'settings.pinnedTagsDefaultValue': '즐겨찾기, block, sb, 차단, 숨김, 읽음, 무시, 낚시제목, 광고, 팔로우',
  'settings.pinnedTagsPlaceholder': 'foo, bar',
  'settings.emojiTags': '이모지 태그를 쉼표로 구분하여 추가하세요',
  'settings.customStyle': '모든 웹사이트에서 사용자 정의 스타일 활성화',
  'settings.customStyleCurrentSite': '현재 웹사이트에서 사용자 정의 스타일 활성화',
  'settings.customStyleDefaultValue': `/* 사용자 정의 스타일 */
body {
  /* 태그 텍스트 색상 */
  --utags-text-tag-color: white;
  /* 태그 테두리 색상 */
  --utags-text-tag-border-color: red;
  /* 태그 배경 색상 */
  --utags-text-tag-background-color: red;
}

/* 'TEST' 라벨의 태그 스타일 */
.utags_text_tag[data-utags_tag="TEST"] {
  /* 태그 텍스트 색상 */
  --utags-text-tag-color: white;
  /* 태그 테두리 색상 */
  --utags-text-tag-border-color: orange;
  /* 태그 배경 색상 */
  --utags-text-tag-background-color: orange;
}`,
  'settings.customStyleExamples': '예시',
  'settings.customStyleExamplesContent': `<p>사용자 정의 스타일 예시</p>
  <p>
  <pre>/* 사용자 정의 스타일 */
body {
  /* 태그 텍스트 색상 */
  --utags-text-tag-color: white;
  /* 태그 테두리 색상 */
  --utags-text-tag-border-color: red;
  /* 태그 배경 색상 */
  --utags-text-tag-background-color: red;
}

/* 'TEST' 라벨의 태그 스타일 */
.utags_text_tag[data-utags_tag="TEST"] {
  /* 태그 텍스트 색상 */
  --utags-text-tag-color: white;
  /* 태그 테두리 색상 */
  --utags-text-tag-border-color: orange;
  /* 태그 배경 색상 */
  --utags-text-tag-background-color: orange;
}

[data-utags_list_node*=",bar,"] {
  /* 목록에서 'bar' 태그를 포함한 항목의 배경색 */
  background-color: aqua;
}

body {
  /* 방문한 게시물의 제목 색상 */
  --utags-visited-title-color: red;
}

/* 다크 모드 */
[data-utags_darkmode="1"] body {
  /* 방문한 게시물의 제목 색상 */
  --utags-visited-title-color: yellow;
}
</pre>
  </p>
  <p><a href="https://github.com/utags/utags/tree/main/custom-style-examples">더 많은 예시</a></p>
  `,
  'settings.useSimplePrompt': '간단한 방법으로 태그 추가',
  'settings.openTagsPage': '태그 목록',
  'settings.openDataPage': '데이터 내보내기/가져오기',
  'settings.title': '🏷️ UTags - 링크에 사용자 태그 추가',
  'settings.information': '설정을 변경한 후 페이지를 새로고침하면 적용됩니다',
  'settings.report': '문제 신고',
  'prompt.addTags': '[UTags] 태그를 입력하세요. 여러 태그는 쉼표로 구분하세요',
  'prompt.pinnedTags': '고정',
  'prompt.mostUsedTags': '최근 자주 사용',
  'prompt.recentAddedTags': '최근 추가',
  'prompt.emojiTags': '이모지',
  'prompt.copy': '복사',
  'prompt.cancel': '취소',
  'prompt.ok': '확인',
  'prompt.settings': '설정',
  'prompt.addTagsToCurrentPage': '현재 페이지에 태그 추가',
}

export default messages
