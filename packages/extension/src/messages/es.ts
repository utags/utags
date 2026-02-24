export const messages = {
  'settings.enableCurrentSite': 'Habilitar UTags en el sitio web actual',
  'settings.enableCurrentSiteCustomRule': 'Habilitar reglas de coincidencia personalizadas para el sitio web actual',
  'settings.customRuleValue': 'Reglas de coincidencia personalizadas',
  'settings.showHidedItems': "Mostrar elementos ocultos (contenido etiquetado con 'block', 'hide')",
  'settings.noOpacityEffect': "Eliminar efecto de transparencia (contenido etiquetado con 'ignore', 'clickbait', 'promotion')",
  'settings.useVisitedFunction': 'Habilitar función de etiquetado de contenido de navegación en el sitio web actual',
  'settings.displayEffectOfTheVisitedContent': 'Efecto de visualización del contenido visitado',
  'settings.displayEffectOfTheVisitedContent.recordingonly': 'Solo guardar registros, no mostrar marca',
  'settings.displayEffectOfTheVisitedContent.showtagonly': 'Solo mostrar marca',
  'settings.displayEffectOfTheVisitedContent.changecolor': 'Cambiar color del título',
  'settings.displayEffectOfTheVisitedContent.translucent': 'Translúcido',
  'settings.displayEffectOfTheVisitedContent.hide': 'Ocultar',
  'settings.pinnedTags': 'Agregue las etiquetas que desea fijar, separadas por comas',
  'settings.pinnedTagsDefaultValue': 'block, hide, ignore, clickbait, promotion',
  'settings.pinnedTagsPlaceholder': 'foo, bar',
  'settings.emojiTags': 'Agregue etiquetas emoji, separadas por comas',
  'settings.customStyle': 'Habilitar estilo personalizado para todos los sitios web',
  'settings.customStyleCurrentSite': 'Habilitar estilo personalizado para el sitio web actual',
  'settings.customStyleDefaultValue': `/* Estilo personalizado */
body {
  /* Color del texto de la etiqueta */
  --utags-text-tag-color: white;
  /* Color del borde de la etiqueta */
  --utags-text-tag-border-color: red;
  /* Color de fondo de la etiqueta */
  --utags-text-tag-background-color: red;
}

/* Estilo de etiqueta para la etiqueta 'TEST' */
.utags_text_tag[data-utags_tag="TEST"] {
  /* Color del texto de la etiqueta */
  --utags-text-tag-color: white;
  /* Color del borde de la etiqueta */
  --utags-text-tag-border-color: orange;
  /* Color de fondo de la etiqueta */
  --utags-text-tag-background-color: orange;
}`,
  'settings.customStyleExamples': 'Ejemplos',
  'settings.customStyleExamplesContent': `<p>Ejemplos de estilo personalizado</p>
  <p>
  <pre>/* Estilo personalizado */
body {
  /* Color del texto de la etiqueta */
  --utags-text-tag-color: white;
  /* Color del borde de la etiqueta */
  --utags-text-tag-border-color: red;
  /* Color de fondo de la etiqueta */
  --utags-text-tag-background-color: red;
}

/* Estilo de etiqueta para la etiqueta 'TEST' */
.utags_text_tag[data-utags_tag="TEST"] {
  /* Color del texto de la etiqueta */
  --utags-text-tag-color: white;
  /* Color del borde de la etiqueta */
  --utags-text-tag-border-color: orange;
  /* Color de fondo de la etiqueta */
  --utags-text-tag-background-color: orange;
}

[data-utags_list_node*=",bar,"] {
  /* Color de fondo de las entradas en la lista que contienen la etiqueta 'bar' */
  background-color: aqua;
}

body {
  /* Color del título de las publicaciones visitadas */
  --utags-visited-title-color: red;
}

/* Modo oscuro */
[data-utags_darkmode="1"] body {
  /* Color del título de las publicaciones visitadas */
  --utags-visited-title-color: yellow;
}
</pre>
  </p>
  <p><a href="https://github.com/utags/utags/tree/main/custom-style-examples">Más ejemplos</a></p>
  `,
  'settings.enableTagStyleInPrompt': 'Habilitar estilo de etiquetas en la ventana de entrada de etiquetas',
  'settings.useSimplePrompt': 'Usar método simple para agregar etiquetas',
  'settings.openTagsPage': 'Lista de etiquetas',
  'settings.openDataPage': 'Exportar/Importar datos',
  'settings.title': '🏷️ UTags - Agregar etiquetas de usuario a los enlaces',
  'settings.information': 'Después de cambiar la configuración, recargue la página para que surta efecto',
  'settings.report': 'Reportar problema',
  'prompt.addTags': '[UTags] Por favor ingrese etiquetas, múltiples etiquetas están separadas por comas',
  'prompt.pinnedTags': 'Fijado',
  'prompt.mostUsedTags': 'Recientemente usado frecuentemente',
  'prompt.recentAddedTags': 'Recién agregado',
  'prompt.emojiTags': 'Emoji',
  'prompt.copy': 'Copiar',
  'prompt.cancel': 'Cancelar',
  'prompt.ok': 'Confirmar',
  'prompt.settings': 'Configuración',
  'menu.addTagsToCurrentPage': 'Agregar etiquetas a la página actual',
  'menu.modifyCurrentPageTags': 'Modificar etiquetas de la página actual',
  'menu.addQuickTag': 'Agregar etiqueta {tag} a la página actual',
  'menu.removeQuickTag': 'Eliminar etiqueta {tag} de la página actual',
  'menu.bookmarkList': 'Administrador de marcadores',
  'menu.hideAllTags': 'Ocultar todas las etiquetas',
  'menu.unhideAllTags': 'Mostrar todas las etiquetas',
  'settings.enableQuickStar': 'Habilitar agregar estrella rápida',
  'settings.quickTags': 'Etiquetas Rápidas',
  'settings.quickTagsPlaceholder': '★, ⭐, 💎',
}

export default messages
