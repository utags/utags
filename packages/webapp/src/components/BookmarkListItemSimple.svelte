<script lang="ts">
  import { getContext } from 'svelte'
  import * as m from '../paraglide/messages'
  import { type BookmarkListItemProps } from '../types/bookmarks'
  import type { SharedStatus } from '../types/shared-status.js'
  import Favicon from './Favicon.svelte'
  import {
    handleBookmarkEdit,
    handleBookmarkDelete,
    handleAISummary,
  } from '../utils/bookmark-actions'
  import BookmarkHoverCardToggleButton from './BookmarkHoverCardToggleButton.svelte'

  let {
    href,
    tags,
    title,
    description,
    note,
    formatedUpdated,
    dateTitleText,
  }: BookmarkListItemProps = $props()

  // Shared status from context
  const sharedStatus = $state(getContext('sharedStatus') as SharedStatus)
  const isViewingDeleted = $derived(sharedStatus.isViewingDeleted)
  const isViewingSharedCollection = $derived(
    sharedStatus.isViewingSharedCollection
  )
</script>

<div class="list-simple group relative w-full p-2 pr-5">
  <div class="absolute top-2 right-0">
    <BookmarkHoverCardToggleButton
      buttonSize={16}
      {href}
      {title}
      {description}
      {note}
      {tags}
      {dateTitleText} />
  </div>

  <div class="title flex items-center gap-2 truncate">
    <Favicon {href} classNames="h-4 w-4 flex-none" />
    <a {href} {title} target="_blank" rel="noopener">
      <span>{title}</span>
    </a>
  </div>
  <div class="url-path mt-1 truncate text-xs">
    <a {href} target="_blank" rel="noopener"><span>{href}</span></a>
  </div>
  <div class="description mt-1 flex flex-wrap items-baseline gap-1 truncate">
    <span class="tags flex flex-wrap gap-1">
      {#each tags as tag}
        <a href="#{encodeURIComponent(tag)}" class="tag"><span>{tag}</span></a>
      {/each}
    </span>
    <span class="datetime" title={dateTitleText}>{formatedUpdated}</span>
    {#if !isViewingDeleted && !isViewingSharedCollection}
      <span class="actions lowercase">
        <a
          href="#action=edit"
          class="action"
          onclick={(e) => {
            e.preventDefault()
            handleBookmarkEdit(href)
          }}>{m.EDIT_BUTTON_TEXT()}</a>
        <a
          href="#action=delete"
          class="action lowercase"
          onclick={(e) => {
            e.preventDefault()
            handleBookmarkDelete(href)
          }}>{m.DELETE_BUTTON_TEXT()}</a>
        <!-- <a
        href="#action=summarize"
        class="action"
        onclick={(e) => {
          e.preventDefault()
          handleAISummary(href)
        }}>summarize</a> -->
      </span>
    {/if}
  </div>
</div>

<style>
  .list-simple {
    --bookmark-title-color: #4644d5;
    --secondary-link-color: #4240d4cc;
    --alternative-color: #048f8d;
    --bookmark-actions-color: #6b7280;
    --bookmark-actions-hover-color: #374151;
  }
  :root.dark .list-simple {
    --bookmark-title-color: #adabf7;
    --secondary-link-color: #adabf7cc;
    --alternative-color: #5ec9c8;
    --bookmark-actions-color: #9ca3af;
    --bookmark-actions-hover-color: #d1d5db;
  }
  .list-simple {
    flex: 1 1 0;
  }
  .list-simple .title {
    position: relative;
  }
  .list-simple .title a {
    color: var(--bookmark-title-color);
    display: block;
    font-size: 14px;
    font-weight: 500;
    overflow: hidden;
    width: fit-content;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .list-simple .url-path {
    color: var(--secondary-link-color);
  }
  .list-simple .tags .tag {
    color: var(--alternative-color);
    font-size: 14px;
  }

  .list-simple .title a:hover,
  .list-simple .url-path a:hover,
  .list-simple .tags .tag:hover {
    text-decoration: underline;
  }
  .list-simple .tag::before {
    content: '#';
  }
  .list-simple .datetime,
  .list-simple .actions,
  .list-simple .action {
    color: var(--bookmark-actions-color);
    font-size: 13px;
  }
  .list-simple .action:hover {
    color: var(--bookmark-actions-hover-color);
  }
  .list-simple .description .datetime::before,
  .list-simple .description .action::before {
    content: '|';
    margin-right: calc(var(--spacing) * 1);
  }
</style>
