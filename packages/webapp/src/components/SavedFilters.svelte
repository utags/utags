<script lang="ts">
  import { onMount } from 'svelte'
  import {
    Bookmark,
    Tag,
    List,
    Clock,
    Star,
    Globe,
    Folder,
  } from 'lucide-svelte'
  import ExpandableContainer from './ui/ExpandableContainer.svelte'
  import Modal from './Modal.svelte'
  import InputField from './ui/InputField.svelte'
  import BaseInputField from './ui/BaseInputField.svelte'
  import ExpandIcon from './ui/ExpandIcon.svelte'
  import {
    HASH_DELIMITER,
    FILTER_DELIMITER,
    OR_CONDITION_DELIMITER,
  } from '../config/constants.js'
  import { filters } from '../stores/saved-filters.js'
  import * as m from '../paraglide/messages'

  let showModal = $state(false)
  let isEditing = $state(false)
  let validationError = $state(false)
  let filterName = $state('')
  let description: string = $state('')
  let currentFilterId: string | undefined = $state(undefined)
  let activeMenuId: string | undefined = $state(undefined)

  onMount(() => {
    window.addEventListener('clickShowSaveFilterModal', showAddModal)
    return () => {
      window.removeEventListener('clickShowSaveFilterModal', showAddModal)
    }
  })

  $effect(() => {
    if (showModal) {
      description = isEditing ? description : getSubtitle()
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

  function getSubtitle() {
    const filterString = location.hash
    const filterParts = filterString.split(HASH_DELIMITER)
    return filterParts
      .flatMap((part) => part.split(FILTER_DELIMITER))
      .map((part) => decodeURIComponent(part))
      .flatMap((part) => part.split(OR_CONDITION_DELIMITER))
      .filter(Boolean)
      .join(', ')
  }

  function saveFilter() {
    filterName = filterName ? filterName.trim() : ''
    if (!filterName) {
      validationError = true
      return
    }

    const now = Date.now()

    if (isEditing && currentFilterId) {
      $filters = $filters.map((f) =>
        f.id === currentFilterId
          ? {
              ...f,
              name: filterName,
              description,
              updated: now,
            }
          : f
      )
    } else {
      $filters = [
        {
          id: crypto.randomUUID(),
          name: filterName,
          description: description || getSubtitle(),
          filterString: location.hash,
          created: now,
          updated: now,
        },
        ...$filters,
      ]
    }

    filterName = ''
    showModal = false
    currentFilterId = undefined
    isEditing = false
  }

  function applyFilter(filterString: string) {
    location.hash = filterString || '#'
    const event = new CustomEvent('applyFilter', {
      detail: filterString,
    })
    window.dispatchEvent(event)
  }

  function deleteFilter(id: string) {
    $filters = $filters.filter((f) => f.id !== id)
  }

  const showAddModal = () => {
    showModal = false
    setTimeout(() => {
      filterName = ''
      description = ''
      showModal = true
      isEditing = false
      currentFilterId = undefined
    })
  }

  let subMenuExpand = $state(true)

  function toggleSubMenu() {
    subMenuExpand = !subMenuExpand
  }
</script>

<div class="saved-filters group">
  <div
    class="group-title"
    onclick={() => toggleSubMenu()}
    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleSubMenu()}
    role="button"
    tabindex="0">
    <span class="flex-1 text-left font-semibold"
      >{m.SAVED_FILTERS_TITLE()}</span>
    <div class="group-title-button relative flex-none">
      <button
        class="absolute top-1/2 right-0 flex -translate-y-1/2 items-center justify-center rounded-lg p-1.5 text-indigo-600
                 transition-colors hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-gray-700"
        aria-label={m.SAVED_FILTERS_CREATE_ARIA_LABEL()}
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
    <div class="group-title-button {subMenuExpand ? '' : 'opacity-100'}">
      <ExpandIcon expanded={subMenuExpand} />
    </div>
  </div>

  <ExpandableContainer expanded={subMenuExpand}>
    <ul class="space-y-1">
      {#each $filters as filter}
        <li class="group pr-2">
          <div class="ml-3 flex items-center justify-between">
            <button
              onclick={() => applyFilter(filter.filterString)}
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
              <span class="h-4 w-4">
                <Folder size={16} />
              </span>
              <span class="flex-1 truncate text-left">{filter.name}</span>
            </button>

            <div class="relative flex items-center gap-1">
              <button
                class="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                onclick={(e) => {
                  e.stopPropagation()
                  activeMenuId =
                    activeMenuId === filter.id ? undefined : filter.id
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
              {#if activeMenuId === filter.id}
                <div
                  data-menu-id={filter.id}
                  class="absolute top-full right-0 z-50 w-32 origin-top-right rounded-md border border-gray-200 bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                  onclick={(event) => {
                    event.stopPropagation()
                  }}>
                  <div class="py-1">
                    <button
                      onclick={() => {
                        activeMenuId = undefined
                        showModal = false
                        filterName = filter.name
                        description = filter.description
                        currentFilterId = filter.id
                        isEditing = true
                        setTimeout(() => (showModal = true))
                      }}
                      class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                      {m.EDIT_BUTTON_TEXT()}
                    </button>
                    <button
                      onclick={() => {
                        if (confirm(m.SAVED_FILTERS_DELETE_CONFIRM_MESSAGE())) {
                          deleteFilter(filter.id)
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

          {#if filter.description}
            <div
              class="mt-1 ml-9 truncate text-xs text-gray-400 dark:text-gray-400">
              {filter.description}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  </ExpandableContainer>
</div>

<Modal
  title={isEditing
    ? m.SAVED_FILTERS_EDIT_MODAL_TITLE()
    : m.SAVED_FILTERS_CREATE_MODAL_TITLE()}
  isOpen={showModal}
  onOpen={() => {
    document.getElementById('filter-name')?.focus()
  }}
  onClose={() => (showModal = false)}
  onInputEnter={saveFilter}
  onConfirm={saveFilter}
  disableConfirm={!filterName}
  confirmText={m.SAVE_BUTTON_TEXT()}>
  <InputField
    id="filter-name"
    bind:value={filterName}
    placeholder={m.SAVED_FILTERS_NAME_PLACEHOLDER()}
    error={validationError ? m.SAVED_FILTERS_NAME_VALIDATION_ERROR() : ''}
    onInput={() => (validationError = false)}>
    {m.SAVED_FILTERS_NAME_LABEL()}
  </InputField>
  <BaseInputField
    id="filter-description"
    bind:value={description}
    placeholder={m.SAVED_FILTERS_DESCRIPTION_PLACEHOLDER()}>
    {m.FIELD_DESCRIPTION()}{m.ZZ_P_COLON()}
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
