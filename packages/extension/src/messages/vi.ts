export const messages = {
  'settings.enableCurrentSite': 'Bật UTags trên trang web hiện tại',
  'settings.enableCurrentSiteCustomRule': 'Bật quy tắc khớp tùy chỉnh cho trang web hiện tại',
  'settings.customRuleValue': 'Quy tắc khớp tùy chỉnh',
  'settings.showHidedItems': "Hiển thị các mục bị ẩn (nội dung được gắn tag 'block', 'hide')",
  'settings.noOpacityEffect': "Loại bỏ hiệu ứng trong suốt (nội dung được gắn tag 'ignore', 'clickbait', 'promotion')",
  'settings.useVisitedFunction': 'Kích hoạt chức năng gắn tag nội dung điều hướng trên trang web hiện tại',
  'settings.displayEffectOfTheVisitedContent': 'Hiệu ứng hiển thị nội dung đã xem',
  'settings.displayEffectOfTheVisitedContent.recordingonly': 'Chỉ lưu bản ghi, không hiển thị dấu hiệu',
  'settings.displayEffectOfTheVisitedContent.showtagonly': 'Chỉ hiển thị dấu hiệu',
  'settings.displayEffectOfTheVisitedContent.changecolor': 'Thay đổi màu tiêu đề',
  'settings.displayEffectOfTheVisitedContent.translucent': 'Trong suốt',
  'settings.displayEffectOfTheVisitedContent.hide': 'Ẩn',
  'settings.pinnedTags': 'Thêm các tag bạn muốn ghim, phân cách bằng dấu phẩy',
  'settings.pinnedTagsDefaultValue': 'block, hide, ignore, clickbait, promotion',
  'settings.pinnedTagsPlaceholder': 'foo, bar',
  'settings.emojiTags': 'Thêm tag emoji, phân cách bằng dấu phẩy',
  'settings.customStyle': 'Kích hoạt kiểu tùy chỉnh cho tất cả trang web',
  'settings.customStyleCurrentSite': 'Kích hoạt kiểu tùy chỉnh cho trang web hiện tại',
  'settings.customStyleDefaultValue': `/* Kiểu tùy chỉnh */
body {
  /* Màu văn bản của tag */
  --utags-text-tag-color: white;
  /* Màu viền của tag */
  --utags-text-tag-border-color: red;
  /* Màu nền của tag */
  --utags-text-tag-background-color: red;
}

/* Kiểu tag cho nhãn 'TEST' */
.utags_text_tag[data-utags_tag="TEST"] {
  /* Màu văn bản của tag */
  --utags-text-tag-color: white;
  /* Màu viền của tag */
  --utags-text-tag-border-color: orange;
  /* Màu nền của tag */
  --utags-text-tag-background-color: orange;
}`,
  'settings.customStyleExamples': 'Ví dụ',
  'settings.customStyleExamplesContent': `<p>Ví dụ về kiểu tùy chỉnh</p>
  <p>
  <pre>/* Kiểu tùy chỉnh */
body {
  /* Màu văn bản của tag */
  --utags-text-tag-color: white;
  /* Màu viền của tag */
  --utags-text-tag-border-color: red;
  /* Màu nền của tag */
  --utags-text-tag-background-color: red;
}

/* Kiểu tag cho nhãn 'TEST' */
.utags_text_tag[data-utags_tag="TEST"] {
  /* Màu văn bản của tag */
  --utags-text-tag-color: white;
  /* Màu viền của tag */
  --utags-text-tag-border-color: orange;
  /* Màu nền của tag */
  --utags-text-tag-background-color: orange;
}

[data-utags_list_node*=",bar,"] {
  /* Màu nền của các mục trong danh sách chứa tag 'bar' */
  background-color: aqua;
}

body {
  /* Màu tiêu đề của bài viết đã xem */
  --utags-visited-title-color: red;
}

/* Chế độ tối */
[data-utags_darkmode="1"] body {
  /* Màu tiêu đề của bài viết đã xem */
  --utags-visited-title-color: yellow;
}
</pre>
  </p>
  <p><a href="https://github.com/utags/utags/tree/main/custom-style-examples">Thêm ví dụ</a></p>
  `,
  'settings.enableTagStyleInPrompt': 'Bật kiểu dáng thẻ trong cửa sổ nhập thẻ',
  'settings.useSimplePrompt': 'Sử dụng phương pháp đơn giản để thêm thẻ',
  'settings.openTagsPage': 'Danh sách tag',
  'settings.openDataPage': 'Xuất/Nhập dữ liệu',
  'settings.title': '🏷️ UTags - Thêm tag người dùng vào liên kết',
  'settings.information': 'Sau khi thay đổi cài đặt, hãy tải lại trang để có hiệu lực',
  'settings.report': 'Báo cáo vấn đề',
  'prompt.addTags': '[UTags] Vui lòng nhập tag, nhiều tag được phân cách bằng dấu phẩy',
  'prompt.pinnedTags': 'Đã ghim',
  'prompt.mostUsedTags': 'Gần đây sử dụng thường xuyên',
  'prompt.recentAddedTags': 'Vừa thêm',
  'prompt.emojiTags': 'Emoji',
  'prompt.copy': 'Sao chép',
  'prompt.cancel': 'Hủy',
  'prompt.ok': 'Xác nhận',
  'prompt.settings': 'Cài đặt',
  'menu.addTagsToCurrentPage': 'Thêm thẻ vào trang hiện tại',
  'menu.modifyCurrentPageTags': 'Sửa đổi thẻ trang hiện tại',
  'menu.addQuickTag': 'Thêm thẻ {tag} vào trang hiện tại',
  'menu.removeQuickTag': 'Xóa thẻ {tag} khỏi trang hiện tại',
  'menu.bookmarkList': 'Trình quản lý dấu trang',
  'menu.hideAllTags': 'Ẩn tất cả thẻ',
  'menu.unhideAllTags': 'Hiện tất cả thẻ',
  'settings.enableQuickStar': 'Kích hoạt thêm sao nhanh',
  'settings.quickTags': 'Thẻ Nhanh',
  'settings.quickTagsPlaceholder': '★, ⭐, 💎',
}

export default messages
