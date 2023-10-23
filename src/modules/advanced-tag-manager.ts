import {
  $,
  $$,
  addClass,
  addElement,
  addEventListener,
  doc,
  removeClass,
  removeEventListener,
} from "browser-extension-utils"

import createModal from "../components/modal"
import { i } from "../messages"
import { getMostUsedTags, getPinnedTags, getRecentAddedTags } from "../storage"
import { copyText, splitTags } from "../utils"

let pinnedTags: string[]
let mostUsedTags: string[]
let recentAddedTags: string[]
let displayedTags = new Set()
let currentTags = new Set()

function onSelect(selected: string, input: HTMLInputElement) {
  if (selected) {
    input.value = ""

    const tags = splitTags(selected)
    for (const tag of tags) {
      if (tag.trim()) {
        currentTags.add(tag.trim())
      }
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

function updateLists() {
  displayedTags = new Set()
  const ul1 = $(".utags_modal_content ul.utags_current_tags")
  if (ul1) {
    updateCurrentTagList(ul1)
  }

  const ul = $(".utags_modal_content ul.utags_select_list.utags_pined_list")
  if (ul) {
    updateCandidateTagList(ul, pinnedTags)
  }

  const ul2 = $(".utags_modal_content ul.utags_select_list.utags_most_used")
  if (ul2) {
    updateCandidateTagList(ul2, mostUsedTags)
  }

  const ul3 = $(".utags_modal_content ul.utags_select_list.utags_recent_added")
  if (ul3) {
    updateCandidateTagList(ul3, recentAddedTags)
  }
}

function updateCandidateTagList(ul: HTMLElement, candidateTags: string[]) {
  ul.textContent = ""

  let index = 0
  for (const text of candidateTags) {
    if (displayedTags.has(text)) {
      continue
    }

    displayedTags.add(text)

    const li = addElement(ul, "li", {
      // class: index === 0 ? "utags_active" : "",
    })
    addElement(li, "span", {
      textContent: text,
    })
    index++
    if (index >= 10) {
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
  ul.textContent = ""

  for (const tag of currentTags) {
    displayedTags.add(tag)
    const li = addElement(ul, "li")
    addElement(li, "a", {
      "data-utags_tag": tag,
      class: "utags_text_tag",
    })
  }
}

/**
 * @param type 0, 1, 2
 */
function removeAllActive(type?: number) {
  if (type !== 2) {
    const selector = ".utags_modal_content ul.utags_select_list .utags_active"
    for (const li of $$(selector)) {
      removeClass(li, "utags_active")
    }
  }

  if (type !== 1) {
    const selector = ".utags_modal_content ul.utags_select_list .utags_active2"
    for (const li of $$(selector)) {
      removeClass(li, "utags_active2")
    }
  }
}

async function copyCurrentTags(input: HTMLInputElement) {
  const value = Array.from(currentTags).join(", ")
  await copyText(value)
  input.value = value
  input.focus()
  input.select()
}

function createPromptView(
  message: string,
  value: string | undefined,
  // eslint-disable-next-line @typescript-eslint/ban-types
  resolve: (value: string | null) => void
) {
  const modal = createModal({ class: "utags_prompt" })
  const content = modal.getContentElement()
  value = value || ""

  addElement(content, "span", {
    class: "utags_title",
    textContent: message,
  })

  const currentTagsWrapper = addElement(content, "div", {
    class: "utags_current_tags_wrapper",
  })
  addElement(currentTagsWrapper, "span", {
    textContent: "",
    style: "display: none;",
    "data-utags": "",
  })
  addElement(currentTagsWrapper, "ul", {
    class: "utags_current_tags utags_ul",
  })

  const input = addElement(content, "input", {
    type: "text",
    placeholder: "foo, bar",
    onblur(event: Event) {
      // console.log(event)
      setTimeout(() => {
        // When press 'Escape' key
        if (doc.activeElement === doc.body) {
          closeModal()
        }
      }, 1)
    },
  }) as HTMLInputElement

  input.focus()
  input.select()

  addElement(currentTagsWrapper, "button", {
    class: "utags_button_copy",
    textContent: i("prompt.copy"),
    async onclick() {
      await copyCurrentTags(input)
    },
  })

  const listWrapper = addElement(content, "div", {
    class: "utags_list_wrapper",
  })

  addElement(listWrapper, "ul", {
    class: "utags_select_list utags_pined_list",
    "data-utags_list_name": i("prompt.pinnedTags"),
  })

  addElement(listWrapper, "ul", {
    class: "utags_select_list utags_most_used",
    "data-utags_list_name": i("prompt.mostUsedTags"),
  })

  addElement(listWrapper, "ul", {
    class: "utags_select_list utags_recent_added",
    "data-utags_list_name": i("prompt.recentAddedTags"),
  })

  updateLists()

  const buttonWrapper = addElement(content, "div", {
    class: "utags_buttons_wrapper",
  })
  let closed = false
  const closeModal = (value?: string | undefined) => {
    if (closed) {
      return
    }

    closed = true
    modal.remove()
    removeEventListener(input, "keydown", keydonwHandler, true)
    removeEventListener(doc, "keydown", keydonwHandler, true)
    removeEventListener(doc, "mousedown", mousedownHandler, true)
    removeEventListener(doc, "click", clickHandler, true)
    removeEventListener(doc, "mouseover", mouseoverHandler, true)
    // eslint-disable-next-line eqeqeq, no-eq-null
    resolve(value == null ? null : value)
  }

  const okHandler = () => {
    closeModal(Array.from(currentTags).join(","))
  }

  addElement(buttonWrapper, "button", {
    textContent: i("prompt.cancel"),
    onclick() {
      closeModal()
    },
  })
  addElement(buttonWrapper, "button", {
    class: "utags_primary",
    textContent: i("prompt.ok"),
    onclick() {
      onSelect(input.value.trim(), input)
      okHandler()
    },
  })

  const keydonwHandler = (event: KeyboardEvent) => {
    // console.log(event, event.target)
    if (event.defaultPrevented || !$(".utags_modal_content")) {
      return // 如果事件已经在进行中，则不做任何事。
    }

    let current = $(".utags_modal_content ul.utags_select_list .utags_active")

    switch (event.key) {
      case "Escape": {
        // 取消默认动作，从而避免处理两次。
        event.preventDefault()
        closeModal()
        break
      }

      case "Enter": {
        // 取消默认动作，从而避免处理两次。
        event.preventDefault()
        input.focus()

        if (current) {
          onSelect(current.textContent!, input)
        } else if (input.value.trim()) {
          onSelect(input.value.trim(), input)
        } else {
          okHandler()
        }

        break
      }

      case "Tab": {
        // 取消默认动作，从而避免处理两次。
        event.preventDefault()
        input.focus()
        break
      }

      case "ArrowDown": {
        // 取消默认动作，从而避免处理两次。
        event.preventDefault()
        input.focus()
        current = $(
          ".utags_modal_content ul.utags_select_list .utags_active,.utags_modal_content ul.utags_select_list .utags_active2"
        )
        if (current) {
          const next = current.nextElementSibling as HTMLElement
          if (next) {
            removeAllActive()
            addClass(next, "utags_active")
          }
        } else {
          // set first item as active
          const next = $(".utags_modal_content ul.utags_select_list li")
          if (next) {
            removeAllActive()
            addClass(next, "utags_active")
          }
        }

        break
      }

      case "ArrowUp": {
        // 取消默认动作，从而避免处理两次。
        event.preventDefault()
        input.focus()
        current = $(
          ".utags_modal_content ul.utags_select_list .utags_active,.utags_modal_content ul.utags_select_list .utags_active2"
        )
        if (current) {
          const previous = current.previousElementSibling as HTMLElement
          if (previous) {
            removeAllActive()
            addClass(previous, "utags_active")
          }
        }

        break
      }

      case "ArrowLeft": {
        // 取消默认动作，从而避免处理两次。
        event.preventDefault()
        input.focus()
        current = $(
          ".utags_modal_content ul.utags_select_list .utags_active,.utags_modal_content ul.utags_select_list .utags_active2"
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
            addClass(
              parentPrevious.children[newIndex] as HTMLElement,
              "utags_active"
            )
          }
        }

        break
      }

      case "ArrowRight": {
        // 取消默认动作，从而避免处理两次。
        event.preventDefault()
        input.focus()
        current = $(
          ".utags_modal_content ul.utags_select_list .utags_active,.utags_modal_content ul.utags_select_list .utags_active2"
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
            addClass(
              parentNext.children[newIndex] as HTMLElement,
              "utags_active"
            )
          }
        }

        break
      }

      default: {
        removeAllActive()
        break
      }
    }
  }

  addEventListener(input, "keydown", keydonwHandler, true)
  addEventListener(doc, "keydown", keydonwHandler, true)

  const mousedownHandler = (event: Event) => {
    // console.log(event, event.target)
    if (event.defaultPrevented || !$(".utags_modal_content")) {
      return // 如果事件已经在进行中，则不做任何事。
    }

    // event.preventDefault()
    const target = event.target as HTMLElement
    if (!target) {
      return
    }

    if (target.closest(".utags_modal_content")) {
      if (target === input) {
        return
      }

      event.preventDefault()
      input.focus()
    } else {
      event.preventDefault()
      input.focus()
      // closeModal()
    }
  }

  addEventListener(doc, "mousedown", mousedownHandler, true)

  const clickHandler = (event: Event) => {
    if (event.defaultPrevented || !$(".utags_modal_content")) {
      return // 如果事件已经在进行中，则不做任何事。
    }

    // event.preventDefault()
    const target = event.target as HTMLElement
    if (!target) {
      return
    }

    if (target.closest(".utags_modal_content")) {
      input.focus()
      if (target.closest(".utags_modal_content ul.utags_select_list li")) {
        onSelect(target.textContent!, input)
      }

      if (target.closest(".utags_modal_content ul.utags_current_tags li a")) {
        removeTag(target.dataset.utags_tag)
      }
    } else {
      closeModal()
    }
  }

  addEventListener(doc, "click", clickHandler, true)

  const mouseoverHandler = (event: Event) => {
    const target = event.target as HTMLElement
    if (!target?.closest(".utags_modal_content")) {
      return
    }

    const li = target.closest("ul.utags_select_list li")!
    if (li) {
      removeAllActive()
      addClass(li, "utags_active2")
    } else {
      removeAllActive(2)
    }
  }

  addEventListener(doc, "mousemove", mouseoverHandler, true)
}

export async function advancedPrompt(
  message: string,
  value: string | undefined
) {
  pinnedTags = await getPinnedTags()
  mostUsedTags = await getMostUsedTags()
  recentAddedTags = await getRecentAddedTags()
  currentTags = new Set(splitTags(value))

  return new Promise((resolve) => {
    createPromptView(message, value, resolve)
  })
}
