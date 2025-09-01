const messages = {
  'settings.enableCurrentSite': 'Enable UTags on the current website',
  'settings.showHidedItems': "Show hidden items (content tagged with 'block', 'hide')",
  'settings.noOpacityEffect': "No opacity mask effect (content tagged with 'ignore', 'clickbait', 'promotion')",
  'settings.useVisitedFunction': 'Enable browsing content tagging on the current website',
  'settings.displayEffectOfTheVisitedContent': 'The display effect of the browsed content',
  'settings.displayEffectOfTheVisitedContent.recordingonly': 'Save records only, no mark display',
  'settings.displayEffectOfTheVisitedContent.showtagonly': 'Only display marks',
  'settings.displayEffectOfTheVisitedContent.changecolor': 'Change the title color',
  'settings.displayEffectOfTheVisitedContent.translucent': 'Translucent',
  'settings.displayEffectOfTheVisitedContent.hide': 'Hide',
  'settings.pinnedTags': 'Add the tags you want to pin, separated by commas.',
  'settings.pinnedTagsDefaultValue': 'block, hide, ignore, clickbait, promotion',
  'settings.pinnedTagsPlaceholder': 'foo, bar',
  'settings.emojiTags': 'Add the emoji tags, separated by commas',
  'settings.customStyle': 'Enable custom style for all websites',
  'settings.customStyleCurrentSite': 'Enable custom style for the current website',
  'settings.customStyleDefaultValue': `/* Custom style */
body {
  /* Tag text color */
  --utags-text-tag-color: white;
  /* Tag border color */
  --utags-text-tag-border-color: red;
  /* Tag background color */
  --utags-text-tag-background-color: red;
}

/* The tag style for the tag with the label 'TEST' */
.utags_text_tag[data-utags_tag="TEST"] {
  /* Tag text color */
  --utags-text-tag-color: white;
  /* Tag border color */
  --utags-text-tag-border-color: orange;
  /* Tag background color */
  --utags-text-tag-background-color: orange;
}`,
  'settings.customStyleExamples': 'Examples',
  'settings.customStyleExamplesContent': `<p>Custom style examples</p>
  <p>
  <pre>/* Custom style */
body {
  /* Tag text color */
  --utags-text-tag-color: white;
  /* Tag border color */
  --utags-text-tag-border-color: red;
  /* Tag background color */
  --utags-text-tag-background-color: red;
}

/* The tag style for the tag with the label 'TEST' */
.utags_text_tag[data-utags_tag="TEST"] {
  /* Tag text color */
  --utags-text-tag-color: white;
  /* Tag border color */
  --utags-text-tag-border-color: orange;
  /* Tag background color */
  --utags-text-tag-background-color: orange;
}

[data-utags_list_node*=",bar,"] {
  /* The background color of the entries
  in the list that contain the 'bar' tag */
  background-color: aqua;
}

body {
  /* The title color of viewed posts */
  --utags-visited-title-color: red;
}

/* Dark mode */
[data-utags_darkmode="1"] body {
  /* The title color of viewed posts */
  --utags-visited-title-color: yellow;
}
</pre>
  </p>
  <p><a href="https://github.com/utags/utags/tree/main/custom-style-examples">More examples</a></p>
  `,
  'settings.enableTagStyleInPrompt': 'Enable tag styling in tag input window',
  'settings.useSimplePrompt': 'Use simple prompt method to add tags',
  'settings.openTagsPage': 'Open the tag list page',
  'settings.openDataPage': 'Open the import data/export data page',
  'settings.title': '🏷️ UTags - Add usertags to links',
  'settings.information': 'After changing the settings, reload the page to take effect',
  'settings.report': 'Report and Issue...',
  'prompt.addTags': '[UTags] Please enter tags, multiple tags are separated by commas',
  'prompt.pinnedTags': 'Pinned',
  'prompt.mostUsedTags': 'Recently commonly used',
  'prompt.recentAddedTags': 'Newly added',
  'prompt.emojiTags': 'Emoji',
  'prompt.copy': 'Copy',
  'prompt.cancel': 'Cancel',
  'prompt.ok': 'OK',
  'prompt.settings': 'Settings',
  'menu.addTagsToCurrentPage': 'Add tags to current page',
  'menu.modifyCurrentPageTags': 'Modify current page tags',
  'menu.addQuickTag': 'Add {tag} tag to current page',
  'menu.removeQuickTag': 'Remove {tag} tag from current page',
  'menu.bookmarkList': 'Bookmark Manager',
  'settings.quickTags': 'Quick Tags',
  'settings.quickTagsPlaceholder': '★, ⭐, 💎',
  'settings.enableQuickStar': 'Enable quick star adding',
}

export default messages
