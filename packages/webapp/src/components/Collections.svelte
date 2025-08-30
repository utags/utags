<script lang="ts">
  import { getContext, onMount } from 'svelte'
  import {
    Bookmark,
    Tag,
    List,
    Clock,
    Star,
    Globe,
    Folder,
  } from 'lucide-svelte'
  import type { SharedStatus } from '../types/shared-status.js'
  import ExpandableContainer from './ui/ExpandableContainer.svelte'
  import Modal from './Modal.svelte'
  import InputField from './ui/InputField.svelte'
  import BaseInputField from './ui/BaseInputField.svelte'
  import ExpandIcon from './ui/ExpandIcon.svelte'
  import { buildCollectionPath } from '../utils/url-utils.js'
  import {
    getCollections,
    deleteCollection,
    saveCollection,
  } from '../stores/collections.js'
  import { spaNavigateAttachment as spaNavigate } from '../actions/spa-navigate-attachment.js'
  import * as m from '../paraglide/messages'

  let collections = getCollections()
  let showModal = $state(false)
  let isEditing = $state(false)
  let validationError = $state(false)
  let collectionName = $state('')
  let pathname = $state('')
  let currentCollectionId: string | undefined = $state(undefined)
  let activeMenuId: string | undefined = $state(undefined)
  // Shared status from context
  const sharedStatus = $state(getContext('sharedStatus') as SharedStatus)
  const isViewingDeleted = $derived(sharedStatus.isViewingDeleted)
  const isViewingSharedCollection = $derived(
    sharedStatus.isViewingSharedCollection
  )

  onMount(() => {
    window.addEventListener('clickShowSaveCollectionModal', showAddModal)
    return () => {
      window.removeEventListener('clickShowSaveCollectionModal', showAddModal)
    }
  })

  $effect(() => {
    if (activeMenuId) {
      const handler = (e: Event) => {
        const menu = document.querySelector(`[data-menu-id='${activeMenuId}']`)
        if (!menu?.contains(e.target as Node)) {
          activeMenuId = undefined
        }
      }
      document.addEventListener('click', handler)
      return () => document.removeEventListener('click', handler)
    }
  })

  function saveHandler() {
    validationError = false
    try {
      saveCollection({
        id: currentCollectionId,
        name: collectionName,
        pathname: pathname,
      })

      collectionName = ''
      pathname = ''
      showModal = false
      currentCollectionId = undefined
      isEditing = false
    } catch (error) {
      console.error(error)
      validationError = true
    }
  }

  function showAddModal() {
    showModal = false
    setTimeout(() => {
      collectionName = ''
      pathname = ''
      showModal = true
      isEditing = false
      validationError = false
      currentCollectionId = undefined
    })
  }

  let subMenuExpand = $state(true)

  function toggleSubMenu() {
    subMenuExpand = !subMenuExpand
  }
</script>

<div class="collections group">
  <div
    class="group-title"
    onclick={() => toggleSubMenu()}
    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleSubMenu()}
    role="button"
    tabindex="0">
    <span class="flex-1 text-left font-semibold">{m.COLLECTIONS_TITLE()}</span>
    {#if !isViewingDeleted && !isViewingSharedCollection}
      <div class="group-title-button relative flex-none">
        <button
          class="absolute top-1/2 right-0 flex -translate-y-1/2 items-center justify-center rounded-lg p-1.5 text-indigo-600
                 transition-colors hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-gray-700"
          aria-label={m.COLLECTIONS_CREATE_ARIA_LABEL()}
          onclick={(e) => {
            e.stopPropagation()
            showAddModal()
          }}>
          <svg
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    {/if}
    <div class="group-title-button {subMenuExpand ? '' : 'opacity-100'}">
      <ExpandIcon expanded={subMenuExpand} />
    </div>
  </div>

  <ExpandableContainer expanded={subMenuExpand}>
    <ul class="space-y-1">
      {#each $collections as collection}
        <li class="group pr-2">
          <div class="ml-3 flex items-center justify-between">
            <a
              href={buildCollectionPath(collection.pathname)}
              {@attach spaNavigate}
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
              <span class="h-4 w-4">
                <Folder size={16} />
              </span>
              <span class="flex-1 truncate text-left">{collection.name}</span>
            </a>

            <div class="relative flex items-center gap-1">
              <button
                class="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                onclick={(e) => {
                  e.stopPropagation()
                  activeMenuId =
                    activeMenuId === collection.id ? undefined : collection.id
                }}
                aria-label={m.COLLECTIONS_MORE_ACTIONS_ARIA_LABEL()}>
                <svg
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 5v.01M12 12v.01M12 19v.01" />
                </svg>
              </button>
              {#if activeMenuId === collection.id}
                <div
                  data-menu-id={collection.id}
                  class="absolute top-full right-0 z-50 w-32 origin-top-right rounded-md border border-gray-200 bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                  onclick={(event) => {
                    event.stopPropagation()
                  }}>
                  <div class="py-1">
                    <button
                      onclick={() => {
                        activeMenuId = undefined
                        showModal = false
                        collectionName = collection.name
                        pathname = collection.pathname
                        currentCollectionId = collection.id
                        isEditing = true
                        setTimeout(() => (showModal = true))
                      }}
                      class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                      {m.EDIT_BUTTON_TEXT()}
                    </button>
                    <button
                      onclick={() => {
                        if (confirm(m.COLLECTIONS_DELETE_CONFIRM_MESSAGE())) {
                          deleteCollection(collection.id)
                        }
                      }}
                      class="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-700">
                      {m.DELETE_BUTTON_TEXT()}
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        </li>
      {/each}
    </ul>
  </ExpandableContainer>
</div>

<Modal
  title={isEditing
    ? m.COLLECTIONS_EDIT_MODAL_TITLE()
    : m.COLLECTIONS_CREATE_MODAL_TITLE()}
  isOpen={showModal}
  onOpen={() => {
    document.getElementById('collection-name')?.focus()
  }}
  onClose={() => (showModal = false)}
  onInputEnter={saveHandler}
  onConfirm={saveHandler}
  disableConfirm={!collectionName}
  confirmText={m.SAVE_BUTTON_TEXT()}>
  {#if !isEditing}
    <div class="mb-4 text-sm text-gray-500 dark:text-gray-400">
      {m.COLLECTIONS_SAVE_MODAL_DESCRIPTION()}
    </div>
  {/if}
  <InputField
    id="collection-name"
    bind:value={collectionName}
    placeholder={m.COLLECTIONS_NAME_PLACEHOLDER()}
    error={validationError ? m.COLLECTIONS_NAME_VALIDATION_ERROR() : ''}
    onInput={() => (validationError = false)}>
    {m.COLLECTIONS_NAME_LABEL()}
  </InputField>
  <BaseInputField
    id="collection-pathname"
    bind:value={pathname}
    placeholder={m.COLLECTIONS_PATH_PLACEHOLDER()}>
    {m.COLLECTIONS_PATH_LABEL()}
  </BaseInputField>
</Modal>

<style>
  /* .saved-filters {
    width: var(--sidebar-width);
    min-width: var(--sidebar-width);
    border-right: var(--sidebar-border-right);
    border-left: var(--sidebar-border-left);
    padding-left: var(--sidebar-padding-left);
    padding-right: var(--sidebar-padding-right);
    overflow: hidden;
    scroll-snap-align: var(--sidebar-scroll-snap-align);
    padding-top: var(--sidebar-padding-top, 20px);
  } */

  /* .saved-filters {
    padding: 0.5rem 0;
  } */
</style>
