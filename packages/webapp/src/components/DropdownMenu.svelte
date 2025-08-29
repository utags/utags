<script lang="ts">
  import { onMount } from 'svelte'

  let {
    open = $bindable(false),
    items,
    selectedValue,
    onSelect,
    showButton = false,
    buttonLabel = '',
    position = 'right-0 top-full',
    // width = 'w-40',
    width = '', // 去掉宽度限制
  } = $props<{
    open?: boolean
    items:
      | Array<{ value: string; label: string }>
      | readonly { readonly value: string; readonly label: string }[]
    selectedValue: string
    onSelect: (value: string) => void
    showButton?: boolean
    buttonLabel?: string
    position?: string
    width?: string
  }>()

  let menuRef: HTMLDivElement | undefined = $state()

  function handleClickOutside(event: MouseEvent) {
    if (open && menuRef && !menuRef.contains(event.target as Node)) {
      open = false
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') {
      open = false
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  })
</script>

{#if showButton}
  <button
    class="flex items-center gap-1 rounded-md px-3 py-1 whitespace-nowrap text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
    aria-label="下拉菜单"
    onclick={() => {
      if (!open) {
        setTimeout(() => {
          open = true
        })
      }
    }}>
    <span>{buttonLabel}</span>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-4 w-4 transition-transform duration-200"
      class:rotate-180={open}
      viewBox="0 0 20 20"
      fill="currentColor">
      <path
        fill-rule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clip-rule="evenodd" />
    </svg>
  </button>
{/if}

<div
  bind:this={menuRef}
  class={`absolute ${position} z-50 mt-2 ${width} ease origin-top transform rounded-md border border-gray-200 bg-white shadow-lg transition-all duration-200 dark:border-gray-700 dark:bg-gray-800 ${
    open
      ? 'scale-y-100 opacity-100'
      : 'pointer-events-none scale-y-80 opacity-0'
  }`}
  role={open ? 'menu' : undefined}
  tabindex={open ? 0 : undefined}>
  {#if open}
    {#each items as item}
      <div
        role="menuitemradio"
        tabindex="0"
        aria-checked={selectedValue === item.value}
        class={`cursor-pointer truncate px-4 py-2 text-sm whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-700 ${
          selectedValue === item.value
            ? 'bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400'
            : ''
        }`}
        onclick={() => {
          onSelect(item.value)
          open = false
        }}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect(item.value)
            open = false
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            const next =
              e.currentTarget.nextElementSibling ||
              e.currentTarget.parentElement!.firstElementChild
            ;(next as HTMLElement)?.focus()
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            const prev =
              e.currentTarget.previousElementSibling ||
              e.currentTarget.parentElement!.lastElementChild
            ;(prev as HTMLElement)?.focus()
          }
        }}>
        {item.label}
      </div>
    {/each}
  {/if}
</div>
