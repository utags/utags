const messages = {
  "settings.enableCurrentSite": "Включить UTags на текущем сайте",
  "settings.showHidedItems": "Показывать скрытые элементы (метки с «блок», «скрыто»)",
  "settings.noOpacityEffect": "Без эффекта прозрачной маски (метки с «игнор», «кликбейт», «реклама»)",
  "settings.useVisitedFunction": "Включить метки контента для просмотра на текущем сайте",
  "settings.displayEffectOfTheVisitedContent": "Эффект отображения просмотренного содержимого",
  "settings.displayEffectOfTheVisitedContent.recordingonly": "Только сохранение записей, без отображения меток",
  "settings.displayEffectOfTheVisitedContent.showtagonly": "Отображать только метки",
  "settings.displayEffectOfTheVisitedContent.changecolor": "Изменить цвет заголовка",
  "settings.displayEffectOfTheVisitedContent.translucent": "Прозрачный",
  "settings.displayEffectOfTheVisitedContent.hide": "Скрыть",
  "settings.pinnedTags": "Добавьте метки, которые вы хотите прикрепить, разделив их запятыми.",
  "settings.pinnedTagsDefaultValue": "блок, скрыто, игнор, кликбейт, реклама",
  "settings.pinnedTagsPlaceholder": "foo, bar",
  "settings.emojiTags": "Добавьте метки эмодзи, разделив их запятыми",
  "settings.customStyle": "Включить пользовательский стиль для всех сайтов",
  "settings.customStyleCurrentSite": "Включить пользовательский стиль для текущего сайта",
  "settings.customStyleDefaultValue": `/* Пользовательский стиль */
body {
  /* Цвет текста метки */
  --utags-text-tag-color: white;
  /* Цвет границ метки */
  --utags-text-tag-border-color: red;
  /* Цвет фона метки */
  --utags-text-tag-background-color: red;
}

/* Стиль метки для метки с ярлыком «TEST» */
.utags_text_tag[data-utags_tag="TEST"] {
  /* Цвет текста метки */
  --utags-text-tag-color: white;
  /* Цвет границ метки */
  --utags-text-tag-border-color: orange;
  /* Цвет фона метки */
  --utags-text-tag-background-color: orange;
}`,
  "settings.customStyleExamples": "Образцы",
  "settings.customStyleExamplesContent": `<p>Образцы пользовательских стилей</p>
  <p>
  <pre>/* Пользовательский стиль */
body {
  /* Цвет текста метки */
  --utags-text-tag-color: white;
  /* Цвет границ метки */
  --utags-text-tag-border-color: red;
  /* Цвет фона метки */
  --utags-text-tag-background-color: red;
}

/* Стиль метки для метки с ярлыком «TEST» */
.utags_text_tag[data-utags_tag="TEST"] {
  /* Цвет текста метки */
  --utags-text-tag-color: white;
  /* Цвет границ метки */
  --utags-text-tag-border-color: orange;
  /* Цвет фона метки */
  --utags-text-tag-background-color: orange;
}

data-utags_list_node*=",bar,"] {
  /* Цвет фона записей
  в списке, которые содержат метку «bar» */
  background-color: aqua;
}

body {
  /* Цвет заголовка просматриваемых публикаций */
  --utags-visited-title-color: red;
}

/* Тёмный режим */
[data-utags_darkmode="1"] body {
  /* Цвет заголовка просматриваемых публикаций */
  --utags-visited-title-color: yellow;
}
</pre>
  </p>
  <p><a href="https://github.com/utags/utags/tree/main/custom-style-examples">Больше примеров</a></p>
  `,
  "settings.useSimplePrompt": "Использовать простой метод подсказок для добавления меток",
  "settings.openTagsPage": "Открыть страницу списка меток",
  "settings.openDataPage": "Открыть страницу импорта данных/экспорта данных",
  "settings.title": "🏷️ UTags – добавление пользовательских меток к ссылкам",
  "settings.information": "После изменения настроек перезагрузите страницу, чтобы они вступили в силу",
  "settings.report": "Отправка ошибки...",
  "prompt.addTags": "[UTags] Пожалуйста, введите метки, несколько меток разделяются запятыми",
  "prompt.pinnedTags": "Прикреплённые",
  "prompt.mostUsedTags": "Недавно часто используемые",
  "prompt.recentAddedTags": "Недавно добавленные",
  "prompt.emojiTags": "Эмодзи",
  "prompt.copy": "Копировать",
  "prompt.cancel": "Отмена",
  "prompt.ok": "OK",
  "prompt.settings": "Настройки",
}

export default messages
