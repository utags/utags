<script>
  import { Pencil, Trash2, BookOpen } from 'lucide-svelte'
  import { humanizeUrl } from '../utils/url-utils.js'
  import Favicon from './Favicon.svelte'
  import {
    handleBookmarkEdit,
    handleBookmarkDelete,
    handleAISummary,
  } from '../utils/bookmark-actions'
  import BookmarkHoverCardToggleButton from './BookmarkHoverCardToggleButton.svelte'

  let {
    href,
    tags,
    title,
    description,
    note,
    created,
    updated,
    formatedCreated,
    formatedUpdated,
    dateTitleText,
  } = $props()
</script>

<div
  class="list-default group relative w-full rounded-md p-2 transition-colors duration-50 hover:bg-gray-100 dark:hover:bg-gray-800">
  <!-- <div
    class="absolute top-2 right-2 z-1 flex gap-1 rounded-md border border-gray-200 bg-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:border-gray-700 dark:bg-gray-800">
    <button
      onclick={() => handleBookmarkEdit(href)}
      class="rounded p-1.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400">
      <Pencil size={16} />
    </button>
    <button
      onclick={() => handleBookmarkDelete(href)}
      class="rounded p-1.5 text-gray-700 hover:bg-red-50 hover:text-red-600 dark:text-gray-300 dark:hover:bg-red-900/30 dark:hover:text-red-400">
      <Trash2 size={16} />
    </button>
    <button
      onclick={() => handleAISummary(href)}
      class="rounded p-1.5 text-gray-700 hover:bg-purple-50 hover:text-purple-600 dark:text-gray-300 dark:hover:bg-purple-900/30 dark:hover:text-purple-400"
      title="AI 总结">
      <BookOpen size={16} />
    </button>
    <BookmarkHoverCardToggleButton
      buttonClass="rounded p-1.5 text-gray-700 hover:bg-green-50 hover:text-green-600 dark:text-gray-300 dark:hover:bg-green-900/30 dark:hover:text-green-400"
      buttonSize={16}
      {href}
      {title}
      {description}
      {note}
      {tags}
      {dateTitleText} />
  </div> -->
  <div class="flex items-center gap-1">
    <div class="flex min-w-0 flex-1 flex-col space-y-0.5">
      <div class="flex items-center gap-2 truncate">
        <h3
          class="truncate text-sm text-gray-900 dark:text-gray-300"
          style="flex: 0 0 50%; min-width: 0;">
          <a
            {href}
            {title}
            target="_blank"
            rel="noopener"
            class="flex flex-nowrap items-center gap-1"
            style="flex-shrink:0; min-width:0">
            <Favicon {href} classNames="h-4 w-4 flex-none" />
            <span class="truncate" style="min-width:0">
              {title}
            </span>
          </a>
        </h3>

        <a
          {href}
          title={href}
          target="_blank"
          rel="noopener"
          class="truncate pt-0.5 text-xs text-gray-800 hover:text-gray-300 dark:text-gray-400">
          <span>{humanizeUrl(href)}</span>
        </a>
      </div>

      {#if description}
        <div
          class="text-xs whitespace-pre-wrap text-gray-600 dark:text-gray-400">
          {description}
        </div>
      {/if}

      {#if note}
        <div
          class="text-xs whitespace-pre-wrap text-gray-500 italic dark:text-gray-500">
          {note}
        </div>
      {/if}

      <div class="tags mt-2 flex flex-wrap gap-2">
        {#each tags as tag}
          <a
            href="#{encodeURIComponent(tag)}"
            class="tag inline-flex items-center gap-1 rounded-sm bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
            <span class="font-normal tracking-tight">{tag}</span>
          </a>
        {/each}
      </div>
    </div>
    <BookmarkHoverCardToggleButton
      {href}
      {title}
      {description}
      {note}
      {tags}
      {dateTitleText} />
    <div class="top-3 right-3 text-right">
      <span
        class="font-mono text-xs tracking-tight text-gray-500 dark:text-gray-500"
        title={dateTitleText}>
        {#if created === updated}
          <div class="flex flex-col items-end gap-0.5">
            <span>{formatedUpdated}</span>
          </div>
        {:else}
          <div class="flex flex-col items-end justify-end gap-0.5">
            <span>{formatedUpdated}</span>
            <span>{formatedCreated}</span>
          </div>
        {/if}
      </span>
    </div>
  </div>
</div>

<style>
  .list-default:hover .tag {
    background-color: var(--color-gray-200);
  }
  :root.dark .list-default:hover .tag {
    background-color: var(--color-gray-900);
  }
</style>
