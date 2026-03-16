import { getElementUtags } from './modules/dom-reference-manager'
import { markElementWhetherVisited, TAG_VISITED } from './modules/visited'
import { getTags } from './storage/bookmarks'
import type { UserTag, UserTagMeta } from './types'

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
  ARTICLE: true,
  ASIDE: true,
  DETAILS: true,
  TABLE: true,
}

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

export function buildTagsForDisplay(
  node: HTMLElement
): { key: string; tags: string[]; meta?: UserTagMeta } | undefined {
  const utags = getElementUtags(node)
  if (!utags || !utags.key) {
    return
  }

  const key = utags.key
  const object = getTags(key) as { tags?: string[] }

  const tags: string[] = (object.tags || []).slice()
  // The visited state can be updated by other tabs, so re-check before adding the visited tag.
  markElementWhetherVisited(key, node)
  if (node.dataset.utags_visited === '1') {
    tags.push(TAG_VISITED)
  }

  return { key, tags, meta: utags.meta }
}
