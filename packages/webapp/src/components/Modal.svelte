<script lang="ts">
  import { onMount, type Snippet } from 'svelte'
  import { initFocusTrap } from 'focus-trap-lite'
  import { $ as _$ } from 'browser-extension-utils'
  import * as m from '../paraglide/messages'

  let {
    children,
    title = '',
    isOpen = $bindable(false),
    onOpen = () => {},
    onClose = () => {},
    onInputEnter = () => {},
    cancelText = m.MODAL_CANCEL_BUTTON(),
    showCancel = true,
    confirmText = m.SAVE_BUTTON_TEXT(),
    showConfirm = true,
    onConfirm = (evt: MouseEvent) => {},
    disableConfirm = false,
  }: {
    children?: Snippet
    title?: string
    isOpen?: boolean
    onOpen?: () => void
    onClose?: () => void
    onInputEnter?: () => void
    cancelText?: string
    showCancel?: boolean
    confirmText?: string
    showConfirm?: boolean
    onConfirm?: (evt: MouseEvent) => void
    disableConfirm?: boolean
  } = $props()
  let modalElement: HTMLElement | undefined = $state()

  onMount(() => {
    return () => {
      isOpen = false
      if (modalElement) {
        modalElement.remove()
      }
    }
  })

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      isOpen = false
    } else if (event.key === 'Enter') {
      const target = event.target as HTMLElement | undefined
      if (
        target &&
        (target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.tagName === 'TEXTAREA')
      ) {
        // target.click()
      } else {
        if (typeof onInputEnter === 'function') {
          onInputEnter()
        }
      }
    }
  }

  $effect(() => {
    if (isOpen) {
      // Move modal to end of main element to prevent z-index conflicts
      _$('main')?.append(modalElement as Node)
      document.addEventListener('keydown', handleKeydown)
      initFocusTrap(modalElement)
      if (typeof onOpen === 'function') {
        onOpen()
      }
    } else {
      if (typeof onClose === 'function') {
        onClose()
      }
    }
    return () => {
      document.removeEventListener('keydown', handleKeydown)
    }
  })
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 bg-black/60 transition-opacity"
    role="dialog"
    aria-modal="true"
    aria-label={title}
    bind:this={modalElement}
    tabindex="-1">
    <div
      class="fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 p-4">
      <div class="rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-200">
            {title}
          </h3>
          <button
            onclick={() => (isOpen = false)}
            class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
            aria-label={m.MODAL_CLOSE_ARIA_LABEL()}>
            <svg
              class="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          class="mx-[-20px] max-h-[calc(100vh-16rem)] overflow-y-auto py-2 pl-5">
          <div class="w-[calc(var(--container-md)-80px)] space-y-4">
            {@render children?.()}
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          {#if showCancel}
            <button
              class="rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700/30"
              onclick={() => (isOpen = false)}>
              {cancelText}
            </button>
          {/if}
          {#if showConfirm}
            <button
              class="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-white transition-all hover:from-blue-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:from-blue-700 dark:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-900"
              onclick={onConfirm}
              disabled={disableConfirm}>
              {confirmText}
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* 添加过渡动画 */
  div {
    transition: opacity 0.2s ease-in-out;
  }
</style>
