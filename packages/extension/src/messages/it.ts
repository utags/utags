export const messages = {
  'settings.enableCurrentSite': 'Abilita UTags sul sito web corrente',
  'settings.enableCurrentSiteCustomRule': 'Abilita regole di corrispondenza personalizzate per il sito web corrente',
  'settings.customRuleValue': 'Regole di corrispondenza personalizzate',
  'settings.showHidedItems': "Mostra elementi nascosti (contenuto etichettato con tag 'block', 'hide')",
  'settings.noOpacityEffect': "Rimuovi effetto trasparenza (contenuto etichettato con tag 'ignore', 'clickbait', 'promotion')",
  'settings.useVisitedFunction': 'Abilita funzione di tagging del contenuto di navigazione sul sito web attuale',
  'settings.displayEffectOfTheVisitedContent': 'Effetto di visualizzazione del contenuto visitato',
  'settings.displayEffectOfTheVisitedContent.recordingonly': 'Salva solo registrazioni, non mostrare segno',
  'settings.displayEffectOfTheVisitedContent.showtagonly': 'Mostra solo segno',
  'settings.displayEffectOfTheVisitedContent.changecolor': 'Cambia colore del titolo',
  'settings.displayEffectOfTheVisitedContent.translucent': 'Traslucido',
  'settings.displayEffectOfTheVisitedContent.hide': 'Nascondere',
  'settings.pinnedTags': 'Aggiungi i tag che vuoi fissare, separati da virgole',
  'settings.pinnedTagsDefaultValue': 'block, hide, ignore, clickbait, promotion',
  'settings.pinnedTagsPlaceholder': 'foo, bar',
  'settings.emojiTags': 'Aggiungi tag emoji, separati da virgole',
  'settings.customStyle': 'Abilita stile personalizzato per tutti i siti web',
  'settings.customStyleCurrentSite': 'Abilita stile personalizzato per il sito web attuale',
  'settings.customStyleDefaultValue': `/* Stile personalizzato */
body {
  /* Colore del testo del tag */
  --utags-text-tag-color: white;
  /* Colore del bordo del tag */
  --utags-text-tag-border-color: red;
  /* Colore di sfondo del tag */
  --utags-text-tag-background-color: red;
}

/* Stile del tag per l'etichetta 'TEST' */
.utags_text_tag[data-utags_tag="TEST"] {
  /* Colore del testo del tag */
  --utags-text-tag-color: white;
  /* Colore del bordo del tag */
  --utags-text-tag-border-color: orange;
  /* Colore di sfondo del tag */
  --utags-text-tag-background-color: orange;
}`,
  'settings.customStyleExamples': 'Esempi',
  'settings.customStyleExamplesContent': `<p>Esempi di stile personalizzato</p>
  <p>
  <pre>/* Stile personalizzato */
body {
  /* Colore del testo del tag */
  --utags-text-tag-color: white;
  /* Colore del bordo del tag */
  --utags-text-tag-border-color: red;
  /* Colore di sfondo del tag */
  --utags-text-tag-background-color: red;
}

/* Stile del tag per l'etichetta 'TEST' */
.utags_text_tag[data-utags_tag="TEST"] {
  /* Colore del testo del tag */
  --utags-text-tag-color: white;
  /* Colore del bordo del tag */
  --utags-text-tag-border-color: orange;
  /* Colore di sfondo del tag */
  --utags-text-tag-background-color: orange;
}

[data-utags_list_node*=",bar,"] {
  /* Colore di sfondo delle voci nell'elenco che contengono il tag 'bar' */
  background-color: aqua;
}

body {
  /* Colore del titolo dei post visitati */
  --utags-visited-title-color: red;
}

/* Modalità scura */
[data-utags_darkmode="1"] body {
  /* Colore del titolo dei post visitati */
  --utags-visited-title-color: yellow;
}
</pre>
  </p>
  <p><a href="https://github.com/utags/utags/tree/main/custom-style-examples">Altri esempi</a></p>
  `,
  'settings.enableTagStyleInPrompt': 'Abilita lo stile dei tag nella finestra di inserimento tag',
  'settings.useSimplePrompt': 'Usa metodo semplice per aggiungere tag',
  'settings.openTagsPage': 'Elenco tag',
  'settings.openDataPage': 'Esporta/Importa dati',
  'settings.title': '🏷️ UTags - Aggiungi tag utente ai collegamenti',
  'settings.information': 'Dopo aver modificato le impostazioni, ricarica la pagina perché abbiano effetto',
  'settings.report': 'Segnala problema',
  'prompt.addTags': '[UTags] Inserisci tag, più tag sono separati da virgole',
  'prompt.pinnedTags': 'Fissato',
  'prompt.mostUsedTags': 'Recentemente usato frequentemente',
  'prompt.recentAddedTags': 'Appena aggiunto',
  'prompt.emojiTags': 'Emoji',
  'prompt.copy': 'Copia',
  'prompt.cancel': 'Annulla',
  'prompt.ok': 'Conferma',
  'prompt.settings': 'Impostazioni',
  'menu.addTagsToCurrentPage': 'Aggiungi tag alla pagina corrente',
  'menu.modifyCurrentPageTags': 'Modifica tag della pagina corrente',
  'menu.addQuickTag': 'Aggiungi tag {tag} alla pagina corrente',
  'menu.removeQuickTag': 'Rimuovi tag {tag} dalla pagina corrente',
  'menu.bookmarkList': 'Gestione segnalibri',
  'menu.hideAllTags': 'Nascondi tutte le etichette',
  'menu.unhideAllTags': 'Mostra tutte le etichette',
  'settings.enableQuickStar': 'Abilita aggiunta rapida stella',
  'settings.quickTags': 'Tag Rapidi',
  'settings.quickTagsPlaceholder': '★, ⭐, 💎',
}

export default messages
