/**
 * @vitest-environment jsdom
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest'
import {
  STORAGE_KEY_BOOKMARKS,
  DELETED_BOOKMARK_TAG,
} from '../config/constants.js'
import {
  type BookmarksStore,
  type BookmarkTagsAndMetadata,
} from '../types/bookmarks.js'
import * as m from '../paraglide/messages.js'
import { AddTagCommand, RemoveTagCommand } from '../lib/tag-commands.js'
import { commandManager } from '../stores/command-store.js'
import {
  batchAddTagsToBookmarks,
  batchRemoveTagsFromBookmarks,
  batchDeleteBookmarks,
} from './bookmark-actions.js'

// Mock commandManager and its methods
vi.mock('../stores/command-store.js', () => ({
  commandManager: {
    executeCommand: vi.fn(),
  },
}))

// Mock AddTagCommand and its methods
const mockGetExecutionResult = vi.fn()
vi.mock('../lib/tag-commands.js', async () => {
  const actual = await vi.importActual('../lib/tag-commands.js')
  return {
    ...actual, // Keep actual implementations for other parts if necessary
    AddTagCommand: vi
      .fn()
      .mockImplementation((urls: string[], tags: string[]) => ({
        urls,
        tags,
        execute: vi.fn(),
        undo: vi.fn(),
        getExecutionResult: mockGetExecutionResult,
        getType: vi.fn().mockReturnValue('addTag'),
        getDescription: vi.fn().mockReturnValue('Mock Add Tag Command'),
      })),
    RemoveTagCommand: vi
      .fn()
      .mockImplementation((urls: string[], tags: string[]) => ({
        urls,
        tags,
        execute: vi.fn(),
        undo: vi.fn(),
        getExecutionResult: vi
          .fn()
          .mockReturnValue({ success: true, affectedCount: urls.length }),
        getType: vi.fn().mockReturnValue('removeTag'),
        getDescription: vi.fn().mockReturnValue('Mock Remove Tag Command'),
      })),
  }
})

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => {
      return store[key] || null
    }),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    clear() {
      store = {}
    },
  }
})()

// Replace global localStorage with mock
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
})

// Add dispatchEvent mock to prevent errors
Object.defineProperty(globalThis, 'dispatchEvent', {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  value() {},
})

// Mock globalThis.confirm
const originalConfirm = globalThis.confirm
const mockConfirm = vi.fn()

describe('batchAddTagsToBookmarks', () => {
  const sampleBookmarkUrls = ['https://example.com', 'https://test.com']
  const sampleTagsToAdd = ['new-tag', 'another-tag']

  beforeEach(() => {
    vi.clearAllMocks() // Clear mocks before each test
  })

  it('should successfully add tags to bookmarks and return execution result', async () => {
    const mockResult = { affectedCount: 2, originalStates: new Map() }
    mockGetExecutionResult.mockReturnValue(mockResult)
    ;(commandManager.executeCommand as Mock).mockResolvedValue(undefined) // Simulate successful command execution

    const result = await batchAddTagsToBookmarks(
      sampleBookmarkUrls,
      sampleTagsToAdd
    )

    expect(AddTagCommand).toHaveBeenCalledWith(
      sampleBookmarkUrls,
      sampleTagsToAdd
    )
    expect(commandManager.executeCommand).toHaveBeenCalledTimes(1)
    expect(result).toEqual(mockResult)
  })

  it('should throw an error if tagsToAdd is empty', async () => {
    await expect(
      batchAddTagsToBookmarks(sampleBookmarkUrls, [])
    ).rejects.toThrow(m.BOOKMARK_FORM_TAGS_ERROR_EMPTY())
    expect(commandManager.executeCommand).not.toHaveBeenCalled()
  })

  it('should throw an error if selectedBookmarkUrls is empty', async () => {
    await expect(batchAddTagsToBookmarks([], sampleTagsToAdd)).rejects.toThrow(
      m.BATCH_TAG_ADD_MODAL_ERROR_NO_BOOKMARKS_SELECTED()
    )
    expect(commandManager.executeCommand).not.toHaveBeenCalled()
  })

  it('should throw an error if commandManager.executeCommand fails', async () => {
    const errorMessage = 'Command execution failed'
    ;(commandManager.executeCommand as Mock).mockRejectedValueOnce(
      new Error(errorMessage)
    )

    await expect(
      batchAddTagsToBookmarks(sampleBookmarkUrls, sampleTagsToAdd)
    ).rejects.toThrow(
      m.BATCH_TAG_ADD_MODAL_ERROR_ADD_FAILED({
        errorDetails: errorMessage,
      })
    )

    expect(AddTagCommand).toHaveBeenCalledWith(
      sampleBookmarkUrls,
      sampleTagsToAdd
    )
    expect(commandManager.executeCommand).toHaveBeenCalledTimes(1)
  })

  it('should return undefined if getExecutionResult returns undefined', async () => {
    mockGetExecutionResult.mockReturnValue(undefined)
    ;(commandManager.executeCommand as Mock).mockResolvedValue(undefined)

    const result = await batchAddTagsToBookmarks(
      sampleBookmarkUrls,
      sampleTagsToAdd
    )

    expect(result).toBeUndefined()
  })
})

describe('batchRemoveTagsFromBookmarks', () => {
  const mockSelectedUrls = [
    'https://example.com/page1',
    'https://example.com/page2',
  ]
  const mockTagsToRemove = ['tag1', 'tag2']

  beforeEach(() => {
    vi.clearAllMocks() // Clear mocks before each test
  })

  /**
   * Test case for successfully removing tags from bookmarks.
   */
  it('should call commandManager.executeCommand with a RemoveTagCommand and return execution result on success', async () => {
    // Arrange
    const mockExecutionResult = {
      success: true,
      affectedCount: mockSelectedUrls.length,
    }
    ;(commandManager.executeCommand as Mock).mockResolvedValueOnce(undefined) // Simulate successful command execution
    // The getExecutionResult is mocked on RemoveTagCommand constructor

    // Act
    const result = await batchRemoveTagsFromBookmarks(
      mockSelectedUrls,
      mockTagsToRemove
    )

    // Assert
    expect(RemoveTagCommand).toHaveBeenCalledWith(
      mockSelectedUrls,
      mockTagsToRemove
    )
    const removeTagCommandInstance = (RemoveTagCommand as Mock).mock.results[0]
      .value as RemoveTagCommand
    expect(commandManager.executeCommand).toHaveBeenCalledWith(
      removeTagCommandInstance
    )
    expect(result).toEqual(mockExecutionResult)
  })

  /**
   * Test case for attempting to remove tags with an empty tag list.
   */
  it('should throw an error if tagsToRemove is empty', async () => {
    // Arrange
    const selectedUrls = ['https://example.com/page1']
    const emptyTags: string[] = []

    // Act & Assert
    await expect(
      batchRemoveTagsFromBookmarks(selectedUrls, emptyTags)
    ).rejects.toThrow(m.BATCH_TAG_REMOVE_MODAL_ERROR_NO_TAGS_SELECTED())
    expect(commandManager.executeCommand).not.toHaveBeenCalled()
  })

  /**
   * Test case for attempting to remove tags from an empty list of selected bookmarks.
   */
  it('should throw an error if selectedBookmarkUrls is empty', async () => {
    // Arrange
    const emptyUrls: string[] = []
    const tags = ['tag1']

    // Act & Assert
    // Note: The original function uses BATCH_TAG_ADD_MODAL_ERROR_NO_BOOKMARKS_SELECTED for this case.
    // Assuming this is intentional, otherwise it should be BATCH_TAG_REMOVE_MODAL_ERROR_NO_BOOKMARKS_SELECTED.
    await expect(batchRemoveTagsFromBookmarks(emptyUrls, tags)).rejects.toThrow(
      m.BATCH_TAG_ADD_MODAL_ERROR_NO_BOOKMARKS_SELECTED()
    )
    expect(commandManager.executeCommand).not.toHaveBeenCalled()
  })

  /**
   * Test case for when commandManager.executeCommand throws an error.
   */
  it('should throw a formatted error if commandManager.executeCommand fails', async () => {
    // Arrange
    const originalError = new Error('Command execution failed')
    ;(commandManager.executeCommand as Mock).mockRejectedValueOnce(
      originalError
    )

    // Act & Assert
    await expect(
      batchRemoveTagsFromBookmarks(mockSelectedUrls, mockTagsToRemove)
    ).rejects.toThrow(
      m.BATCH_TAG_REMOVE_MODAL_ERROR_REMOVE_FAILED({
        errorDetails: originalError.message,
      })
    )
    expect(RemoveTagCommand).toHaveBeenCalledWith(
      mockSelectedUrls,
      mockTagsToRemove
    )
    const removeTagCommandInstance = (RemoveTagCommand as Mock).mock.results[0]
      .value as RemoveTagCommand
    expect(commandManager.executeCommand).toHaveBeenCalledWith(
      removeTagCommandInstance
    )
  })

  /**
   * Test case for ensuring RemoveTagCommand is instantiated correctly.
   */
  it('should instantiate RemoveTagCommand with correct parameters', async () => {
    // Arrange
    ;(commandManager.executeCommand as Mock).mockResolvedValueOnce(undefined)

    // Act
    await batchRemoveTagsFromBookmarks(mockSelectedUrls, mockTagsToRemove)

    // Assert
    expect(RemoveTagCommand).toHaveBeenCalledTimes(1)
    expect(RemoveTagCommand).toHaveBeenCalledWith(
      mockSelectedUrls,
      mockTagsToRemove
    )
  })
})
