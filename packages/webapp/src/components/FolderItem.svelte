<script lang="ts">
  import { onMount } from 'svelte'
  import { slide } from 'svelte/transition'
  import { Folder } from 'lucide-svelte'
  import type { TagHierarchyItem } from '../types/bookmarks.js'
  import FolderItem from './FolderItem.svelte'
  import ExpandIcon from './ui/ExpandIcon.svelte'

  let {
    name,
    path,
    query,
    count,
    children,
    expanded = $bindable(false),
  }: TagHierarchyItem = $props()

  let animate = $state(false)

  onMount(() => {
    if (count === 0) {
      expanded = true
    }
    // 如果是一级文件夹，默认折叠
    if (path.split('/').length <= 2) {
      expanded = false
    }
  })

  function toggle() {
    animate = true
    expanded = !expanded
  }
</script>

<div class="group">
  <div class="group flex items-center gap-1">
    <button
      class="flex h-8 w-6 flex-0 items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
      onclick={toggle}>
      <ExpandIcon {expanded} {animate} show={children.length > 0} />
    </button>

    <button
      class="flex flex-1 items-center gap-2 truncate rounded-md px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
      title={name}
      data-path={path}
      data-query={query}
      ondblclick={toggle}
      onclick={() => {
        console.log('显示书签:', name, path, query)
        location.hash = `//${encodeURIComponent(query)}`
      }}>
      <span class="h-4 w-4"><Folder size={16} /></span>
      <span class="truncate text-left">{name}</span>
      {#if count > 0}
        <span class="ml-auto text-xs text-gray-500 dark:text-gray-400"
          >{count}</span>
      {/if}
    </button>
  </div>

  {#if expanded}
    <ul class="ml-4" transition:slide={{ duration: 100, axis: 'y' }}>
      {#each children as child}
        <li>
          <FolderItem {...child} />
        </li>
      {/each}
    </ul>
  {/if}
</div>
