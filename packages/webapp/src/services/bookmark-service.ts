import { get } from 'svelte/store'
import { persisted, type Persisted } from 'svelte-persisted-store'
import Console from 'console-tagger'
import {
  STORAGE_KEY_BOOKMARKS,
  CURRENT_DATABASE_VERSION,
} from '../config/constants.js'
import type {
  BookmarksStore,
  BookmarkKeyValuePair,
} from '../types/bookmarks.js'

const console = new Console({
  prefix: 'bookmark-service',
  color: { line: 'black', background: 'red' },
})

// Event name for bookmark updates
// eslint-disable-next-line @typescript-eslint/naming-convention
const BOOKMARKS_UPDATED_EVENT = 'bookmarks-updated'

/**
 * Service class for managing bookmark data
 * Handles local storage, shared collections, and API interactions
 */
export class BookmarkService {
  /**
   * Get singleton instance of BookmarkService
   * @returns The singleton instance
   */
  public static getInstance(): BookmarkService {
    BookmarkService.instance ||= new BookmarkService()
    return BookmarkService.instance
  }

  private static instance: BookmarkService

  /**
   * Current bookmark store - can hold either regular bookmarks or deleted bookmarks
   * Uses persisted store for browser storage persistence
   */
  private currentStore: Persisted<BookmarksStore> = persisted(
    'temporary_bookmarks',
    {
      data: {},
      meta: {
        databaseVersion: CURRENT_DATABASE_VERSION,
        created: Date.now(),
      },
    },
    {
      storage: 'session',
      syncTabs: false,
    }
  )

  private currentStoreKey: string = STORAGE_KEY_BOOKMARKS
  private isSharedCollection = false
  private collectionId: string | undefined
  private visibility: string | undefined
  private apiBaseUrl = 'https://api.utags.link'
  private apiSuffix = ''

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  /**
   * Set API base URL for shared collections
   * @param url Base URL for the API
   */
  public setApiBaseUrl(url: string): void {
    this.apiBaseUrl = url.replace(/\/$/, '')
  }

  /**
   * Set API suffix for shared collections
   * @param suffix Suffix for the API, e.g., 'json'
   */
  public setApiSuffix(suffix: string): void {
    this.apiSuffix = suffix.replace(/^\./, '')
  }

  /**
   * Initialize bookmark store with appropriate storage key and data structure
   * Handles different collection types (regular, shared, deleted)
   *
   * @param collectionId Optional collection ID
   * @param visibility Collection visibility ('shared', 'public', 'private')
   */
  public initializeStore(
    collectionId?: string,
    visibility: string | undefined = undefined
  ): void {
    // Determine storage key
    let storageKey = STORAGE_KEY_BOOKMARKS

    // Soft-deleted bookmarks are part of the main store, no special key needed.

    if (
      visibility &&
      collectionId &&
      ['shared', 'public', 'private'].includes(visibility)
    ) {
      // For shared, public, or private collections, set isSharedCollection to true
      storageKey = `${STORAGE_KEY_BOOKMARKS}-${visibility}-${collectionId}`
      this.visibility = visibility
      this.isSharedCollection = true
      this.collectionId = collectionId
    } else {
      this.visibility = undefined
      this.isSharedCollection = false
      this.collectionId = collectionId // Still store collectionId if provided (e.g., for local named collections if any)
    }

    console.log(`Initializing bookmark store with key: ${storageKey}`)
    this.currentStoreKey = storageKey

    // Initialize store with appropriate default value
    this.currentStore = persisted<BookmarksStore>(storageKey, {
      data: {},
      meta: {
        databaseVersion: CURRENT_DATABASE_VERSION,
        created: Date.now(),
      },
    })

    // If it's a shared collection, fetch data from API
    if (this.isSharedCollection && this.collectionId) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.fetchSharedCollection()
    }
  }

  /**
   * Fetch shared collection data from remote API
   * Handles different visibility types (shared, public, private)
   *
   * @returns Promise that resolves when fetch is complete
   */
  public async fetchSharedCollection(): Promise<void> {
    if (!this.isSharedCollection || !this.visibility || !this.collectionId) {
      console.warn(
        'Cannot fetch: not a shared collection or missing collection ID'
      )
      return
    }

    // Store the current collectionId and visibility for later verification
    const requestCollectionId = this.collectionId
    const requestVisibility = this.visibility

    try {
      const apiSuffix = this.apiSuffix ? `.${this.apiSuffix}` : ''
      // Build API path based on visibility type
      const apiUrl = `${this.apiBaseUrl}/${requestVisibility}/${this.collectionId}${apiSuffix}`
      console.log(`Fetching ${requestVisibility} collection from: ${apiUrl}`)

      const response = await fetch(apiUrl)

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as BookmarksStore

      // Verify that the collection hasn't changed during the API request
      if (
        this.collectionId !== requestCollectionId ||
        this.visibility !== requestVisibility
      ) {
        console.warn(
          `Collection changed during API request. Ignoring response for ${requestVisibility}/${requestCollectionId}`
        )
        return
      }

      // Update local storage with fetched data
      this.updateStore(data)

      // Dispatch event to notify components about the update
      this.notifyUpdate()

      console.log(`${requestVisibility} collection updated successfully`)
    } catch (error) {
      console.error(`Failed to fetch ${requestVisibility} collection:`, error)
    }
  }

  /**
   * Add event listener for bookmark updates
   * Components can subscribe to receive notifications when bookmarks change
   *
   * @param callback Function to call when bookmarks are updated
   */
  public onUpdate(callback: (event: CustomEvent) => void): void {
    globalThis.addEventListener(
      BOOKMARKS_UPDATED_EVENT,
      callback as EventListener
    )
  }

  /**
   * Remove event listener for bookmark updates
   * Components should call this when unmounting to prevent memory leaks
   *
   * @param callback Function to remove from event listeners
   */
  public offUpdate(callback: (event: CustomEvent) => void): void {
    globalThis.removeEventListener(
      BOOKMARKS_UPDATED_EVENT,
      callback as EventListener
    )
  }

  /**
   * Get current bookmark data as an array of key-value pairs.
   *
   * @returns Array of bookmark key-value pairs.
   */
  public getBookmarks(): BookmarkKeyValuePair[] {
    const bookmarksData = get(this.currentStore)

    // This method now always converts from BookmarksStore format.
    // Filtering of soft-deleted bookmarks should be handled by the caller if needed.
    return Object.entries(bookmarksData.data)
  }

  /**
   * Check if current store is a shared collection
   * @returns True if the current collection is shared, false otherwise
   */
  public isShared(): boolean {
    return this.isSharedCollection
  }

  /**
   * Get current collection ID
   * @returns The current collection ID or undefined if no collection is active
   */
  public getCollectionId(): string | undefined {
    return this.collectionId
  }

  /**
   * Get current collection visibility
   * @returns The visibility type ('shared', 'public', 'private') or undefined
   */
  public getVisibility(): string | undefined {
    return this.visibility
  }

  /**
   * Get the current store instance
   * @returns The persisted store instance for bookmarks
   */
  public getStore(): Persisted<BookmarksStore> {
    return this.currentStore
  }

  /**
   * Update store with new data
   * Handles different data structures and ensures database version compatibility
   *
   * @param data New bookmark data
   * @throws Error when database versions are incompatible
   */
  private updateStore(data: BookmarksStore): void {
    // This method now always expects BookmarksStore format.

    const bookmarksData = data
    const currentData = get(this.currentStore)

    // Verify database version compatibility
    if (
      bookmarksData.meta?.databaseVersion &&
      bookmarksData.meta.databaseVersion !== CURRENT_DATABASE_VERSION
    ) {
      throw new Error(
        `Database version mismatch: expected ${CURRENT_DATABASE_VERSION}, got ${bookmarksData.meta.databaseVersion}`
      )
    }

    // Merge metadata
    const updatedData: BookmarksStore = {
      data: { ...bookmarksData.data },
      meta: {
        ...currentData.meta,
        updated: Date.now(),
        // Preserve original creation date if it exists
        created: currentData.meta.created || Date.now(),
        // Keep current database version
        databaseVersion: CURRENT_DATABASE_VERSION,
      },
    }

    // Update the store
    this.currentStore.set(updatedData)
  }

  /**
   * Notify components about bookmark data update
   * Dispatches a custom event with collection details
   */
  private notifyUpdate(): void {
    const event = new CustomEvent(BOOKMARKS_UPDATED_EVENT, {
      detail: {
        isShared: this.isSharedCollection,
        collectionId: this.collectionId,
        visibility: this.visibility,
      },
    })
    globalThis.dispatchEvent(event)
  }
}
