<script lang="ts">
  import { onDestroy } from 'svelte'
  import { splitTags } from 'utags-utils'
  import * as m from '../paraglide/messages'

  // Props
  let {
    id = '',
    tags = $bindable([]),
    placeholder = m.TAG_INPUT_PLACEHOLDER(),
    class: clazz = '',
    disabled = false,
  }: {
    id?: string
    tags?: string[]
    placeholder?: string
    class?: string
    disabled?: boolean
  } = $props()

  // State
  let inputValue = $state('')
  let inputElement: HTMLInputElement | null = $state(null)
  let editingTagIndex = $state<number>(-1)
  let editingTagValue = $state('')
  // Add a flag to track if we should ignore the next blur event
  let ignoreNextBlur = $state(false)
  // Add a flag to track if the component is mounted
  let isMounted = $state(true)
  // Add a flag to track if the input is in error shake state
  let isInputShaking = $state(false)

  // Set the flag to false when the component is destroyed
  onDestroy(() => {
    isMounted = false
  })

  /**
   * Trigger a shake animation on the input field to indicate validation error
   */
  function shakeInput() {
    if (!inputElement) return

    isInputShaking = true
    setTimeout(() => {
      if (isMounted) {
        isInputShaking = false
      }
    }, 500) // Animation duration
  }

  /**
   * Add a new tag to the list
   * @param tag - The tag to add
   */
  function addTag(tag: string) {
    // Trim the tag and convert to lowercase
    const trimmedTag = tag.trim()

    // Validate tag
    if (trimmedTag === '') {
      shakeInput() // Add visual feedback for empty tag
      return
    }

    // Check if tag already exists
    if (tags.includes(trimmedTag)) {
      shakeInput() // Add visual feedback for duplicate tag
      return
    }

    // When using Chinese input methods, commas may still be included in certain edge cases, so we need to split the tags again
    // Add tag directly to the bindable array
    tags = splitTags(tags.join(',') + ',' + trimmedTag)

    // Clear input
    inputValue = ''
  }

  /**
   * Remove a tag from the list
   * @param tagToRemove - The tag to remove
   */
  function removeTag(tagToRemove: string) {
    if (disabled) return

    // Update tags directly
    tags = tags.filter((tag) => tag !== tagToRemove)
  }

  /**
   * Handle keydown events in the input field
   * @param event - The keyboard event
   */
  function handleKeydown(event: KeyboardEvent) {
    if (disabled) return

    // Special case: when tags exist and input is empty, don't stop propagation for Enter key
    // This allows the Enter key to bubble up (e.g., for form submission)
    if (event.key === 'Enter' && tags.length > 0 && inputValue.trim() === '') {
      // Don't call event.stopPropagation() in this case
      event.preventDefault()
      return
    }

    // For all other cases, stop propagation as before
    event.stopPropagation()

    // Add tag on Enter
    if (event.key === 'Enter' || event.key === ',' || event.key === '，') {
      event.preventDefault()
      addTag(inputValue)
    }

    // Remove last tag on Backspace if input is empty
    if (event.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      const lastTag = tags[tags.length - 1]
      removeTag(lastTag)
    }
  }

  /**
   * Handle paste events to add multiple tags at once
   * @param event - The clipboard event
   */
  function handlePaste(event: ClipboardEvent) {
    if (disabled) return

    // Get pasted text
    const pastedText = event.clipboardData?.getData('text') || ''

    // Split by commas, newlines, or spaces
    const pastedTags = splitTags(pastedText)

    // Add each tag
    if (pastedTags.length > 1) {
      event.preventDefault()
      pastedTags.forEach((tag) => addTag(tag))
    }
  }

  /**
   * Focus the input field
   */
  function focusInput() {
    if (!disabled && inputElement) {
      inputElement.focus()
    }
  }

  /**
   * Start editing a tag
   * @param index - The index of the tag to edit
   * @param tag - The tag value
   */
  function startEditingTag(index: number, tag: string) {
    if (disabled) return

    editingTagIndex = index
    editingTagValue = tag

    // Focus will be set by the bind:this in the editing input
    setTimeout(() => {
      const editInput = document.getElementById(`tag-edit-${index}`)
      if (editInput) {
        editInput.focus()
      }
    }, 10)
  }

  /**
   * Save the edited tag
   * @param index - The index of the tag being edited
   */
  function saveEditedTag(index: number) {
    // console.log('saveEditedTag', index)
    const trimmedValue = editingTagValue.trim()

    // If empty, remove the tag
    if (trimmedValue === '') {
      tags = tags.filter((_, i) => i !== index)
      editingTagIndex = -1
      return
    }

    // If the tag already exists elsewhere, cancel editing
    const existsAtDifferentIndex =
      tags.findIndex((t, i) => t === trimmedValue && i !== index) !== -1

    if (existsAtDifferentIndex) {
      editingTagIndex = -1
      return
    }

    // Update the tag
    const newTags = [...tags]
    newTags[index] = trimmedValue
    // When editing tags, commas might be entered, requiring re-splitting of the tag string
    tags = splitTags(newTags)
    editingTagIndex = -1
  }

  /**
   * Handle keydown events in the tag edit input
   * @param event - The keyboard event
   * @param index - The index of the tag being edited
   */
  function handleTagEditKeydown(event: KeyboardEvent, index: number) {
    event.stopPropagation()

    if (event.key === 'Enter') {
      event.preventDefault()
      saveEditedTag(index)
      // Focus the tag span after editing is complete
      setTimeout(() => {
        const tagSpan = document.querySelector(
          `.tag-item:nth-child(${index + 1}) span[role="button"]`
        )
        if (tagSpan) {
          ;(tagSpan as HTMLElement).focus()
        }
      }, 10)
    }
  }

  /**
   * Handle blur events in the tag edit input
   * @param index - The index of the tag being edited
   */
  function handleTagEditBlur(index: number) {
    // console.log('handleTagEditBlur', editingTagIndex, index)
    if (editingTagIndex === index) {
      // Use setTimeout with 200ms delay to ensure click events on buttons
      // (like the clear/delete button) have enough time to process before
      // the blur event handler runs. A shorter delay might cause the blur
      // handler to execute before the button's click event, preventing
      // proper interaction with the tag input while in edit mode.
      setTimeout(() => {
        // Check if the component is still mounted before proceeding
        // console.log(
        //   'isMounted',
        //   isMounted,
        //   ignoreNextBlur,
        //   editingTagIndex,
        //   index
        // )
        if (isMounted && !ignoreNextBlur) {
          saveEditedTag(index)
        }
        setTimeout(() => {
          ignoreNextBlur = false
        }, 200)
      }, 200)
    }
  }
  function handleTagEditFocus(index: number) {
    // console.log('handleTagEditFocus', editingTagIndex, index)
    // If the current tag is in edit mode
    if (editingTagIndex === index) {
      // Set the flag to ignore the next blur event
      ignoreNextBlur = true
      setTimeout(() => {
        ignoreNextBlur = false
      }, 410)
    }
  }

  /**
   * Handle tag button action (clear or remove)
   * Handles both click and keyboard events for the tag button
   * @param index - The index of the tag
   * @param tag - The tag value
   */
  function handleTagButtonAction(index: number, tag: string) {
    // console.log('handleTagButtonAction', editingTagIndex, index, tag)
    // If the current tag is in edit mode, clear the input content and maintain focus
    if (editingTagIndex === index) {
      // Set the flag to ignore the next blur event
      ignoreNextBlur = true
      editingTagValue = ''
      // Refocus on the input field
      setTimeout(() => {
        const editInput = document.getElementById(`tag-edit-${index}`)
        if (editInput) {
          editInput.focus()
        }
      }, 10)
    } else {
      // Use setTimeout with 210ms delay to ensure previous editing tag input blur event to finish
      setTimeout(() => {
        // Otherwise perform normal tag removal operation
        removeTag(tag)
      }, 210)
    }
  }

  function getRemoveButtonTitle(tagValue: string, isClear: boolean) {
    return isClear
      ? m.TAG_INPUT_CLEAR_TAG_CONTENT_TOOLTIP()
      : m.TAG_INPUT_REMOVE_TAG_TOOLTIP({ tag: tagValue })
  }
</script>

<div
  class="tag-input-container flex flex-wrap items-center gap-2 rounded-md border border-gray-300 bg-white p-2 dark:border-gray-600 dark:bg-gray-700 {clazz}"
  class:focus-within:border-blue-500={!disabled}
  class:focus-within:ring-1={!disabled}
  class:focus-within:ring-blue-500={!disabled}
  class:cursor-not-allowed={disabled}
  class:opacity-70={disabled}
  onclick={focusInput}
  onkeydown={(e) =>
    e.key === 'Enter' || e.key === ' '
      ? (e.preventDefault(), focusInput())
      : null}
  tabindex="-1"
  role="textbox"
  aria-label="tags input area">
  {#each tags as tag, index}
    <div
      class="tag-item flex items-center rounded-md bg-blue-100 px-1 py-0.5 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
      {#if editingTagIndex === index}
        <input
          id={`tag-edit-${index}`}
          type="text"
          class="w-full min-w-[40px] bg-transparent text-xs outline-none"
          bind:value={editingTagValue}
          onkeydown={(e) => handleTagEditKeydown(e, index)}
          onfocus={() => handleTagEditFocus(index)}
          onblur={() => handleTagEditBlur(index)}
          onclick={(e) => e.stopPropagation()} />
      {:else}
        <span
          class="group relative rounded px-0.5 transition-colors {!disabled
            ? 'cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/30'
            : 'cursor-inherit'}"
          onclick={(e) => {
            e.stopPropagation()
            // Use setTimeout with 210ms delay to ensure previous editing tag input blur event to finish
            setTimeout(() => {
              startEditingTag(index, tag)
            }, 210)
          }}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              startEditingTag(index, tag)
            }
          }}
          role="button"
          tabindex="0"
          title={disabled ? '' : m.TAG_INPUT_EDIT_TAG_TOOLTIP()}>
          {tag}
          {#if !disabled}
            <span
              class="absolute top-0 right-0 -mt-2 -mr-2 hidden text-blue-500 group-hover:inline-block dark:text-blue-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-2.5 w-2.5"
                viewBox="0 0 20 20"
                fill="currentColor">
                <path
                  d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </span>
          {/if}
        </span>
      {/if}
      {#if !disabled}
        <button
          type="button"
          class="ml-0.5 text-blue-600 hover:text-red-500 dark:text-blue-400 dark:hover:text-red-400"
          onmouseenter={(e) => {
            // Find the nearest span element and add strikethrough and red text effect if not in edit mode
            if (editingTagIndex !== index) {
              const span = e.currentTarget
                .closest('.tag-item')
                ?.querySelector('span')
              if (span) {
                span.classList.add(
                  'line-through',
                  'text-red-500',
                  'dark:text-red-400'
                )
              }
            }
          }}
          onmouseleave={(e) => {
            // Find the nearest span element and remove strikethrough and red text effect if not in edit mode
            if (editingTagIndex !== index) {
              const span = e.currentTarget
                .closest('.tag-item')
                ?.querySelector('span')
              if (span) {
                span.classList.remove(
                  'line-through',
                  'text-red-500',
                  'dark:text-red-400'
                )
              }
            }
          }}
          onfocus={() => handleTagEditFocus(index)}
          onblur={() => handleTagEditBlur(index)}
          onclick={(e) => {
            e.stopPropagation()
            handleTagButtonAction(index, tag)
          }}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              handleTagButtonAction(index, tag)
            }
          }}
          tabindex="0"
          title={getRemoveButtonTitle(tag, editingTagIndex === index)}
          aria-label={getRemoveButtonTitle(tag, editingTagIndex === index)}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3 w-3"
            viewBox="0 0 20 20"
            fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd" />
          </svg>
        </button>
      {/if}
    </div>
  {/each}
  {#if !(disabled && tags.length > 0)}
    <input
      bind:this={inputElement}
      {id}
      type="text"
      class="flex-grow border-none bg-transparent px-0 py-0.5 text-xs text-gray-700 outline-none placeholder:text-gray-400 dark:text-gray-300 dark:placeholder:text-gray-500"
      class:cursor-not-allowed={disabled}
      class:shake-animation={isInputShaking}
      placeholder={tags.length === 0 ? placeholder : ''}
      bind:value={inputValue}
      onkeydown={handleKeydown}
      onpaste={handlePaste}
      {disabled} />
  {/if}
</div>

<style>
  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    10%,
    30%,
    50%,
    70%,
    90% {
      transform: translateX(-2px);
    }
    20%,
    40%,
    60%,
    80% {
      transform: translateX(2px);
    }
  }

  .shake-animation {
    animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }
</style>
