import { STORAGE_KEY_BOOKMARKS_MERGED } from '../config/constants.js'
import { type BookmarkObject } from '../types/bookmarks.js'

type MergedBookmarkItem = {
  bookmarkObject1: BookmarkObject
  bookmarkObject2: BookmarkObject
  tobeBookmarkObject: BookmarkObject
  options: {
    actionType: 'edit' | 'import' | 'sync'
  }
  created: number
}

export function saveMergedBookmark(
  bookmarkObject1: BookmarkObject,
  bookmarkObject2: BookmarkObject,
  tobeBookmarkObject: BookmarkObject,
  options: {
    actionType: 'edit' | 'import' | 'sync'
  }
) {
  const mergedBookmarkItem: MergedBookmarkItem = {
    bookmarkObject1,
    bookmarkObject2,
    tobeBookmarkObject,
    options,
    created: Date.now(),
  }

  // 从localStorage获取现有数据或初始化空数组
  const existingData = localStorage.getItem(STORAGE_KEY_BOOKMARKS_MERGED)
  const mergedBookmarks = existingData
    ? (JSON.parse(existingData) as MergedBookmarkItem[])
    : []

  // 添加新条目到数组
  mergedBookmarks.push(mergedBookmarkItem)

  // 保存回localStorage
  localStorage.setItem(
    STORAGE_KEY_BOOKMARKS_MERGED,
    JSON.stringify(mergedBookmarks)
  )
}
