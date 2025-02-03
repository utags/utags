import {
  addEventListener,
  doc,
  removeEventListener,
} from "browser-extension-utils"

function printNodeInfo(element: HTMLElement) {
  console.log(element)
  const style = getComputedStyle(element)
  const position = style.position
  const display = style.display
  const offsetParent = element.offsetParent
  const offsetHeight = element.offsetHeight
  const offsetWidth = element.offsetWidth
  const offsetTop = element.offsetTop
  const offsetLeft = element.offsetLeft

  console.log({
    position,
    display,
    offsetParent,
    offsetHeight,
    offsetWidth,
    offsetTop,
    offsetLeft,
  })

  if (element.parentElement) {
    printNodeInfo(element.parentElement)
  }
}

function clickHandler(event: Event) {
  const target = event.target as HTMLElement
  if (!target) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()

  console.log(">>>>>>>>>>>>>>>>>")
  printNodeInfo(target)
  console.log("<<<<<<<<<<<<<<<<<")
}

function startDebuggingMode() {
  console.log("start debugging mode")

  addEventListener(doc, "click", clickHandler, true)
}

function stopDebuggingMode() {
  console.log("stop debugging mode")

  removeEventListener(doc, "click", clickHandler, true)
}

let intervalId: NodeJS.Timeout
function startAutoShowAllUtags() {
  document.body.classList.add("utags_show_all")
  intervalId = setInterval(() => {
    document.body.classList.add("utags_show_all")
  }, 5000)
}

function stopAutoShowAllUtags() {
  clearInterval(intervalId)
  document.body.classList.remove("utags_show_all")
}

let isDebuggingMode = false
let isAutoShowAllUtagsMode = false
let lastKey = ""
let keydownCount = 0

export function registerDebuggingHotkey() {
  addEventListener(
    doc,
    "keydown",
    (event: KeyboardEvent) => {
      if (event.key === "F1" || event.key === "F2") {
        if (event.key === lastKey) {
          keydownCount++
        } else {
          lastKey = event.key
          keydownCount = 1
        }

        setTimeout(() => {
          if (keydownCount > 0) {
            keydownCount--
            console.log(keydownCount)
          }
        }, 1500)

        console.log(keydownCount)

        if (keydownCount >= 3) {
          if (event.key === "F1") {
            if (isDebuggingMode) {
              keydownCount = 0
              isDebuggingMode = false
              stopDebuggingMode()
            } else {
              keydownCount = 0
              isDebuggingMode = true
              startDebuggingMode()
            }
          } else if (event.key === "F2") {
            if (isAutoShowAllUtagsMode) {
              keydownCount = 0
              isAutoShowAllUtagsMode = false
              stopAutoShowAllUtags()
            } else {
              keydownCount = 0
              isAutoShowAllUtagsMode = true
              startAutoShowAllUtags()
            }
          }
        }
      } else {
        keydownCount = 0
      }
    },
    true
  )
}
