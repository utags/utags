import { describe, it, expect, beforeEach, vi } from 'vitest'
import { get } from 'svelte/store'
import { STORAGE_KEY_COLLECTIONS } from '../config/constants.js'
import {
  getCollections,
  deleteCollection,
  saveCollection,
  getFilterStringByPathname,
} from './collections.js'

let storageChangeHandler: ((event: StorageEvent) => void) | undefined
// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem(key: string, value: string) {
      store[key] = value.toString()
      if (typeof storageChangeHandler === 'function') {
        // @ts-expect-error - StorageEvent is not defined in vitest
        storageChangeHandler({ key, newValue: value })
      }
    },
    clear() {
      store = {}
    },
  }
})()

// Mock localStorage for svelte-persisted-store
vi.stubGlobal('localStorage', localStorageMock)
// Mock document for svelte-persisted-store
vi.stubGlobal('document', {})
// Mock window for svelte-persisted-store
vi.stubGlobal('window', {
  addEventListener(type: string, handler: (event: StorageEvent) => void) {
    console.log('addEventListener', type)
    if (type === 'storage') {
      storageChangeHandler = handler
    }
  },
  removeEventListener(type: string) {
    console.log('removeEventListener', type)
    if (type === 'storage') {
      // storageChangeHandler = null
    }
  },
})

// Mock location object for URL-related tests
const locationMock = {
  href: 'http://test.com/?q=search&t=tag1,tag2&d=example.com',
}

vi.stubGlobal('location', locationMock)

const collections = getCollections()

describe('collections store', () => {
  beforeEach(() => {
    // Reset store and localStorage before each test
    collections.set([])
    localStorage.clear()
  })

  describe('deleteCollection', () => {
    it('should remove collection with given id', () => {
      const testCollection = {
        id: '1',
        name: 'Test',
        pathname: 'test',
        filterString: '',
        created: Date.now(),
        updated: Date.now(),
      }
      collections.set([testCollection])

      expect(get(collections)).toEqual([testCollection])

      deleteCollection('1')

      expect(get(collections)).toEqual([])
    })

    it('should do nothing if collection not found', () => {
      const testCollection = {
        id: '1',
        name: 'Test',
        pathname: 'test',
        filterString: '',
        created: Date.now(),
        updated: Date.now(),
      }
      collections.set([testCollection])

      deleteCollection('2')

      expect(get(collections)).toEqual([testCollection])
    })
  })

  describe('saveCollection', () => {
    it('should create new collection when no id provided', () => {
      const now = Date.now()
      vi.useFakeTimers().setSystemTime(now)

      saveCollection({
        name: 'New Collection',
        pathname: 'new-collection',
      })

      const result = get(collections)
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('New Collection')
      expect(result[0].pathname).toBe('new-collection')
      expect(result[0].created).toBe(now)
      expect(result[0].updated).toBe(now)
      expect(result[0].id).toBeDefined()
      expect(result[0].filterString).toBe(
        'q=search&t=tag1%2Ctag2&d=example.com'
      )
    })

    it('should update existing collection when id provided', () => {
      const oldTime = Date.now() - 1000
      const testCollection = {
        id: '1',
        name: 'Old Name',
        pathname: 'old-path',
        filterString: '',
        created: oldTime,
        updated: oldTime,
      }
      collections.set([testCollection])

      const now = Date.now()
      vi.useFakeTimers().setSystemTime(now)

      saveCollection({
        id: '1',
        name: 'New Name',
        pathname: 'new-path',
      })

      const result = get(collections)
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('New Name')
      expect(result[0].pathname).toBe('new-path')
      expect(result[0].created).toBe(oldTime) // Created time should not change
      expect(result[0].updated).toBe(now) // Updated time should be updated
    })

    it('should throw error when collection name is empty', () => {
      expect(() => {
        saveCollection({
          name: '',
          pathname: 'test',
        })
      }).toThrow('Collection name is required.')
    })

    it('should throw error when pathname is invalid', () => {
      expect(() => {
        saveCollection({
          name: 'Test',
          pathname: 'invalid path',
        })
      }).toThrow('Collection pathname is invalid.')
    })

    it('should throw error when pathname is a reserved keyword', () => {
      // Test 'deleted' reserved keyword
      expect(() => {
        saveCollection({
          name: 'Deleted Items',
          pathname: 'deleted',
        })
      }).toThrow('Collection pathname is a reserved keyword.')

      // Test 'public' reserved keyword
      expect(() => {
        saveCollection({
          name: 'Public Collection',
          pathname: 'public',
        })
      }).toThrow('Collection pathname is a reserved keyword.')

      // Test 'private' reserved keyword
      expect(() => {
        saveCollection({
          name: 'Private Collection',
          pathname: 'private',
        })
      }).toThrow('Collection pathname is a reserved keyword.')

      // Test 'shared' reserved keyword
      expect(() => {
        saveCollection({
          name: 'Shared Collection',
          pathname: 'shared',
        })
      }).toThrow('Collection pathname is a reserved keyword.')
    })

    it('should throw error when pathname already exists', () => {
      collections.set([
        {
          id: '1',
          name: 'Existing',
          pathname: 'existing',
          filterString: '',
          created: Date.now(),
          updated: Date.now(),
        },
      ])

      expect(() => {
        saveCollection({
          name: 'Test',
          pathname: 'existing',
        })
      }).toThrow('Collection pathname already exists.')
    })

    it('should maintain collection order when updating an existing collection', () => {
      // Prepare multiple test collections
      const collection1 = {
        id: '1',
        name: 'First Collection',
        pathname: 'first',
        filterString: 'tag=first',
        created: Date.now() - 3000,
        updated: Date.now() - 3000,
      }

      const collection2 = {
        id: '2',
        name: 'Second Collection',
        pathname: 'second',
        filterString: 'tag=second',
        created: Date.now() - 2000,
        updated: Date.now() - 2000,
      }

      const collection3 = {
        id: '3',
        name: 'Third Collection',
        pathname: 'third',
        filterString: 'tag=third',
        created: Date.now() - 1000,
        updated: Date.now() - 1000,
      }

      // Set initial collection data
      collections.set([collection1, collection2, collection3])

      // Update the middle collection
      const now = Date.now()
      vi.useFakeTimers().setSystemTime(now)

      saveCollection({
        id: '2',
        name: 'Updated Second',
        pathname: 'second',
      })

      // Verify results
      const result = get(collections)
      expect(result.length).toBe(3)

      // Verify order remains unchanged
      expect(result[0].id).toBe('1')
      expect(result[1].id).toBe('2')
      expect(result[2].id).toBe('3')

      // Verify only the specified collection was updated
      expect(result[0].name).toBe('First Collection')
      expect(result[1].name).toBe('Updated Second')
      expect(result[2].name).toBe('Third Collection')

      // Verify update time only changed for the specified collection
      expect(result[0].updated).toBe(collection1.updated)
      expect(result[1].updated).toBe(now)
      expect(result[2].updated).toBe(collection3.updated)
    })

    it('should place new collection at the beginning of the array', () => {
      // Prepare multiple test collections
      const collection1 = {
        id: '1',
        name: 'First Collection',
        pathname: 'first',
        filterString: 'tag=first',
        created: Date.now() - 2000,
        updated: Date.now() - 2000,
      }

      const collection2 = {
        id: '2',
        name: 'Second Collection',
        pathname: 'second',
        filterString: 'tag=second',
        created: Date.now() - 1000,
        updated: Date.now() - 1000,
      }

      // Set initial collection data
      collections.set([collection1, collection2])

      // Add new collection
      const now = Date.now()
      vi.useFakeTimers().setSystemTime(now)

      saveCollection({
        name: 'New Collection',
        pathname: 'new',
        filterString: 'tag=new',
      })

      // Verify results
      const result = get(collections)
      expect(result.length).toBe(3)

      // Verify new collection is added to the beginning of the array
      expect(result[0].name).toBe('New Collection')
      expect(result[0].pathname).toBe('new')
      expect(result[0].filterString).toBe('tag=new')
      expect(result[0].created).toBe(now)

      // Verify original collections order remains unchanged
      expect(result[1].id).toBe('1')
      expect(result[2].id).toBe('2')
    })

    it('should handle updating collection with pathname change', () => {
      // Prepare multiple test collections
      const collection1 = {
        id: '1',
        name: 'First Collection',
        pathname: 'first',
        filterString: 'tag=first',
        created: Date.now() - 2000,
        updated: Date.now() - 2000,
      }

      const collection2 = {
        id: '2',
        name: 'Second Collection',
        pathname: 'second',
        filterString: 'tag=second',
        created: Date.now() - 1000,
        updated: Date.now() - 1000,
      }

      // Set initial collection data
      collections.set([collection1, collection2])

      // Update collection with pathname change
      const now = Date.now()
      vi.useFakeTimers().setSystemTime(now)

      saveCollection({
        id: '1',
        name: 'Updated First',
        pathname: 'first-updated',
      })

      // Verify results
      const result = get(collections)
      expect(result.length).toBe(2)

      // Verify collection was correctly updated
      expect(result[0].id).toBe('1')
      expect(result[0].name).toBe('Updated First')
      expect(result[0].pathname).toBe('first-updated')
      expect(result[0].updated).toBe(now)
      expect(result[0].created).toBe(collection1.created) // Creation time should not change

      // Verify other collections are not affected
      expect(result[1].id).toBe('2')
      expect(result[1].pathname).toBe('second')
    })

    it('should throw error when updating non-existent collection', () => {
      // Prepare test data
      collections.set([
        {
          id: '1',
          name: 'Existing',
          pathname: 'existing',
          filterString: '',
          created: Date.now(),
          updated: Date.now(),
        },
      ])

      // Attempt to update non-existent collection
      expect(() => {
        saveCollection({
          id: 'non-existent-id',
          name: 'Test',
          pathname: 'test',
        })
      }).toThrow('Collection not found.')
    })

    it('should use provided filterString when creating new collection', () => {
      saveCollection({
        name: 'Test',
        pathname: 'test',
        filterString: 't=tag1,tag2&d=example.com&q=keyword',
      })

      const result = get(collections)
      expect(result[0].filterString).toBe('t=tag1,tag2&d=example.com&q=keyword')
    })
  })

  describe('persistence', () => {
    it('should persist collections to localStorage', () => {
      const testData = [
        {
          id: '1',
          name: 'Test',
          pathname: 'test',
          filterString: '',
          created: Date.now(),
          updated: Date.now(),
        },
      ]

      collections.set(testData)

      const stored = localStorage.getItem(STORAGE_KEY_COLLECTIONS)
      expect(stored).toBe(JSON.stringify(testData))
    })

    it('should load collections from localStorage on init', () => {
      const testData = [
        {
          id: '2',
          name: 'Test',
          pathname: 'test',
          filterString: '',
          created: Date.now(),
          updated: Date.now(),
        },
      ]

      localStorage.setItem(STORAGE_KEY_COLLECTIONS, JSON.stringify(testData))

      expect(get(collections)).toEqual(testData)
    })
  })

  describe('getFilterStringByPathname', () => {
    it('should return filterString when collection with matching pathname exists', () => {
      // Prepare test data
      const testCollection = {
        id: '1',
        name: 'Test Collection',
        pathname: 'test-collection',
        filterString: 'tag=test&domain=example.com',
        created: Date.now(),
        updated: Date.now(),
      }
      collections.set([testCollection])

      // Call function
      const result = getFilterStringByPathname('test-collection')

      // Verify result
      expect(result).toBe('tag=test&domain=example.com')
    })

    it('should return undefined when collection with matching pathname does not exist', () => {
      // Prepare test data
      const testCollection = {
        id: '1',
        name: 'Test Collection',
        pathname: 'test-collection',
        filterString: 'tag=test',
        created: Date.now(),
        updated: Date.now(),
      }
      collections.set([testCollection])

      // Call function
      const result = getFilterStringByPathname('non-existent-collection')

      // Verify result
      expect(result).toBeUndefined()
    })

    it('should return undefined when collections array is empty', () => {
      // Prepare empty collection
      collections.set([])

      // Call function
      const result = getFilterStringByPathname('any-pathname')

      // Verify result
      expect(result).toBeUndefined()
    })

    it('should perform case-sensitive pathname matching', () => {
      // Prepare test data
      const testCollection = {
        id: '1',
        name: 'Test Collection',
        pathname: 'Test-Collection',
        filterString: 'tag=test',
        created: Date.now(),
        updated: Date.now(),
      }
      collections.set([testCollection])

      // Call function - case mismatch
      const result = getFilterStringByPathname('test-collection')

      // Verify result
      expect(result).toBeUndefined()

      // Call function - exact case match
      const exactMatch = getFilterStringByPathname('Test-Collection')

      // Verify result
      expect(exactMatch).toBe('tag=test')
    })

    it('should handle special characters in pathname correctly', () => {
      // Prepare test data - Note: In real application, validateCollectionInput would prevent special characters
      // but we're testing the function's behavior in isolation
      const testCollection = {
        id: '1',
        name: 'Special Collection',
        pathname: 'special_collection',
        filterString: 'tag=special',
        created: Date.now(),
        updated: Date.now(),
      }
      collections.set([testCollection])

      // Call function
      const result = getFilterStringByPathname('special_collection')

      // Verify result
      expect(result).toBe('tag=special')
    })

    it('should return filterString from builtin collections when not found in user collections', () => {
      // Prepare empty user collections
      collections.set([])

      // Call function with builtin collection pathname
      const starredResult = getFilterStringByPathname('starred')
      const readLaterResult = getFilterStringByPathname('read-later')

      // Verify results - should find builtin collections
      expect(starredResult).toBeDefined()
      expect(starredResult).toContain('t=')
      expect(starredResult).toContain('starred')

      expect(readLaterResult).toBeDefined()
      expect(readLaterResult).toContain('t=')
      expect(readLaterResult).toContain('read-later')
    })

    it('should prioritize user collections over builtin collections', () => {
      // Prepare user collection with same pathname as builtin
      const userCollection = {
        id: '1',
        name: 'User Starred',
        pathname: 'starred',
        filterString: 'tag=user-starred',
        created: Date.now(),
        updated: Date.now(),
      }
      collections.set([userCollection])

      // Call function
      const result = getFilterStringByPathname('starred')

      // Verify result - should return user collection, not builtin
      expect(result).toBe('tag=user-starred')
    })
  })
})
