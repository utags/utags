import { get } from 'svelte/store'
import { SyncManager } from '../sync/sync-manager.js'
import { initialBookmarks } from '../data/initial-bookmarks.js'
import { initialBookmarks as initialBookmarksCN } from '../data/initial-bookmarks-zh-CN.js'
import { bookmarkStorage } from '../lib/bookmark-storage.js'
import { isChineseLocale } from '../utils/i18n-utils.js'
import {
  syncConfigStore,
  discoverBrowserExtensionTargets,
  isDiscovering,
  discoveredTargets,
  promoteDiscoveredTarget,
} from './sync-config-store.js'
import { filters } from './saved-filters.js'
import { getCollections } from './collections.js'
import { settings, clearAllBookmarks } from './stores.js'

function initializeSettings() {
  console.log('initializing settings')
  const $settings = get(settings)
  console.log($settings.headerToolbarSettings)
  if (!$settings.headerToolbarSettings) {
    const headerToolbarSettings = {
      theme: false,
      sortBy: true,
      sidebarPosition: false,
      viewMode: true,
      skin: false,
      toggleNavbar: true,
      addButton: true,
    }
    settings.set({ ...$settings, headerToolbarSettings })
  }

  if ($settings.isFirstRun) {
    $settings.isFirstRun = false
    settings.set($settings)
  }
}

async function initializeBookmarks() {
  if (get(settings).isFirstRun) {
    // Initial bookmarks
    await bookmarkStorage.upsertBookmarks(
      Object.entries(isChineseLocale() ? initialBookmarksCN : initialBookmarks)
    )
  }
}

/**
 * Clear all initial bookmarks from storage
 * Extracts URLs from initialBookmarks or initialBookmarksCN and deletes them
 */
export async function clearInitialBookmarks(): Promise<void> {
  const bookmarksData = isChineseLocale()
    ? initialBookmarksCN
    : initialBookmarks
  const urls = Object.keys(bookmarksData)

  if (urls.length > 0) {
    await bookmarkStorage.deleteBookmarks(urls)
  }
}

function initializeCollections() {
  const collections = getCollections()
  const $collections = get(collections)
  if ($collections.length === 0) {
    const now = Date.now()
    const collectionsPreset = isChineseLocale()
      ? [
          {
            id: crypto.randomUUID(),
            name: '已加星标',
            pathname: 'starred',
            filterString: `t=${[
              '★',
              '★★',
              '★★★',
              '☆',
              '☆☆',
              '☆☆☆',
              'starred',
            ].join(',')}`,
            created: now,
            updated: now,
          },
          {
            id: crypto.randomUUID(),
            name: '稍后阅读',
            pathname: 'read-later',
            filterString: `t=${[
              'read-later',
              'Read Later',
              '稍后阅读',
              'toread',
            ].join(',')}`,
            created: now,
            updated: now,
          },
          {
            id: crypto.randomUUID(),
            name: '论坛社区',
            pathname: 'communities',
            filterString: `t=${['论坛', '社区'].join(',')}`,
            created: now,
            updated: now,
          },
        ]
      : [
          {
            id: crypto.randomUUID(),
            name: 'Starred',
            pathname: 'starred',
            filterString: `t=${[
              '★',
              '★★',
              '★★★',
              '☆',
              '☆☆',
              '☆☆☆',
              'starred',
            ].join(',')}`,
            created: now,
            updated: now,
          },
          {
            id: crypto.randomUUID(),
            name: 'Read Later',
            pathname: 'read-later',
            filterString: `t=${['read-later', 'Read Later', 'toread'].join(
              ','
            )}`,
            created: now,
            updated: now,
          },
          {
            id: crypto.randomUUID(),
            name: 'Communities',
            pathname: 'communities',
            filterString: `t=${['Forum', 'Community'].join(',')}`,
            created: now,
            updated: now,
          },
        ]

    for (const preset of collectionsPreset) {
      $collections.push(preset)
    }

    collections.set($collections)
  }
}

function initializeFilters() {
  const $filters = get(filters)
  if ($filters.length === 0) {
    const now = Date.now()
    const filtersPreset = isChineseLocale()
      ? [
          {
            id: crypto.randomUUID(),
            name: '常用网站',
            description: '常用网站',
            filterString: `#${encodeURIComponent('常用, Popular')}`,
            created: now,
            updated: now,
          },
          {
            id: crypto.randomUUID(),
            name: 'Tools',
            description: '好用的工具',
            filterString: `#${encodeURIComponent('工具,Tools')}`,
            created: now,
            updated: now,
          },
          {
            id: crypto.randomUUID(),
            name: '浏览器扩展',
            description: '好用的浏览器扩展',
            filterString: `#${encodeURIComponent('浏览器扩展')}`,
            created: now,
            updated: now,
          },
        ]
      : [
          {
            id: crypto.randomUUID(),
            name: 'Popular',
            description: 'Popular websites',
            filterString: `#${encodeURIComponent('常用, Popular')}`,
            created: now,
            updated: now,
          },
          {
            id: crypto.randomUUID(),
            name: 'Tools',
            description: 'Useful tools',
            filterString: '#Tools',
            created: now,
            updated: now,
          },
          {
            id: crypto.randomUUID(),
            name: 'Browser Extensions',
            description: 'Useful browser extensions',
            filterString: `#${encodeURIComponent('Browser Extension')}`,
            created: now,
            updated: now,
          },
        ]

    for (const preset of filtersPreset) {
      $filters.push(preset)
    }

    filters.set($filters)
  }
}

async function initializeSyncSettings(): Promise<boolean> {
  const syncServices = get(syncConfigStore).syncServices
  if (syncServices && syncServices.length > 0) {
    return false
  }

  await discoverBrowserExtensionTargets()
  const targets = get(discoveredTargets)
  console.log(targets)
  if (targets && targets.length > 0) {
    promoteDiscoveredTarget(targets[0].id)

    // Get updated sync services
    const syncServices = get(syncConfigStore).syncServices
    if (syncServices && syncServices.length === 1) {
      // Clear sample data
      await clearInitialBookmarks()

      const syncManager = new SyncManager()
      await syncManager.synchronize(syncServices[0].id)
    }

    return true
  }

  return false
}

export default async function initializeStores() {
  const $settings = get(settings)

  await initializeBookmarks()

  // only run once
  if ($settings.isFirstRun) {
    initializeCollections()
    initializeFilters()
  }

  // run every time when loading stores
  initializeSettings()

  if (!$settings.autoDiscoveredBrowserExtensionTargets) {
    setTimeout(async () => {
      const result = await initializeSyncSettings()
      if (result) {
        $settings.autoDiscoveredBrowserExtensionTargets = true
        settings.set($settings)
      }
    })
  }
}
