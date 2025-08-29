<script lang="ts">
  import { type BookmarkListItemProps } from '../types/bookmarks'
  import Favicon from './Favicon.svelte'
  import BookmarkHoverCardToggleButton from './BookmarkHoverCardToggleButton.svelte'

  // Props
  let {
    href,
    tags,
    title,
    description,
    note,
    formatedUpdated,
    dateTitleText,
  }: BookmarkListItemProps = $props()
</script>

<div
  class="list-compact group relative w-full rounded-md p-2 transition-colors duration-50 hover:bg-gray-100 dark:hover:bg-gray-700">
  <div class="flex items-center justify-between gap-1">
    <div class="flex items-center gap-2 truncate">
      <Favicon {href} classNames="h-3 w-3 flex-none" />
      <h3
        class="flex-none truncate text-xs font-normal text-gray-900 dark:text-gray-300">
        <a {href} {title} target="_blank" rel="noopener">
          <span>{title}</span>
        </a>
      </h3>
      <div class="tags flex flex-nowrap gap-1 overflow-x-auto">
        {#each tags as tag}
          <a
            href="#{encodeURIComponent(tag)}"
            class="tag inline-flex items-center rounded-sm bg-gray-100 px-1 py-0.5 text-[11px] text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700">
            <span>{tag}</span>
          </a>
        {/each}
      </div>
    </div>
    <div class="flex items-center gap-1">
      <BookmarkHoverCardToggleButton
        {href}
        {title}
        {description}
        {note}
        {tags}
        {dateTitleText} />
      <span
        class="shrink-0 text-xs text-gray-500 dark:text-gray-500"
        title={dateTitleText}>
        {formatedUpdated}
      </span>
    </div>
  </div>
</div>

<style>
  .list-compact:hover .tag {
    background-color: var(--color-gray-200);
  }
  :root.dark .list-compact:hover .tag {
    background-color: var(--color-gray-900);
  }
</style>
