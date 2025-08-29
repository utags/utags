/**
 * Represents the metadata associated with a bookmark.
 * This type includes standard fields and allows for arbitrary, user-defined fields via an index signature.
 */
export type BookmarkMetadata = {
  /**
   * Index signature allowing for arbitrary, dynamically-defined key-value pairs.
   * This provides flexibility for users or extensions to add custom metadata fields to bookmarks.
   * Keys are strings, and values can be of any type.
   * Example: `customField: 'customValue'`, `priority: 1`
   */
  [key: string]: any
  /** The primary URL of the bookmark. This is typically the direct link to the bookmarked content. Optional. */
  url?: string
  /** The main title of the bookmark. Optional. */
  title?: string
  /** An optional shorter version of the title, suitable for display in constrained spaces. */
  shortTitle?: string
  /** An optional user-provided description of the bookmark. */
  description?: string
  /** Optional personal notes or annotations related to the bookmark. */
  note?: string
  /** The URL of the favicon for the bookmarked page. Optional. */
  favicon?: string
  /** The URL of a cover image or a representative image for the bookmark. Optional. */
  coverImage?: string
  /**
   * The canonical or main URL if the `url` field points to a specific part or version of a larger resource.
   * For example, if `url` is a deep link, `mainUrl` could be the homepage of the site. Optional.
   */
  mainUrl?: string
  /**
   * Timestamp (in milliseconds since the UNIX epoch) indicating when the bookmark was initially created.
   * This value is set once upon creation and should remain immutable.
   */
  created: number
  /**
   * Timestamp (in milliseconds since the UNIX epoch) of the last manual edit by the user.
   * This includes direct modifications to fields like title, URL, tags, description, or notes via the application's edit interface.
   * This field is ONLY updated when the user manually edits the bookmark through the UI.
   * It should NOT be updated by automated processes such as sync, import, or batch operations.
   */
  updated: number
  /**
   * Timestamp (in milliseconds since the UNIX epoch) of the last batch modification to the bookmark.
   * This field is updated when the bookmark is modified through batch operations, including:
   *  - Bulk tagging or tag removal operations
   *  - Batch deletion and restoration operations
   *  - Mass editing operations that affect multiple bookmarks simultaneously
   * This timestamp helps track when bookmarks were last modified through automated bulk processes.
   */
  updated2?: number
  /**
   * Timestamp (in milliseconds since the UNIX epoch) of the last synchronization or import merge operation.
   * This field is updated when the bookmark is modified during:
   *  - Synchronization processes with remote servers (merge conflicts resolution)
   *  - Import operations that merge or overwrite existing bookmark data
   *  - Data reconciliation processes during sync operations
   * This timestamp is crucial for sync conflict resolution and tracking data merge history.
   */
  updated3?: number
  /**
   * Timestamp (in milliseconds since the UNIX epoch) indicating when the bookmark was soft-deleted.
   * A value here signifies that the bookmark is marked as deleted but may still be recoverable.
   * Undefined or 0 if the bookmark is active. Optional.
   */
  deleted?: number
  /** Optional: The IETF language tag (e.g., "en", "zh-CN") for the content of the bookmark. */
  lang?: string
  /** Optional: A user-defined numerical rating for the bookmark. */
  rating?: number
  /** Optional: A boolean flag indicating whether the user has marked this bookmark as read. */
  read?: boolean
  /** Optional: A string indicating the source or method by which the bookmark was added (e.g., "import", "manual", "extension"). */
  source?: string
  /** Optional: Search keywords associated with the bookmark for enhanced searchability. */
  searchKeyword?: string
}

/**
 * The tags and metadata of a bookmark.
 */
export type BookmarkTagsAndMetadata = {
  tags: string[]
  meta: BookmarkMetadata
  // /**
  //  * The alternate URLs of the bookmark.
  //  */
  // urls?: string[]
  // relatedUrls: []
  /**
   * The hilights of the bookmark.
   */
  hilights?: [
    {
      /**
       * The timestamp of the creation of the hilight.
       */
      created: number
      /**
       * The timestamp of the last update of the hilight.
       */
      updated: number
      /**
       * The text of the hilight.
       */
      text: string
      color?: string
      /**
       * The note of the hilight.
       */
      note?: string
      /**
       * The type of the hilight.
       */
      type?: string
    },
  ]
  deletedMeta?: {
    /**
     * The timestamp of the deletion of the bookmark.
     */
    deleted: number
    actionType: DeleteActionType
  }
  importedMeta?: {
    /**
     * The timestamp of the import of the bookmark.
     */
    imported: number
    /**
     * The source of the import.
     */
    source: string
    /**
     * The type of the import.
     */
    type: string
  }
}

/**
 * Alias for BookmarkTagsAndMetadata
 */
export type BookmarkEntry = BookmarkTagsAndMetadata

/**
 * The key is the URL of the bookmark.
 */
export type BookmarkKey = string

/**
 * A tuple representing a bookmark entry with its URL and associated data.
 * The first element is the bookmark URL (key), and the second element contains tags and metadata.
 * Used primarily in array-based bookmark operations and data transformations.
 */
export type BookmarkKeyValuePair = [BookmarkKey, BookmarkTagsAndMetadata]

export type BookmarkObject = {
  key: BookmarkKey
  entry: BookmarkTagsAndMetadata
}

/**
 * The value is an object containing the tags and metadata of the bookmark.
 */
export type BookmarksData = Record<BookmarkKey, BookmarkTagsAndMetadata>

/**
 * Statistics interface for bookmark data
 */
export type BookmarkStats = {
  /** Total number of bookmarks */
  bookmarksCount: number
  /** Total number of unique tags */
  tagsCount: number
  /** Total number of all tags (including duplicates) */
  totalTagsCount: number
  /** Total number of unique domains */
  domainsCount: number
}

/**
 * The bookmarks store.
 * This is the main data structure that holds all bookmark information.
 * It contains both the actual bookmark data and metadata about the store itself.
 */
export type BookmarksStore = {
  /**
   * The collection of all bookmarks, organized as a record with URLs as keys.
   * Each entry contains tags and metadata for a specific bookmark.
   */
  data: BookmarksData
  /**
   * Metadata about the bookmarks store.
   * Contains version information and timestamps for tracking database state.
   */
  meta: {
    /**
     * The version number of the database schema.
     * Used to handle migrations between different data structure versions.
     */
    databaseVersion: number
    /**
     * The timestamp when the bookmarks store was initially created.
     * Stored as milliseconds since epoch.
     */
    created: number
    /**
     * The timestamp when the bookmarks store was last updated.
     * Stored as milliseconds since epoch.
     */
    updated?: number
    /**
     * The timestamp when the bookmarks were last exported.
     * Only used during bookmark export operations.
     * Stored as milliseconds since epoch.
     */
    exported?: number
    /**
     * Optional statistics about the bookmarks store.
     * Contains aggregated data and metrics for the bookmark collection.
     */
    stats?: BookmarkStats
    /**
     * Information about the last device that uploaded data to this store.
     * This helps track sync operations across multiple devices.
     */
    lastUploadDevice?: {
      /** Unique device identifier */
      deviceId: string
      /** Browser name and version */
      browser: string
      /** Operating system information */
      os: string
      /** Device type (desktop, mobile, tablet) */
      deviceType: string
      /** Timestamp when the upload occurred */
      uploadTimestamp: number
      /** User agent string */
      userAgent: string
      /** The origin (domain) from which the data was uploaded */
      origin: string
      /** Last data change timestamp from service config */
      lastDataChangeTimestamp?: number
      /** Current sync operation timestamp */
      currentSyncTimestamp?: number
    }
  }
}

export type TagHierarchyItem = {
  name: string
  path: string
  query: string
  count: number
  children: TagHierarchyItem[]
  expanded: boolean
}

/**
 * Props interface for BookmarkListItem component
 */
export type BookmarkListItemProps = {
  href: string
  tags: string[]
  title: string
  description?: string
  note?: string
  formatedUpdated?: string
  dateTitleText: string
}

/**
 * Represents the type of delete action performed on a bookmark.
 */
/**
 * Represents the specific type of action that led to a bookmark's (soft) deletion.
 * This helps in understanding the context of the deletion, especially for undo operations or analytics.
 */
export type DeleteActionType =
  | 'DELETE' // Standard deletion action initiated by the user.
  | 'IMPORT' // Bookmark was part of an import process and might have been marked for deletion based on import rules.
  | 'SYNC' // Deletion occurred as a result of a synchronization process with another data source.
  | 'BATCH_DELETE_BOOKMARKS' // Bookmark was deleted as part of a batch operation to remove multiple bookmarks.
  | 'BATCH_REMOVE_TAGS' // Bookmark was (soft) deleted because all its tags were removed in a batch operation.
  | 'LAST_TAG_REMOVED' // Bookmark was (soft) deleted because its last remaining tag was removed.
