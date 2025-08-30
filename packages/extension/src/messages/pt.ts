export const messages = {
  'settings.enableCurrentSite': 'Ativar UTags no site atual',
  'settings.showHidedItems': "Mostrar itens ocultos (conteúdo marcado com tags 'block', 'hide')",
  'settings.noOpacityEffect': "Remover efeito de transparência (conteúdo marcado com tags 'ignore', 'clickbait', 'promotion')",
  'settings.useVisitedFunction': 'Ativar função de marcação de conteúdo de navegação no site atual',
  'settings.displayEffectOfTheVisitedContent': 'Efeito de exibição do conteúdo visitado',
  'settings.displayEffectOfTheVisitedContent.recordingonly': 'Salvar apenas registros, não mostrar marca',
  'settings.displayEffectOfTheVisitedContent.showtagonly': 'Mostrar apenas marca',
  'settings.displayEffectOfTheVisitedContent.changecolor': 'Alterar cor do título',
  'settings.displayEffectOfTheVisitedContent.translucent': 'Translúcido',
  'settings.displayEffectOfTheVisitedContent.hide': 'Ocultar',
  'settings.pinnedTags': 'Adicione as tags que deseja fixar, separadas por vírgulas',
  'settings.pinnedTagsDefaultValue': 'block, hide, ignore, clickbait, promotion',
  'settings.pinnedTagsPlaceholder': 'foo, bar',
  'settings.emojiTags': 'Adicione tags emoji, separadas por vírgulas',
  'settings.customStyle': 'Ativar estilo personalizado para todos os sites',
  'settings.customStyleCurrentSite': 'Ativar estilo personalizado para o site atual',
  'settings.customStyleDefaultValue': `/* Estilo personalizado */
body {
  /* Cor do texto da tag */
  --utags-text-tag-color: white;
  /* Cor da borda da tag */
  --utags-text-tag-border-color: red;
  /* Cor de fundo da tag */
  --utags-text-tag-background-color: red;
}

/* Estilo da tag para o rótulo 'TEST' */
.utags_text_tag[data-utags_tag="TEST"] {
  /* Cor do texto da tag */
  --utags-text-tag-color: white;
  /* Cor da borda da tag */
  --utags-text-tag-border-color: orange;
  /* Cor de fundo da tag */
  --utags-text-tag-background-color: orange;
}`,
  'settings.customStyleExamples': 'Exemplos',
  'settings.customStyleExamplesContent': `<p>Exemplos de estilo personalizado</p>
  <p>
  <pre>/* Estilo personalizado */
body {
  /* Cor do texto da tag */
  --utags-text-tag-color: white;
  /* Cor da borda da tag */
  --utags-text-tag-border-color: red;
  /* Cor de fundo da tag */
  --utags-text-tag-background-color: red;
}

/* Estilo da tag para o rótulo 'TEST' */
.utags_text_tag[data-utags_tag="TEST"] {
  /* Cor do texto da tag */
  --utags-text-tag-color: white;
  /* Cor da borda da tag */
  --utags-text-tag-border-color: orange;
  /* Cor de fundo da tag */
  --utags-text-tag-background-color: orange;
}

[data-utags_list_node*=",bar,"] {
  /* Cor de fundo das entradas na lista que contêm a tag 'bar' */
  background-color: aqua;
}

body {
  /* Cor do título das postagens visitadas */
  --utags-visited-title-color: red;
}

/* Modo escuro */
[data-utags_darkmode="1"] body {
  /* Cor do título das postagens visitadas */
  --utags-visited-title-color: yellow;
}
</pre>
  </p>
  <p><a href="https://github.com/utags/utags/tree/main/custom-style-examples">Mais exemplos</a></p>
  `,
  'settings.enableTagStyleInPrompt': 'Ativar estilo de tags na janela de entrada de tags',
  'settings.useSimplePrompt': 'Usar método simples para adicionar tags',
  'settings.openTagsPage': 'Lista de tags',
  'settings.openDataPage': 'Exportar/Importar dados',
  'settings.title': '🏷️ UTags - Adicionar tags de usuário aos links',
  'settings.information': 'Após alterar as configurações, recarregue a página para que tenham efeito',
  'settings.report': 'Relatar problema',
  'prompt.addTags': '[UTags] Por favor, insira tags, múltiplas tags são separadas por vírgulas',
  'prompt.pinnedTags': 'Fixado',
  'prompt.mostUsedTags': 'Recentemente usado com frequência',
  'prompt.recentAddedTags': 'Recém-adicionado',
  'prompt.emojiTags': 'Emoji',
  'prompt.copy': 'Copiar',
  'prompt.cancel': 'Cancelar',
  'prompt.ok': 'Confirmar',
  'prompt.settings': 'Configurações',
  'menu.addTagsToCurrentPage': 'Adicionar tags à página atual',
  'menu.modifyCurrentPageTags': 'Modificar tags da página atual',
  'menu.addQuickTag': 'Adicionar tag {tag} à página atual',
  'menu.removeQuickTag': 'Remover tag {tag} da página atual',
  'settings.quickTags': 'Tags Rápidas',
  'settings.quickTagsPlaceholder': '★, ⭐, 💎',
}

export default messages
