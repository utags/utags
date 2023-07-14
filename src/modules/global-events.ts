import {
  $,
  $$,
  addClass,
  addEventListener,
  doc,
  isTouchScreen,
  removeClass,
} from "browser-extension-utils"

const numberLimitOfShowAllUtagsInArea = 10

function hideAllUtagsInArea(target?: HTMLElement | undefined) {
  const element = $(".utags_show_all")
  if (!element) {
    return
  }

  if (element === target || element.contains(target)) {
    return
  }

  for (const element of $$(".utags_show_all")) {
    removeClass(element, "utags_show_all")
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
  let lastShownArea: HTMLElement | undefined

  addEventListener(
    doc,
    eventType,
    (event: Event) => {
      let target = event.target as HTMLElement
      if (!target) {
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
            lastShownArea = undefined
            return
          }

          lastShownArea = area
          return
        }
      }

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
        lastShownArea = undefined
        // 取消默认动作，从而避免处理两次。
        event.preventDefault()
      }
    },
    true
  )
}
