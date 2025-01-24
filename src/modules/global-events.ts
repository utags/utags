import { getSettingsValue } from "browser-extension-settings"
import {
  $,
  $$,
  addClass,
  addEventListener,
  doc,
  extendHistoryApi,
  isTouchScreen,
  removeClass,
} from "browser-extension-utils"

import { i } from "../messages"
import { getEmojiTags, saveTags } from "../storage"
import { type NullOrUndefined, type UserTag, type UserTagMeta } from "../types"
import { sortTags, splitTags } from "../utils"
import { advancedPrompt } from "./advanced-tag-manager"
import { simplePrompt } from "./simple-tag-manger"

const numberLimitOfShowAllUtagsInArea = 10
let lastShownArea: HTMLElement | undefined

export function hideAllUtagsInArea(target?: HTMLElement | undefined) {
  const element = $(".utags_show_all")
  if (!element) {
    return
  }

  if (element === target || element.contains(target as Node)) {
    return
  }

  if (!target) {
    lastShownArea = undefined
  }

  for (const element of $$(".utags_show_all")) {
    // Cancel delay effect
    addClass(element, "utags_hide_all")
    removeClass(element, "utags_show_all")
    setTimeout(() => {
      removeClass(element, "utags_hide_all")
    })
  }
}

function showAllUtagsInArea(element: HTMLElement | undefined) {
  if (!element) {
    return false
  }

  const utags = $$(".utags_ul", element)
  if (utags.length > 0 && utags.length <= numberLimitOfShowAllUtagsInArea) {
    addClass(element, "utags_show_all")
    return true
  }

  return false
}

export function bindDocumentEvents() {
  const eventType = isTouchScreen() ? "touchstart" : "click"

  addEventListener(
    doc,
    eventType,
    (event: Event) => {
      let target = event.target as HTMLElement
      if (!target) {
        return
      }

      if (target.closest(".utags_prompt")) {
        return
      }

      if (target.closest(".utags_ul")) {
        const captainTag = target.closest(
          ".utags_captain_tag,.utags_captain_tag2"
        ) as HTMLElement | undefined
        const textTag = target.closest(".utags_text_tag") as
          | HTMLElement
          | undefined
        if (captainTag) {
          event.preventDefault()
          event.stopPropagation()
          event.stopImmediatePropagation()

          if (!captainTag.dataset.utags_key) {
            return
          }

          setTimeout(async () => {
            const key = captainTag.dataset.utags_key
            const tags = captainTag.dataset.utags_tags
            const meta: UserTagMeta | undefined = captainTag.dataset.utags_meta
              ? (JSON.parse(captainTag.dataset.utags_meta) as UserTagMeta)
              : undefined
            const myPrompt = getSettingsValue("useSimplePrompt")
              ? simplePrompt
              : advancedPrompt
            const newTags = (await myPrompt(i("prompt.addTags"), tags)) as
              | string
              | NullOrUndefined

            captainTag.focus()
            // eslint-disable-next-line eqeqeq
            if (key && newTags != undefined) {
              const emojiTags = await getEmojiTags()
              const newTagsArray = sortTags(splitTags(newTags), emojiTags)
              await saveTags(key, newTagsArray, meta)
            }
          })
        } else if (textTag) {
          event.stopPropagation()
          event.stopImmediatePropagation()
        }

        return
      }

      hideAllUtagsInArea(target)

      const targets: HTMLElement[] = []
      // Add parent elements to candidates, up to 8
      do {
        targets.push(target)
        target = target.parentElement!
      } while (targets.length <= 8 && target)

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
      lastShownArea = undefined

      // TODO: delay display utags in corner of page for current page
    },
    true
  )

  addEventListener(
    doc,
    "keydown",
    (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return // 如果事件已经在进行中，则不做任何事。
      }

      if (event.key === "Escape" && $(".utags_show_all")) {
        // 按“ESC”键时要做的事。
        hideAllUtagsInArea()
        // 取消默认动作，从而避免处理两次。
        event.preventDefault()
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
      window.dispatchEvent(new Event("locationchange"))
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

  addEventListener(window, "locationchange", function () {
    hideAllUtagsInArea()
  })
}
