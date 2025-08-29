import type { BookmarkKeyValuePair } from '../types/bookmarks.js'
import { filterBookmarksByUrls } from '../utils/bookmarks.js'
import { type TagCommand, type CommandExecutionResult } from './tag-commands.js'

/**
 * Manages a history of {@link TagCommand} instances, allowing for undo and redo operations.
 * It orchestrates command execution by first resolving bookmark data using a provided callback,
 * then executing the command, and finally persisting changes via another optional callback.
 * The command history size is limited, and older commands are discarded when the limit is reached.
 */
export class CommandManager {
  private commandHistory: TagCommand[] = []
  private currentIndex = -1
  private isExecuting = false // Lock to prevent concurrent execution

  private readonly resolveBookmarksCallback: (
    urls: string[]
  ) => Promise<BookmarkKeyValuePair[] | undefined>

  private readonly persistCallback?:
    | ((bookmarks: BookmarkKeyValuePair[]) => Promise<void>)
    | undefined

  // TODO: not implemented
  private readonly persistHistoryCallback?: (
    history: TagCommand[]
  ) => Promise<void>

  private maxHistorySize = 100 // Default maximum history size

  /**
   * Creates an instance of CommandManager.
   * @param {function(string[]): Promise<BookmarkKeyValuePair[] | undefined>} resolveBookmarksCallback - A function that takes an array of bookmark URLs
   *                               and returns a promise resolving to an array of {@link BookmarkKeyValuePair}.
   *                               This is used to fetch the most current bookmark data before a command executes or undoes.
   * @param {function(BookmarkKeyValuePair[]): Promise<void>} [persistCallback] - Optional. A function called after command execution, undo, or redo
   *                          to persist the changes to storage. It receives the array of all bookmarks that might have been affected.
   * @param {function(TagCommand[]): Promise<void>} [persistHistoryCallback] - Optional. A function to persist the command history itself.
   *                                                                          (Currently not fully implemented or used for loading history).
   * @param {number} [maxHistorySize=100] - Optional. The maximum number of commands to keep in the history. Defaults to 100.
   */
  constructor(
    resolveBookmarksCallback: (
      urls: string[]
    ) => Promise<BookmarkKeyValuePair[] | undefined>,
    persistCallback?: (bookmarks: BookmarkKeyValuePair[]) => Promise<void>,
    persistHistoryCallback?: (history: TagCommand[]) => Promise<void>,
    maxHistorySize = 100
  ) {
    this.resolveBookmarksCallback = resolveBookmarksCallback
    this.persistCallback = persistCallback
    this.persistHistoryCallback = persistHistoryCallback
    this.maxHistorySize = maxHistorySize
  }

  /**
   * Executes a single command. It resolves bookmark data via `resolveBookmarksCallback`,
   * executes the command, and optionally persists changes and history.
   * @param {TagCommand} command - The command to execute.
   * @returns {Promise<CommandExecutionResult | undefined>} A promise that resolves with the command's execution result,
   *                                                        or undefined if data resolution failed or another operation is in progress.
   */
  async executeCommand(
    command: TagCommand
  ): Promise<CommandExecutionResult | undefined> {
    if (this.isExecuting) {
      console.warn('CommandManager: Another operation is already in progress.')
      throw new Error('Another operation is already in progress.')
      // return undefined
    }

    this.isExecuting = true
    try {
      // Execute single command
      const results = await this.executeCommandsInternal([command])
      return results.length > 0 ? results[0] : undefined
    } finally {
      this.isExecuting = false
    }
  }

  /**
   * Executes a batch of commands. It resolves all necessary bookmark data once,
   * executes each command, and optionally persists changes and history.
   * @param {TagCommand[]} commands - An array of commands to execute in sequence.
   * @returns {Promise<Array<CommandExecutionResult | undefined>>} A promise that resolves with an array of execution results for each command,
   *                                                              or an empty array if data resolution failed or another operation is in progress.
   */
  async executeBatch(
    commands: TagCommand[]
  ): Promise<Array<CommandExecutionResult | undefined>> {
    if (commands.length === 0) {
      // throw new Error('No commands to execute')
      return []
    }

    if (this.isExecuting) {
      console.warn('CommandManager: Another operation is already in progress.')
      throw new Error('Another operation is already in progress.')
      // return [] // Return empty array as per original behavior for no commands
    }

    this.isExecuting = true
    try {
      // Execute multiple commands
      return await this.executeCommandsInternal(commands)
    } finally {
      this.isExecuting = false
    }
  }

  /**
   * Undoes the last executed command. It resolves bookmark data via `resolveBookmarksCallback`,
   * calls the command's undo method, and optionally persists changes and history.
   * @returns {Promise<boolean>} A promise that resolves to true if the undo operation was successful and changes were potentially persisted,
   *                           false otherwise (e.g., if there's nothing to undo, data resolution failed, or another operation is in progress).
   */
  async undo(): Promise<boolean> {
    if (this.isExecuting) {
      console.warn('CommandManager: Another operation is already in progress.')
      throw new Error('Another operation is already in progress.')
      // return false
    }

    this.isExecuting = true
    try {
      if (this.currentIndex < 0) {
        return false
      }

      const command = this.commandHistory[this.currentIndex]

      const resolvedBookmarks = await this.resolveBookmarks(
        command.getBookmarkUrls()
      )
      if (!resolvedBookmarks) {
        console.error(
          'CommandManager: No bookmark URLs provided for command undo.'
        )
        return false
      }

      command.undo(resolvedBookmarks)

      // If persistence callback provided, save changes
      if (this.persistCallback) {
        await this.persistCallback(resolvedBookmarks)
      }

      // Clear execution result after a successful undo and potential persistence.
      // This ensures that the undone command's result is no longer accessible,
      // preventing inconsistencies if, for example, getExecutionResult were called on it later.
      command.clearExecutionResult()

      this.currentIndex--

      // If persistence callback provided, save history
      if (this.persistHistoryCallback) {
        await this.persistHistoryCallback(this.commandHistory)
      }

      return true
    } finally {
      this.isExecuting = false
    }
  }

  /**
   * Redoes the last undone command. It resolves bookmark data via `resolveBookmarksCallback`,
   * re-executes the command, and optionally persists changes.
   * @returns {Promise<CommandExecutionResult | undefined>} A promise that resolves with the command's execution result,
   *                                                        or undefined if there's nothing to redo, data resolution failed, or another operation is in progress.
   */
  async redo(): Promise<CommandExecutionResult | undefined> {
    if (this.isExecuting) {
      console.warn('CommandManager: Another operation is already in progress.')
      throw new Error('Another operation is already in progress.')
      // return undefined
    }

    this.isExecuting = true
    try {
      if (this.currentIndex >= this.commandHistory.length - 1) {
        return undefined
      }

      const command = this.commandHistory[this.currentIndex + 1]

      const resolvedBookmarks = await this.resolveBookmarks(
        command.getBookmarkUrls()
      )
      if (!resolvedBookmarks) {
        console.error(
          'CommandManager: No bookmark URLs provided for command re-execution.'
        )
        return undefined
      }

      // Re-execute command and update affected bookmarks
      command.execute(resolvedBookmarks) // Command re-executes and stores its own result

      // If persistence callback provided, save changes
      if (this.persistCallback) {
        try {
          await this.persistCallback(resolvedBookmarks)
        } catch (error) {
          console.error(
            'CommandManager: Error persisting changes after redo:',
            error
          )
          // If persistence fails after redo, clear the execution result of the command.
          // This is crucial because the redo operation's outcome was not successfully saved,
          // so its result should not be considered valid or accessible.
          command.clearExecutionResult()
          throw error // Re-throw the error to propagate it further up the call stack
        }
      }

      this.currentIndex++

      // If persistence callback provided, save history
      if (this.persistHistoryCallback) {
        await this.persistHistoryCallback(this.commandHistory)
      }

      return command.getExecutionResult()
    } finally {
      this.isExecuting = false
    }
  }

  /**
   * Checks if an undo operation can be performed.
   * @returns True if there is at least one command in the history that can be undone, false otherwise.
   */
  canUndo(): boolean {
    return this.currentIndex >= 0
  }

  /**
   * Checks if a redo operation can be performed.
   * @returns True if there is at least one undone command in the history that can be redone, false otherwise.
   */
  canRedo(): boolean {
    return this.currentIndex < this.commandHistory.length - 1
  }

  /**
   * Gets a copy of the current command history.
   * @returns An array containing the executed commands.
   */
  getCommandHistory(): TagCommand[] {
    return [...this.commandHistory]
  }

  /**
   * Gets the current index in the command history.
   * This points to the last executed command. -1 means the history is empty or all commands have been undone.
   * @returns The current index.
   */
  getCurrentIndex(): number {
    return this.currentIndex
  }

  /**
   * Clears the entire command history and resets the current index.
   */
  async clear(): Promise<void> {
    this.commandHistory = []
    this.currentIndex = -1

    // If persistence callback provided, save history
    if (this.persistHistoryCallback) {
      await this.persistHistoryCallback(this.commandHistory)
    }
  }

  /**
   * Sets the maximum number of commands to keep in the history.
   * If the new size is smaller than the current history size, the oldest commands are removed.
   * @param size - The new maximum history size. Must be greater than 0.
   * @throws Error if the provided size is less than 1.
   */
  async setMaxHistorySize(size: number): Promise<void> {
    if (size < 1) {
      // TODO: Consider localizing this error message if CommandManager is used in UI directly
      // or if error messages are meant to be user-facing.
      throw new Error('Max history size must be a positive integer.')
    }

    this.maxHistorySize = size

    // Trim history if needed
    if (this.commandHistory.length > this.maxHistorySize) {
      const excess = this.commandHistory.length - this.maxHistorySize
      this.commandHistory = this.commandHistory.slice(excess)
      this.currentIndex -= excess

      // If persistence callback provided, save history
      if (this.persistHistoryCallback) {
        await this.persistHistoryCallback(this.commandHistory)
      }
    }
  }

  /**
   * Internal helper method to execute a list of commands, update the command history,
   * manage history size, and trigger persistence.
   * @param commands - An array of commands to execute.
   * @private
   */
  private async executeCommandsInternal(
    commands: TagCommand[]
  ): Promise<Array<CommandExecutionResult | undefined>> {
    // If not at the last command (i.e., some undos have happened),
    // clear commands after the current index, effectively removing the redo history.
    if (this.currentIndex < this.commandHistory.length - 1) {
      this.commandHistory = this.commandHistory.slice(0, this.currentIndex + 1)
    }

    const executionResults: Array<CommandExecutionResult | undefined> = []

    const allBookmarkUrlsSet = new Set<string>()
    // Collect all bookmark URLs from all commands
    for (const command of commands) {
      for (const url of command.getBookmarkUrls()) {
        allBookmarkUrlsSet.add(url)
      }
    }

    const allBookmarkUrls = Array.from(allBookmarkUrlsSet)
    const resolvedBookmarks = await this.resolveBookmarks(allBookmarkUrls)
    if (!resolvedBookmarks) {
      console.error(
        'CommandManager: No bookmark URLs provided for command execution.'
      )
      return executionResults
    }

    // Execute all commands and add them to the history
    for (const command of commands) {
      command.execute(resolvedBookmarks)
      executionResults.push(command.getExecutionResult())
    }

    // If persistence callback provided, save changes
    // Only run once after all commands have been executed, not for each individual execution.
    if (this.persistCallback) {
      try {
        await this.persistCallback(resolvedBookmarks)
      } catch (error) {
        console.error('CommandManager: Failed to persist changes:', error)
        // Revert changes for all commands that failed to persist
        // for (const command of commands) {
        //   command.undo(resolvedBookmarks)
        // }
        executionResults.length = 0 // Clear the collected results as they are now invalid
        // If persistence fails after executing commands, clear the execution result for each command.
        // This ensures that the results of these unpersisted operations are not considered valid.
        for (const command of commands) {
          command.clearExecutionResult()
        }

        throw error
      }
    }

    // Push all commands to the history after all commands have been executed and persisted
    this.commandHistory.push(...commands)
    // Increment index after all commands have been executed and persisted
    this.currentIndex += commands.length // Increment index for each command added

    // Limit history size by removing the oldest commands if necessary
    if (this.commandHistory.length > this.maxHistorySize) {
      const excess = this.commandHistory.length - this.maxHistorySize
      this.commandHistory = this.commandHistory.slice(excess)
      // Adjust currentIndex to reflect the removed items from the beginning of the array
      this.currentIndex -= excess
    }

    // If persistence callback provided, save history
    // Only run once after all commands have been executed, not for each individual execution.
    if (this.persistHistoryCallback) {
      await this.persistHistoryCallback(this.commandHistory)
    }

    return executionResults
  }

  private async resolveBookmarks(
    bookmarkUrls: string[]
  ): Promise<BookmarkKeyValuePair[] | undefined> {
    if (bookmarkUrls.length === 0) {
      // Don't push the command to the history.
      // It's not a valid command to execute.
      // It's not a valid command to undo also.
      return undefined
    }

    let resolvedBookmarks: BookmarkKeyValuePair[] | undefined
    try {
      resolvedBookmarks = await this.resolveBookmarksCallback(bookmarkUrls)
    } catch (error) {
      console.error(
        'CommandManager: Failed to resolve bookmarks for command execution.',
        error
      )
    }

    // Maybe the bookmark resolve service temporarily unavailable or other error
    // so we should log it and return empty list. Undo should not effect the bookmarks,
    // but redo would be work when the service is available again.
    if (!resolvedBookmarks) {
      console.error(
        'CommandManager: Failed to resolve bookmarks for command execution.'
      )
      return []
    }

    if (resolvedBookmarks.length === 0 && bookmarkUrls.length > 0) {
      console.warn(
        'CommandManager: None of the requested bookmark URLs were found in the resolved data.'
      )
      // Still execute the command with an empty list, it should handle this (e.g. affectedCount = 0)
      // No bookmarks at currently.
      return []
    }

    // Filter resolvedBookmarks to only include those actually requested by the command,
    // as resolveBookmarksCallback might return more or less depending on its implementation.
    // This ensures the command operates on the exact set of bookmarks it was intended for.
    const targetBookmarks = filterBookmarksByUrls(
      resolvedBookmarks,
      bookmarkUrls
    )

    if (targetBookmarks.length === 0 && bookmarkUrls.length > 0) {
      console.warn(
        'CommandManager: None of the requested bookmark URLs were found in the resolved data.'
      )
      // Still execute the command with an empty list, it should handle this (e.g. affectedCount = 0)
      // No bookmarks at currently.
      return []
    }

    return targetBookmarks
  }
}
