<script lang="ts">
  import { getContext } from 'svelte'
  import * as m from '../paraglide/messages'
  import { type BookmarkListItemProps } from '../types/bookmarks'
  import type { SharedStatus } from '../types/shared-status.js'
  import { getHostName } from '../utils/url-utils.js'
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

<div class="group bookmark-list-item relative w-full p-2 pr-5">
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
  <div class="flex flex-wrap items-center gap-2 truncate">
    <span class="flex items-center gap-2 truncate">
      <Favicon {href} classNames="h-4 w-4 flex-none" />
      <a class="title flex-none" {href} {title} target="_blank" rel="noopener">
        <span>{title}</span>
      </a>
    </span>
    <span class="tags flex flex-wrap gap-1">
      {#each tags as tag}
        <a href="#{encodeURIComponent(tag)}" class="tag"><span>{tag}</span></a>
      {/each}
    </span>
    <a class="domain" href="#/{getHostName(href)}">{getHostName(href)}</a>
  </div>
  <div class="byline mt-1 flex flex-wrap items-center gap-1 truncate">
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
  :root.dark .bookmark-list-item {
    --opacity-fg-contrast-4-5: 61%;
    --base-fg: 255 255 255;
    --bookmark-title-color: #8ab1ff;
    --bookmark-link-color: var(--color-fg-contrast-4-5);
    --color-tag-bg: #3b320d;
    --color-tag-border: #665501;
  }

  .bookmark-list-item {
    flex: 1 1 0;
    --bookmark-title-color: #1c59d1;
    --bookmark-link-color: var(--color-fg-contrast-4-5);
    --color-tag-bg: #fffcd7;
    --color-tag-border: #d5d458;
    --base-fg: 51 51 51;
    --opacity-fg-contrast-10: 84%;
    --opacity-fg-contrast-4-5: 59%;
    --color-fg-contrast-10: rgb(var(--base-fg) / var(--opacity-fg-contrast-10));
    --color-fg-contrast-4-5: rgb(
      var(--base-fg) / var(--opacity-fg-contrast-4-5)
    );
  }
  .bookmark-list-item .title {
    color: var(--bookmark-title-color);
    display: block;
    font-weight: 500;
    overflow: hidden;
    width: fit-content;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bookmark-list-item .domain {
    color: var(--color-fg-contrast-4-5);
    font-style: italic;
    font-size: 9pt;
    text-decoration: none;
    vertical-align: middle;
  }
  .bookmark-list-item .tags .tag {
    background-color: var(--color-tag-bg);
    border: 1px solid var(--color-tag-border);
    border-radius: 5px;
    color: var(--color-fg-contrast-10);
    font-size: 11px;
    padding: 0px 0.4em 0px 0.4em;
    text-decoration: none;
    white-space: nowrap;
  }
  .bookmark-list-item .byline span {
    color: var(--color-fg-contrast-4-5);
    font-size: 12px;
  }
  .bookmark-list-item .byline .actions .action::before {
    content: '|';
    margin-right: calc(var(--spacing) * 1);
  }
</style>
