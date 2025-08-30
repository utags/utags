<script lang="ts">
  import { EllipsisVertical } from 'lucide-svelte'
  import BookmarkHoverCard from './BookmarkHoverCard.svelte'

  // Props
  let {
    buttonClass,
    buttonSize = 12,
    href,
    tags,
    title,
    description,
    note,
    formatedUpdated,
    dateTitleText,
  }: {
    buttonClass?: string
    buttonSize?: number
    href: string
    title: string
    description?: string
    note?: string
    tags: string[]
    formatedUpdated?: string
    dateTitleText: string
  } = $props()

  // State
  let showHoverCard = $state(false)
  let menuButtonRef: HTMLButtonElement | null = $state(null)
  let hoverCardRef: HTMLDivElement | null = $state(null)

  /**
   * Toggle hover card visibility
   * @param e - Mouse event
   */
  function toggleHoverCard(e: MouseEvent) {
    e.stopPropagation()
    showHoverCard = !showHoverCard
  }

  /**
   * Close hover card when clicking outside
   */
  function handleClickOutside(e: MouseEvent) {
    if (
      showHoverCard &&
      hoverCardRef &&
      !hoverCardRef.contains(e.target as Node) &&
      menuButtonRef &&
      !menuButtonRef.contains(e.target as Node)
    ) {
      showHoverCard = false
    }
  }

  // Add and remove document click listener
  $effect(() => {
    if (showHoverCard) {
      document.addEventListener('click', handleClickOutside, true)
    } else {
      document.removeEventListener('click', handleClickOutside, true)
    }

    // Cleanup
    return () => {
      document.removeEventListener('click', handleClickOutside, true)
    }
  })
</script>

<div class="wrapper relative flex">
  <button
    bind:this={menuButtonRef}
    onclick={toggleHoverCard}
    class={buttonClass ||
      'menu-button z-1 rounded p-1 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300'}
    title="操作菜单">
    <EllipsisVertical size={buttonSize} />
  </button>
  <BookmarkHoverCard
    {href}
    {title}
    {description}
    {note}
    {tags}
    {dateTitleText}
    show={showHoverCard && menuButtonRef !== null}
    position="button"
    anchorElement={menuButtonRef}
    bind:cardElement={hoverCardRef} />
</div>
