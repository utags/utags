/* eslint-disable @typescript-eslint/naming-convention */
const validNodeNames: Record<string, boolean> = {
  A: true,
  H1: true,
  H2: true,
  H3: true,
  H4: true,
  H5: true,
  H6: true,
  DIV: true,
  SPAN: true,
  P: true,
  UL: true,
  OL: true,
  LI: true,
  SECTION: true,
}
/* eslint-enable @typescript-eslint/naming-convention */

export function shouldUpdateUtagsWhenNodeUpdated(nodeList: NodeList) {
  const length = nodeList.length
  for (let i = 0; i < length; i++) {
    const node = nodeList[i]
    if (node.nodeType !== 1) {
      continue
    }

    const classList = (node as HTMLElement).classList
    if (
      classList.contains('utags_ul') ||
      classList.contains('utags_li') ||
      classList.contains('utags_text_tag') ||
      classList.contains('utags_modal') ||
      classList.contains('utags_modal_wrapper') ||
      classList.contains('utags_modal_content') ||
      classList.contains('browser_extension_settings_v2_container')
    ) {
      // Early exit if any of the classes match
      return false
    }

    if (validNodeNames[node.nodeName]) {
      // Early exit if any of the valid node names match
      return true
    }
  }

  return false
}
