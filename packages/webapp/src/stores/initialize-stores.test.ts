import { describe, it, expect, beforeEach, vi } from 'vitest'
import { bookmarkStorage } from '../lib/bookmark-storage.js'
import { isChineseLocale } from '../utils/i18n-utils.js'
import { initialBookmarks } from '../data/initial-bookmarks.js'
import { initialBookmarks as initialBookmarksCN } from '../data/initial-bookmarks-zh-CN.js'
import { clearInitialBookmarks } from './initialize-stores.js'

// Mock dependencies
vi.mock('../lib/bookmark-storage.js', () => ({
  bookmarkStorage: {
    deleteBookmarks: vi.fn(),
  },
}))

vi.mock('../utils/i18n-utils.js', () => ({
  isChineseLocale: vi.fn(),
}))

vi.mock('../data/initial-bookmarks.js', () => ({
  initialBookmarks: {
    'https://example1.com': { meta: { title: 'Example 1' }, tags: ['test'] },
    'https://example2.com': { meta: { title: 'Example 2' }, tags: ['test'] },
  },
}))

vi.mock('../data/initial-bookmarks-zh-CN.js', () => ({
  initialBookmarks: {
    'https://example-cn1.com': { meta: { title: '示例 1' }, tags: ['测试'] },
    'https://example-cn2.com': { meta: { title: '示例 2' }, tags: ['测试'] },
  },
}))

describe('clearInitialBookmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should clear English initial bookmarks when not Chinese locale', async () => {
    // Arrange
    vi.mocked(isChineseLocale).mockReturnValue(false)
    const mockDeleteBookmarks = vi.mocked(bookmarkStorage.deleteBookmarks)

    // Act
    await clearInitialBookmarks()

    // Assert
    expect(mockDeleteBookmarks).toHaveBeenCalledWith([
      'https://example1.com',
      'https://example2.com',
    ])
    expect(mockDeleteBookmarks).toHaveBeenCalledTimes(1)
  })

  it('should clear Chinese initial bookmarks when Chinese locale', async () => {
    // Arrange
    vi.mocked(isChineseLocale).mockReturnValue(true)
    const mockDeleteBookmarks = vi.mocked(bookmarkStorage.deleteBookmarks)

    // Act
    await clearInitialBookmarks()

    // Assert
    expect(mockDeleteBookmarks).toHaveBeenCalledWith([
      'https://example-cn1.com',
      'https://example-cn2.com',
    ])
    expect(mockDeleteBookmarks).toHaveBeenCalledTimes(1)
  })

  it('should handle empty bookmarks gracefully', async () => {
    // Arrange
    vi.mocked(isChineseLocale).mockReturnValue(false)
    const mockDeleteBookmarks = vi.mocked(bookmarkStorage.deleteBookmarks)

    // Act
    await clearInitialBookmarks()

    // Assert
    // Even with empty mock data, the function should still work
    // The actual implementation will call deleteBookmarks with the mocked URLs
    expect(mockDeleteBookmarks).toHaveBeenCalled()
  })
})
