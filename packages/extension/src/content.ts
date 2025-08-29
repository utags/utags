import { getPrefferedLocale } from 'browser-extension-i18n'
import {
  getSettingsValue,
  initSettings,
  type SettingsTable,
} from 'browser-extension-settings'
import {
  $,
  $$,
  addClass,
  addElement,
  addEventListener,
  addStyle,
  createElement,
  createHTML,
  doc,
  getAttribute,
  getOffsetPosition,
  hasClass,
  removeClass,
  runWhenHeadExists,
  setStyle,
  throttle,
  uniq,
} from 'browser-extension-utils'
import styleText from 'data-text:./content.scss'
import type { PlasmoCSConfig } from 'plasmo'
import { splitTags } from 'utags-utils'

import createTag from './components/tag'
import { getAvailableLocales, i, resetI18n } from './messages'
import { registerDebuggingHotkey } from './modules/debugging'
import { outputData } from './modules/export-import'
import {
  bindDocumentEvents,
  bindWindowEvents,
  hideAllUtagsInArea,
} from './modules/global-events'
import { createMenuCommandManager } from './modules/menu-command-manager'
import { destroySyncAdapter, initSyncAdapter } from './modules/sync-adapter'
import {
  isAvailableOnCurrentSite,
  TAG_VISITED,
  onSettingsChange as visitedOnSettingsChange,
} from './modules/visited'
import { setupWebappBridge } from './modules/webapp-bridge'
import {
  getCanonicalUrl,
  getConditionNodes,
  getListNodes,
  matchedNodes,
} from './sites/index'
import {
  addTagsValueChangeListener,
  getCachedUrlMap,
  getTags,
  initBookmarksStore,
} from './storage/bookmarks'
import { getEmojiTags } from './storage/tags'
import type { UserTag, UserTagMeta } from './types'
import { sortTags } from './utils'

export const config: PlasmoCSConfig = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  run_at: 'document_start',
  matches: ['https://*/*', 'http://*/*'],
  // eslint-disable-next-line @typescript-eslint/naming-convention
  all_frames: false,
}

let emojiTags: string[]
const host = location.host

const isEnabledByDefault = () => {
  if (host.includes('www.bilibili.com')) {
    return false
  }

  return true
}

const isTagManager = location.href.includes('utags.pipecraft.net/tags/')

const getSettingsTable = (): SettingsTable => {
  let groupNumber = 1

  return {
    [`enableCurrentSite_${host}`]: {
      title: i('settings.enableCurrentSite'),
      defaultValue: isEnabledByDefault(),
    },

    showHidedItems: {
      title: i('settings.showHidedItems'),
      defaultValue: false,
      group: ++groupNumber,
    },
    noOpacityEffect: {
      title: i('settings.noOpacityEffect'),
      defaultValue: false,
      group: groupNumber,
    },

    [`useVisitedFunction_${host}`]: {
      title: i('settings.useVisitedFunction'),
      defaultValue: false,
      group: ++groupNumber,
    },
    [`displayEffectOfTheVisitedContent_${host}`]: {
      title: i('settings.displayEffectOfTheVisitedContent'),
      type: 'select',
      // 默认值：中
      defaultValue: '2',
      options: {
        [i('settings.displayEffectOfTheVisitedContent.recordingonly')]: '0',
        [i('settings.displayEffectOfTheVisitedContent.showtagonly')]: '1',
        [i('settings.displayEffectOfTheVisitedContent.changecolor')]: '4',
        [i('settings.displayEffectOfTheVisitedContent.translucent')]: '2',
        [i('settings.displayEffectOfTheVisitedContent.hide')]: '3',
      },
      group: groupNumber,
    },

    pinnedTagsTitle: {
      title: i('settings.pinnedTags'),
      type: 'action',
      async onclick() {
        const input = $('textarea[data-key="pinnedTags"]') as HTMLInputElement
        if (input) {
          input.scrollIntoView({ block: 'start' })
          input.selectionStart = input.value.length
          input.selectionEnd = input.value.length
          input.focus()
        }
      },
      group: ++groupNumber,
    },
    pinnedTags: {
      title: i('settings.pinnedTags'),
      defaultValue: i('settings.pinnedTagsDefaultValue'),
      placeholder: i('settings.pinnedTagsPlaceholder'),
      type: 'textarea',
      group: groupNumber,
    },
    emojiTagsTitle: {
      title: i('settings.emojiTags'),
      type: 'action',
      async onclick() {
        const input = $('textarea[data-key="emojiTags"]') as HTMLInputElement
        if (input) {
          input.scrollIntoView({ block: 'start' })
          input.selectionStart = input.value.length
          input.selectionEnd = input.value.length
          input.focus()
        }
      },
      group: groupNumber,
    },
    emojiTags: {
      title: i('settings.emojiTags'),
      defaultValue:
        '★, ★★, ★★★, ☆, ☆☆, ☆☆☆, 👍, 👎, ❤️, ⭐, 🌟, 🔥, 💩, ⚠️, 💯, 👏, 🐷, 📌, 📍, 🏆, 💎, 💡, 🤖, 📔, 📖, 📚, 📜, 📕, 📗, 🧰, ⛔, 🚫, 🔴, 🟠, 🟡, 🟢, 🔵, 🟣, ❗, ❓, ✅, ❌',
      placeholder: '👍, 👎',
      type: 'textarea',
      group: groupNumber,
    },
    quickTagsTitle: {
      title: i('settings.quickTags'),
      type: 'action',
      async onclick() {
        const input = $('textarea[data-key="quickTags"]') as HTMLInputElement
        if (input) {
          input.scrollIntoView({ block: 'start' })
          input.selectionStart = input.value.length
          input.selectionEnd = input.value.length
          input.focus()
        }
      },
      group: ++groupNumber,
    },
    quickTags: {
      title: i('settings.quickTags'),
      defaultValue: '★, ❤️',
      placeholder: i('settings.quickTagsPlaceholder'),
      type: 'textarea',
      group: groupNumber,
    },

    customStyle: {
      title: i('settings.customStyle'),
      defaultValue: false,
      group: ++groupNumber,
    },
    customStyleValue: {
      title: 'Custom style value',
      defaultValue: i('settings.customStyleDefaultValue'),
      placeholder: i('settings.customStyleDefaultValue'),
      type: 'textarea',
      group: groupNumber,
    },
    customStyleTip: {
      title: i('settings.customStyleExamples'),
      type: 'tip',
      tipContent: i('settings.customStyleExamplesContent'),
      group: groupNumber,
    },

    [`customStyle_${host}`]: {
      title: i(`settings.customStyleCurrentSite`),
      defaultValue: false,
      group: ++groupNumber,
    },
    [`customStyleValue_${host}`]: {
      title: 'Custom style value',
      defaultValue: '',
      placeholder: i('settings.customStyleDefaultValue'),
      type: 'textarea',
      group: groupNumber,
    },

    enableTagStyleInPrompt: {
      title: i('settings.enableTagStyleInPrompt'),
      defaultValue: true,
      group: ++groupNumber,
    },

    useSimplePrompt: {
      title: i('settings.useSimplePrompt'),
      defaultValue: false,
      group: groupNumber,
    },

    openTagsPage: {
      title: i('settings.openTagsPage'),
      type: 'externalLink',
      url: 'https://utags.link/',
      group: ++groupNumber,
    },
    openDataPage: {
      title: i('settings.openDataPage'),
      type: 'externalLink',
      url: 'https://utags.link/',
      group: groupNumber,
    },
  }
}

const addUtagsStyle = () => {
  const style = addStyle(styleText)
  style.id = 'utags_style'
}

function updateCustomStyle() {
  const customStyleValue =
    (getSettingsValue('customStyleValue') as string) || ''
  if (getSettingsValue('customStyle') && customStyleValue) {
    if ($('#utags_custom_style')) {
      $('#utags_custom_style')!.textContent = customStyleValue
    } else {
      addElement('style', {
        id: 'utags_custom_style',
        textContent: customStyleValue,
      })
      if ($('#utags_custom_style_2')) {
        $('#utags_custom_style_2')!.remove()
      }
    }
  } else if ($('#utags_custom_style')) {
    $('#utags_custom_style')!.remove()
  }

  const customStyleValue2 =
    (getSettingsValue(`customStyleValue_${host}`) as string) || ''
  if (getSettingsValue(`customStyle_${host}`) && customStyleValue2) {
    if ($('#utags_custom_style_2')) {
      $('#utags_custom_style_2')!.textContent = customStyleValue2
    } else {
      addElement('style', {
        id: 'utags_custom_style_2',
        textContent: customStyleValue2,
      })
    }
  } else if ($('#utags_custom_style_2')) {
    $('#utags_custom_style_2')!.remove()
  }
}

function onSettingsChange() {
  const locale =
    (getSettingsValue('locale') as string | undefined) || getPrefferedLocale()
  resetI18n(locale)

  if (getSettingsValue('showHidedItems')) {
    addClass(doc.documentElement, 'utags_no_hide')
  } else {
    removeClass(doc.documentElement, 'utags_no_hide')
  }

  if (getSettingsValue('noOpacityEffect')) {
    addClass(doc.documentElement, 'utags_no_opacity_effect')
  } else {
    removeClass(doc.documentElement, 'utags_no_opacity_effect')
  }

  doc.documentElement.dataset.utags_displayEffectOfTheVisitedContent =
    getSettingsValue(`displayEffectOfTheVisitedContent_${host}`) as string

  if (getSettingsValue(`enableCurrentSite_${host}`)) {
    doc.documentElement.dataset.utags = `${host}`
    displayTagsThrottled()
    updateCustomStyle()
  } else {
    doc.documentElement.dataset.utags = 'off'
    if ($('#utags_custom_style')) {
      $('#utags_custom_style')!.remove()
    }

    if ($('#utags_custom_style_2')) {
      $('#utags_custom_style_2')!.remove()
    }

    if ($('#utags_site_style')) {
      $('#utags_site_style')!.remove()
    }
  }
}

// For debug, 0 disable, 1 enable
let start = 0

if (start) {
  start = Date.now()
}

/**
 * Append a link to the current page at the end of the document body
 * @returns A cleanup function that removes the appended link
 */
function appendCurrentPageLink(): () => void {
  const containerId = 'utags_current_page_link_container'

  // Check if container already exists
  const existingContainer = $('#' + containerId)
  if (existingContainer) {
    return () => {
      if (existingContainer.parentNode) {
        existingContainer.remove()
      }
    }
  }

  // Create the container div
  const containerElement = document.createElement('div')
  containerElement.id = containerId

  // Create the anchor element
  const linkElement = document.createElement('a')
  linkElement.href = location.href
  linkElement.textContent = document.title
  linkElement.id = 'utags_current_page_link'

  // Append link to container
  containerElement.append(linkElement)

  // Append container to the end of document body
  document.body.append(containerElement)

  // Return cleanup function
  return () => {
    if (containerElement.parentNode) {
      containerElement.remove()
    }
  }
}

function showCurrentPageLinkUtagsPrompt(tag?: string, remove = false) {
  const cleanUp = appendCurrentPageLink()
  setTimeout(() => {
    const element = $('#utags_current_page_link + ul.utags_ul button')!
    if (element) {
      if (tag) {
        const currentTags = splitTags(element.dataset.utags_tags)
        if (remove) {
          if (currentTags.includes(tag)) {
            element.dataset.utags_tags = currentTags
              .filter((t) => t !== tag)
              .join(', ')
          }
        } else if (!currentTags.includes(tag)) {
          element.dataset.utags_tags = sortTags(
            [...currentTags, tag],
            emojiTags
          ).join(', ')
        }
      }

      element.click()
    } else {
      showCurrentPageLinkUtagsPrompt(tag, remove)
    }
  }, 10)
  setTimeout(() => {
    cleanUp()
  }, 3000)
}

// Initialize menu command manager
const menuCommandManager = createMenuCommandManager(
  () => {
    showCurrentPageLinkUtagsPrompt()
  },
  (tag: string, remove: boolean) => {
    showCurrentPageLinkUtagsPrompt(tag, remove)
  }
)

/**
 * Update menu command for adding tags to current page
 * @param tags - Optional array of tags to display in menu
 */
async function updateAddTagsToCurrentPageMenuCommand(tags?: string[]) {
  await menuCommandManager.updateMenuCommand(tags)
  await menuCommandManager.updateQuickTagMenuCommands(tags)
}

function appendTagsToPage(
  element: HTMLElement,
  key: string,
  tags: string[],
  meta: UserTagMeta | undefined
) {
  const utagsUl = element.nextSibling as HTMLElement
  if (hasClass(utagsUl, 'utags_ul')) {
    if (
      element.dataset.utags === tags.join(',') &&
      key === getAttribute(utagsUl, 'data-utags_key')
    ) {
      return
    }

    utagsUl.remove()
  }

  // On some websites, using the `UL` tag will affect the selectors of the original website.
  // For example: https://www.zhipin.com/
  const tagName = element.dataset.utags_ul_type === 'ol' ? 'ol' : 'ul'
  const ul = createElement(tagName, {
    class: tags.length === 0 ? 'utags_ul utags_ul_0' : 'utags_ul utags_ul_1',
    'data-utags_key': key,
  })
  let li = createElement('li')

  const a = createElement('button', {
    type: 'button',
    // href: "",
    // tabindex: "0",
    title: 'Add tags',
    'data-utags_tag': '🏷️',
    'data-utags_key': key,
    'data-utags_tags': tags.join(', '),
    'data-utags_meta': meta ? JSON.stringify(meta) : '',
    class:
      tags.length === 0
        ? 'utags_text_tag utags_captain_tag'
        : 'utags_text_tag utags_captain_tag2',
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" fill="currentColor" class="bi bi-tags-fill" viewBox="0 0 16 16">
<path d="M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
<path d="M1.293 7.793A1 1 0 0 1 1 7.086V2a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l.043-.043-7.457-7.457z"/>
</svg>
`
  a.innerHTML = createHTML(svg)

  li.append(a)
  ul.append(li)

  for (const tag of tags) {
    li = createElement('li')
    const a = createTag(tag, {
      isEmoji: emojiTags.includes(tag),
      noLink: isTagManager,
      enableSelect: isTagManager,
    })
    li.append(a)
    ul.append(li)
  }

  element.after(ul)
  element.dataset.utags = tags.join(',')
  /* Fix v2ex polish start */
  // 为了防止阻塞渲染页面，延迟执行
  setTimeout(() => {
    const style = getComputedStyle(element)
    const zIndex = style.zIndex
    if (zIndex && zIndex !== 'auto') {
      setStyle(ul, { zIndex })
    }
  }, 200)
  /* Fix v2ex polish end */
}

/**
 * Clean utags elements after SPA web apps re-rendered.
 * works on these sites
 * - youtube
 *
 * Fix mp.weixin.qq.com issue, 有推荐阅读, 往期推荐内容时，utags_ul 和子元素的 class 都会被清空。https://github.com/utags/utags/issues/29
 */
function cleanUnusedUtags() {
  const utagsUlList = $$('.utags_ul,ul[data-utags_key],ol[data-utags_key]')
  for (const utagsUl of utagsUlList) {
    const element = utagsUl.previousSibling as HTMLElement
    if (element && getAttribute(element, 'data-utags') !== null) {
      continue
    }

    utagsUl.remove()
  }
}

async function displayTags() {
  if (start) {
    console.error('start of displayTags', Date.now() - start)
  }

  emojiTags = await getEmojiTags()

  // console.error("displayTags")
  const listNodes = getListNodes()
  for (const node of listNodes) {
    // Flag list nodes first
    node.dataset.utags_list_node = ''
  }

  if (start) {
    console.error('before matchedNodes', Date.now() - start)
  }

  // Display tags for matched components on matched pages
  const nodes = matchedNodes()
  if (start) {
    console.error('after matchedNodes', Date.now() - start, nodes.length)
  }

  await getCachedUrlMap()

  for (const node of nodes) {
    const utags: UserTag = node.utags!
    if (!utags) {
      continue
    }

    const key = utags.key
    if (!key) {
      continue
    }

    const object = getTags(key)

    const tags: string[] = (object.tags || []).slice()
    if (node.dataset.utags_visited === '1') {
      tags.push(TAG_VISITED)
    }

    appendTagsToPage(node, key, tags, utags.meta)

    setTimeout(() => {
      updateTagPosition(node)
    })
  }

  if (start) {
    console.error('after appendTagsToPage', Date.now() - start)
  }

  const conditionNodes = getConditionNodes()
  for (const node of conditionNodes) {
    if (getAttribute(node, 'data-utags') !== null) {
      // Flag condition nodes
      node.dataset.utags_condition_node = ''
    }
  }

  for (const node of listNodes) {
    const conditionNodes = $$('[data-utags_condition_node]', node)
    const tagsArray: string[] = []
    for (const node2 of conditionNodes) {
      if (!node2.dataset.utags) {
        continue
      }

      if (node2.closest('[data-utags_list_node]') !== node) {
        // Nested list node
        continue
      }

      tagsArray.push(node2.dataset.utags)
    }

    if (tagsArray.length === 1) {
      node.dataset.utags_list_node = ',' + tagsArray[0] + ','
    } else if (tagsArray.length > 1) {
      node.dataset.utags_list_node =
        ',' + uniq(tagsArray.join(',').split(',')).join(',') + ','
    }
  }

  // Update menu command
  const key = getCanonicalUrl(location.href)
  if (key) {
    const object = getTags(key)
    await updateAddTagsToCurrentPageMenuCommand(object.tags)
  }

  cleanUnusedUtags()

  if (start) {
    console.error('end of displayTags', Date.now() - start)
  }
}

const displayTagsThrottled = throttle(displayTags, 500)

async function initStorage() {
  await initBookmarksStore()
  await initSyncAdapter()
  addTagsValueChangeListener(() => {
    if (!doc.hidden) {
      setTimeout(displayTags)
    }
  })
}

/* eslint-disable @typescript-eslint/naming-convention */
const validNodeNames = {
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

function shouldUpdateUtagsWhenNodeUpdated(nodeList: NodeList) {
  const length = nodeList.length
  for (let i = 0; i < length; i++) {
    const node = nodeList[i]
    if (
      validNodeNames[node.nodeName] &&
      !hasClass(node as HTMLElement, 'utags_ul') &&
      !hasClass(node as HTMLElement, 'utags_modal')
    ) {
      return true
    }
  }

  return false
}

function getOutermostOffsetParent(
  element1: HTMLElement,
  element2: HTMLElement
): HTMLElement | undefined {
  if (
    !(element1 instanceof HTMLElement) ||
    !(element2 instanceof HTMLElement)
  ) {
    throw new TypeError('Both arguments must be valid HTMLElements.')
  }

  const offsetParent1 = element1.offsetParent as HTMLElement
  const offsetParent2 = element2.offsetParent as HTMLElement

  if (offsetParent1 && offsetParent2) {
    if (offsetParent1.contains(offsetParent2)) {
      return offsetParent1
    }

    if (offsetParent2.contains(offsetParent1)) {
      return offsetParent2
    }

    return undefined
  }

  return offsetParent1 || offsetParent2
}

function getMaxOffsetLeft(
  offsetParent: HTMLElement | undefined,
  utags: HTMLElement,
  utagsSizeFix: number
) {
  let maxOffsetRight: number

  if (offsetParent && offsetParent.offsetWidth > 0) {
    // X轴 scroll 时计算正确
    if (offsetParent === utags.offsetParent) {
      maxOffsetRight = offsetParent.offsetWidth
    } else {
      maxOffsetRight =
        offsetParent.offsetWidth -
        getOffsetPosition(utags.offsetParent as HTMLElement, offsetParent).left
    }
  } else {
    // X轴 scroll 时会计算错误
    maxOffsetRight =
      document.body.offsetWidth -
      getOffsetPosition(utags.offsetParent as HTMLElement).left -
      2
  }

  return maxOffsetRight - utags.clientWidth - utagsSizeFix
}

// position: fixed -> offsetParent = null
// position: static -> offsetParent = TD element or the ancestor element whitch has postion: (relative|absolute|fixed|sticky) or document.body
// position: (relative|absolute|fixed|sticky) -> offsetParent = the ancestor element whitch has postion: (relative|absolute|fixed|sticky) or document.body
// display: contents -> offsetParent = null, offsetWith = 0, offsetLeft = 0, offsetTop = 0

function updateTagPosition(element: HTMLElement) {
  const utags = element.nextElementSibling as HTMLElement
  if (!utags || !hasClass(utags, 'utags_ul')) {
    return
  }

  if (!utags.offsetParent && !utags.offsetHeight && !utags.offsetWidth) {
    return
  }

  const style = getComputedStyle(utags)
  if (style.position !== 'absolute') {
    return
  }

  if (element.dataset.utags_position_selector) {
    element =
      $(element.dataset.utags_position_selector, element) ||
      element.closest(element.dataset.utags_position_selector) ||
      element
  }

  element.dataset.utags_fit_content = '1'

  // 22 is the size of captain tag
  const utagsSizeFix = hasClass(utags, 'utags_ul_0') ? 22 : 0

  const offsetParent =
    element.offsetParent === utags.offsetParent
      ? (element.offsetParent as HTMLElement)
      : getOutermostOffsetParent(element, utags)

  const offset = getOffsetPosition(element, offsetParent! || doc.body)

  if (offsetParent !== utags.offsetParent) {
    const offset2 = getOffsetPosition(
      utags.offsetParent as HTMLElement,
      offsetParent! || doc.body
    )

    offset.top -= offset2.top
    offset.left -= offset2.left
  }

  // For debug
  // if (1) {
  //   const style = getComputedStyle(element)
  //   element.dataset.offsetWidth = String(element.offsetWidth)
  //   element.dataset.clientWidth = String(element.clientWidth)
  //   element.dataset.offsetHeight = String(element.offsetHeight)
  //   element.dataset.clientHeight = String(element.clientHeight)
  //   element.dataset.offsetLeft = String(element.offsetLeft)
  //   element.dataset.offsetTop = String(element.offsetTop)
  //   element.dataset.offsetLeft2 = String(offset.left)
  //   element.dataset.offsetTop2 = String(offset.top)
  //   element.dataset.offsetParent = element.offsetParent?.outerHTML.replaceAll(
  //     />[\s\S]*/gm,
  //     ">"
  //   )
  //   element.dataset.display = style.display
  //   utags.dataset.offsetParent = utags.offsetParent?.outerHTML.replaceAll(
  //     />[\s\S]*/gm,
  //     ">"
  //   )
  // }

  // element is hidden
  if (!element.offsetWidth && !element.clientWidth) {
    return
  }

  // version 6
  const objectPosition = style.objectPosition

  switch (objectPosition) {
    // left-center
    case '-100% 50%': {
      utags.style.left =
        Math.max(offset.left - utags.clientWidth - utagsSizeFix, 0) + 'px'
      utags.style.top =
        offset.top +
        ((element.clientHeight || element.offsetHeight) -
          utags.clientHeight -
          utagsSizeFix) /
          2 +
        'px'
      break
    }

    // left-top
    case '0% -100%': {
      utags.style.left = offset.left + 'px'
      utags.style.top = offset.top - utags.clientHeight - utagsSizeFix + 'px'
      break
    }

    // left-top
    case '0% 0%': {
      utags.style.left = offset.left + 'px'
      utags.style.top = offset.top + 'px'
      break
    }

    // left-bottom
    case '0% 100%': {
      utags.style.left = offset.left + 'px'
      utags.style.top =
        offset.top +
        (element.clientHeight || element.offsetHeight) -
        utags.clientHeight -
        utagsSizeFix +
        'px'
      break
    }

    // left-bottom, out of element box
    case '0% 200%': {
      utags.style.left = offset.left + 'px'
      utags.style.top =
        offset.top + (element.clientHeight || element.offsetHeight) + 'px'
      break
    }

    // right-top
    case '100% -100%': {
      utags.style.left =
        offset.left +
        (element.clientWidth || element.offsetWidth) -
        utags.clientWidth -
        utagsSizeFix +
        'px'
      utags.style.top = offset.top - utags.clientHeight - utagsSizeFix + 'px'
      break
    }

    // right-top
    case '100% 0%': {
      let offsetLeft =
        (element.clientWidth || element.offsetWidth) -
        utags.clientWidth -
        utagsSizeFix
      if (offsetLeft < 100) {
        offsetLeft = element.clientWidth || element.offsetWidth
      }

      utags.style.left =
        Math.min(
          offset.left + offsetLeft,
          getMaxOffsetLeft(offsetParent, utags, utagsSizeFix)
        ) + 'px'
      utags.style.top = offset.top + 'px'
      break
    }

    // right-center
    case '100% 50%': {
      let offsetLeft =
        (element.clientWidth || element.offsetWidth) -
        utags.clientWidth -
        utagsSizeFix
      if (offsetLeft < 100) {
        offsetLeft = element.clientWidth || element.offsetWidth
      }

      utags.style.left =
        Math.min(
          offset.left + offsetLeft,
          getMaxOffsetLeft(offsetParent, utags, utagsSizeFix)
        ) + 'px'
      utags.style.top =
        offset.top +
        ((element.clientHeight || element.offsetHeight) -
          utags.clientHeight -
          utagsSizeFix) /
          2 +
        'px'
      break
    }

    // right-bottom
    case '100% 100%': {
      let offsetLeft =
        (element.clientWidth || element.offsetWidth) -
        utags.clientWidth -
        utagsSizeFix
      if (offsetLeft < 100) {
        offsetLeft = element.clientWidth || element.offsetWidth
      }

      utags.style.left =
        Math.min(
          offset.left + offsetLeft,
          getMaxOffsetLeft(offsetParent, utags, utagsSizeFix)
        ) + 'px'
      utags.style.top =
        offset.top +
        (element.clientHeight || element.offsetHeight) -
        utags.clientHeight -
        utagsSizeFix +
        'px'
      break
    }

    // right-bottom, out of element box
    case '100% 200%': {
      utags.style.left =
        offset.left +
        (element.clientWidth || element.offsetWidth) -
        utags.clientWidth -
        utagsSizeFix +
        'px'
      utags.style.top =
        offset.top + (element.clientHeight || element.offsetHeight) + 'px'
      break
    }

    // right-top, out of element box
    case '200% 0%': {
      utags.style.left =
        Math.min(
          offset.left + (element.clientWidth || element.offsetWidth),
          getMaxOffsetLeft(offsetParent, utags, utagsSizeFix)
        ) + 'px'
      utags.style.top = offset.top + 'px'
      break
    }

    // right-center, out of element box
    case '200% 50%': {
      utags.style.left =
        Math.min(
          offset.left + (element.clientWidth || element.offsetWidth),
          getMaxOffsetLeft(offsetParent, utags, utagsSizeFix)
        ) + 'px'
      utags.style.top =
        offset.top +
        ((element.clientHeight || element.offsetHeight) -
          utags.clientHeight -
          utagsSizeFix) /
          2 +
        'px'
      break
    }

    // right-bottom, out of element box
    case '200% 100%': {
      utags.style.left =
        Math.min(
          offset.left + (element.clientWidth || element.offsetWidth),
          getMaxOffsetLeft(offsetParent, utags, utagsSizeFix)
        ) + 'px'
      utags.style.top =
        offset.top +
        (element.clientHeight || element.offsetHeight) -
        utags.clientHeight -
        utagsSizeFix +
        'px'
      break
    }

    default: {
      break
    }
  }

  element.dataset.utags_fit_content = '0'
}

async function main() {
  addUtagsStyle()

  await initSettings(() => {
    const settingsTable = getSettingsTable()
    return {
      id: 'utags',
      title: i('settings.title'),
      footer: `
    <p>${i('settings.information')}</p>
    <p>
    <a href="https://github.com/utags/utags/issues" target="_blank">
    ${i('settings.report')}
    </a></p>
    <p>Made with ❤️ by
    <a href="https://www.pipecraft.net/" target="_blank">
      Pipecraft
    </a></p>`,
      settingsTable,
      availableLocales: getAvailableLocales(),
      async onValueChange() {
        visitedOnSettingsChange()
        onSettingsChange()
      },
      onViewUpdate(settingsMainView) {
        let item: HTMLElement | undefined = $(
          `[data-key="useVisitedFunction_${host}"]`,
          settingsMainView
        )

        if (!isAvailableOnCurrentSite() && item) {
          item.style.display = 'none'
          item.parentElement!.style.display = 'none'
        }

        item = $(
          `[data-key="displayEffectOfTheVisitedContent_${host}"]`,
          settingsMainView
        )
        if (item) {
          item.style.display = getSettingsValue(`useVisitedFunction_${host}`)
            ? 'flex'
            : 'none'
        }

        item = $(`[data-key="customStyleValue"]`, settingsMainView)
        if (item) {
          // FIXME: data-key should on the parent element of textarea
          item.parentElement!.style.display = getSettingsValue(`customStyle`)
            ? 'block'
            : 'none'
        }

        item = $(`.bes_tip`, settingsMainView)
        if (item) {
          item.style.display = getSettingsValue(`customStyle`)
            ? 'block'
            : 'none'
        }

        item = $(`[data-key="customStyleValue_${host}"]`, settingsMainView)
        if (item) {
          // FIXME: data-key should on the parent element of textarea
          item.parentElement!.style.display = getSettingsValue(
            `customStyle_${host}`
          )
            ? 'block'
            : 'none'
        }
      },
    }
  })

  if (!getSettingsValue(`enableCurrentSite_${host}`)) {
    return
  }

  setupWebappBridge()

  visitedOnSettingsChange()
  onSettingsChange()

  await initStorage()

  setTimeout(outputData, 1)

  await updateAddTagsToCurrentPageMenuCommand()

  // registerMenuCommand(
  //   '⭐ ' +'收藏当前网页',
  //   () => {
  //     showCurrentPageLinkUtagsPrompt()
  //   },
  //   'u'
  // )

  await displayTags()

  addEventListener(doc, 'visibilitychange', async () => {
    if (!doc.hidden) {
      await displayTags()
    }
  })

  bindDocumentEvents()
  bindWindowEvents()

  const observer = new MutationObserver(async (mutationsList) => {
    // console.error("mutation", Date.now(), mutationsList)
    let shouldUpdate = false
    for (const mutationRecord of mutationsList) {
      if (shouldUpdateUtagsWhenNodeUpdated(mutationRecord.addedNodes)) {
        shouldUpdate = true
        break
      }

      if (shouldUpdateUtagsWhenNodeUpdated(mutationRecord.removedNodes)) {
        shouldUpdate = true
        break
      }
    }

    if (shouldUpdate) {
      // Clean up immediately. Some app like tictok re-render while mouse over something
      cleanUnusedUtags()
      displayTagsThrottled()
    }

    if ($('#vimiumHintMarkerContainer')) {
      addClass(doc.body, 'utags_show_all')
      addClass(doc.documentElement, 'utags_vimium_hint')
    } else if (hasClass(doc.documentElement, 'utags_vimium_hint')) {
      removeClass(doc.documentElement, 'utags_vimium_hint')
      hideAllUtagsInArea()
    }
  })
  observer.observe(doc, {
    childList: true,
    subtree: true,
  })

  // To fix issues on reddit, add mouseover event
  addEventListener(doc, 'mouseover', (event: Event) => {
    const target = event.target as HTMLElement
    if (
      target &&
      (target.tagName === 'A' || target.dataset.utags !== undefined)
    ) {
      displayTagsThrottled()
    }
  })

  // For debug
  // registerDebuggingHotkey()
}

runWhenHeadExists(async () => {
  if (doc.documentElement.dataset.utags === undefined) {
    doc.documentElement.dataset.utags = `${host}`
    await main()
  }
})
