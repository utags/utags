import { getSettingsValue } from 'browser-extension-settings'
import {
  $,
  $$,
  addClass,
  addEventListener,
  doc,
  extendHistoryApi,
  isTouchScreen,
  removeClass,
} from 'browser-extension-utils'
import { splitTags } from 'utags-utils'

import { i } from '../messages'
import { saveTags } from '../storage/bookmarks'
import { getEmojiTags } from '../storage/tags'
import { type NullOrUndefined, type UserTag, type UserTagMeta } from '../types'
import { filterTags, sortTags } from '../utils'
import { advancedPrompt } from './advanced-tag-manager'
import { simplePrompt } from './simple-tag-manger'
import { addVisited, removeVisited, TAG_VISITED } from './visited'

const numberLimitOfShowAllUtagsInArea = 10
let lastShownArea: HTMLElement | undefined
let isPromptShown = false

export function hideAllUtagsInArea(target?: HTMLElement | undefined) {
  const element = $('.utags_show_all')
  if (!element) {
    return
  }

  if (element === target || element.contains(target as Node)) {
    return
  }

  if (!target) {
    lastShownArea = undefined
  }

  for (const element of $$('.utags_show_all')) {
    // Cancel delay effect
    addClass(element, 'utags_hide_all')
    removeClass(element, 'utags_show_all')
    setTimeout(() => {
      removeClass(element, 'utags_hide_all')
    })
  }
}

function showAllUtagsInArea(element: HTMLElement | undefined) {
  if (!element) {
    return false
  }

  const utags = $$('.utags_ul', element)
  // console.log("showAllUtagsInArea", utags.length, element)
  if (utags.length > 0 && utags.length <= numberLimitOfShowAllUtagsInArea) {
    addClass(element, 'utags_show_all')
    return true
  }

  return false
}

function findElementToShowAllUtags(target: HTMLElement) {
  hideAllUtagsInArea(target)
  // hideAllUtagsInArea(doc.documentElement)

  if (!target) {
    return
  }

  const targets: HTMLElement[] = []
  let width: number
  let height: number
  // Add parent elements to candidates, up to 8
  do {
    targets.push(target)

    const tagName = target.tagName
    const style = getComputedStyle(target)

    if (
      style.position === 'fixed' ||
      style.position === 'sticky' ||
      /^(BODY|TABLE|UL|OL|NAV|ARTICLE|SECTION|ASIDE)$/.test(tagName)
    ) {
      break
    }

    target = target.parentElement!
    if (target) {
      width = target.offsetWidth || target.clientWidth
      height = target.offsetHeight || target.clientHeight
    } else {
      width = 0
      height = 0
    }
  } while (targets.length < 8 && target && width > 20 && height > 10)

  // Start testing from the outermost parent element
  while (targets.length > 0) {
    const area = targets.pop()
    if (showAllUtagsInArea(area)) {
      if (lastShownArea === area) {
        hideAllUtagsInArea()
        return
      }

      lastShownArea = area
      return
    }
  }

  // Failed testing showAllUtagsInArea
  // console.log("Failed testing showAllUtagsInArea")
  hideAllUtagsInArea()
  lastShownArea = undefined
}

export function bindDocumentEvents() {
  const eventType = isTouchScreen() ? 'touchstart' : 'click'

  addEventListener(
    doc,
    eventType,
    (event: PointerEvent) => {
      const target = event.target as HTMLElement
      if (!target) {
        return
      }

      if (target.closest('.utags_prompt')) {
        return
      }

      if (target.closest('.utags_ul')) {
        const captainTag = target.closest(
          '.utags_captain_tag,.utags_captain_tag2'
        ) as HTMLElement | undefined
        const textTag = target.closest('.utags_text_tag') as
          | HTMLElement
          | undefined
        if (captainTag) {
          event.preventDefault()
          event.stopPropagation()
          event.stopImmediatePropagation()

          if (!captainTag.dataset.utags_key || isPromptShown) {
            return
          }

          isPromptShown = true

          setTimeout(async () => {
            const key = captainTag.dataset.utags_key
            const tags = captainTag.dataset.utags_tags || ''
            const meta: UserTagMeta | undefined = captainTag.dataset.utags_meta
              ? (JSON.parse(captainTag.dataset.utags_meta) as UserTagMeta)
              : undefined
            const myPrompt = getSettingsValue('useSimplePrompt')
              ? simplePrompt
              : advancedPrompt
            const newTags = (await myPrompt(i('prompt.addTags'), tags)) as
              | string
              | NullOrUndefined

            isPromptShown = false

            captainTag.focus()
            // eslint-disable-next-line eqeqeq
            if (key && newTags != undefined) {
              const emojiTags = await getEmojiTags()
              const newTagsArray = sortTags(
                filterTags(splitTags(newTags), TAG_VISITED),
                emojiTags
              )

              if (
                tags.includes(TAG_VISITED) &&
                !newTags.includes(TAG_VISITED)
              ) {
                removeVisited(key)
              } else if (
                !tags.includes(TAG_VISITED) &&
                newTags.includes(TAG_VISITED)
              ) {
                addVisited(key)
              }

              await saveTags(key, newTagsArray, meta)
            }
          })
        } else if (textTag) {
          event.stopPropagation()
          event.stopImmediatePropagation()
        }

        return
      }

      setTimeout(() => {
        findElementToShowAllUtags(target)
      }, 100)

      // TODO: delay display utags in corner of page for current page
    },
    true
  )

  addEventListener(
    doc,
    'keydown',
    (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return // 如果事件已经在进行中，则不做任何事。
      }

      if (event.key === 'Escape' && $('.utags_show_all')) {
        // 按“ESC”键时要做的事。
        hideAllUtagsInArea()
        // 取消默认动作，从而避免处理两次。
        event.preventDefault()
      }
    },
    true
  )

  addEventListener(
    doc,
    'mousedown',
    (event: MouseEvent) => {
      const target = event.target as HTMLElement

      if (target?.closest('.utags_ul')) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
      }
    },
    true
  )
  addEventListener(
    doc,
    'mouseup',
    (event: MouseEvent) => {
      const target = event.target as HTMLElement

      if (target?.closest('.utags_ul')) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
      }
    },
    true
  )
}

function extendHistoryApi2() {
  let url = location.href
  setInterval(() => {
    const url2 = location.href
    if (url !== url2) {
      url = url2
      globalThis.dispatchEvent(new Event('locationchange'))
    }
  }, 100)
}

export function bindWindowEvents() {
  extendHistoryApi()

  // 浏览器扩展有不同的结果。脚本运行环境的 windows, history 对象与网页的不是一个对象
  // Tampermonkey(Chrome): O
  // Userscripts: X
  // Chrome extension: X
  // Firefox extension: X
  extendHistoryApi2()

  addEventListener(globalThis, 'locationchange', function () {
    hideAllUtagsInArea()
  })
}
