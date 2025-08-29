<script lang="ts">
  import Modal from '../Modal.svelte'
  import {
    syncConfigStore,
    removeSyncService,
    setActiveSyncService,
    discoverBrowserExtensionTargets,
    isDiscovering,
    discoveredTargets,
    promoteDiscoveredTarget,
  } from '../../stores/sync-config-store.js'
  import SyncServiceForm from './SyncServiceForm.svelte'
  import { SyncManager } from '../../sync/sync-manager.js'
  import type { SyncServiceConfig } from '../../sync/types.js'
  import { Pen, Trash2, RefreshCw, CheckCircle, Plus } from 'lucide-svelte'
  import ConfirmModal from '../ConfirmModal.svelte'

  let { showSyncSettings = $bindable() } = $props<{
    showSyncSettings: boolean
  }>()
  let showSyncServiceForm = $state(false)
  let editingService = $state<SyncServiceConfig | null>(null)
  let showConfirmModal = $state(false)
  let serviceToDelete = $state<string | null>(null)
  let syncingServices = $state<Set<string>>(new Set())

  const syncManager = new SyncManager()

  function handleAdd() {
    editingService = null
    showSyncServiceForm = true
  }

  function handleEdit(service: SyncServiceConfig) {
    editingService = service
    showSyncServiceForm = true
  }

  function handleDelete(serviceId: string) {
    serviceToDelete = serviceId
    showConfirmModal = true
  }

  function confirmDelete() {
    if (serviceToDelete) {
      removeSyncService(serviceToDelete)
    }
    showConfirmModal = false
    serviceToDelete = null
  }

  async function handleSyncNow(serviceId: string) {
    syncingServices.add(serviceId)
    syncingServices = new Set(syncingServices) // Trigger reactivity
    try {
      await syncManager.synchronize(serviceId)
    } finally {
      syncingServices.delete(serviceId)
      syncingServices = new Set(syncingServices) // Trigger reactivity
    }
  }

  /**
   * Format timestamp to readable date string
   * @param timestamp - Unix timestamp in milliseconds
   * @param serviceType - Type of sync service for precision control
   * @returns Formatted date string or appropriate message
   */
  function formatLastSyncTime(
    timestamp?: number,
    serviceType?: string
  ): string {
    if (!timestamp) {
      return 'Never synced'
    }

    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    // For browserExtension, show seconds precision due to 1-minute sync cycle
    if (serviceType === 'browserExtension') {
      if (diffSeconds < 10) {
        return 'Just now'
      } else if (diffSeconds < 60) {
        return `${diffSeconds} second${diffSeconds === 1 ? '' : 's'} ago`
      } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
      } else {
        return date.toLocaleDateString()
      }
    }

    // For other service types, use minute precision
    if (diffMinutes < 1) {
      return 'Just now'
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  function handleSetAsActive(serviceId: string) {
    setActiveSyncService(serviceId)
  }
</script>

<Modal
  bind:isOpen={showSyncSettings}
  showConfirm={false}
  cancelText="Close"
  title="Sync Settings">
  <div class="flex flex-col gap-6 p-2">
    <div class="flex justify-end gap-3">
      <button
        class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-offset-gray-900"
        onclick={() => discoverBrowserExtensionTargets()}
        disabled={$isDiscovering}>
        <RefreshCw size={18} class={$isDiscovering ? 'animate-spin' : ''} />
        <span>Discover Targets</span>
      </button>
      <button
        class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-offset-gray-900"
        onclick={() => handleAdd()}>
        <Plus size={18} />
        <span>Add Service</span>
      </button>
    </div>
    <ul class="space-y-3">
      {#each $syncConfigStore.syncServices as service (service.id)}
        <li
          class="group rounded-xl border border-blue-400 bg-white p-4 shadow-sm transition-all duration-200 hover:border-blue-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500">
          <div class="flex items-center gap-4">
            <div
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              {#if $syncConfigStore.activeSyncServiceId === service.id && false}
                <CheckCircle class="text-green-500" size={22} />
              {:else}
                <RefreshCw
                  size={20}
                  class={syncingServices.has(service.id)
                    ? 'animate-spin'
                    : ''} />
              {/if}
            </div>
            <div class="flex-1">
              <p class="font-semibold text-gray-900 dark:text-gray-50">
                {service.name}
              </p>
              <div
                class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{service.type}</span>
                <span class="text-xs">•</span>
                <span
                  class:text-green-600={service.enabled}
                  class:dark:text-green-400={service.enabled}
                  class:text-red-600={!service.enabled}
                  class:dark:text-red-400={!service.enabled}
                  >{service.enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div class="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Last sync: {formatLastSyncTime(
                  service.lastSyncTimestamp,
                  service.type
                )}
              </div>
            </div>
          </div>
          <div
            class="mt-3 flex items-center justify-end gap-1 border-t border-gray-200 pt-3 transition-opacity group-hover:opacity-100 md:opacity-0 dark:border-gray-600">
            <button
              class="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
              onclick={() => handleEdit(service)}
              title="Edit">
              <Pen size={16} />
            </button>
            <button
              class="rounded-full p-2 text-red-500 transition-colors hover:bg-red-100 dark:hover:bg-red-900/50"
              onclick={() => handleDelete(service.id)}
              title="Delete">
              <Trash2 size={16} />
            </button>
            <button
              class="rounded-full p-2 text-blue-500 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/50"
              onclick={() => handleSyncNow(service.id)}
              title="Sync Now"
              disabled={syncingServices.has(service.id)}>
              <RefreshCw
                size={16}
                class={syncingServices.has(service.id) ? 'animate-spin' : ''} />
            </button>
            {#if $syncConfigStore.activeSyncServiceId !== service.id && false}
              <button
                class="ml-2 rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 dark:bg-green-800/50 dark:text-green-300 dark:hover:bg-green-700"
                onclick={() => handleSetAsActive(service.id)}
                >Set Active</button>
            {/if}
          </div>
        </li>
      {/each}
      {#each $discoveredTargets as service (service.id)}
        <li
          class="group flex items-center justify-between rounded-xl border border-dashed bg-white p-4 shadow-sm transition-all duration-200 hover:border-blue-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500">
          <div class="flex items-center gap-4">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              <RefreshCw size={20} />
            </div>
            <div>
              <p class="font-semibold text-gray-900 dark:text-gray-50">
                {service.name}
              </p>
              <div
                class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{service.type}</span>
              </div>
            </div>
          </div>
          <div
            class="flex items-center gap-1 transition-opacity group-hover:opacity-100 md:opacity-0">
            <button
              class="rounded-full p-2 text-blue-500 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/50"
              onclick={() => promoteDiscoveredTarget(service.id)}
              title="Add">
              <Plus size={16} />
            </button>
          </div>
        </li>
      {/each}
    </ul>
  </div>

  {#if showSyncServiceForm}
    <SyncServiceForm
      bind:showForm={showSyncServiceForm}
      service={editingService} />
  {/if}

  <ConfirmModal
    bind:isOpen={showConfirmModal}
    title="Delete Sync Service"
    message="Are you sure you want to delete this sync service? This action cannot be undone."
    confirmText="Delete"
    onConfirm={confirmDelete} />
</Modal>
