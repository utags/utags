<script>
  import Favicon from './Favicon.svelte'
  let { href, tags, title, description, note, formatedUpdated, dateTitleText } =
    $props()
</script>

<div
  class="delicious-item group relative px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800">
  <div class="flex flex-col gap-1">
    <div class="flex items-center gap-2">
      <Favicon {href} classNames="h-4 w-4 flex-none" />
      <a
        {href}
        {title}
        target="_blank"
        rel="noopener"
        class="truncate text-base font-medium text-gray-900 hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400">
        {title}
      </a>
    </div>

    <div class="flex items-baseline gap-2 text-sm">
      <a
        {href}
        target="_blank"
        rel="noopener"
        class="truncate text-gray-600 hover:underline dark:text-gray-400">
        {new URL(href).hostname}
      </a>
      <span class="text-gray-400 dark:text-gray-500">·</span>
      <span class="text-gray-500 dark:text-gray-400" title={dateTitleText}>
        {formatedUpdated}
      </span>
    </div>

    {#if tags && tags.length > 0}
      <div class="mt-1 flex flex-wrap gap-1.5">
        {#each tags as tag}
          <a
            href="#{encodeURIComponent(tag)}"
            class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            <span>{tag}</span>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .delicious-item {
    border-bottom: 1px solid #e5e7eb;
    transition: background-color 0.15s ease;
  }
  .delicious-item:last-child {
    border-bottom: none;
  }
  :global(.dark) .delicious-item {
    border-bottom-color: #374151;
  }
</style>
