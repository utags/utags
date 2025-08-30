<script>
  import Favicon from './Favicon.svelte'
  let { href, tags, title, description, note, formatedUpdated, dateTitleText } =
    $props()
</script>

<div
  class="bookmark-item group relative px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">
  <div class="flex items-start gap-3">
    <Favicon {href} classNames="h-4 w-4 mt-1 flex-none" />

    <div class="min-w-0 flex-1">
      <div class="flex items-baseline gap-2">
        <a
          {href}
          {title}
          target="_blank"
          rel="noopener"
          class="truncate text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">
          {title}
        </a>
        <span class="shrink-0 text-xs text-gray-500 dark:text-gray-400">
          {formatedUpdated}
        </span>
      </div>

      <div class="mt-1">
        <a
          {href}
          target="_blank"
          rel="noopener"
          class="block truncate text-xs text-gray-600 hover:underline dark:text-gray-300">
          {new URL(href).hostname}
        </a>
      </div>

      {#if tags && tags.length > 0}
        <div class="mt-1 flex flex-wrap gap-1">
          {#each tags as tag}
            <a
              href="#{encodeURIComponent(tag)}"
              class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              #<span>{tag}</span>
            </a>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .bookmark-item {
    border-bottom: 1px solid #e0e0e0;
    transition: background-color 0.2s ease;
  }
  .bookmark-item:last-child {
    border-bottom: none;
  }
  :global(.dark) .bookmark-item {
    border-bottom-color: #2d3748;
  }
</style>
