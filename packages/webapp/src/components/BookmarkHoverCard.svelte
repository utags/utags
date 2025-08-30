<script lang="ts">
  import { getContext } from 'svelte'
  import { Pencil, Trash2, BookOpen } from 'lucide-svelte'
  import type { SharedStatus } from '../types/shared-status.js'
  import * as m from '../paraglide/messages'
  import Favicon from './Favicon.svelte'
  import {
    handleBookmarkEdit,
    handleBookmarkDelete,
    handleAISummary,
  } from '../utils/bookmark-actions'

  /**
   * Props for the BookmarkHoverCard component
   */
  interface BookmarkHoverCardProps {
    href: string
    title: string
    description?: string
    note?: string
    tags: string[]
    dateTitleText: string
    show: boolean
    position?: 'top' | 'bottom' | 'auto' | 'button'
    anchorElement?: HTMLElement | null
    cardElement?: HTMLDivElement | null
  }

  // Props
  let {
    href,
    title,
    description,
    note,
    tags,
    dateTitleText,
    show = false,
    position = 'auto',
    anchorElement,
    cardElement = $bindable(null),
  }: BookmarkHoverCardProps = $props()

  // State
  let cardPosition = $state<'top' | 'bottom' | 'button-top' | 'button-bottom'>(
    'bottom'
  )

  // Shared status from context
  const sharedStatus = $state(getContext('sharedStatus') as SharedStatus)
  const isViewingDeleted = $derived(sharedStatus.isViewingDeleted)
  const isViewingSharedCollection = $derived(
    sharedStatus.isViewingSharedCollection
  )

  /**
   * Calculate the optimal position for the hover card
   * Checks if there's enough space below the element, otherwise positions above
   */
  function calculatePosition() {
    if (position === 'button' && anchorElement && cardElement) {
      const cardRect = cardElement.getBoundingClientRect()
      // 获取按钮位置
      const buttonRect = anchorElement.getBoundingClientRect()
      const viewportHeight = window.innerHeight

      // 计算按钮下方的可用空间
      const spaceBelow = viewportHeight - buttonRect.bottom

      // 假设卡片高度约为350px（可根据实际情况调整）
      const estimatedCardHeight = cardRect.height

      // 如果下方空间足够，则显示在按钮下方
      if (spaceBelow >= estimatedCardHeight) {
        cardPosition = 'button-bottom'
      } else {
        // 否则显示在按钮上方
        cardPosition = 'button-top'
      }
      return
    } else if (position === 'button' && !anchorElement) {
      console.warn('Button position specified but anchorElement is null')
      // 默认为底部位置
      cardPosition = 'bottom'
      return
    }

    if (position !== 'auto') {
      cardPosition = position as 'top' | 'bottom'
      return
    }

    if (!cardElement) return

    // Get card dimensions and position
    const cardRect = cardElement.getBoundingClientRect()
    const parentRect = cardElement.parentElement?.getBoundingClientRect()

    if (!parentRect) return

    // Check if there's enough space below
    const spaceBelow = window.innerHeight - parentRect.bottom
    const cardHeight = cardRect.height

    // If not enough space below and more space above, position on top
    if (spaceBelow < cardHeight && parentRect.top > cardHeight) {
      cardPosition = 'top'
    } else {
      cardPosition = 'bottom'
    }
  }

  // 监听窗口大小变化，重新计算位置
  function handleResize() {
    if (show) {
      calculatePosition()
    }
  }

  // Recalculate position when card becomes visible
  $effect(() => {
    if (show) {
      window.addEventListener('resize', handleResize)
      // 使用setTimeout确保DOM已更新
      setTimeout(calculatePosition, 0)
    } else {
      window.removeEventListener('resize', handleResize)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  })
</script>

{#if show}
  <div
    bind:this={cardElement}
    class="hover-card absolute z-50 max-h-[450px] w-[450px] overflow-auto rounded-md border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800"
    class:top-auto={cardPosition === 'bottom'}
    class:bottom-full={cardPosition === 'top' || cardPosition === 'button-top'}
    class:top-full={cardPosition === 'bottom' ||
      cardPosition === 'button-bottom'}
    class:mb-2={cardPosition === 'top' || cardPosition === 'button-top'}
    class:mt-2={cardPosition === 'bottom' || cardPosition === 'button-bottom'}
    class:right-full={cardPosition === 'button-top' ||
      cardPosition === 'button-bottom'}
    class:mr-1={cardPosition === 'button-top' ||
      cardPosition === 'button-bottom'}
    style={cardPosition === 'button-top' || cardPosition === 'button-bottom'
      ? `transform-origin: top right; min-width: 350px;`
      : `transform-origin: ${cardPosition === 'top' ? 'bottom' : 'top'} left;`}>
    <div class="mb-2 flex items-start justify-between">
      <div class="flex items-center gap-2">
        <Favicon {href} classNames="h-4 w-4 flex-none" />
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-200">
          {title}
        </h3>
      </div>
      <div class="flex gap-1">
        {#if !isViewingDeleted && !isViewingSharedCollection}
          <button
            onclick={() => handleBookmarkEdit(href)}
            class="rounded p-1 text-gray-600 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
            title={m.EDIT_BUTTON_TEXT()}>
            <Pencil size={14} />
          </button>
          <button
            onclick={() => handleBookmarkDelete(href)}
            class="rounded p-1 text-gray-600 hover:bg-red-50 hover:text-red-600 dark:text-gray-300 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            title={m.DELETE_BUTTON_TEXT()}>
            <Trash2 size={14} />
          </button>
        {/if}
        <button
          onclick={() => handleAISummary(href)}
          class="rounded p-1 text-gray-600 hover:bg-purple-50 hover:text-purple-600 dark:text-gray-300 dark:hover:bg-purple-900/30 dark:hover:text-purple-400"
          title={m.AI_SUMMARY_BUTTON_TEXT()}>
          <BookOpen size={14} />
        </button>
      </div>
    </div>

    <a
      {href}
      title={href}
      target="_blank"
      rel="noopener"
      class="mb-2 block truncate text-xs text-blue-600 hover:underline dark:text-blue-400">
      {href}
    </a>

    {#if description}
      <div class="mb-2 text-xs text-gray-700 dark:text-gray-300">
        <div class="font-medium">{m.FIELD_DESCRIPTION()}{m.ZZ_P_COLON()}</div>
        <div class="whitespace-pre-wrap">{description}</div>
      </div>
    {/if}

    {#if note}
      <div class="mb-2 text-xs text-gray-700 dark:text-gray-300">
        <div class="font-medium">{m.FIELD_NOTE()}{m.ZZ_P_COLON()}</div>
        <div class="whitespace-pre-wrap italic">{note}</div>
      </div>
    {/if}

    <div class="mt-2">
      <div class="text-xs font-medium text-gray-700 dark:text-gray-300">
        {m.FIELD_TAGS()}{m.ZZ_P_COLON()}
      </div>
      <div class="mt-1 flex flex-wrap gap-1">
        {#each tags as tag}
          <a
            href="#{encodeURIComponent(tag)}"
            class="tag inline-flex items-center rounded-sm bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            <span>{tag}</span>
          </a>
        {/each}
      </div>
    </div>

    <div class="mt-2 text-right text-xs text-gray-500 dark:text-gray-400">
      <pre>
      {@html dateTitleText.replace('\n', '<br />')}
      </pre>
    </div>
  </div>
{/if}

<style>
  .hover-card {
    animation: fadeIn 0.2s ease-out;
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);

    /* Custom scrollbar styles */
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  }

  /* For Webkit browsers (Chrome, Safari) */
  .hover-card::-webkit-scrollbar {
    width: 6px;
  }

  .hover-card::-webkit-scrollbar-track {
    background: transparent;
  }

  .hover-card::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-5px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
