<script lang="ts">
  import { spaNavigateAttachment as spaNavigate } from '../../actions/spa-navigate-attachment.js'
  import ExpandableContainer from './ExpandableContainer.svelte'
  import ExpandIcon from './ExpandIcon.svelte'
  import {
    List,
    Clock,
    Star,
    Globe,
    Folder,
    NotebookPen,
    BookmarkPlus,
    HelpCircle,
    FileText,
    Trash2,
  } from 'lucide-svelte'

  /**
   * Navigation item interface
   */
  export interface NavItem {
    name: string
    icon: string
    href?: string
  }

  /**
   * Navigation group interface
   */
  export interface NavGroup {
    title: string
    icon?: string
    items: NavItem[]
    open: boolean
  }

  /**
   * Props for the component
   */
  let {
    group,
    onToggle = (group: NavGroup) => {
      // Default toggle handler
      group.open = !group.open
    },
  }: {
    group: NavGroup
    onToggle?: (group: NavGroup) => void
  } = $props()

  /**
   * Handle group toggle
   */
  function handleToggle() {
    onToggle(group)
  }
</script>

<div class="group">
  <div
    class="group-title"
    onclick={handleToggle}
    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleToggle()}
    role="button"
    tabindex="0">
    <span class="flex-1 text-left font-semibold">{group.title}</span>
    <div class="group-title-button {group.open ? '' : 'opacity-100'}">
      <ExpandIcon expanded={group.open} />
    </div>
  </div>

  <ExpandableContainer expanded={group.open}>
    <div class="ml-3 flex flex-col gap-1">
      {#each group.items as item}
        <a
          href={item.href}
          {@attach spaNavigate}
          class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
          <span class="h-4 w-4">
            {#if item.icon === 'list'}
              <List size={16} />
            {:else if item.icon === 'clock'}
              <Clock size={16} />
            {:else if item.icon === 'star'}
              <Star size={16} />
            {:else if item.icon === 'globe'}
              <Globe size={16} />
            {:else if item.icon === 'note'}
              <NotebookPen size={16} />
            {:else if item.icon === 'bookmark-plus'}
              <BookmarkPlus size={16} />
            {:else if item.icon === 'help-circle'}
              <HelpCircle size={16} />
            {:else if item.icon === 'file-text'}
              <FileText size={16} />
            {:else if item.icon === 'trash-2'}
              <Trash2 size={16} />
            {:else}
              <Folder size={16} />
            {/if}
          </span>
          <span>{item.name}</span>
        </a>
      {/each}
    </div>
  </ExpandableContainer>
</div>
