import {
  CURRENT_DATABASE_VERSION,
  STORAGE_KEY_BOOKMARKS,
} from '../config/constants.js'
import type {
  BookmarksStore,
  BookmarksData,
  BookmarkKeyValuePair,
  BookmarkTagsAndMetadata,
  BookmarkKey,
} from '../types/bookmarks.js'
import { isNonNullObject } from '../utils/index.js'
import { prettyPrintJson } from '../utils/pretty-print-json.js'

/**
 * Bookmark Storage Service
 *
 * Responsible for saving and retrieving bookmark data from local storage or remote servers.
 * Provides methods for CRUD operations on bookmarks and manages the bookmark store structure.
 */
export class BookmarkStorage {
  /**
   * Storage key used for localStorage
   * @private
   */
  private readonly storageKey: string

  /**
   * Current database version
   * @private
   */
  private readonly currentVersion: number = CURRENT_DATABASE_VERSION

  /**
   * Creates a new BookmarkStorage instance
   * @param storageKey - Custom storage key for localStorage, defaults to 'utags-bookmarks'
   */
  constructor(storageKey: string = STORAGE_KEY_BOOKMARKS) {
    this.storageKey = storageKey
  }

  /**
   * Persists the entire bookmark store (data and metadata) to local storage.
   *
   * @param bookmarksStore - The complete bookmark store object to save.
   * @param skipValidation - If true, skips the validation step. Useful for internal calls where data is already validated.
   * @returns A promise that resolves when the data has been successfully saved.
   * @throws Error if saving fails or if data is invalid (and validation is not skipped).
   */
  async persistBookmarksStore(
    bookmarksStore: BookmarksStore,
    skipValidation = false
  ): Promise<void> {
    try {
      // Validate the bookmarks store before saving if not skipped
      const validatedStore = skipValidation
        ? bookmarksStore
        : this.validateBookmarksStore(bookmarksStore, false)

      const bookmarksJson = JSON.stringify(validatedStore)
      localStorage.setItem(this.storageKey, bookmarksJson)

      const event = new CustomEvent('updateBookmarksStore')
      globalThis.dispatchEvent(event)
    } catch (error) {
      console.error('Failed to save bookmarks:', error)
      throw error
    }
  }

  /**
   * Retrieves the entire bookmark store (data and metadata) from local storage.
   *
   * @returns A promise that resolves with the `BookmarksStore` object.
   * If no data exists in local storage, it returns an initialized empty store.
   * @throws Error if the stored data has an incompatible database version or if validation fails.
   */
  async getBookmarksStore(): Promise<BookmarksStore> {
    try {
      const bookmarksJson = localStorage.getItem(this.storageKey)
      if (bookmarksJson) {
        const parsedData = JSON.parse(bookmarksJson) as BookmarksStore

        // Validate the parsed data
        return this.validateBookmarksStore(parsedData)
      }

      // Return empty initialized data
      return this.createEmptyBookmarksStore()
    } catch (error) {
      console.error('Failed to retrieve bookmarks:', error)
      throw error
    }
  }

  /**
   * Replaces the entire `data` field within the bookmark store with the provided `BookmarksData`.
   * This method overwrites any existing bookmarks data, but preserves other metadata.
   * The `updated` timestamp in the store's metadata will be set to the current time.
   *
   * @param data - The new `BookmarksData` object to set as the store's data.
   * @returns A promise that resolves when the data has been successfully overwritten and the store persisted.
   * @throws Error if retrieving the current store or persisting the updated store fails.
   */
  async overwriteBookmarks(data: BookmarksData): Promise<void> {
    try {
      const bookmarksStore = await this.getBookmarksStore()

      // Replace the existing bookmarks data
      bookmarksStore.data = data

      // Update the last modified timestamp
      bookmarksStore.meta.updated = Date.now()

      // Save the updated store, skipping validation as we are directly setting validated data structure (conceptually)
      await this.persistBookmarksStore(bookmarksStore, true)
    } catch (error) {
      console.error('Failed to save bookmarks data with new data:', error) // More specific error message
      throw error
    }
  }

  /**
   * Updates existing bookmarks or adds new ones based on the provided `BookmarksData` object.
   * This method effectively merges the provided data into the existing bookmarks data.
   * It converts the `BookmarksData` object into an array of key-value pairs and then calls `upsertBookmarks`.
   *
   * @param data - The `BookmarksData` object containing bookmarks to be updated or added.
   * @returns A promise that resolves when the bookmarks have been successfully upserted and the store persisted.
   * @throws Error if any part of the process (retrieving store, upserting, persisting) fails.
   */
  async upsertBookmarksFromData(data: BookmarksData): Promise<void> {
    // Convert BookmarksData object to an array of key-value pairs for the upsertBookmarks method
    const bookmarksToUpdate: BookmarkKeyValuePair[] = Object.entries(
      data
    ) as BookmarkKeyValuePair[]
    // The upsertBookmarks method handles fetching the store, merging data, updating timestamp, and saving.
    await this.upsertBookmarks(bookmarksToUpdate)
  }

  /**
   * Retrieves only the `data` part (the actual bookmarks) from the bookmark store.
   *
   * @returns A promise that resolves with the `BookmarksData` object.
   * @throws Error if retrieving or validating the bookmark store fails.
   */
  async getBookmarksData(): Promise<BookmarksData> {
    const bookmarksStore = await this.getBookmarksStore()
    return bookmarksStore.data
  }

  /**
   * Retrieves all bookmarks from the store's `data` field as an array of key-value pairs (entries).
   *
   * @returns A promise that resolves with an array of `BookmarkKeyValuePair`.
   * Returns an empty array if the store is empty or if retrieval fails (error will be logged).
   * @throws Error if retrieving or validating the bookmark store fails (propagated from `getBookmarksStore`).
   */
  async getAllBookmarksAsEntries(): Promise<BookmarkKeyValuePair[]> {
    try {
      const bookmarksStore = await this.getBookmarksStore()
      return Object.entries(bookmarksStore.data) as BookmarkKeyValuePair[]
    } catch (error) {
      console.error('Failed to retrieve bookmarks as array:', error)
      throw error
    }
  }

  /**
   * Retrieves specific bookmarks as an array of key-value pairs (entries) based on the provided keys.
   *
   * @param bookmarkKeys - An array of `BookmarkKey` (URLs) to retrieve.
   * @returns A promise that resolves with an array of `BookmarkKeyValuePair` for the found bookmarks.
   * Bookmarks not found for the given keys are silently ignored.
   * @throws Error if retrieving or validating the bookmark store fails (propagated from `getBookmarksStore`).
   */
  async getBookmarkEntriesByKeys(
    bookmarkKeys: BookmarkKey[]
  ): Promise<BookmarkKeyValuePair[]> {
    try {
      const bookmarksStore = await this.getBookmarksStore()
      const bookmarksData = bookmarksStore.data

      // Filter bookmarks by the provided keys
      return bookmarkKeys
        .filter((key) => key in bookmarksData)
        .map((key) => [key, bookmarksData[key]] as BookmarkKeyValuePair)
    } catch (error) {
      console.error('Failed to retrieve specific bookmarks as array:', error)
      throw error
    }
  }

  /**
   * Updates multiple existing bookmarks or adds new ones in batch.
   * The `updated` timestamp in the store's metadata will be set to the current time.
   *
   * @param bookmarks - An array of `BookmarkKeyValuePair` to update or add.
   * @returns A promise that resolves when all bookmarks have been successfully upserted and the store persisted.
   * @throws Error if retrieving the current store or persisting the updated store fails.
   */
  async upsertBookmarks(bookmarks: BookmarkKeyValuePair[]): Promise<void> {
    try {
      await this.batchUpdateBookmarksInternal([], bookmarks)
    } catch (error) {
      console.error('Failed to update bookmarks in batch:', error)
      throw error
    }
  }

  /**
   * Updates a single existing bookmark or adds a new one.
   * The `updated` timestamp in the store's metadata will be set to the current time.
   *
   * @param key - The `BookmarkKey` (URL) of the bookmark.
   * @param entry - The `BookmarkTagsAndMetadata` for the bookmark.
   * @returns A promise that resolves when the bookmark has been successfully upserted and the store persisted.
   * @throws Error if retrieving the current store or persisting the updated store fails.
   */
  async upsertBookmark(
    key: BookmarkKey,
    entry: BookmarkTagsAndMetadata
  ): Promise<void> {
    try {
      await this.batchUpdateBookmarksInternal([], [[key, entry]])
    } catch (error) {
      console.error('Failed to save bookmark:', error)
      throw error
    }
  }

  /**
   * Deletes multiple bookmarks from the store based on their keys.
   * If any bookmarks are deleted, the `updated` timestamp in the store's metadata will be set to the current time.
   *
   * @param keys - An array of `BookmarkKey` (URLs) of the bookmarks to delete.
   * @returns A promise that resolves when the bookmarks have been deleted and the store (if changed) has been persisted.
   * @throws Error if retrieving the current store or persisting the updated store fails.
   */
  async deleteBookmarks(keys: BookmarkKey[]): Promise<void> {
    try {
      await this.batchUpdateBookmarksInternal(keys, [])
    } catch (error) {
      console.error('Failed to delete bookmarks:', error)
      throw error
    }
  }

  /**
   * Deletes a single bookmark from the store based on its key.
   * This is a convenience method that calls `deleteBookmarks` with a single key.
   *
   * @param key - The `BookmarkKey` (URL) of the bookmark to delete.
   * @returns A promise that resolves when the bookmark has been deleted.
   * @throws Error if deletion fails (propagated from `deleteBookmarks`).
   */
  async deleteBookmark(key: BookmarkKey): Promise<void> {
    try {
      // Call deleteBookmarks with a single key
      await this.batchUpdateBookmarksInternal([key], [])
    } catch (error) {
      console.error('Failed to delete bookmark:', error)
      throw error
    }
  }

  /**
   * Batch updates bookmarks by handling both deletions and modifications in a single operation.
   * Only persists changes if there are actual modifications or deletions.
   * The `updated` timestamp in the store's metadata will be set to the current time if changes occur.
   *
   * @param deletions - An array of `BookmarkKey` (URLs) of the bookmarks to delete, can be empty.
   * @param modifications - An array of `BookmarkKeyValuePair` to update or add, can be empty.
   * @returns A promise that resolves when all operations are complete and the store (if changed) has been persisted.
   * @throws Error if retrieving the current store or persisting the updated store fails.
   */
  async batchUpdateBookmarks(
    deletions: BookmarkKey[] = [],
    modifications: BookmarkKeyValuePair[] = []
  ): Promise<void> {
    try {
      await this.batchUpdateBookmarksInternal(deletions, modifications)
    } catch (error) {
      console.error('Failed to batch update bookmarks:', error)
      throw error
    }
  }

  /**
   * Exports the entire bookmark store as a JSON string, pretty-printed for readability.
   * The `exported` timestamp in the store's metadata will be set to the current time before export.
   *
   * @returns A promise that resolves with the bookmarks store as a JSON string.
   * @throws Error if retrieving the store or JSON stringification fails.
   */
  async exportBookmarks(): Promise<string> {
    try {
      const bookmarksStore = await this.getBookmarksStore()

      // Update export timestamp
      bookmarksStore.meta.exported = Date.now()

      return prettyPrintJson(bookmarksStore)
    } catch (error) {
      console.error('Failed to export bookmarks:', error)
      throw error
    }
  }

  /**
   * Imports bookmarks from a JSON string representing a `BookmarksStore`.
   * The imported bookmarks are merged with the existing bookmarks data.
   * Metadata from the imported store (except for `updated` timestamp) is also merged.
   * The `updated` timestamp of the current store is NOT modified by this import directly,
   * but `persistBookmarksStore` will update it if data changes.
   *
   * @param jsonData - The JSON string containing the `BookmarksStore` data to import.
   * @returns A promise that resolves when the import is complete and the merged store has been persisted.
   * @throws Error if parsing the JSON, validating the imported data, or persisting the store fails.
   */
  async importBookmarks(jsonData: string): Promise<void> {
    try {
      // Parse the imported data
      const importedData = JSON.parse(jsonData) as BookmarksStore

      // Validate the imported data and handle migration if needed
      const validatedData = this.validateBookmarksStore(importedData, false)

      // Get current bookmarks store
      const currentStore = await this.getBookmarksStore()

      // Merge the imported data with existing bookmarks
      const mergedStore = {
        data: {
          ...currentStore.data,
          ...validatedData.data,
        },
        meta: {
          ...validatedData.meta,
          // updated: Date.now(), // Update the timestamp
        },
      }

      // Save the merged data (skip validation as we already validated)
      await this.persistBookmarksStore(mergedStore, true)

      console.log('Bookmarks imported successfully')
    } catch (error) {
      console.error('Failed to import bookmarks:', error)
      throw error
    }
  }

  /**
   * Batch updates bookmarks by handling both deletions and modifications in a single operation.
   * Only persists changes if there are actual modifications or deletions.
   * The `updated` timestamp in the store's metadata will be set to the current time if changes occur.
   *
   * @param deletions - An array of `BookmarkKey` (URLs) of the bookmarks to delete, can be empty.
   * @param modifications - An array of `BookmarkKeyValuePair` to update or add, can be empty.
   * @returns A promise that resolves when all operations are complete and the store (if changed) has been persisted.
   * @throws Error if retrieving the current store or persisting the updated store fails.
   */
  private async batchUpdateBookmarksInternal(
    deletions: BookmarkKey[] = [],
    modifications: BookmarkKeyValuePair[] = []
  ): Promise<void> {
    try {
      const bookmarksStore = await this.getBookmarksStore()
      let hasChanges = false

      // Handle deletions
      for (const key of deletions) {
        if (bookmarksStore.data[key]) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete bookmarksStore.data[key]
          hasChanges = true
        }
      }

      // Handle modifications
      for (const [key, entry] of modifications) {
        bookmarksStore.data[key] = entry
        hasChanges = true
      }

      // Only persist if there were actual changes
      if (hasChanges) {
        // Update the last modified timestamp
        bookmarksStore.meta.updated = Date.now()
        await this.persistBookmarksStore(bookmarksStore, true)
      }
    } catch (error) {
      // Throw the error to be caught and handled by the caller
      throw error
    }
  }

  /**
   * Creates an empty initialized bookmark store
   *
   * @returns A new empty BookmarksStore with current version and timestamps
   * @private
   */
  private createEmptyBookmarksStore(): BookmarksStore {
    return {
      data: {},
      meta: {
        databaseVersion: this.currentVersion,
        created: Date.now(),
        updated: Date.now(),
      },
    }
  }

  /**
   * Validates bookmark store data structure and version compatibility
   *
   * @param data - The data to validate
   * @param saveAfterMigration - Whether to save after migration, defaults to true
   * @returns The validated data as BookmarksStore if valid
   * @throws Error if the data structure is invalid or version is incompatible
   * @private
   */
  private validateBookmarksStore(
    data: any,
    saveAfterMigration = true
  ): BookmarksStore {
    // Validate the parsed data structure
    if (!isNonNullObject(data.data) || !isNonNullObject(data.meta)) {
      throw new Error(
        'Invalid bookmark store format: data and meta must be non-null objects'
      )
    }

    // Validate database version
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { databaseVersion } = data.meta

    // Check if databaseVersion is a number
    if (typeof databaseVersion !== 'number' || Number.isNaN(databaseVersion)) {
      throw new TypeError(
        'Invalid bookmark store format: databaseVersion must be a number'
      )
    }

    // Check if version is compatible
    if (databaseVersion > this.currentVersion) {
      throw new Error(
        `Incompatible database version: ${databaseVersion} is newer than the supported version ${this.currentVersion}`
      )
    }

    // Handle migration for older versions
    if (databaseVersion < this.currentVersion) {
      // Perform migration
      return this.migrateBookmarksStore(
        data,
        databaseVersion,
        saveAfterMigration
      )
    }

    return data as BookmarksStore
  }

  /**
   * Migrates bookmark store data from older versions to the current version
   *
   * @param oldStore - The old bookmark store data
   * @param oldVersion - The version of the old bookmark store
   * @param saveAfterMigration - Whether to save the migrated data, defaults to true
   * @returns The migrated bookmark store data
   * @private
   */
  private migrateBookmarksStore(
    oldStore: any,
    oldVersion: number,
    saveAfterMigration = true
  ): BookmarksStore {
    console.log(
      `Migrating bookmarks from version ${oldVersion} to version ${this.currentVersion}`
    )

    // Create a copy of the old store
    const newStore: BookmarksStore = {
      data: { ...(oldStore.data as BookmarksStore['data']) },
      meta: {
        ...(oldStore.meta as BookmarksStore['meta']),
        databaseVersion: this.currentVersion,
        updated: Date.now(),
      },
    }

    let migrationVersion = oldVersion

    // Version-specific migrations - apply sequentially
    if (migrationVersion === 1) {
      // Migrate from version 1 to 2
      this.migrateV1toV2(newStore)

      migrationVersion = 2
    }

    if (migrationVersion === 2) {
      // Migrate from version 2 to 3
      this.migrateV2toV3(newStore)

      migrationVersion = 3
    }

    // Save the migrated store if required
    if (saveAfterMigration) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.persistBookmarksStore(newStore, true) // Skip validation as we just validated
      } catch (error) {
        console.error('Failed to save migrated bookmarks:', error)
      }
    }

    return newStore
  }

  /**
   * Migrates bookmark store from version 1 to version 2
   *
   * @param store - The store to migrate
   * @private
   */
  private migrateV1toV2(store: BookmarksStore): void {
    // Implement version 1 to 2 migration logic
    // Example: Add missing fields or transform data structure
    console.log('Migrating from version 1 to 2')
  }

  /**
   * Migrates bookmark store from version 2 to version 3
   *
   * @param store - The store to migrate
   * @private
   */
  private migrateV2toV3(store: BookmarksStore): void {
    // Implement version 2 to 3 migration logic
    // Example: Update data structure or add new required fields
    console.log('Migrating from version 2 to 3')
  }
}

// Create singleton instance
export const bookmarkStorage = new BookmarkStorage()

/**
 * TODO: Potential Optimizations
 *
 * 1. Error Handling Improvements:
 *    - Add custom BookmarkStorageError class for better error differentiation
 *    - Enhance error messages with more context
 *    - Improve migration failure error handling
 *
 * 2. Data Validation Enhancements:
 *    - Add BookmarkTagsAndMetadata field validation
 *    - Implement data integrity checks
 *    - Add URL format validation
 *
 * 3. Performance Optimizations:
 *    - Optimize hasChanges flag in batchUpdateBookmarksInternal
 *    - Use Set for deletion operations
 *    - Implement batch processing for large datasets
 *
 * 4. Migration System Improvements:
 *    - Implement concrete migration logic
 *    - Add migration rollback mechanism
 *    - Add migration progress notifications
 *
 * 5. Event System Enhancements:
 *    - Add more event types (delete, update, migrate)
 *    - Include additional context in events
 *    - Implement event subscription system
 *
 * 6. Code Organization Improvements:
 *    - Extract validation logic to separate class
 *    - Create dedicated migration manager
 *    - Implement strategy pattern for migrations
 *
 * 7. Storage Backend Extensions:
 *    - Add support for multiple storage backends
 *    - Implement storage adapter interface
 *    - Add data compression options
 */

/**
 * TODO: Additional test cases needed for batchUpdateBookmarksInternal method:
 *
 * 1. Edge Cases:
 *    - Test with empty input parameters
 *    - Test with invalid bookmark keys
 *    - Test with non-existent bookmarks
 *    - Test with maximum allowed batch size
 *    - Test with duplicate keys in delete and update arrays
 *
 * 2. Error Handling and Exception Cases:
 *    - Test error handling for invalid data structures
 *    - Test error handling for storage failures
 *    - Test error handling for concurrent modifications
 *    - Test error handling for version conflicts
 *
 * 3. Data Integrity Validation:
 *    - Verify all required fields are preserved after updates
 *    - Verify timestamps are correctly updated
 *    - Verify data consistency after partial failures
 *    - Verify no unintended side effects on other bookmarks
 *
 * 4. Event Handling:
 *    - Test event emission for successful operations
 *    - Test event emission for failed operations
 *    - Test event emission order for combined operations
 *    - Test event payload correctness
 *
 * 5. Storage Isolation:
 *    - Test operations do not affect other storage instances
 *    - Test operations are atomic within the same instance
 *    - Test concurrent access handling
 *    - Test storage cleanup after operations
 *
 * 6. Version Compatibility:
 *    - Test backward compatibility with older data formats
 *    - Test forward compatibility with newer features
 *    - Test migration handling during operations
 *    - Test version number updates
 *
 * 7. Performance and Load Testing:
 *    - Test with large datasets
 *    - Test with high frequency operations
 *    - Test memory usage patterns
 *    - Test operation timing and optimization
 */
