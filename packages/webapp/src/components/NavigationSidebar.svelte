<script lang="ts">
  import { getContext } from 'svelte'
  import { PanelLeftOpen, PanelLeftClose } from 'lucide-svelte'
  import type { SharedStatus } from '../types/shared-status.js'
  import * as m from '../paraglide/messages'
  import { appConfig } from '../config/app-config.js'
  import {
    buildTimeQuerySearchParams,
    buildCollectionPath,
  } from '../utils/url-utils.js'
  import { isChineseLocale } from '../utils/i18n-utils.js'
  import GroupSeparator from './ui/GroupSeparator.svelte'
  import NavigationGroup from './ui/NavigationGroup.svelte'
  import type { TagHierarchyItem } from '../types/bookmarks.js'
  import { settings } from '../stores/stores'
  import Collections from './Collections.svelte'
  import SavedFilters from './SavedFilters.svelte'
  import TagHierarchy from './TagHierarchy.svelte'

  const base = appConfig.base

  let {
    tagHierarchyItems = [],
  }: {
    tagHierarchyItems: TagHierarchyItem[]
  } = $props()

  // Shared status from context
  const sharedStatus = $state(getContext('sharedStatus') as SharedStatus)
  const locationSearchString = $derived(sharedStatus.locationSearchString)

  // 导航组数据结构
  // 置顶 Collections (position: fixed or sticky)
  // 所有书签
  // 常用书签 （一个 collection, 固定住这个位置）
  // 网址导航 （一个 collection, 固定住这个位置，导航视图）
  // 稍后阅读 -> Acticles
  // 笔记/备注
  // 最近收藏 （7天，30天，1年）
  // 最近更新 （7天，30天，1年）
  // 最近访问 （7天，30天，1年）
  // 当前和最近打开的 collection, 显示三个
  // Collections
  // collections/read-later/#tag1,tag2
  // 工作
  // 学习
  // 生活
  // 娱乐
  // 摸鱼
  // 工具
  // 影视
  // 隐藏赞助商/广告 !tag:sponsor
  // 已删除
  // 标签页
  // 隐藏的书签
  // hidden/#tag1,tag2
  // 常用标签
  //  - 常用
  //  - 学习
  // 文件夹
  // #~/folder1/folder2/#tag1,tag2
  // 自定义文件夹
  // 共享书签集 (访问过的自动保存，最近保存过的在最上面，支持删除)
  // collections/shared/1234567890 -> ?collection=shared/1234567890
  // collections/sahred/2345678901
  // explore/collections
  // 导航
  //   Applications
  //   Tools
  // TODO: collections, saved filters, tag hierarchy 可以在设置里调节顺序
  let navGroups = $state([
    {
      title: m.FAVORITES_TITLE(),
      icon: 'bookmark',
      items: [
        // { name: '默认', icon: 'list', href: '/#' }, // Inbox
        { name: m.ALL_BOOKMARKS(), icon: 'list', href: `${base}#` },
        // { name: '所有书签', icon: 'list', href: '/all#' },
        // { name: '存档', icon: 'list', href: '/archive#' },
        // { name: '已删除书签', icon: 'list', href: '/deleted#' },
        {
          name: m.STARRED(),
          icon: 'star',
          href: buildCollectionPath('starred'),
        },
        {
          name: m.READ_LATER(),
          icon: 'bookmark-plus',
          href: buildCollectionPath('read-later'),
        },
        { name: m.NOTES(), icon: 'note', href: `${base}?has_note#` },
        {
          name: m.RECENTLY_ADDED(),
          icon: 'clock',
          href: `?${buildTimeQuerySearchParams('', 'created', '1m').toString()}`,
        },
        {
          name: m.RECENTLY_MODIFIED(),
          icon: 'clock',
          href: `?${buildTimeQuerySearchParams('', 'updated', '1m').toString()}`,
        },
        // { name: '最近修改', icon: 'clock', href: 'updated/2m' },
        // { name: '最近修改', icon: 'clock', href: 'updated/from/2024-12' },
        // { name: '常用书签', icon: 'star' },
      ],
      open: true,
    },
    // {
    //   title: '文件夹',
    //   icon: 'folder',
    //   items: [
    //     { name: '/Comming soon', icon: 'folder' },
    //     { name: '/文件夹1', icon: 'folder' },
    //     { name: '/文件夹1/文件夹2', icon: 'folder' },
    //   ],
    //   open: false,
    // },
  ])

  $effect(() => {
    const firstNavGroup = navGroups[0]
    if (firstNavGroup) {
      // FIXME: 索引不应该写死，有忘记更新的风险
      firstNavGroup.items[4].href = `?${buildTimeQuerySearchParams(locationSearchString, 'created', '1m').toString()}`
      firstNavGroup.items[5].href = `?${buildTimeQuerySearchParams(locationSearchString, 'updated', '1m').toString()}`
    }
  })

  let navGroupOther = $state({
    title: m.MORE_COLLECTIONS_TITLE(),
    icon: 'folder',
    items: [
      {
        name: m.DELETED_BOOKMARKS(),
        icon: 'trash-2',
        href: buildCollectionPath('deleted'),
      },
      {
        name: m.NAVIGATION_SIDEBAR_HELP_DOCS(),
        icon: 'help-circle',
        href: buildCollectionPath(
          `help${isChineseLocale() ? '-zh' : ''}`,
          'public'
        ),
      },
      {
        name: m.DOWNLOAD(),
        icon: 'download',
        href: buildCollectionPath(
          `utags-downloads${isChineseLocale() ? '-zh' : ''}`,
          'public'
        ),
      },
      {
        name: m.RELEASE_NOTES(),
        icon: 'file-text',
        href: buildCollectionPath(
          `release-notes${isChineseLocale() ? '-zh' : ''}`,
          'public'
        ),
      },
    ],
    open: false,
  })

  let isCollapsed = $derived($settings.navigationSidebarCollapsed ?? false)

  /**
   * Toggle sidebar collapsed state
   */
  function toggleSidebar() {
    $settings.navigationSidebarCollapsed = !$settings.navigationSidebarCollapsed
  }
</script>

<aside
  class="navigation-sidebar z-49 h-full w-[var(--sidebar-width)] overflow-x-hidden overflow-y-auto bg-white pt-4 pr-2 pb-10 transition-all duration-200 ease-in-out select-none dark:bg-gray-900"
  class:collapsed={isCollapsed}>
  {#if !isCollapsed || true}
    <nav class="flex w-[calc(var(--sidebar-width)-11px)] flex-col gap-1">
      {#each navGroups as group, i}
        <NavigationGroup {group} />
        {#if i < navGroups.length - 1}
          <GroupSeparator />
        {/if}
      {/each}
      {#if tagHierarchyItems.length > 0}
        <GroupSeparator />
        <TagHierarchy {tagHierarchyItems} />
      {/if}
      <GroupSeparator />
      <SavedFilters />
      <GroupSeparator />
      <Collections />
      <GroupSeparator />
      <NavigationGroup group={navGroupOther} />
    </nav>
  {/if}

  <button
    class="fixed bottom-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 p-1 text-gray-600 shadow-sm transition-all hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
    onclick={toggleSidebar}>
    {#if isCollapsed}
      <PanelLeftOpen size={24} absoluteStrokeWidth={true} strokeWidth={1} />
    {:else}
      <PanelLeftClose size={24} absoluteStrokeWidth={true} strokeWidth={1} />
    {/if}
  </button>
</aside>

<style>
  .navigation-sidebar {
    /* --sidebar-width: 260px; */
    position: relative;
    order: var(--navigation-sidebar-order);
    border-right: var(--seperator-line);
    /* margin-left: -10px; */
  }

  .navigation-sidebar.collapsed {
    width: 0;
    min-width: 0;
    padding-right: 0;
  }
</style>
