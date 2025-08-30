<script lang="ts">
  import * as m from '../paraglide/messages'
  import type { BookmarkKeyValuePair } from '../types/bookmarks'
  import { formatDatetime } from '../utils'
  import BookmarkListItemList from './BookmarkListItemList.svelte'
  import BookmarkListItemCompact from './BookmarkListItemCompact.svelte'
  import BookmarkListItemCompact2 from './BookmarkListItemCompact2.svelte'
  import BookmarkListItemSimple from './BookmarkListItemSimple.svelte'
  import BookmarkListItemSimple2 from './BookmarkListItemSimple2.svelte'
  import BookmarkListItemSimple3 from './BookmarkListItemSimple3.svelte'
  import BookmarkListItemSimple4 from './BookmarkListItemSimple4.svelte'

  let {
    index,
    item,
    viewMode,
    selectionMode,
    selected,
  }: {
    index: number
    item: BookmarkKeyValuePair
    viewMode: string
    selectionMode: boolean
    selected: boolean
  } = $props()

  const href = $derived(item[0])
  const tags = $derived(item[1].tags)
  const meta = $derived(item[1].meta)
  // TODO: 用户设置，显示‘无标题’ 还是 显示 url 地址，或其他自定义内容
  const title = $derived(meta.title || m.BOOKMARK_ITEM_UNTITLED())
  const description = $derived(meta.description)
  const note = $derived(meta.note)
  const created = $derived(meta.created)
  const updated = $derived(meta.updated)
  const formatedCreated = $derived(formatDatetime(created))
  const formatedUpdated = $derived(formatDatetime(updated))
  const dateTitleText = $derived(
    m.BOOKMARK_ITEM_DATETIME_TOOLTIP({
      updatedTime: formatDatetime(updated, true),
      createdTime: formatDatetime(created, true),
    })
  )
</script>

<div
  data-url={href}
  data-index={index}
  class="bookmark-item-wrapper relative"
  class:cursor-pointer={selectionMode}
  class:select-none={selectionMode}
  class:selected={selectionMode && selected}>
  {#if selectionMode}
    <div class="absolute inset-0 z-2"></div>
    <div class="selection-checkbox mr-2">
      <input
        type="checkbox"
        class="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
        checked={selected} />
    </div>
  {/if}
  {#if viewMode === 'compact'}
    <BookmarkListItemCompact
      {href}
      {tags}
      {title}
      {description}
      {note}
      {formatedUpdated}
      {dateTitleText} />
  {:else if viewMode === 'compact2'}
    <BookmarkListItemCompact2
      {href}
      {tags}
      {title}
      {description}
      {note}
      {formatedUpdated}
      {dateTitleText} />
  {:else if viewMode === 'simple'}
    <BookmarkListItemSimple
      {href}
      {tags}
      {title}
      {description}
      {note}
      {formatedUpdated}
      {dateTitleText} />
  {:else if viewMode === 'simple2'}
    <BookmarkListItemSimple2
      {href}
      {tags}
      {title}
      {description}
      {note}
      {formatedUpdated}
      {dateTitleText} />
  {:else if viewMode === 'simple3'}
    <BookmarkListItemSimple3
      {href}
      {tags}
      {title}
      {description}
      {note}
      {formatedUpdated}
      {dateTitleText} />
  {:else if viewMode === 'simple4'}
    <BookmarkListItemSimple4
      {href}
      {tags}
      {title}
      {description}
      {note}
      {formatedUpdated}
      {dateTitleText} />
  {:else}
    <BookmarkListItemList
      {href}
      {tags}
      {title}
      {description}
      {note}
      {created}
      {updated}
      {formatedCreated}
      {formatedUpdated}
      {dateTitleText} />
  {/if}
</div>

<style>
  .bookmark-item-wrapper {
    display: flex;
    align-items: center;
    padding: 0 0.75rem;
  }
  .bookmark-item-wrapper.select-none {
    padding: 0.25rem 0.5rem;
    border-bottom: 1px solid var(--seperator-line-color);
  }

  .bookmark-item-wrapper.select-none:hover {
    background-color: rgba(79, 70, 229, 0.1);
    opacity: 0.8;
  }
  .bookmark-item-wrapper.selected {
    background-color: rgba(79, 70, 229, 0.1);
  }

  .bookmark-item-wrapper > :global(.group) {
    flex: 1;
  }

  .selection-checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cursor-pointer {
    cursor: pointer;
  }
</style>
