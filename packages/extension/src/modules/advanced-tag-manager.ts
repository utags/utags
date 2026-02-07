import { getSettingsValue, showSettings } from 'browser-extension-settings'
import {
  $,
  $$,
  addClass,
  addElement,
  addEventListener,
  doc,
  removeClass,
  removeEventListener,
} from 'browser-extension-utils'
import { splitTags } from 'utags-utils'

import createModal from '../components/modal'
import createTag from '../components/tag'
import { i } from '../messages'
import {
  getEmojiTags,
  getMostUsedTags,
  getPinnedTags,
  getRecentAddedTags,
} from '../storage/tags'
import { copyText, sortTags } from '../utils'
import { createTimeout } from './timer-manager'

let pinnedTags: string[]
let mostUsedTags: string[]
let recentAddedTags: string[]
let emojiTags: string[]
let displayedTags = new Set()
let currentTags = new Set<string>()
let disableTagStyleInPrompt = false

/**
 * Clears all tag manager global variables to free memory
 * Should be called when the extension is being unloaded or reset
 */
export function clearTagManagerCache(): void {
  pinnedTags = []
  mostUsedTags = []
  recentAddedTags = []
  emojiTags = []
  displayedTags = new Set()
  currentTags = new Set()
}

// eslint-disable-next-line @typescript-eslint/no-restricted-types
function onSelect(selected: string | null, input: HTMLInputElement) {
  if (selected) {
    input.value = ''

    const tags = splitTags(selected)
    for (const tag of tags) {
      currentTags.add(tag)
    }

    updateLists()
  }
}

function removeTag(tag: string | undefined) {
  if (tag) {
    tag = tag.trim()
    currentTags.delete(tag)

    updateLists()
  }
}

function updateLists(container?: HTMLElement) {
  displayedTags = new Set()
  const ul1 = $('.utags_modal_content ul.utags_current_tags', container)
  if (ul1) {
    updateCurrentTagList(ul1)
  }

  const ul = $(
    '.utags_modal_content ul.utags_select_list.utags_pined_list',
    container
  )
  if (ul) {
    updateCandidateTagList(ul, pinnedTags)
  }

  const ul4 = $(
    '.utags_modal_content ul.utags_select_list.utags_emoji_list',
    container
  )
  if (ul4) {
    updateCandidateTagList(ul4, emojiTags, 1000, true)
  }

  const ul2 = $(
    '.utags_modal_content ul.utags_select_list.utags_most_used',
    container
  )
  if (ul2) {
    updateCandidateTagList(ul2, mostUsedTags)
  }

  const ul3 = $(
    '.utags_modal_content ul.utags_select_list.utags_recent_added',
    container
  )
  if (ul3) {
    updateCandidateTagList(ul3, recentAddedTags)
  }
}

function updateCandidateTagList(
  ul: HTMLElement,
  candidateTags: string[],
  limitSize?: number,
  isEmoji?: boolean
) {
  ul.textContent = ''

  let index = 0
  for (const text of candidateTags) {
    if (displayedTags.has(text)) {
      continue
    }

    displayedTags.add(text)

    const li = addElement(ul, 'li', {
      // class: index === 0 ? "utags_active" : "",
    })
    addElement(li, 'span', {
      class: 'utags_text_tag' + (isEmoji ? ' utags_emoji_tag' : ''),
      textContent: text,
      'data-utags_tag': text,
    })
    index++
    if (index >= (limitSize || 50)) {
      break
    }
  }
}

function getNextList(parentElement: HTMLElement) {
  let parentNext = parentElement.nextElementSibling as HTMLElement
  while (parentNext && parentNext.children.length === 0) {
    parentNext = parentNext.nextElementSibling as HTMLElement
  }

  return parentNext
}

function getPreviousList(parentElement: HTMLElement) {
  let parentPrevious = parentElement.previousElementSibling as HTMLElement
  while (parentPrevious && parentPrevious.children.length === 0) {
    parentPrevious = parentPrevious.previousElementSibling as HTMLElement
  }

  return parentPrevious
}

function updateCurrentTagList(ul: HTMLElement) {
  ul.textContent = ''

  const sortedTags = sortTags([...currentTags], emojiTags)
  for (const tag of sortedTags) {
    displayedTags.add(tag)
    const li = addElement(ul, 'li')
    const a = createTag(tag, { isEmoji: emojiTags.includes(tag), noLink: true })
    if (li) li.append(a)
  }
}

/**
 * @param type 0, 1, 2
 */
function removeAllActive(type?: number) {
  if (type !== 2) {
    const selector = '.utags_modal_content ul.utags_select_list .utags_active'
    for (const li of $$(selector)) {
      removeClass(li, 'utags_active')
    }
  }

  if (type !== 1) {
    const selector = '.utags_modal_content ul.utags_select_list .utags_active2'
    for (const li of $$(selector)) {
      removeClass(li, 'utags_active2')
    }
  }
}

async function copyCurrentTags(input: HTMLInputElement) {
  const value = sortTags([...currentTags], emojiTags).join(', ')
  await copyText(value)
  input.value = value
  input.focus()
  input.select()
}

function stopEventPropagation(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

function createPromptView(
  message: string,
  value: string | undefined,
  // eslint-disable-next-line @typescript-eslint/no-restricted-types
  resolve: (value: string | null) => void
) {
  let closed = false
  let selectMode = false
  const modal = createModal({ class: 'utags_prompt' })
  const content = modal.getContentElement()
  value = value || ''

  addElement(content, 'span', {
    class: 'utags_title',
    textContent: message,
  })

  const currentTagsWrapper = addElement(content, 'div', {
    class: 'utags_current_tags_wrapper',
  })
  addElement(currentTagsWrapper, 'span', {
    textContent: '',
    style: 'display: none;',
    'data-utags': '',
  })
  addElement(currentTagsWrapper, 'ul', {
    class: 'utags_current_tags utags_ul',
    'data-utags_exclude': '',
  })

  const input = addElement(content, 'input', {
    type: 'text',
    placeholder: 'foo, bar',
    onblur(event: FocusEvent) {
      // console.log('onblur', event.relatedTarget, doc.activeElement, Date.now())
      // relatedTarget is null when Escape key pressed
      if (event.relatedTarget) {
        // focusToInput()
        // stopEventPropagation(event)
      }

      createTimeout(() => {
        // When press 'Escape' key
        // Chrome, Firefox 需要按两次 Escape 键才能在 keydonwHandler 里捕获, 而 Safari 只需要按一次
        // 所以这里模拟第一次按 Escape 键，Safari 不会进入这里
        // Same as keydonwHandler logic
        if (doc.activeElement === doc.body) {
          if (selectMode) {
            selectMode = false
            removeAllActive()
            focusToInput()
            stopEventPropagation(event)
          } else {
            // 取消默认动作，从而避免处理两次。
            stopEventPropagation(event)
            closeModal()
          }
        }
      }, 1)
    },
  }) as HTMLInputElement

  setTimeout(() => {
    focusToInput(true)
  }, 1) // After focus-trap-lite init
  // Try again
  setTimeout(() => {
    focusToInput(true)
  }, 10) // After focus-trap-lite init

  const focusToInput = (select = false) => {
    if (closed) {
      return
    }

    input.focus()
    if (select) {
      input.select()
    }
  }

  addElement(currentTagsWrapper, 'button', {
    type: 'button',
    class: 'utags_button_copy',
    tabIndex: '0',
    textContent: i('prompt.copy'),
    async onclick() {
      await copyCurrentTags(input)
    },
  })

  const listWrapper = addElement(content, 'div', {
    class: 'utags_list_wrapper',
    tabIndex: '-1',
  })

  addElement(listWrapper, 'ul', {
    class:
      'utags_select_list utags_pined_list' +
      (disableTagStyleInPrompt ? ' utags_disable_tag_style' : ''),
    'data-utags_list_name': i('prompt.pinnedTags'),
  })

  addElement(listWrapper, 'ul', {
    class:
      'utags_select_list utags_most_used' +
      (disableTagStyleInPrompt ? ' utags_disable_tag_style' : ''),
    'data-utags_list_name': i('prompt.mostUsedTags'),
  })

  addElement(listWrapper, 'ul', {
    class:
      'utags_select_list utags_recent_added' +
      (disableTagStyleInPrompt ? ' utags_disable_tag_style' : ''),
    'data-utags_list_name': i('prompt.recentAddedTags'),
  })

  addElement(listWrapper, 'ul', {
    class:
      'utags_select_list utags_emoji_list' +
      (disableTagStyleInPrompt ? ' utags_disable_tag_style' : ''),
    'data-utags_list_name': i('prompt.emojiTags'),
  })

  updateLists(content)

  const buttonWrapper = addElement(content, 'div', {
    class: 'utags_buttons_wrapper',
  })

  const closeModal = (value?: string) => {
    if (closed) {
      return
    }

    closed = true
    removeEventListener(input, 'keydown', keydonwHandler, true)
    removeEventListener(doc, 'keydown', keydonwHandler, true)
    removeEventListener(doc, 'mousedown', mousedownHandler, true)
    removeEventListener(doc, 'click', clickHandler, true)
    removeEventListener(doc, 'mouseover', mouseoverHandler, true)
    // https://github.com/utags/utags/issues/138
    // use setTimeout to resolve Safari issue
    // Scroll to end because focus to input element, but input element is not visible or removed from dom
    // modal.remove()
    setTimeout(() => {
      modal.remove()
    }, 10)
    // eslint-disable-next-line eqeqeq, no-eq-null
    resolve(value == null ? null : value)
  }

  const okHandler = () => {
    closeModal(Array.from(currentTags).join(','))
  }

  addElement(buttonWrapper, 'button', {
    type: 'button',
    tabIndex: '0',
    textContent: i('prompt.cancel'),
    onclick() {
      closeModal()
    },
  })
  addElement(buttonWrapper, 'button', {
    type: 'button',
    class: 'utags_primary',
    tabIndex: '0',
    textContent: i('prompt.ok'),
    onclick() {
      onSelect(input.value.trim(), input)
      okHandler()
    },
  })

  const keydonwHandler = (event: KeyboardEvent) => {
    // console.log(event, event.target, event.defaultPrevented)
    if (event.defaultPrevented || !$('.utags_modal_content')) {
      return // 如果事件已经在进行中，则不做任何事。
    }

    let current = $('.utags_modal_content ul.utags_select_list .utags_active')

    switch (event.key) {
      case 'Escape': {
        if (selectMode) {
          selectMode = false
          removeAllActive()
          focusToInput()
          stopEventPropagation(event)
        } else {
          // 取消默认动作，从而避免处理两次。
          stopEventPropagation(event)
          closeModal()
        }

        break
      }

      case 'Enter': {
        selectMode = false
        // 取消默认动作，从而避免处理两次。
        stopEventPropagation(event)
        focusToInput()

        if (current) {
          onSelect(current.textContent, input)
        } else if (input.value.trim()) {
          onSelect(input.value.trim(), input)
        } else {
          okHandler()
        }

        break
      }

      case 'Tab': {
        // 取消默认动作，从而避免处理两次。
        // stopEventPropagation(event)
        // focusToInput()
        // selectMode = false
        break
      }

      case 'ArrowDown': {
        selectMode = true
        // 取消默认动作，从而避免处理两次。
        stopEventPropagation(event)
        focusToInput()
        current = $(
          '.utags_modal_content ul.utags_select_list .utags_active,.utags_modal_content ul.utags_select_list .utags_active2'
        )
        if (current) {
          const next = current.nextElementSibling as HTMLElement
          if (next) {
            next.scrollIntoView({ block: 'end' })
            removeAllActive()
            addClass(next, 'utags_active')
          }
        } else {
          // set first item as active
          const next = $('.utags_modal_content ul.utags_select_list li')
          if (next) {
            next.scrollIntoView({ block: 'end' })
            removeAllActive()
            addClass(next, 'utags_active')
          }
        }

        break
      }

      case 'ArrowUp': {
        // 取消默认动作，从而避免处理两次。
        stopEventPropagation(event)
        focusToInput()
        current = $(
          '.utags_modal_content ul.utags_select_list .utags_active,.utags_modal_content ul.utags_select_list .utags_active2'
        )
        if (current) {
          const previous = current.previousElementSibling as HTMLElement
          if (previous) {
            previous.scrollIntoView({ block: 'end' })
            removeAllActive()
            addClass(previous, 'utags_active')
          }
        }

        break
      }

      case 'ArrowLeft': {
        if (!selectMode) {
          return
        }

        // 取消默认动作，从而避免处理两次。
        stopEventPropagation(event)
        focusToInput()
        current = $(
          '.utags_modal_content ul.utags_select_list .utags_active,.utags_modal_content ul.utags_select_list .utags_active2'
        )
        if (current) {
          const parentElement = current.parentElement!
          const index = Array.prototype.indexOf.call(
            parentElement.children,
            current
          ) as number
          const parentPrevious = getPreviousList(parentElement)
          if (parentPrevious) {
            removeAllActive()
            const newIndex = Math.min(parentPrevious.children.length - 1, index)
            const next = parentPrevious.children[newIndex] as HTMLElement
            next.scrollIntoView({ block: 'end' })
            addClass(next, 'utags_active')
          }
        }

        break
      }

      case 'ArrowRight': {
        if (!selectMode) {
          return
        }

        // 取消默认动作，从而避免处理两次。
        stopEventPropagation(event)
        focusToInput()
        current = $(
          '.utags_modal_content ul.utags_select_list .utags_active,.utags_modal_content ul.utags_select_list .utags_active2'
        )
        if (current) {
          const parentElement = current.parentElement!
          const index = Array.prototype.indexOf.call(
            parentElement.children,
            current
          ) as number
          const parentNext = getNextList(parentElement)
          if (parentNext) {
            removeAllActive()
            const newIndex = Math.min(parentNext.children.length - 1, index)
            const next = parentNext.children[newIndex] as HTMLElement
            next.scrollIntoView({ block: 'end' })
            addClass(next, 'utags_active')
          }
        }

        break
      }

      default: {
        selectMode = false
        removeAllActive()
        break
      }
    }
  }

  addEventListener(input, 'keydown', keydonwHandler, true)
  addEventListener(doc, 'keydown', keydonwHandler, true)

  const mousedownHandler = (event: Event) => {
    // console.log(event, event.target)
    if (event.defaultPrevented || !$('.utags_modal_content')) {
      return // 如果事件已经在进行中，则不做任何事。
    }

    // event.preventDefault()
    const target = event.target as HTMLElement
    if (!target) {
      return
    }

    if (target.closest('.utags_modal_content')) {
      if (target === input) {
        return
      }

      event.preventDefault()
      focusToInput()
    } else {
      event.preventDefault()
      focusToInput()
      // closeModal()
    }
  }

  addEventListener(doc, 'mousedown', mousedownHandler, true)

  const clickHandler = (event: PointerEvent) => {
    if (event.defaultPrevented || !$('.utags_modal_content')) {
      return // 如果事件已经在进行中，则不做任何事。
    }

    // event.preventDefault()
    const target = event.target as HTMLElement
    if (!target) {
      return
    }

    if (
      !target.closest('.utags_modal_content button') &&
      !target.closest('.utags_modal_content .utags_footer a')
    ) {
      stopEventPropagation(event)
    }

    if (target.closest('.utags_modal_content')) {
      focusToInput()
      if (target.closest('.utags_modal_content ul.utags_select_list li')) {
        onSelect(target.textContent, input)
      }

      if (target.closest('.utags_modal_content ul.utags_current_tags li a')) {
        removeTag(target.dataset.utags_tag)
      }
    } else {
      closeModal()
    }
  }

  addEventListener(doc, 'click', clickHandler, true)

  const mouseoverHandler = (event: Event) => {
    const target = event.target as HTMLElement
    if (!target?.closest('.utags_modal_content')) {
      return
    }

    const li = target.closest('ul.utags_select_list li') as
      | HTMLElement
      | undefined
    if (li) {
      removeAllActive()
      addClass(li, 'utags_active2')
    } else {
      removeAllActive(2)
    }
  }

  addEventListener(doc, 'mousemove', mouseoverHandler, true)

  const footer = addElement(content, 'div', {
    class: 'utags_footer',
  })

  addElement(footer, 'a', {
    class: 'utags_link_settings',
    tabIndex: '0',
    textContent: i('prompt.settings'),
    async onclick() {
      closeModal()
      createTimeout(showSettings, 1)
    },
  })

  modal.append()
}

export async function advancedPrompt(
  message: string,
  value: string | undefined
) {
  pinnedTags = await getPinnedTags()
  mostUsedTags = await getMostUsedTags()
  recentAddedTags = await getRecentAddedTags()
  emojiTags = await getEmojiTags()
  currentTags = new Set(splitTags(value))
  disableTagStyleInPrompt = !getSettingsValue<boolean>('enableTagStyleInPrompt')

  return new Promise((resolve) => {
    createPromptView(message, value, resolve)
  })
}
