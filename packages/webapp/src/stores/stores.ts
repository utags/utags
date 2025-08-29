import { get } from 'svelte/store'
import { persisted, type Persisted } from 'svelte-persisted-store'
import Console from 'console-tagger'
import { addEventListener } from 'browser-extension-utils'
import {
  STORAGE_KEY_BOOKMARKS,
  STORAGE_KEY_SETTINGS,
} from '../config/constants.js'
import {
  type BookmarksStore,
  type BookmarksData,
  type BookmarkTagsAndMetadata,
} from '../types/bookmarks.js'
import { bookmarkStorage } from '../lib/bookmark-storage.js'
import { sortBookmarks } from '../utils/sort-bookmarks.js'
import { normalizeBookmarkData } from '../utils/normalize-bookmark-data.js'
import { getHostName } from '../utils/url-utils.js'
import { calculateBookmarkStatsFromData } from '../utils/bookmark-stats.js'
import { convertDate, isValidDate } from '../utils/date.js'
import { prettyPrintJson } from '../utils/pretty-print-json.js'
import {
  type MergeMetaStrategy,
  type MergeTagsStrategy,
} from '../config/merge-options.js'

const console = new Console({
  prefix: 'stores',
  color: { line: 'white', background: 'black' },
})

// TODO: put into initialize method
export const settings = persisted(STORAGE_KEY_SETTINGS, {
  theme: 'system',
  sortBy: 'updatedDesc',
  sidebarPosition: 'left',
  navigationSidebarCollapsed: false,
  viewMode: 'compact',
  skin: 'skin1',
  isFirstRun: true,
  autoDiscoveredBrowserExtensionTargets: false,
  alwaysShowAdvancedFields: false,
  maxDeletedBookmarks: 10_000,
  headerToolbarSettings: {
    theme: false,
    sortBy: true,
    sidebarPosition: false,
    viewMode: true,
    skin: false,
    toggleNavbar: true,
    addButton: true,
  },
})

let isBookmarksDataReady = false

export function checkBookmarksDataReady() {
  if (!isBookmarksDataReady) {
    // eslint-disable-next-line no-alert
    alert('Bookmarks data is not ready yet.')
    throw new Error('Bookmarks data is not ready yet.')
  }
}

// 初始化书签存储
// eslint-disable-next-line import/no-mutable-exports
export let bookmarks: Persisted<BookmarksStore> = persisted(
  'temporary_bookmarks',
  {
    data: {},
    meta: {
      databaseVersion: 3,
      created: Date.now(),
    },
  },
  {
    storage: 'session',
    syncTabs: false,
  }
)

function initializeBookmarks() {
  console.log('initalizing bookmarks')
  bookmarks = persisted(STORAGE_KEY_BOOKMARKS, {
    data: {},
    meta: {
      databaseVersion: 3,
      created: Date.now(),
    },
  })

  const event = new CustomEvent('bookmarksInitialized')
  globalThis.dispatchEvent(event)
  isBookmarksDataReady = true
}

// 延迟初始化，避免阻塞主线程
setTimeout(initializeBookmarks, 1000)

// when update in BookmarkStorage.ts
addEventListener(globalThis, 'updateBookmarksStore', async () => {
  const bookmarksRaw = await bookmarkStorage.getBookmarksStore()
  if (isBookmarksDataReady) {
    // 触发响应式更新
    bookmarks.set(bookmarksRaw)
  }
})

export function exportData(bookmarksData?: BookmarksData) {
  checkBookmarksDataReady()

  const now = new Date()
  let bookmarksStore = get(bookmarks)
  if (bookmarksData) {
    const stats = calculateBookmarkStatsFromData(bookmarksData)
    bookmarksStore = {
      data: bookmarksData,
      meta: {
        ...bookmarksStore.meta,
        exported: now.getTime(),
        stats,
      },
    }
  } else {
    const sortedData = Object.fromEntries(
      sortBookmarks(Object.entries(bookmarksStore.data), 'createdDesc')
    )
    const stats = calculateBookmarkStatsFromData(sortedData)
    bookmarksStore = {
      data: sortedData,
      meta: {
        ...bookmarksStore.meta,
        exported: now.getTime(),
        stats,
      },
    }
  }

  const dataString = prettyPrintJson(normalizeBookmarkData(bookmarksStore))
  const blob = new Blob([dataString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  a.href = url
  a.download = `utags-backup-${timestamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function clearAllBookmarks(noConfirm = false) {
  checkBookmarksDataReady()

  if (
    noConfirm ||
    // eslint-disable-next-line no-alert
    confirm('请确认是否清空所有书签？此操作不可逆，建议先导出备份数据。')
  ) {
    const bookmarksRaw = get(bookmarks)
    bookmarksRaw.data = {}
    bookmarks.set(bookmarksRaw)
    const event = new CustomEvent('clearAllBookmarks')
    globalThis.dispatchEvent(event)
  }
}

// 新增导入状态
let importProgress = {
  current: 0,
  total: 0,
  stats: {
    newBookmarks: 0,
    newDomains: new Set(),
    newTags: new Set(),
  },
}

type MergeStrategy = {
  title: MergeMetaStrategy
  tags: MergeTagsStrategy
  // conflict: 'skip' | 'overwrite' | 'rename'
  defaultDate: number
  skipExisting?: boolean // default false
  updateOverDelete?: boolean // default true
  overwriteLocalDeleted?: boolean // 是否覆盖本地已删除的书签
  overwriteRemoteDeleted?: boolean // 是否覆盖远程已删除的书签. 先保留，有实际使用场景时再实现
}

export async function importData(
  data: BookmarksStore,
  mergeStrategy: MergeStrategy
) {
  checkBookmarksDataReady()

  const bookmarksRaw = get(bookmarks)
  const bookmarksData = bookmarksRaw.data
  // 收集所有标签和域名，用于统计新的标签和域名数量
  const allTags = new Set(
    Object.values(bookmarksData).flatMap((entry) => entry.tags)
  )
  const allDomains = new Set(
    Object.keys(bookmarksData).map((url) => getHostName(url))
  )

  try {
    // 初始化进度
    importProgress = {
      current: 0,
      total: Object.keys(data.data).length,
      stats: {
        newBookmarks: 0,
        newDomains: new Set(),
        newTags: new Set(),
      },
    }

    // 分批处理避免阻塞
    const batchSize = 50
    const entries = Object.entries(data.data)
    const defaultDate = new Date(mergeStrategy.defaultDate).getTime()

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)
      for (const [url, entry] of batch) {
        if (!bookmarksData[url]) {
          importProgress.stats.newBookmarks++

          // 统计新域名
          const domain = getHostName(url)
          if (!allDomains.has(domain)) {
            importProgress.stats.newDomains.add(domain)
          }

          // 统计新标签
          for (const tag of entry.tags) {
            if (!allTags.has(tag)) {
              importProgress.stats.newTags.add(tag)
            }
          }
        }

        normalizeBookmark(entry, defaultDate)

        bookmarksData[url] = entry
        importProgress.current++
      }

      // 直接更新 localStorage，防止触发响应式更新
      localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(bookmarksRaw))

      const event = new CustomEvent('importProgressUpdated', {
        detail: importProgress,
      })
      globalThis.dispatchEvent(event)

      // 等待下一次事件循环
      // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    const event = new CustomEvent('importFinished', {
      detail: importProgress,
    })
    globalThis.dispatchEvent(event)

    // 重置进度
    importProgress = {
      current: 0,
      total: 0,
      stats: {
        newBookmarks: 0,
        newDomains: new Set(),
        newTags: new Set(),
      },
    }

    // 触发响应式更新
    bookmarks.set(bookmarksRaw)
  } catch {
    // eslint-disable-next-line no-alert
    alert('文件导入失败，请检查文件格式')
  }
}

function normalizeBookmark(
  bookmark: BookmarkTagsAndMetadata,
  defaultDate: number
) {
  const meta = bookmark.meta
  const { created, updated } = meta

  if (!isValidDate(created)) {
    meta.created = defaultDate
    meta.updated = defaultDate
  } else if (!isValidDate(updated)) {
    meta.updated = created
  }
}
