export const STORAGE_KEY_BOOKMARKS = 'utags-bookmarks'
export const STORAGE_KEY_BOOKMARKS_MERGED = 'utags-bookmarks-merged'
export const STORAGE_KEY_BOOKMARKS_DELETED = 'utags-bookmarks-deleted'
export const STORAGE_KEY_SETTINGS = 'utags-settings'
export const STORAGE_KEY_SYNC_SETTINGS = 'utags-sync-settings'
export const STORAGE_KEY_FILTERS = 'utags-filters'
export const STORAGE_KEY_COLLECTIONS = 'utags-collections'
export const CURRENT_DATABASE_VERSION = 3

export const defaultFavicon16 = encodeURIComponent(
  'https://wsrv.nl/?w=16&h=16&url=th.bing.com/th?id=ODLS.A2450BEC-5595-40BA-9F13-D9EC6AB74B9F'
)
export const defaultFavicon32 = encodeURIComponent(
  'https://wsrv.nl/?w=32&h=32&url=th.bing.com/th?id=ODLS.A2450BEC-5595-40BA-9F13-D9EC6AB74B9F'
)
export const defaultFavicon64 = encodeURIComponent(
  'https://wsrv.nl/?w=64&h=64&url=th.bing.com/th?id=ODLS.A2450BEC-5595-40BA-9F13-D9EC6AB74B9F'
)

export const defaultFavicons = {
  16: defaultFavicon16,
  32: defaultFavicon32,
  64: defaultFavicon64,
}

export const HASH_DELIMITER = '#'
export const FILTER_DELIMITER = '/'
export const OR_CONDITION_DELIMITER = ','

export const DELETED_BOOKMARK_TAG = '._DELETED_'
export const STARRED_BOOKMARK_TAG = '._STARRED_'
export const ARCHIVED_BOOKMARK_TAG = '._ARCHIVED_'
export const DEFAULT_DATE = 946_684_800_000 // new Date('2000-01-01T00:00:00Z').getTime()
