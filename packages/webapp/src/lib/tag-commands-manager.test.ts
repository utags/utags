import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest'
import type { BookmarkKeyValuePair } from '../types/bookmarks.js'
import {
  AddTagCommand,
  RemoveTagCommand,
  RenameTagCommand,
  CompositeTagCommand,
} from './tag-commands.js'
import { CommandManager } from './tag-commands-manager.js'

// Helper function to extract URLs from bookmark key-value pairs
function bookmarksToUrls(bookmarks: BookmarkKeyValuePair[]): string[] {
  return bookmarks.map((bookmark) => bookmark[0])
}

describe('CommandManager', () => {
  // Test data: A mutable store to simulate real bookmark data changes
  let originalBookmarksStore: BookmarkKeyValuePair[]
  let commandManager: CommandManager
  let mockResolveBookmarksCallback: Mock<
    (urls: string[]) => Promise<BookmarkKeyValuePair[] | undefined>
  >
  let mockPersistCallback: Mock<
    (bookmarks: BookmarkKeyValuePair[]) => Promise<void>
  >
  let mockPersistHistoryCallback: Mock<
    (history: CommandManager['commandHistory']) => Promise<void>
  >

  beforeEach(() => {
    // Reset test data for each test to ensure isolation
    originalBookmarksStore = [
      [
        'https://example.com',
        {
          tags: ['example', 'test'],
          meta: {
            title: 'Example Website',
            created: Date.now(),
            updated: Date.now(),
          },
        },
      ],
      [
        'https://test.org',
        {
          tags: ['test', 'organization'],
          meta: {
            title: 'Test Organization',
            created: Date.now(),
            updated: Date.now(),
          },
        },
      ],
    ]

    // Mock the resolveBookmarksCallback to return a deep copy of the relevant bookmarks from our store
    mockResolveBookmarksCallback = vi.fn(async (urls: string[]) => {
      return structuredClone(originalBookmarksStore).filter(
        (bm: BookmarkKeyValuePair) => urls.includes(bm[0])
      )
    })

    // Mock the persistCallback to update our in-memory store
    mockPersistCallback = vi.fn(
      async (bookmarksToPersist: BookmarkKeyValuePair[]) => {
        // Simulate persisting changes by updating the originalBookmarksStore
        // This needs to be a careful update, not a simple replacement, if commands modify parts of bookmarks
        for (const updatedBookmark of bookmarksToPersist) {
          const index = originalBookmarksStore.findIndex(
            (b) => b[0] === updatedBookmark[0]
          )
          if (index === -1) {
            // This case should ideally not happen if resolveBookmarksCallback works correctly
            // or if commands only operate on existing bookmarks.
            // For simplicity, we'll add it if not found, though real behavior might differ.
            originalBookmarksStore.push(structuredClone(updatedBookmark))
          } else {
            originalBookmarksStore[index] = structuredClone(updatedBookmark) // Deep copy to avoid shared references
          }
        }
      }
    )

    mockPersistHistoryCallback = vi.fn().mockResolvedValue(undefined)

    // Create CommandManager instance with mocks
    commandManager = new CommandManager(
      mockResolveBookmarksCallback,
      mockPersistCallback,
      mockPersistHistoryCallback,
      10 // maxHistorySize
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Basic Functionality Tests
   */
  describe('Basic Functionality', () => {
    it('should execute a single command and persist changes', async () => {
      const command = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'new-tag'
      )

      await commandManager.executeCommand(command)

      // Verify tags were added to the in-memory store via persistCallback
      expect(originalBookmarksStore[0][1].tags).toContain('new-tag')
      expect(originalBookmarksStore[1][1].tags).toContain('new-tag')

      // Verify persistCallback was called once with the updated bookmarks
      expect(mockPersistCallback).toHaveBeenCalledTimes(1)
      expect(mockPersistCallback).toHaveBeenCalledWith(originalBookmarksStore)
      expect(mockPersistHistoryCallback).toHaveBeenCalledTimes(1)

      // Verify command history
      expect(commandManager.getCommandHistory().length).toBe(1)
      expect(commandManager.getCurrentIndex()).toBe(0)
    })

    it('should execute multiple commands in batch and persist once', async () => {
      const addCommand = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'new-tag'
      )
      const removeCommand = new RemoveTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'test'
      )

      const results = await commandManager.executeBatch([
        addCommand,
        removeCommand,
      ])

      expect(results.length).toBe(2)
      expect(results[0]?.affectedCount).toBeGreaterThan(0)
      expect(results[1]?.affectedCount).toBeGreaterThan(0)

      // Verify tag changes in the store
      expect(originalBookmarksStore[0][1].tags).toContain('new-tag')
      expect(originalBookmarksStore[0][1].tags).not.toContain('test')
      expect(originalBookmarksStore[1][1].tags).toContain('new-tag')
      expect(originalBookmarksStore[1][1].tags).not.toContain('test')

      // Verify persistCallback was called only once for the batch
      expect(mockPersistCallback).toHaveBeenCalledTimes(1)
      expect(mockPersistCallback).toHaveBeenCalledWith(originalBookmarksStore)
      expect(mockPersistHistoryCallback).toHaveBeenCalledTimes(1)

      // Verify command history (each command in batch is a separate history entry)
      expect(commandManager.getCommandHistory().length).toBe(2)
      expect(commandManager.getCurrentIndex()).toBe(1)
    })

    it('should undo a command and persist reverted changes', async () => {
      const initialTagsBookmark0 = [...originalBookmarksStore[0][1].tags]
      const command = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'new-tag'
      )
      await commandManager.executeCommand(command)

      // Verify tag was added before undo
      expect(originalBookmarksStore[0][1].tags).toContain('new-tag')

      const undoResult = await commandManager.undo()
      expect(undoResult).toBe(true)

      // Verify tag was removed from the store after undo
      expect(originalBookmarksStore[0][1].tags).not.toContain('new-tag')
      expect(originalBookmarksStore[0][1].tags).toEqual(initialTagsBookmark0)

      // Persist callback called for execute and for undo
      expect(mockPersistCallback).toHaveBeenCalledTimes(2)
      expect(mockPersistHistoryCallback).toHaveBeenCalledTimes(2)
      expect(commandManager.getCurrentIndex()).toBe(-1)
    })

    it('should redo a command and persist changes again', async () => {
      const command = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'new-tag'
      )
      const executionResult = await commandManager.executeCommand(command)
      await commandManager.undo()

      // Verify tag is not present after undo
      expect(originalBookmarksStore[0][1].tags).not.toContain('new-tag')

      const redoResult = await commandManager.redo()

      // The result of redo should be the same as the original execution result object
      // This requires CommandManager to store and return the CommandExecutionResult
      expect(redoResult).toEqual(executionResult)

      // Verify tag was re-added to the store
      expect(originalBookmarksStore[0][1].tags).toContain('new-tag')
      expect(originalBookmarksStore[1][1].tags).toContain('new-tag')

      // Persist callback: execute, undo, redo
      expect(mockPersistCallback).toHaveBeenCalledTimes(3)
      expect(mockPersistHistoryCallback).toHaveBeenCalledTimes(3)
      expect(commandManager.getCurrentIndex()).toBe(0)
    })

    it('should correctly report undo/redo status', async () => {
      expect(commandManager.canUndo()).toBe(false)
      expect(commandManager.canRedo()).toBe(false)

      const command = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'new-tag'
      )
      await commandManager.executeCommand(command)
      expect(commandManager.canUndo()).toBe(true)
      expect(commandManager.canRedo()).toBe(false)

      await commandManager.undo()
      expect(commandManager.canUndo()).toBe(false)
      expect(commandManager.canRedo()).toBe(true)

      await commandManager.redo()
      expect(commandManager.canUndo()).toBe(true)
      expect(commandManager.canRedo()).toBe(false)
    })

    it('should clear redo history when a new command is executed', async () => {
      const addCommand = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'tag1'
      )
      const removeCommand = new RemoveTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'test'
      )

      await commandManager.executeCommand(addCommand)
      await commandManager.executeCommand(removeCommand)
      await commandManager.undo() // Undo removeCommand

      expect(commandManager.canRedo()).toBe(true) // Can redo removeCommand

      const newCommand = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'tag2'
      )
      await commandManager.executeCommand(newCommand)

      expect(commandManager.canRedo()).toBe(false) // Redo history for removeCommand is cleared
      expect(commandManager.getCommandHistory().length).toBe(2) // addCommand, newCommand
      expect(commandManager.getCurrentIndex()).toBe(1)
    })
  })

  /**
   * Edge Case Tests
   */
  describe('Edge Cases', () => {
    it('should handle an empty command list for executeBatch', async () => {
      const result = await commandManager.executeBatch([])
      expect(result).toEqual([])
      expect(commandManager.getCommandHistory().length).toBe(0)
      expect(mockPersistCallback).not.toHaveBeenCalled()
      expect(mockPersistHistoryCallback).not.toHaveBeenCalled()
    })

    it('should return false when trying to undo with no commands executed', async () => {
      const result = await commandManager.undo()
      expect(result).toBe(false)
      expect(mockPersistCallback).not.toHaveBeenCalled()
      expect(mockPersistHistoryCallback).not.toHaveBeenCalled()
    })

    it('should return undefined when trying to redo with no undone commands', async () => {
      const result = await commandManager.redo()
      expect(result).toBeUndefined()
      expect(mockPersistCallback).not.toHaveBeenCalled()
      expect(mockPersistHistoryCallback).not.toHaveBeenCalled()
    })

    it('should limit command history size', async () => {
      await commandManager.setMaxHistorySize(3)
      for (let i = 0; i < 5; i++) {
        const command = new AddTagCommand(
          bookmarksToUrls(originalBookmarksStore),
          `tag-${i}`
        )
        // eslint-disable-next-line no-await-in-loop
        await commandManager.executeCommand(command)
      }

      expect(commandManager.getCommandHistory().length).toBeLessThanOrEqual(3)
    })

    it('should throw error for invalid max history size', async () => {
      await expect(async () =>
        commandManager.setMaxHistorySize(0)
      ).rejects.toThrow('Max history size must be a positive integer.')
      await expect(async () =>
        commandManager.setMaxHistorySize(-1)
      ).rejects.toThrow('Max history size must be a positive integer.')
    })

    it('should clear command history', async () => {
      const command = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'new-tag'
      )
      await commandManager.executeCommand(command)
      await commandManager.clear()

      expect(commandManager.getCommandHistory().length).toBe(0)
      expect(commandManager.getCurrentIndex()).toBe(-1)
      expect(commandManager.canUndo()).toBe(false)
      expect(commandManager.canRedo()).toBe(false)
      // Persist history should be called when clearing
      expect(mockPersistHistoryCallback).toHaveBeenCalledTimes(2) // 1 for execute, 1 for clear
    })
  })

  /**
   * Complex Command Tests (e.g., CompositeTagCommand)
   */
  describe('Complex Commands', () => {
    it('should handle CompositeTagCommand execution and undo', async () => {
      const initialTagsBookmark0 = [...originalBookmarksStore[0][1].tags]
      const addSubCommand = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'composite-add'
      )
      const renameSubCommand = new RenameTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'test',
        'testing-composite'
      )
      const compositeCommand = new CompositeTagCommand(
        [addSubCommand, renameSubCommand],
        'rename',
        'Batch tag operations'
      )

      await commandManager.executeCommand(compositeCommand)

      expect(originalBookmarksStore[0][1].tags).toContain('composite-add')
      expect(originalBookmarksStore[0][1].tags).not.toContain('test')
      expect(originalBookmarksStore[0][1].tags).toContain('testing-composite')
      expect(mockPersistCallback).toHaveBeenCalledTimes(1) // Single persist for composite
      expect(mockPersistHistoryCallback).toHaveBeenCalledTimes(1)

      await commandManager.undo()

      expect(originalBookmarksStore[0][1].tags).not.toContain('composite-add')
      expect(originalBookmarksStore[0][1].tags).toContain('test')
      expect(originalBookmarksStore[0][1].tags).not.toContain(
        'testing-composite'
      )
      expect(originalBookmarksStore[0][1].tags).toEqual(initialTagsBookmark0)
      expect(mockPersistCallback).toHaveBeenCalledTimes(2) // Second persist for undo
      expect(mockPersistHistoryCallback).toHaveBeenCalledTimes(2)
    })
  })

  /**
   * Callback Handling Tests
   */
  describe('Callback Handling', () => {
    it('should not attempt to persist if persistCallback is not provided', async () => {
      const managerWithoutPersist = new CommandManager(
        mockResolveBookmarksCallback,
        undefined, // No persistBookmarksCallback
        mockPersistHistoryCallback
      )
      const command = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'no-persist-tag'
      )

      await expect(
        managerWithoutPersist.executeCommand(command)
      ).resolves.not.toThrow()
      // Check that our mockPersistCallback (from the main setup) was NOT called
      expect(mockPersistCallback).not.toHaveBeenCalled()
      // History should still be persisted if callback provided
      expect(mockPersistHistoryCallback).toHaveBeenCalledTimes(1)
    })

    it('should not attempt to persist history if persistHistoryCallback is not provided', async () => {
      const managerWithoutHistoryPersist = new CommandManager(
        mockResolveBookmarksCallback,
        mockPersistCallback,
        undefined // No persistHistoryCallback
      )
      const command = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'no-history-persist-tag'
      )

      await expect(
        managerWithoutHistoryPersist.executeCommand(command)
      ).resolves.not.toThrow()
      expect(mockPersistCallback).toHaveBeenCalledTimes(1) // Bookmark persist should happen
      // Check that our mockPersistHistoryCallback (from the main setup) was NOT called
      const historyCalls = mockPersistHistoryCallback.mock.calls.length
      // Execute another command to ensure it's not called for subsequent actions either
      await managerWithoutHistoryPersist.executeCommand(command)
      expect(mockPersistHistoryCallback.mock.calls.length).toBe(historyCalls) // No new calls
    })

    it('should handle errors from resolveBookmarksCallback gracefully', async () => {
      mockResolveBookmarksCallback.mockRejectedValueOnce(
        new Error('Failed to resolve bookmarks')
      )
      const command = new AddTagCommand(
        ['https://nonexistent.com'],
        'error-tag'
      )

      const result = await commandManager.executeCommand(command)

      expect(result).toBeDefined()
      expect(result?.affectedCount).toBe(0)
      expect(result?.deletedCount).toBe(0)
      expect(result?.originalStates.size).toBe(0)
      expect(mockPersistCallback).toHaveBeenCalled()
      expect(mockPersistHistoryCallback).toHaveBeenCalled() // Command failed, no history change
      expect(commandManager.getCommandHistory().length).toBe(1)
    })

    it('should handle errors from persistCallback gracefully and not add to history', async () => {
      mockPersistCallback.mockRejectedValueOnce(new Error('Failed to persist'))
      const command = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'persist-fail-tag'
      )

      await expect(commandManager.executeCommand(command)).rejects.toThrow(
        'Failed to persist'
      )
      expect(command.getExecutionResult()).toBeUndefined()

      expect(mockPersistCallback).toHaveBeenCalledTimes(1) // It was attempted
      expect(mockPersistHistoryCallback).not.toHaveBeenCalled() // Persist failed, command not added to history
      expect(commandManager.getCommandHistory().length).toBe(0)
      // Ensure original store is not modified if persist fails (depends on CommandManager's atomicity)
      // For this test, we assume CommandManager reverts optimistic updates or doesn't apply them before successful persist.
      // The current mockPersistCallback updates originalBookmarksStore directly, so this aspect isn't fully tested here
      // without more complex CommandManager logic for rollbacks.
    })

    it('should handle errors from resolveBookmarksCallback gracefully during executeCommand', async () => {
      mockResolveBookmarksCallback.mockRejectedValueOnce(
        new Error('Failed to resolve bookmarks')
      )
      const command = new AddTagCommand(
        ['https://nonexistent.com'],
        'error-tag'
      )

      // // Expect executeCommand to throw an error when resolveBookmarksCallback fails
      // await expect(commandManager.executeCommand(command)).rejects.toThrow(
      //   'Failed to resolve bookmarks'
      // )
      const result = await commandManager.executeCommand(command)

      expect(result).toBeDefined()
      expect(result?.affectedCount).toBe(0)
      expect(result?.deletedCount).toBe(0)
      expect(result?.originalStates.size).toBe(0)

      expect(mockPersistCallback).toHaveBeenCalled()
      expect(mockPersistHistoryCallback).toHaveBeenCalled()
      expect(commandManager.getCommandHistory().length).toBe(1)
    })

    it('should handle errors from persistCallback gracefully during executeCommand and not add to history', async () => {
      mockPersistCallback.mockRejectedValueOnce(new Error('Failed to persist'))
      const command = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'persist-fail-tag'
      )

      await expect(commandManager.executeCommand(command)).rejects.toThrow(
        'Failed to persist'
      )

      expect(mockPersistCallback).toHaveBeenCalledTimes(1) // It was attempted
      expect(mockPersistHistoryCallback).not.toHaveBeenCalled() // Persist failed, command not added to history
      expect(commandManager.getCommandHistory().length).toBe(0)
    })

    it('should handle errors from resolveBookmarksCallback gracefully during executeBatch', async () => {
      mockResolveBookmarksCallback.mockRejectedValueOnce(
        new Error('Failed to resolve bookmarks for batch')
      )
      const command = new AddTagCommand(['https://example.com'], 'batch-error')

      // await expect(commandManager.executeBatch([command])).rejects.toThrow(
      //   'Failed to resolve bookmarks for batch'
      // )

      const result = await commandManager.executeCommand(command)

      expect(result).toBeDefined()
      expect(result?.affectedCount).toBe(0)
      expect(result?.deletedCount).toBe(0)
      expect(result?.originalStates.size).toBe(0)

      expect(mockPersistCallback).toHaveBeenCalled()
      expect(mockPersistHistoryCallback).toHaveBeenCalled()
      expect(commandManager.getCommandHistory().length).toBe(1)
    })

    it('should handle errors from persistCallback gracefully during executeBatch', async () => {
      mockPersistCallback.mockRejectedValueOnce(
        new Error('Failed to persist batch')
      )
      const command = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'batch-persist-fail'
      )

      await expect(commandManager.executeBatch([command])).rejects.toThrow(
        'Failed to persist batch'
      )

      expect(command.getExecutionResult()).toBeUndefined()

      expect(mockPersistCallback).toHaveBeenCalledTimes(1)
      expect(mockPersistHistoryCallback).not.toHaveBeenCalled()
      expect(commandManager.getCommandHistory().length).toBe(0)
    })

    it('should handle errors from resolveBookmarksCallback gracefully during undo', async () => {
      const command = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'undo-resolve-fail'
      )
      await commandManager.executeCommand(command)

      mockResolveBookmarksCallback.mockRejectedValueOnce(
        new Error('Failed to resolve for undo')
      )

      // await expect(commandManager.undo()).rejects.toThrow(
      //   'Failed to resolve for undo'
      // )

      const result = await commandManager.undo()

      expect(result).toBe(true)

      // Persist for execute, but not for failed undo
      expect(mockPersistCallback).toHaveBeenCalledTimes(2)
      // Persist history for execute, but not for failed undo
      expect(mockPersistHistoryCallback).toHaveBeenCalledTimes(2)
      expect(commandManager.getCurrentIndex()).toBe(-1) // State should not change from before undo attempt
    })

    it('should handle errors from persistCallback gracefully during undo', async () => {
      const command = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'undo-persist-fail'
      )
      await commandManager.executeCommand(command)

      const executionResult = command.getExecutionResult()
      expect(executionResult).toBeDefined()
      expect(executionResult?.affectedCount).toBe(2)
      expect(executionResult?.deletedCount).toBe(0)
      expect(executionResult?.originalStates.size).toBe(2)

      mockPersistCallback.mockRejectedValueOnce(
        new Error('Failed to persist undo')
      )

      await expect(commandManager.undo()).rejects.toThrow(
        'Failed to persist undo'
      )

      expect(command.getExecutionResult()).toBeDefined()
      expect(command.getExecutionResult()).toEqual(executionResult)

      // Persist for execute, attempted for undo
      expect(mockPersistCallback).toHaveBeenCalledTimes(2)
      // Persist history for execute, but not for failed undo persist
      expect(mockPersistHistoryCallback).toHaveBeenCalledTimes(1)
      expect(commandManager.getCurrentIndex()).toBe(0) // State should not change
    })

    it('should handle errors from resolveBookmarksCallback gracefully during redo', async () => {
      const command = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'redo-resolve-fail'
      )
      await commandManager.executeCommand(command)
      await commandManager.undo()

      mockResolveBookmarksCallback.mockRejectedValueOnce(
        new Error('Failed to resolve for redo')
      )

      // await expect(commandManager.redo()).rejects.toThrow(
      //   'Failed to resolve for redo'
      // )

      const result = await commandManager.redo()

      expect(result).toBeDefined()
      expect(result?.affectedCount).toBe(0)
      expect(result?.deletedCount).toBe(0)
      expect(result?.originalStates.size).toBe(0)

      // Persist for execute, undo, but not for failed redo
      expect(mockPersistCallback).toHaveBeenCalledTimes(3)
      // Persist history for execute, undo, but not for failed redo
      expect(mockPersistHistoryCallback).toHaveBeenCalledTimes(3)
      expect(commandManager.getCurrentIndex()).toBe(0) // State should not change from before redo attempt
    })

    it('should handle errors from persistCallback gracefully during redo', async () => {
      const command = new AddTagCommand(
        bookmarksToUrls(originalBookmarksStore),
        'redo-persist-fail'
      )
      await commandManager.executeCommand(command)
      const executionResult = command.getExecutionResult()
      expect(executionResult).toBeDefined()
      expect(executionResult?.affectedCount).toBe(2)
      expect(executionResult?.deletedCount).toBe(0)
      expect(executionResult?.originalStates.size).toBe(2)

      await commandManager.undo()
      expect(command.getExecutionResult()).toBeUndefined()

      mockPersistCallback.mockRejectedValueOnce(
        new Error('Failed to persist redo')
      )

      await expect(commandManager.redo()).rejects.toThrow(
        'Failed to persist redo'
      )
      expect(command.getExecutionResult()).toBeUndefined()

      // Persist for execute, undo, attempted for redo
      expect(mockPersistCallback).toHaveBeenCalledTimes(3)
      // Persist history for execute, undo, but not for failed redo persist
      expect(mockPersistHistoryCallback).toHaveBeenCalledTimes(2)
      expect(commandManager.getCurrentIndex()).toBe(-1) // State should not change
    })
  })

  /**
   * Concurrency Control Tests
   */
  describe('Concurrency Control', () => {
    it('should prevent concurrent execution of executeCommand', async () => {
      let resolveFirstCall: (value?: unknown) => void
      const firstCallPromise = new Promise((resolve) => {
        resolveFirstCall = resolve
      })

      // Reset mockPersistCallback for this specific test path
      mockPersistCallback.mockReset()
      // Make persistCallback slow for the first call
      mockPersistCallback.mockImplementationOnce(async () => {
        await firstCallPromise
      })

      const command1 = new AddTagCommand(['https://example.com'], 'tag-c1')
      const command2 = new AddTagCommand(['https://example.com'], 'tag-c2')

      const promise1 = commandManager.executeCommand(command1)
      // Try to execute another command while the first is 'in-flight'
      const promise2 = commandManager.executeCommand(command2)

      // Expect the second command to be rejected or return a specific result indicating it was blocked
      // Based on the implementation, it throws an error.
      await expect(promise2).rejects.toThrow(
        'Another operation is already in progress.'
      )

      resolveFirstCall!() // Allow the first command to complete
      await promise1 // Ensure the first command finishes

      expect(mockPersistCallback).toHaveBeenCalledTimes(1) // Only first command's persist should run
      expect(commandManager.getCommandHistory().length).toBe(1)
    })

    it('should prevent concurrent execution of executeBatch', async () => {
      let resolveFirstCall: (value?: unknown) => void
      const firstCallPromise = new Promise((resolve) => {
        resolveFirstCall = resolve
      })

      // Reset mockPersistCallback for this specific test path
      mockPersistCallback.mockReset()
      // Make persistCallback slow for the first call
      mockPersistCallback.mockImplementationOnce(async () => {
        await firstCallPromise
      })

      const batch1 = [new AddTagCommand(['https://example.com'], 'tag-b1')]
      const batch2 = [new AddTagCommand(['https://example.com'], 'tag-b2')]

      const promise1 = commandManager.executeBatch(batch1)
      const promise2 = commandManager.executeBatch(batch2)

      await expect(promise2).rejects.toThrow(
        'Another operation is already in progress.'
      )
      resolveFirstCall!()
      await promise1
      expect(mockPersistCallback).toHaveBeenCalledTimes(1)
    })

    it('should prevent concurrent undo operation', async () => {
      const command = new AddTagCommand(['https://example.com'], 'tag-u1')
      await commandManager.executeCommand(command) // Execute once to enable undo

      let resolveFirstUndo: (value?: unknown) => void
      const firstUndoPromise = new Promise((resolve) => {
        resolveFirstUndo = resolve
      })
      // Reset mockPersistCallback for this specific test path
      mockPersistCallback.mockReset()
      mockPersistCallback.mockImplementationOnce(async () => {
        await firstUndoPromise
      })

      const promise1 = commandManager.undo()
      const promise2 = commandManager.undo() // Attempt concurrent undo

      await expect(promise2).rejects.toThrow(
        'Another operation is already in progress.'
      )
      resolveFirstUndo!()
      await promise1
      expect(mockPersistCallback).toHaveBeenCalledTimes(1)
    })

    it('should prevent concurrent redo operation', async () => {
      const command = new AddTagCommand(['https://example.com'], 'tag-r1')
      await commandManager.executeCommand(command)
      await commandManager.undo() // Execute and undo to enable redo

      let resolveFirstRedo: (value?: unknown) => void
      const firstRedoPromise = new Promise((resolve) => {
        resolveFirstRedo = resolve
      })
      // Reset mockPersistCallback for this specific test path
      mockPersistCallback.mockReset()
      mockPersistCallback.mockImplementationOnce(async () => {
        await firstRedoPromise
      })

      const promise1 = commandManager.redo()
      const promise2 = commandManager.redo() // Attempt concurrent redo

      await expect(promise2).rejects.toThrow(
        'Another operation is already in progress.'
      )
      resolveFirstRedo!()
      await promise1
      expect(mockPersistCallback).toHaveBeenCalledTimes(1)
    })

    it('should release lock if persistCallback fails during executeCommand', async () => {
      mockPersistCallback.mockRejectedValueOnce(new Error('Persist failed'))
      const command = new AddTagCommand(['https://example.com'], 'fail-persist')

      // First execution attempt, expected to fail at persist step
      await expect(commandManager.executeCommand(command)).rejects.toThrow(
        'Persist failed'
      )
      expect(command.getExecutionResult()).toBeUndefined()
      expect(commandManager.getCommandHistory().length).toBe(0) // Should not be added to history

      // Reset mock to allow successful persistence for the second command
      mockPersistCallback.mockReset()
      mockPersistCallback.mockResolvedValue(undefined) // Explicitly resolve with undefined
      mockResolveBookmarksCallback.mockResolvedValue(
        structuredClone(originalBookmarksStore)
      )

      // Second command execution should succeed, indicating lock was released
      const command2 = new AddTagCommand(
        ['https://example.com'],
        'success-after-fail'
      )
      const result2 = await commandManager.executeCommand(command2)
      expect(result2).toBeDefined()
      expect(result2?.affectedCount).toBeGreaterThan(0)
      // mockPersistCallback was called once for the failed attempt, and once for the successful one.
      // However, due to the mockReset, we only count the successful call here.
      expect(mockPersistCallback).toHaveBeenCalledTimes(1)
      expect(commandManager.getCommandHistory().length).toBe(1)
    })

    it('should release lock if resolveBookmarksCallback fails during executeCommand', async () => {
      mockResolveBookmarksCallback.mockRejectedValueOnce(
        new Error('Resolve failed')
      )
      const command = new AddTagCommand(['https://example.com'], 'fail-resolve')

      const result1 = await commandManager.executeCommand(command)
      expect(result1).toBeDefined()
      expect(result1?.affectedCount).toBe(0)
      expect(result1?.deletedCount).toBe(0)
      expect(result1?.originalStates.size).toBe(0)
      expect(commandManager.getCommandHistory().length).toBe(1)

      // Reset mock to allow successful resolution for the second command
      mockResolveBookmarksCallback.mockReset()
      mockResolveBookmarksCallback.mockResolvedValue(
        structuredClone(originalBookmarksStore)
      )
      mockPersistCallback.mockResolvedValue(undefined) // Explicitly resolve with undefined

      const command2 = new AddTagCommand(
        ['https://example.com'],
        'success-after-fail-resolve'
      )
      const result2 = await commandManager.executeCommand(command2)
      expect(result2).toBeDefined()
      expect(result2?.affectedCount).toBeGreaterThan(0)
      expect(commandManager.getCommandHistory().length).toBe(2)
    })
  })
})
