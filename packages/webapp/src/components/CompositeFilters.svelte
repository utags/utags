<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import Console from 'console-tagger'
  import { $ as _$ } from 'browser-extension-utils'
  import type { BookmarkKeyValuePair } from '../types/bookmarks.js'
  import { HASH_DELIMITER } from '../config/constants.js'
  import {
    parseFilterString,
    convertToFilterString,
    parseHashFiltersToSearchParams,
  } from '../utils/url-utils.js'
  import { getTagCounts, getDomainCounts } from '../utils/bookmarks.js'
  import { filterBookmarksByUrlParams } from '../utils/filter-bookmarks.js'
  import FilterCheckbox from './FilterCheckbox.svelte'
  import * as m from '../paraglide/messages'

  interface Props {
    level: number
    input: BookmarkKeyValuePair[]
    output?: BookmarkKeyValuePair[]
    useNextLevel?: boolean
    filterString?: string
    disabled?: boolean
    paused?: boolean
    active?: boolean
    class?: string
    onfocus?: (event: FocusEvent) => void
  }

  let {
    level,
    input,
    output = $bindable(),
    useNextLevel = $bindable(false),
    filterString,
    disabled = false,
    paused = false,
    active = false,
    class: className,
    onfocus,
  }: Props = $props()

  const console = new Console({
    prefix: 'composite-filters-level' + level,
    color: {
      line: 'white',
      background: ['green', 'blue', 'purple'][level - 1],
    },
  })

  console.log(`component loaded`)

  // 筛选相关状态
  let searchKeyword = $state('')
  let selectedTags: Set<string> = $state(new Set()) as Set<string>
  let selectedDomains: Set<string> = $state(new Set()) as Set<string>
  let tagCounts = $state(new Map<string, number>())
  let domainCounts = $state(new Map<string, number>())
  let showOnlySelectedTags = $state(false)
  let showOnlySelectedDomains = $state(false)
  let multiSelectTagsMode = $state(false)
  let multiSelectDomainsMode = $state(false)
  let placeholder = $state('')

  // 添加随机placeholder数组
  const placeholders = [
    '搜索 URL/标题/标签...',
    '搜索 标题/描述/标签...',
    '搜索 标题/描述/笔记...',
    'tag: abc',
    'title: book',
    'site: example.com',
    'url: example.com/articles',
    'note: 重要',
    'description: 项目描述',
    'tag:js tag:css', // AND 条件
    'title:book -tag:read', // 排除条件
    '/^https:\\/\\/example/', // 正则表达式
    'tag:js,tag:html,tag:css', // 多标签 OR 条件
    '!tag:read', // 排除标签
    'title:book tag:read', // AND 条件
    'tag:tech site:github.com', // 混合条件
    '/.*\\d{4}.*/', // 包含4位数字
    'description: /About how/', // 精确匹配
    'tag:js !tag:read', // 组合条件
  ]

  onMount(() => {
    console.log(`onMount`)
    // 随机选择一个placeholder
    placeholder = placeholders[Math.floor(Math.random() * placeholders.length)]
    return () => {
      console.log(`onDestroy`)
    }
  })

  function scrollTagIntoView(tag: string) {
    const element = _$(
      `.composite-filters-${level} .filter-group-tags label[data-key="${tag}"]`
    )
    if (element) {
      element.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
      })
    }
  }

  function scrollDomainIntoView(domain: string) {
    const element = _$(
      `.composite-filters-${level} .filter-group-domains label[data-key="${domain}"]`
    )
    if (element) {
      element.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
      })
    }
  }

  // update url hash
  function updateUrlHash() {
    if (paused || disabled) {
      return
    }
    console.log('updateUrlHash')
    // hash sample: #tag1,tag2/domain1,domain2/keywod#tag3,tag4/domain3,domain4/keyword2#...
    const filterString = convertToFilterString(
      selectedTags,
      selectedDomains,
      searchKeyword
    )

    let newUrlHash
    if (level === 1 && filterString === '') {
      // filters are empty
      newUrlHash = '#'
      // Notes: 不能设置为 ''，历史记录前进后退时会出现问题
    } else {
      const filterStringArr = location.hash.split(HASH_DELIMITER)
      const currentFilterString = filterStringArr[level] || ''
      console.log(
        `last filter string:`,
        `[${decodeURIComponent(currentFilterString)}]`,
        '\n                            new filter string:',
        `[${decodeURIComponent(filterString)}]`
      )
      if (currentFilterString === filterString) {
        return
      }
      filterStringArr.length = level
      filterStringArr[level] = filterString

      newUrlHash = filterStringArr.join(HASH_DELIMITER).replace(/[/#]+$/, '')
    }

    if (location.hash !== newUrlHash) {
      console.log(`new url hash [${newUrlHash}]`)
      location.hash = newUrlHash
    }
  }

  // 监听 input 变化并更新 tagCounts 和 domainCounts
  $effect(() => {
    if (paused) {
      console.log(`paused:`, paused, `disabled:`, disabled)
      return
    }
    console.log(
      `init tagCounts and domainCounts - input list length:`,
      input.length
    )

    const _tagCounts = getTagCounts(input)

    const _domainCounts = getDomainCounts(input)

    // get filters from url hash
    const filter = parseFilterString(filterString || '')
    // TODO: get output at App.svelte
    const searchParams = parseHashFiltersToSearchParams(filterString || '')
    console.log(
      `init tagCounts and domainCounts - filter:`,
      JSON.stringify(
        filter
          ? {
              tags: [...filter.selectedTags],
              domains: [...filter.selectedDomains],
              searchKeyword: filter.searchKeyword,
            }
          : {}
      ),
      ' searchParams:',
      searchParams.toString()
    )
    if (filter) {
      let lastOne: string | undefined
      for (const tag of filter.selectedTags) {
        lastOne = tag

        if (!_tagCounts.get(tag)) {
          _tagCounts.set(tag, 0)
        }
      }

      setTimeout(() => {
        if (lastOne) {
          scrollTagIntoView(lastOne)
        }
      }, 5)

      for (const domain of filter.selectedDomains) {
        lastOne = domain

        if (!_domainCounts.get(domain)) {
          _domainCounts.set(domain, 0)
        }
      }

      setTimeout(() => {
        if (lastOne) {
          scrollDomainIntoView(lastOne)
        }
      }, 5)

      searchKeyword = filter.searchKeyword
      selectedTags = filter.selectedTags
      selectedDomains = filter.selectedDomains
      if (filter.selectedTags.size === 0) {
        showOnlySelectedTags = false
      } else if (filter.selectedTags.size > 1) {
        multiSelectTagsMode = true
      }
      if (filter.selectedDomains.size === 0) {
        showOnlySelectedDomains = false
      } else if (filter.selectedDomains.size > 1) {
        multiSelectDomainsMode = true
      }

      const result = filterBookmarksByUrlParams(input, searchParams)
      useNextLevel = result.length > 1 && result.length < input.length
      output = result
    } else {
      searchKeyword = ''
      selectedTags = new Set()
      selectedDomains = new Set()
      showOnlySelectedTags = false
      showOnlySelectedDomains = false

      console.log(`current filter: no filter`)
      // output = [...input]
      output = input
      useNextLevel = false
    }

    tagCounts = _tagCounts
    domainCounts = _domainCounts

    setTimeout(() => {
      // 触发书签列表组件更新
      window.dispatchEvent(
        new CustomEvent('filterOutputChange', { detail: { level: level } })
      )
    }, 1)
  })

  // 重置筛选条件
  function resetFilterWith() {
    console.log(`resetFilterWith`)
    searchKeyword = ''
    selectedTags = new Set()
    selectedDomains = new Set()

    updateUrlHash()
  }

  function toggleTag(tag: string) {
    if (multiSelectTagsMode) {
      // 多选模式
      selectedTags = selectedTags.has(tag)
        ? new Set([...selectedTags].filter((t) => t !== tag))
        : new Set([...selectedTags, tag])
    } else {
      // 单选模式
      selectedTags = selectedTags.has(tag) ? new Set() : new Set([tag])
    }
    updateUrlHash()
  }

  function toggleDomain(domain: string) {
    if (multiSelectDomainsMode) {
      selectedDomains = selectedDomains.has(domain)
        ? new Set([...selectedDomains].filter((d) => d !== domain))
        : new Set([...selectedDomains, domain])
    } else {
      selectedDomains = selectedDomains.has(domain)
        ? new Set()
        : new Set([domain])
    }
    updateUrlHash()
  }
</script>

<div
  class="composite-filters {className} composite-filters-{level} group relative flex flex-col gap-4"
  role="listbox"
  aria-label="bookmark filters"
  tabindex="0"
  onfocusin={onfocus}
  out:fade={{ duration: 200 }}
  inert={disabled}>
  {#if disabled}
    <div
      class="absolute inset-0 z-10 bg-white/50 dark:bg-gray-900/50"
      aria-hidden="true">
    </div>
  {/if}

  <div class="flex flex-col gap-2">
    <button
      class="reset-filter rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
      onclick={() => {
        resetFilterWith()
      }}>
      {m.COMPOSITE_FILTERS_RESET_BUTTON()}
      <span
        class="group-focus-within:border-blue-500 group-focus-within:text-blue-500 dark:group-focus-within:border-blue-400 dark:group-focus-within:text-blue-400"
        >#{level}</span>
    </button>
    <div class="relative w-full" style="padding-right: 1px;">
      <input
        type="text"
        {placeholder}
        spellcheck="false"
        class="w-full rounded-md border border-gray-300 bg-transparent py-1.5 pr-8 pl-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        oninput={(e) => {
          // TODO: 延迟调用
          // TODO: pushState -> replaceState
          searchKeyword = (e.currentTarget as HTMLInputElement).value.trim()
          updateUrlHash()
        }}
        value={searchKeyword} />
      {#if searchKeyword}
        <button
          class="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-gray-100 p-1 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          onclick={() => {
            searchKeyword = ''
            updateUrlHash()
          }}
          aria-label={m.COMPOSITE_FILTERS_CLEAR_SEARCH_ARIA_LABEL()}>
          <svg
            class="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1">
            <path
              fill="currentColor"
              stroke="currentColor"
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <div class="filter-controls flex h-full flex-col gap-4">
    {#if tagCounts && tagCounts.size}
      <div
        class="filter-group filter-group-tags relative flex flex-col gap-1 overflow-y-auto pr-2"
        data-showOnlySelectedTags={showOnlySelectedTags || null}>
        <h4
          class="sticky top-0 m-0 flex flex-none items-center justify-between border-b border-gray-100 bg-white py-2 text-sm font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          <span>{m.COMPOSITE_FILTERS_TAG_FILTER_TITLE()}</span>
          <div class="flex items-center gap-2">
            {#if selectedTags.size > 0}
              <button
                class="flex h-5 w-5 items-center justify-center rounded-full {showOnlySelectedTags
                  ? 'bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'
                  : 'bg-gray-500 hover:bg-gray-700 dark:hover:bg-gray-600'} transform text-xs font-medium text-white transition-colors duration-200 hover:scale-105"
                onclick={() => (showOnlySelectedTags = !showOnlySelectedTags)}>
                {selectedTags.size}
              </button>
            {/if}
            <button
              class="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              title={m.COMPOSITE_FILTERS_TOGGLE_MULTI_SELECT_TITLE()}
              onclick={() => (multiSelectTagsMode = !multiSelectTagsMode)}>
              {#if multiSelectTagsMode}
                <svg
                  class="h-4 w-4 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              {:else}
                <svg
                  class="h-4 w-4 text-gray-600 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7" />
                </svg>
              {/if}
            </button>
          </div>
        </h4>
        {#each Array.from(tagCounts).sort((a, b) => b[1] - a[1]) as [tag, count]}
          <FilterCheckbox
            value={tag}
            checked={selectedTags.has(tag)}
            {count}
            onchange={() => {
              toggleTag(tag)
            }} />
        {/each}
      </div>
    {/if}

    {#if domainCounts && domainCounts.size}
      <div
        class="filter-group filter-group-domains relative flex flex-col gap-1 overflow-y-auto pr-2"
        data-showOnlySelectedDomains={showOnlySelectedDomains || null}>
        <h4
          class="sticky top-0 m-0 flex items-center justify-between border-b border-gray-100 bg-white py-2 text-sm font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          <span>{m.COMPOSITE_FILTERS_DOMAIN_FILTER_TITLE()}</span>
          <div class="flex items-center gap-2">
            {#if selectedDomains.size > 0}
              <button
                class="flex h-5 w-5 items-center justify-center rounded-full {showOnlySelectedDomains
                  ? 'bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'
                  : 'bg-gray-500 hover:bg-gray-700 dark:hover:bg-gray-600'} transform text-xs font-medium text-white transition-colors duration-200 hover:scale-105"
                onclick={() =>
                  (showOnlySelectedDomains = !showOnlySelectedDomains)}>
                {selectedDomains.size}
              </button>
            {/if}
            <button
              class="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              title={m.COMPOSITE_FILTERS_TOGGLE_MULTI_SELECT_TITLE()}
              onclick={() =>
                (multiSelectDomainsMode = !multiSelectDomainsMode)}>
              {#if multiSelectDomainsMode}
                <svg
                  class="h-4 w-4 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              {:else}
                <svg
                  class="h-4 w-4 text-gray-600 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7" />
                </svg>
              {/if}
            </button>
          </div>
        </h4>
        {#each Array.from(domainCounts).sort((a, b) => b[1] - a[1]) as [domain, count]}
          <FilterCheckbox
            value={domain}
            checked={selectedDomains.has(domain)}
            {count}
            onchange={() => {
              toggleDomain(domain)
            }} />
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .composite-filters {
    width: var(--sidebar-width);
    min-width: var(--sidebar-width);
    border-right: var(--sidebar-border-right);
    border-left: var(--sidebar-border-left);
    padding-left: var(--sidebar-padding-left);
    padding-right: var(--sidebar-padding-right);
    scroll-snap-align: var(--sidebar-scroll-snap-align);
    padding-top: var(--sidebar-padding-top, 20px);
    padding-bottom: 20px;
    /* transition: all 0.2s ease; */
    height: calc(100vh - 92px);
  }

  /* unset 'scroll-snap-align' while call scrollIntoView to fix Firefox issue */
  :global(.onscroll) .composite-filters {
    scroll-snap-align: unset;
  }

  .composite-filters:focus-visible {
    outline: none;
  }

  .composite-filters:focus-within::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: var(--color-blue-500);
  }

  .filter-controls {
    overflow: hidden;
  }
  .filter-group {
    /* position: relative; */

    scroll-padding-top: 55px;
  }

  .filter-group-tags {
    min-height: calc(40%);
  }
  .filter-group-domains {
    min-height: calc(40%);
  }

  .filter-group-tags[data-showOnlySelectedTags]
    :global(label:not([data-checked])) {
    display: none;
  }

  .filter-group-domains[data-showOnlySelectedDomains]
    :global(label:not([data-checked])) {
    display: none;
  }

  .filter-group h4 {
    position: sticky;
    top: 0;
    padding: 8px 0;
    z-index: 1;
    margin: 0;
  }

  .reset-filter {
    align-self: var(--sidebar-reset-filter-align-self);
  }
</style>
