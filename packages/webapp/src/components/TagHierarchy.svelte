<script lang="ts">
  // 层级标签组件 - 用于展示以'/'分隔的标签层级结构
  // Folder And Hierarchy Tags
  import type { TagHierarchyItem } from '../types/bookmarks.js'
  import FolderItem from './FolderItem.svelte'
  import ExpandIcon from './ui/ExpandIcon.svelte'
  import ExpandableContainer from './ui/ExpandableContainer.svelte'
  import * as m from '../paraglide/messages'

  let {
    tagHierarchyItems = [],
  }: {
    tagHierarchyItems: TagHierarchyItem[]
  } = $props()

  let folders = $derived(tagHierarchyItems)
  let expanded = $state(true)
</script>

{#if folders.length > 0}
  <div class="group">
    <div
      class="group-title"
      onclick={() => (expanded = !expanded)}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          expanded = !expanded
        }
      }}
      role="button"
      tabindex="0">
      <span class="flex-1 text-left font-semibold"
        >{m.HIERARCHICAL_TAGS_TITLE()}</span>
      <div class="group-title-button {expanded ? '' : 'opacity-100'}">
        <ExpandIcon {expanded} />
      </div>
    </div>

    <ExpandableContainer {expanded}>
      {#each folders as folder}
        <FolderItem {...folder} />
      {/each}
    </ExpandableContainer>
  </div>
{/if}
