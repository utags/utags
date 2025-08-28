export const messages = {
  'settings.enableCurrentSite': 'UTags auf der aktuellen Website aktivieren',
  'settings.showHidedItems': "Versteckte Elemente anzeigen (Inhalte mit 'block', 'hide' Tags markiert)",
  'settings.noOpacityEffect': "Transparenz-Effekt entfernen (Inhalte mit 'ignore', 'clickbait', 'promotion' Tags markiert)",
  'settings.useVisitedFunction': 'Browsing-Inhalts-Tagging auf der aktuellen Website aktivieren',
  'settings.displayEffectOfTheVisitedContent': 'Anzeigeeffekt für besuchte Inhalte',
  'settings.displayEffectOfTheVisitedContent.recordingonly': 'Nur Aufzeichnungen speichern, keine Markierung anzeigen',
  'settings.displayEffectOfTheVisitedContent.showtagonly': 'Nur Markierung anzeigen',
  'settings.displayEffectOfTheVisitedContent.changecolor': 'Titelfarbe ändern',
  'settings.displayEffectOfTheVisitedContent.translucent': 'Durchscheinend',
  'settings.displayEffectOfTheVisitedContent.hide': 'Verstecken',
  'settings.pinnedTags': 'Fügen Sie die Tags hinzu, die Sie anheften möchten, getrennt durch Kommas',
  'settings.pinnedTagsDefaultValue': 'block, hide, ignore, clickbait, promotion',
  'settings.pinnedTagsPlaceholder': 'foo, bar',
  'settings.emojiTags': 'Fügen Sie Emoji-Tags hinzu, getrennt durch Kommas',
  'settings.customStyle': 'Benutzerdefinierten Stil für alle Websites aktivieren',
  'settings.customStyleCurrentSite': 'Benutzerdefinierten Stil für die aktuelle Website aktivieren',
  'settings.customStyleDefaultValue': `/* Benutzerdefinierter Stil */
body {
  /* Tag-Textfarbe */
  --utags-text-tag-color: white;
  /* Tag-Rahmenfarbe */
  --utags-text-tag-border-color: red;
  /* Tag-Hintergrundfarbe */
  --utags-text-tag-background-color: red;
}

/* Tag-Stil für das Label 'TEST' */
.utags_text_tag[data-utags_tag="TEST"] {
  /* Tag-Textfarbe */
  --utags-text-tag-color: white;
  /* Tag-Rahmenfarbe */
  --utags-text-tag-border-color: orange;
  /* Tag-Hintergrundfarbe */
  --utags-text-tag-background-color: orange;
}`,
  'settings.customStyleExamples': 'Beispiele',
  'settings.customStyleExamplesContent': `<p>Beispiele für benutzerdefinierten Stil</p>
  <p>
  <pre>/* Benutzerdefinierter Stil */
body {
  /* Tag-Textfarbe */
  --utags-text-tag-color: white;
  /* Tag-Rahmenfarbe */
  --utags-text-tag-border-color: red;
  /* Tag-Hintergrundfarbe */
  --utags-text-tag-background-color: red;
}

/* Tag-Stil für das Label 'TEST' */
.utags_text_tag[data-utags_tag="TEST"] {
  /* Tag-Textfarbe */
  --utags-text-tag-color: white;
  /* Tag-Rahmenfarbe */
  --utags-text-tag-border-color: orange;
  /* Tag-Hintergrundfarbe */
  --utags-text-tag-background-color: orange;
}

[data-utags_list_node*=",bar,"] {
  /* Hintergrundfarbe der Einträge in der Liste, die das 'bar' Tag enthalten */
  background-color: aqua;
}

body {
  /* Titelfarbe besuchter Beiträge */
  --utags-visited-title-color: red;
}

/* Dunkler Modus */
[data-utags_darkmode="1"] body {
  /* Titelfarbe besuchter Beiträge */
  --utags-visited-title-color: yellow;
}
</pre>
  </p>
  <p><a href="https://github.com/utags/utags/tree/main/custom-style-examples">Weitere Beispiele</a></p>
  `,
  'settings.enableTagStyleInPrompt': 'Tag-Styling im Tag-Eingabefenster aktivieren',
  'settings.useSimplePrompt': 'Einfache Methode zum Hinzufügen von Tags verwenden',
  'settings.openTagsPage': 'Tag-Liste',
  'settings.openDataPage': 'Daten exportieren/importieren',
  'settings.title': '🏷️ UTags - Benutzer-Tags zu Links hinzufügen',
  'settings.information': 'Nach dem Ändern der Einstellungen laden Sie die Seite neu, damit sie wirksam werden',
  'settings.report': 'Problem melden',
  'prompt.addTags': '[UTags] Bitte geben Sie Tags ein, mehrere Tags werden durch Kommas getrennt',
  'prompt.pinnedTags': 'Angeheftet',
  'prompt.mostUsedTags': 'Kürzlich häufig verwendet',
  'prompt.recentAddedTags': 'Neu hinzugefügt',
  'prompt.emojiTags': 'Emoji',
  'prompt.copy': 'Kopieren',
  'prompt.cancel': 'Abbrechen',
  'prompt.ok': 'Bestätigen',
  'prompt.settings': 'Einstellungen',
  'menu.addTagsToCurrentPage': 'Tags zur aktuellen Seite hinzufügen',
  'menu.modifyCurrentPageTags': 'Tags der aktuellen Seite ändern',
  'menu.addQuickTag': '{tag} Tag zur aktuellen Seite hinzufügen',
  'menu.removeQuickTag': '{tag} Tag von der aktuellen Seite entfernen',
  'settings.quickTags': 'Schnell-Tags',
  'settings.quickTagsPlaceholder': '★, ⭐, 💎',
}

export default messages
