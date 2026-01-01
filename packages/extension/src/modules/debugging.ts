import {
  addEventListener,
  doc,
  removeEventListener,
} from 'browser-extension-utils'

import { storageTest } from '../storage/storage-test'
import {
  clearManagedInterval,
  createInterval,
  createTimeout,
  type TimerId,
} from './timer-manager'

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

  console.log('>>>>>>>>>>>>>>>>>')
  printNodeInfo(target)
  console.log('<<<<<<<<<<<<<<<<<')
}

function startDebuggingMode() {
  console.log('start debugging mode')

  addEventListener(doc, 'click', clickHandler, true)
}

function stopDebuggingMode() {
  console.log('stop debugging mode')

  removeEventListener(doc, 'click', clickHandler, true)
}

let intervalId: TimerId
function startAutoShowAllUtags() {
  if (!document.body) {
    createTimeout(startAutoShowAllUtags, 100)
    return
  }

  console.log('startAutoShowAllUtags')
  document.body.classList.add('utags_show_all')
  intervalId = createInterval(() => {
    document.body.classList.add('utags_show_all')
  }, 5000)
}

function stopAutoShowAllUtags() {
  console.log('stopAutoShowAllUtags')
  clearManagedInterval(intervalId)
  document.body.classList.remove('utags_show_all')
}

function startDelayedDebugger() {
  console.log('start debugger after 5 seconds')
  createTimeout(() => {
    // eslint-disable-next-line no-debugger
    debugger
  }, 5000)
}

let isDebuggingMode = false
let isAutoShowAllUtagsMode = false
let lastKey = ''
let keydownCount = 0

export function registerDebuggingHotkey() {
  storageTest()
  startAutoShowAllUtags()
  isAutoShowAllUtagsMode = true
  addEventListener(
    doc,
    'keydown',
    (event: KeyboardEvent) => {
      if (event.key === 'F1' || event.key === 'F2' || event.key === 'F3') {
        if (event.key === lastKey) {
          keydownCount++
        } else {
          lastKey = event.key
          keydownCount = 1
        }

        createTimeout(() => {
          if (keydownCount > 0) {
            keydownCount--
            console.log(keydownCount)
          }
        }, 1500)

        console.log(keydownCount)

        if (keydownCount >= 3) {
          switch (event.key) {
            case 'F1': {
              if (isDebuggingMode) {
                keydownCount = 0
                isDebuggingMode = false
                stopDebuggingMode()
              } else {
                keydownCount = 0
                isDebuggingMode = true
                startDebuggingMode()
              }

              break
            }

            case 'F2': {
              if (isAutoShowAllUtagsMode) {
                keydownCount = 0
                isAutoShowAllUtagsMode = false
                stopAutoShowAllUtags()
              } else {
                keydownCount = 0
                isAutoShowAllUtagsMode = true
                startAutoShowAllUtags()
              }

              break
            }

            case 'F3': {
              startDelayedDebugger()

              break
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
