<script lang="ts">
  import type { NestedFilterExpression } from '../types/filters'

  export let nestedFilterExpression: NestedFilterExpression
  export let onRemove: (
    groupIndex: number,
    filterSetIndex: number,
    filterItemIndex: number
  ) => void
</script>

<ul class="flex flex-wrap items-center gap-1">
  {#each nestedFilterExpression as filterGroup, groupIndex}
    {#each filterGroup as filterSet, filterSetIndex}
      {#each filterSet as filter, filterItemIndex}
        <li
          class="flex flex-shrink-0 items-center gap-1 rounded px-2 py-1 text-xs"
          class:bg-blue-100={filter.type === 'keyword'}
          class:bg-green-100={filter.type === 'tag'}
          class:bg-purple-100={filter.type === 'domain'}
          class:dark:bg-blue-900={filter.type === 'keyword'}
          class:dark:bg-green-900={filter.type === 'tag'}
          class:dark:bg-purple-900={filter.type === 'domain'}>
          <button
            class="hover:bg-opacity-80 flex items-center gap-1 transition-all duration-200 hover:text-red-500 hover:[&>span]:line-through"
            onclick={() =>
              onRemove(groupIndex, filterSetIndex, filterItemIndex)}>
            <span>{filter.value}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3 w-3 opacity-70 hover:text-red-500 hover:opacity-100"
              viewBox="0 0 20 20"
              fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd" />
            </svg>
          </button>
        </li>
      {/each}
    {/each}
    {#if groupIndex < nestedFilterExpression.length - 1}
      <li class="flex-shrink-0 text-gray-400 dark:text-gray-500">•</li>
    {/if}
  {/each}
</ul>
