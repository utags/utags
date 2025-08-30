<script lang="ts">
  import { getContext } from 'svelte'
  import { type NestedFilterExpression } from '../types/filters'
  import type { SharedStatus } from '../types/shared-status.js'
  import * as m from '../paraglide/messages'
  import Statistics from './Statistics.svelte'
  import DropdownMenu from './DropdownMenu.svelte'
  import MoreVertIcon from './svg/MoreVertIcon.svelte'
  import FilterChips from './FilterChips.svelte'

  interface Stats {
    bookmarksCount: number
    tagsCount: number
    domainsCount: number
  }

  let {
    stats,
    onSelectionModeChange = (mode: boolean) => {},
  }: { stats: Stats; onSelectionModeChange?: (mode: boolean) => void } =
    $props()

  let menuOpen = $state(false)
  // Selection mode state
  let selectionMode = $state(false)

  // Shared status from context
  const sharedStatus = $state(getContext('sharedStatus') as SharedStatus)
  const isViewingDeleted = $derived(sharedStatus.isViewingDeleted)
  const isViewingSharedCollection = $derived(
    sharedStatus.isViewingSharedCollection
  )

  let nestedFilterExpression: NestedFilterExpression = [
    [
      [
        {
          value: 'abcd',
          type: 'keyword',
        },
      ],
      [
        {
          value: '111',
          type: 'tag',
        },
        {
          value: '222',
          type: 'tag',
        },
        {
          value: '111',
          type: 'tag',
        },
        {
          value: '222',
          type: 'tag',
        },
      ],
      [
        {
          value: 'example.com',
          type: 'domain',
        },
        {
          value: 'example2.com',
          type: 'domain',
        },
        {
          value: 'example.com',
          type: 'domain',
        },
        {
          value: 'example2.com',
          type: 'domain',
        },
      ],
    ],
    [
      [
        {
          value: 'abcd',
          type: 'keyword',
        },
      ],
      [
        {
          value: '111',
          type: 'tag',
        },
        {
          value: '222',
          type: 'tag',
        },
      ],
      [
        {
          value: 'example.com',
          type: 'domain',
        },
        {
          value: 'example2.com',
          type: 'domain',
        },
        {
          value: 'example.com',
          type: 'domain',
        },
        {
          value: 'example2.com',
          type: 'domain',
        },
      ],
    ],
    [
      [
        {
          value: 'abcd',
          type: 'keyword',
        },
      ],
      [
        {
          value: '111',
          type: 'tag',
        },
        {
          value: '222',
          type: 'tag',
        },
        {
          value: '222',
          type: 'tag',
        },
        {
          value: '222',
          type: 'tag',
        },
      ],
      [
        {
          value: 'example.com',
          type: 'domain',
        },
        {
          value: 'example2.com',
          type: 'domain',
        },
      ],
    ],
  ]

  // nestedFilterExpression = []

  function handleFilterRemove(
    groupIndex: number,
    filterSetIndex: number,
    filterItemIndex: number
  ) {
    console.log('Remove filter', {
      groupIndex,
      filterSetIndex,
      filterItemIndex,
    })
    // 实际删除逻辑实现
  }

  /**
   * Toggle selection mode
   */
  function toggleSelectionMode() {
    selectionMode = !selectionMode
    onSelectionModeChange(selectionMode)
  }
</script>

<div
  class="toolbar z-40 flex h-11.25 flex-none items-center justify-between border-b border-(color:--seperator-line-color) bg-white/95 px-5 dark:bg-gray-900/95">
  <div class="left-tools flex flex-none items-center gap-2 py-1">
    <!-- 左侧工具按钮区域 -->
    <Statistics
      bookmarksCount={stats.bookmarksCount}
      tagsCount={stats.tagsCount}
      domainsCount={stats.domainsCount} />
  </div>
  <div
    class="right-tools flex flex-grow-1 flex-nowrap items-center justify-end gap-2 py-1 pl-5">
    <!-- <div
      class="filters-container flex flex-grow-1 flex-wrap items-center gap-1">
      <FilterChips {nestedFilterExpression} onRemove={handleFilterRemove} />
    </div> -->
    <!-- 右侧工具按钮区域 -->
    <div class="ml-auto flex items-center">
      <!-- Add selection mode toggle button -->
      <button
        class="toolbar-button ml-auto flex items-center"
        class:active={selectionMode}
        onclick={toggleSelectionMode}
        title={m.TOOLBAR_BATCH_SELECT_MODE_TOOLTIP()}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span class="ml-1">{m.TOOLBAR_SELECT_BUTTON()}</span>
      </button>
    </div>
    <div class="relative flex flex-none">
      <button
        class="rounded-full p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        onclick={() => {
          if (!menuOpen) {
            setTimeout(() => {
              menuOpen = true
            })
          }
        }}>
        <MoreVertIcon />
      </button>

      <!-- TODO: isViewingSharedCollection == true 时：显示打开全部，复制到我的书签，导出书签等菜单 -->
      <DropdownMenu
        bind:open={menuOpen}
        items={isViewingDeleted || isViewingSharedCollection
          ? [
              { value: 'selectMode', label: m.TOOLBAR_MENU_SELECT_MODE() },
              { value: 'openAll', label: m.TOOLBAR_MENU_OPEN_ALL_BOOKMARKS() },
            ]
          : [
              { value: 'selectMode', label: m.TOOLBAR_MENU_SELECT_MODE() },
              { value: 'openAll', label: m.TOOLBAR_MENU_OPEN_ALL_BOOKMARKS() },
              {
                value: 'bookmarksExportCurrent',
                label: m.TOOLBAR_MENU_EXPORT_CURRENT_RESULTS(),
              },
              {
                value: 'bookmarksExportAll',
                label: m.TOOLBAR_MENU_EXPORT_ALL_BOOKMARKS(),
              },
            ]}
        selectedValue=""
        onSelect={(value) => {
          if (value === 'openAll') {
            // 打开所有书签的逻辑
            window.dispatchEvent(new CustomEvent('openAllBookmarks'))
            alert(m.FEATURE_COMING_SOON_ALERT())
          } else if (value === 'selectMode') {
            // 选择逻辑
            toggleSelectionMode()
            window.dispatchEvent(new CustomEvent('enterSelectionMode'))
          } else if (value === 'bookmarksExportCurrent') {
            window.dispatchEvent(
              new CustomEvent('bookmarksExport', {
                detail: { type: 'current' },
              })
            )
          } else if (value === 'bookmarksExportAll') {
            window.dispatchEvent(
              new CustomEvent('bookmarksExport', { detail: { type: 'all' } })
            )
          } else {
            alert(m.FEATURE_COMING_SOON_ALERT())
          }
        }} />
    </div>
  </div>
</div>

<style>
  .toolbar-button.active {
    background-color: rgba(79, 70, 229, 0.2);
    color: rgb(79, 70, 229);
  }
</style>
