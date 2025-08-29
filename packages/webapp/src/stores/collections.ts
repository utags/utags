import { get } from 'svelte/store'
import { persisted, type Persisted } from 'svelte-persisted-store'
import { STORAGE_KEY_COLLECTIONS } from '../config/constants.js'
import {
  mergeHashFiltersIntoSearchParams,
  convertCollectionToFilterParams,
} from '../utils/url-utils.js'

/**
 * Represents a bookmark collection with its metadata
 */
export type Collection = {
  id: string
  name: string
  pathname: string
  filterString: string
  created: number
  updated: number
}

/**
 * Parameters required for creating or updating a collection
 */
type SaveCollectionParams = {
  id?: string
  name: string
  pathname: string
  filterString?: string
}

let collections: Persisted<Collection[]>

const builtinCollections = [
  {
    id: crypto.randomUUID(),
    name: 'Starred',
    pathname: 'starred',
    filterString: `t=${['★', '★★', '★★★', '☆', '☆☆', '☆☆☆', 'starred'].join(
      ','
    )}`,
    created: 0,
    updated: 0,
  },
  {
    id: crypto.randomUUID(),
    name: 'Read Later',
    pathname: 'read-later',
    filterString: `t=${['read-later', 'Read Later', 'toread', '稍后阅读'].join(',')}`,
    created: 0,
    updated: 0,
  },
]

/**
 * Retrieves the collections store
 * Initializes the store if it hasn't been initialized yet
 *
 * @returns The persisted collections store
 */
export function getCollections() {
  collections ||= persisted(STORAGE_KEY_COLLECTIONS, [])
  return collections
}

/**
 * Deletes a collection by its ID
 *
 * @param id - The unique identifier of the collection to delete
 */
export function deleteCollection(id: string) {
  getCollections().update(($collections) =>
    $collections.filter((c) => c.id !== id)
  )
}

/**
 * Creates a new collection or updates an existing one
 *
 * @param collection - The collection data to save
 * @throws Error if validation fails (e.g., duplicate pathname, invalid input)
 */
export function saveCollection(collection: SaveCollectionParams) {
  const { id: currentCollectionId, name, pathname, filterString } = collection
  const $collections = get(getCollections())
  const now = Date.now()

  validateCollectionInput(collection, $collections, currentCollectionId)

  const updatedCollections = currentCollectionId
    ? updateExistingCollection(
        $collections,
        currentCollectionId,
        name,
        pathname,
        now
      )
    : createNewCollection($collections, name, pathname, filterString, now)

  getCollections().set(updatedCollections)
}

/**
 * Validates collection input data before saving
 *
 * @param collection - The collection data to validate
 * @param existingCollections - Array of existing collections for duplicate checking
 * @param currentCollectionId - ID of the collection being updated (if any)
 * @throws Error if validation fails
 */
function validateCollectionInput(
  collection: SaveCollectionParams,
  existingCollections: Collection[],
  currentCollectionId?: string
) {
  const { name, pathname } = collection

  if (
    currentCollectionId &&
    !existingCollections.some((c) => c.id === currentCollectionId)
  ) {
    throw new Error('Collection not found.')
  }

  const trimmedName = name?.trim()
  if (!trimmedName) {
    throw new Error('Collection name is required.')
  }

  const trimmedPathname = pathname?.trim()

  // Define reserved keywords
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const RESERVED_KEYWORDS = ['deleted', 'public', 'private', 'shared']

  // Check if pathname is a reserved keyword
  if (RESERVED_KEYWORDS.includes(trimmedPathname)) {
    throw new Error('Collection pathname is a reserved keyword.')
  }

  if (!/^[\w-]+$/.test(trimmedPathname)) {
    throw new Error(
      "Collection pathname is invalid. Only allow letters, numbers, '_' and '-'."
    )
  }

  if (
    existingCollections.some(
      (c) => c.pathname === trimmedPathname && c.id !== currentCollectionId
    )
  ) {
    throw new Error('Collection pathname already exists.')
  }
}

/**
 * Updates an existing collection with new data
 *
 * @param collections - Array of all collections
 * @param id - ID of the collection to update
 * @param name - New name for the collection
 * @param pathname - New pathname for the collection
 * @param updated - Timestamp for the update operation
 * @returns Updated array of collections
 */
// eslint-disable-next-line max-params
function updateExistingCollection(
  collections: Collection[],
  id: string,
  name: string,
  pathname: string,
  updated: number
) {
  return collections.map((c) =>
    c.id === id
      ? { ...c, name: name.trim(), pathname: pathname.trim(), updated }
      : c
  )
}

/**
 * Creates a new collection and adds it to the beginning of the collections array
 *
 * @param collections - Array of existing collections
 * @param name - Name for the new collection
 * @param pathname - Pathname for the new collection
 * @param filterString - Filter string for the new collection (optional)
 * @param created - Timestamp for the creation operation
 * @returns Updated array of collections with the new collection added
 */
// eslint-disable-next-line max-params
function createNewCollection(
  collections: Collection[],
  name: string,
  pathname: string,
  filterString: string | undefined,
  created: number
) {
  return [
    {
      id: crypto.randomUUID(),
      name: name.trim(),
      pathname: pathname.trim(),
      filterString:
        filterString ||
        convertCollectionToFilterParams(
          mergeHashFiltersIntoSearchParams(location.href)
        ).toString(),
      created,
      updated: created,
    },
    ...collections,
  ]
}

/**
 * Retrieves a collection's filter string by its pathname
 *
 * @param pathname - The pathname of the collection to find
 * @returns The filterString of the collection if found, undefined otherwise
 */
export function getFilterStringByPathname(
  pathname: string
): string | undefined {
  const $collections = get(getCollections())
  // If not found in user collections, search in builtin collections
  const collection =
    $collections.find((c) => c.pathname === pathname) ||
    builtinCollections.find((c) => c.pathname === pathname)

  return collection ? collection.filterString : undefined
}
