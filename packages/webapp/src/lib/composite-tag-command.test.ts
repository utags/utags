import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BookmarkKeyValuePair } from '../types/bookmarks.js'
import { DELETED_BOOKMARK_TAG } from '../config/constants.js'
import { filterBookmarksByUrls } from '../utils/bookmarks.js'
import {
  AddTagCommand,
  RemoveTagCommand,
  RenameTagCommand,
  CompositeTagCommand,
} from './tag-commands.js'

// Helper function to create a deep copy of bookmarks
function deepCopyBookmarks(
  bookmarks: BookmarkKeyValuePair[]
): BookmarkKeyValuePair[] {
  return structuredClone(bookmarks)
}

// Simulate a global, mutable bookmark store for testing command effects
let originalBookmarksStore: BookmarkKeyValuePair[] = []

// Mock callback for resolving bookmarks from the mutable store
const mockResolveBookmarksCallback = vi.fn(
  (urls: string[]): BookmarkKeyValuePair[] =>
    filterBookmarksByUrls(originalBookmarksStore, urls)
)

describe('CompositeTagCommand', () => {
  let initialBookmarks: BookmarkKeyValuePair[]

  beforeEach(() => {
    // Reset the store and callback for each test
    initialBookmarks = [
      [
        'url1',
        {
          tags: ['tagA', 'tagB'],
          meta: {
            title: 'Bookmark 1',
            created: new Date('2023-05-28').getTime(),
            updated: new Date('2023-05-29').getTime(),
          },
        },
      ],
      [
        'url2',
        {
          tags: ['tagB', 'tagC'],
          meta: {
            title: 'Bookmark 2',
            created: new Date('2023-06-20').getTime(),
            updated: new Date('2023-08-29').getTime(),
          },
        },
      ],
      [
        'url3',
        {
          tags: ['tagD'],
          meta: {
            title: 'Bookmark 3',
            created: new Date('2023-05-22').getTime(),
            updated: new Date('2023-06-18').getTime(),
          },
        },
      ],
    ]
    originalBookmarksStore = deepCopyBookmarks(initialBookmarks)
    mockResolveBookmarksCallback.mockClear()
  })

  describe('constructor', () => {
    it('should correctly initialize with commands, type, and name', () => {
      const cmd1 = new AddTagCommand(['url1'], 'newTag')
      const cmd2 = new RemoveTagCommand(['url2'], 'tagC')
      const composite = new CompositeTagCommand(
        [cmd1, cmd2],
        'add',
        'My Composite Add'
      )

      expect(composite.getType()).toBe('add')
      expect(composite.getName()).toBe('My Composite Add')
      // Check if sub-commands are stored (internal, but good to infer)
      // This is an indirect check, as 'commands' is private.
      // We can test its behavior in execute/undo.
    })
  })

  describe('execute', () => {
    it('should execute all sub-commands and aggregate results', () => {
      const cmd1 = new AddTagCommand(['url1'], 'tagX')
      const cmd2 = new RemoveTagCommand(['url2'], 'tagC')
      const cmd3 = new RenameTagCommand(['url3'], 'tagD', 'tagD_renamed')
      const composite = new CompositeTagCommand([cmd1, cmd2, cmd3], 'add')

      const resolvedBookmarksForComposite = mockResolveBookmarksCallback(
        composite.getBookmarkUrls()
      )
      composite.execute(resolvedBookmarksForComposite)

      const result = composite.getExecutionResult()
      expect(result).toBeDefined()
      expect(result?.affectedCount).toBe(3) // url1, url2, url3 affected
      expect(result?.deletedCount).toBe(0)
      expect(result?.originalStates.size).toBe(3)

      // Verify changes in the store
      const bm1 = originalBookmarksStore.find(([url]) => url === 'url1')?.[1]
      const bm2 = originalBookmarksStore.find(([url]) => url === 'url2')?.[1]
      const bm3 = originalBookmarksStore.find(([url]) => url === 'url3')?.[1]

      expect(bm1?.tags).toEqual(
        expect.arrayContaining(['tagA', 'tagB', 'tagX'])
      )
      expect(bm2?.tags).toEqual(expect.arrayContaining(['tagB'])) // tagC removed
      expect(bm2?.tags).not.toContain('tagC')
      expect(bm3?.tags).toEqual(expect.arrayContaining(['tagD_renamed']))
      expect(bm3?.tags).not.toContain('tagD')
    })

    it('should handle empty sub-commands list', () => {
      const composite = new CompositeTagCommand([], 'add')
      const resolvedBookmarksForComposite = mockResolveBookmarksCallback(
        composite.getBookmarkUrls()
      )
      composite.execute(resolvedBookmarksForComposite)

      const result = composite.getExecutionResult()
      expect(result).toBeDefined()
      expect(result?.affectedCount).toBe(0)
      expect(result?.deletedCount).toBe(0)
      expect(result?.originalStates.size).toBe(0)
      expect(originalBookmarksStore).toEqual(initialBookmarks) // No changes
    })

    it('should correctly aggregate originalStates, prioritizing first encountered for a URL', () => {
      // cmd1 affects url1, cmd2 also affects url1 (e.g., remove then add)
      const cmd1 = new RemoveTagCommand(['url1'], 'tagA')
      const cmd2 = new AddTagCommand(['url1'], 'tagZ') // This add will happen after remove
      const composite = new CompositeTagCommand([cmd1, cmd2], 'add')

      const resolvedBookmarksForComposite = mockResolveBookmarksCallback(
        composite.getBookmarkUrls()
      )
      composite.execute(resolvedBookmarksForComposite)

      const result = composite.getExecutionResult()
      expect(result).toBeDefined()
      expect(result?.affectedCount).toBe(1) // Only url1 is affected
      expect(result?.originalStates.size).toBe(1)

      // The original state should be from cmd1 (the first command affecting url1)
      const originalStateForUrl1 = result?.originalStates.get('url1')
      expect(originalStateForUrl1?.tags).toEqual(['tagA', 'tagB'])

      // Verify final state in store
      const bm1 = originalBookmarksStore.find(([url]) => url === 'url1')?.[1]
      expect(bm1?.tags).toEqual(expect.arrayContaining(['tagB', 'tagZ']))
      expect(bm1?.tags).not.toContain('tagA')
    })

    it('should handle sub-commands that do not affect any bookmarks', () => {
      const cmd1 = new AddTagCommand(['url-non-existent'], 'tagX')
      const cmd2 = new RemoveTagCommand(['url1'], 'tagNonExistent')
      const composite = new CompositeTagCommand([cmd1, cmd2], 'add')

      const resolvedBookmarksForComposite = mockResolveBookmarksCallback(
        composite.getBookmarkUrls()
      )
      composite.execute(resolvedBookmarksForComposite)

      const result = composite.getExecutionResult()
      expect(result).toBeDefined()
      // cmd1 affects 0, cmd2 affects 0 (tagNonExistent not on url1)
      // However, AddTagCommand and RemoveTagCommand might still produce an originalState entry
      // if the bookmark URL exists, even if no tags are changed.
      // Let's check the implementation: AddTagCommand only adds to originalStates if tagsToAdd.length > 0.
      // RemoveTagCommand only adds if allTagsToRemovePresent is true.
      // So, in this case, affectedCount should be 0.
      expect(result?.affectedCount).toBe(0)
      expect(result?.deletedCount).toBe(0)
      expect(result?.originalStates.size).toBe(0)
      expect(originalBookmarksStore).toEqual(initialBookmarks)
    })

    it('should correctly handle deletion and undeletion within sub-commands', () => {
      const cmd1 = new AddTagCommand(
        ['url1'],
        DELETED_BOOKMARK_TAG,
        // @ts-expect-error for testing
        'USER_DELETED'
      ) // Delete url1
      const cmd2 = new RemoveTagCommand(['url1'], DELETED_BOOKMARK_TAG) // Undelete url1
      const composite = new CompositeTagCommand([cmd1, cmd2], 'add')

      const resolvedBookmarksForComposite = mockResolveBookmarksCallback(
        composite.getBookmarkUrls()
      )
      composite.execute(resolvedBookmarksForComposite)

      const result = composite.getExecutionResult()
      expect(result).toBeDefined()
      expect(result?.affectedCount).toBe(1) // url1 was affected
      // deletedCount is tricky for composite. cmd1 increments, cmd2 might decrement (if it clears deletedMeta).
      // The composite's deletedCount is sum of sub-command's deletedCount.
      // AddTagCommand's deletedCount is 1 if DELETED_BOOKMARK_TAG is added.
      // RemoveTagCommand's deletedCount is 0 (it doesn't mark as newly deleted when removing DELETED_BOOKMARK_TAG).
      // So, composite deletedCount should be 1 from cmd1.
      expect(result?.deletedCount).toBe(1)
      expect(result?.originalStates.size).toBe(1)
      expect(result?.originalStates.get('url1')?.tags).toEqual(['tagA', 'tagB'])

      const bm1 = originalBookmarksStore.find(([url]) => url === 'url1')?.[1]
      expect(bm1?.tags).toEqual(['tagA', 'tagB']) // Back to original tags, DELETED_BOOKMARK_TAG removed
      expect(bm1?.deletedMeta).toBeUndefined()
    })
  })

  describe('undo', () => {
    it('should undo all sub-commands in reverse order', () => {
      const cmd1 = new AddTagCommand(['url1'], 'tagX')
      const cmd2 = new RemoveTagCommand(['url2'], 'tagC')
      const cmd3 = new RenameTagCommand(['url3'], 'tagD', 'tagD_renamed')
      const composite = new CompositeTagCommand([cmd1, cmd2, cmd3], 'add')

      // Execute first
      let resolvedBookmarks = mockResolveBookmarksCallback(
        composite.getBookmarkUrls()
      )
      composite.execute(resolvedBookmarks)

      // Now undo
      resolvedBookmarks = mockResolveBookmarksCallback(
        composite.getBookmarkUrls()
      )
      composite.undo(resolvedBookmarks)

      // Verify store is back to initial state for these bookmarks
      const bm1 = originalBookmarksStore.find(([url]) => url === 'url1')?.[1]
      const bm2 = originalBookmarksStore.find(([url]) => url === 'url2')?.[1]
      const bm3 = originalBookmarksStore.find(([url]) => url === 'url3')?.[1]

      expect(bm1?.tags).toEqual(['tagA', 'tagB'])
      expect(bm2?.tags).toEqual(['tagB', 'tagC'])
      expect(bm3?.tags).toEqual(['tagD'])

      // Execution result should be cleared after undo for the composite command
      composite.clearExecutionResult()
      expect(composite.getExecutionResult()).toBeUndefined()
      // Also check sub-commands (indirectly, by verifying state)
    })

    it('should correctly undo a sequence involving deletion and undeletion', () => {
      // Initial: url1: ['tagA', 'tagB']
      const cmd1 = new AddTagCommand(
        ['url1'],
        DELETED_BOOKMARK_TAG,
        // @ts-expect-error for testing
        'USER_DELETED'
      ) // url1: ['tagA', 'tagB', '_deleted_'], deletedMeta set
      const cmd2 = new AddTagCommand(['url1'], 'tagY') // url1: ['tagA', 'tagB', '_deleted_', 'tagY'], deletedMeta still set
      const composite = new CompositeTagCommand([cmd1, cmd2], 'add')

      let resolvedBookmarks = mockResolveBookmarksCallback(
        composite.getBookmarkUrls()
      )
      composite.execute(resolvedBookmarks)

      const bm1AfterExecute = originalBookmarksStore.find(
        ([url]) => url === 'url1'
      )?.[1]
      expect(bm1AfterExecute?.tags).toEqual(
        expect.arrayContaining(['tagA', 'tagB', DELETED_BOOKMARK_TAG, 'tagY'])
      )
      expect(bm1AfterExecute?.deletedMeta).toBeDefined()

      resolvedBookmarks = mockResolveBookmarksCallback(
        composite.getBookmarkUrls()
      )
      composite.undo(resolvedBookmarks)

      const bm1AfterUndo = originalBookmarksStore.find(
        ([url]) => url === 'url1'
      )?.[1]
      expect(bm1AfterUndo?.tags).toEqual(['tagA', 'tagB']) // Should be back to original state before cmd1
      expect(bm1AfterUndo?.deletedMeta).toBeUndefined()
    })

    it('undo on an unexecuted composite command should not alter data', () => {
      const cmd1 = new AddTagCommand(['url1'], 'tagX')
      const composite = new CompositeTagCommand([cmd1], 'add')

      // Attempt to undo without executing
      const resolvedBookmarks = mockResolveBookmarksCallback(
        composite.getBookmarkUrls()
      )
      composite.undo(resolvedBookmarks) // Should ideally do nothing or log error, sub-commands handle this

      expect(originalBookmarksStore).toEqual(initialBookmarks)
    })

    it('undo should only revert tags and deletedMeta, preserving other metadata', () => {
      const cmd1 = new AddTagCommand(['url1'], 'tagX')
      const composite = new CompositeTagCommand([cmd1], 'add')

      let resolvedBookmarks = mockResolveBookmarksCallback(
        composite.getBookmarkUrls()
      )
      composite.execute(resolvedBookmarks)

      // Simulate external modification to other metadata after command execution
      const bm1 = originalBookmarksStore.find(([url]) => url === 'url1')?.[1]
      if (bm1) {
        bm1.meta.title = 'New Title After Command'
        bm1.meta.lastUsed = Date.now()
      }

      resolvedBookmarks = mockResolveBookmarksCallback(
        composite.getBookmarkUrls()
      )
      composite.undo(resolvedBookmarks)

      const bm1AfterUndo = originalBookmarksStore.find(
        ([url]) => url === 'url1'
      )?.[1]
      expect(bm1AfterUndo?.tags).toEqual(['tagA', 'tagB']) // Tags reverted
      expect(bm1AfterUndo?.meta.title).toBe('New Title After Command') // Other meta preserved
      expect(bm1AfterUndo?.meta.lastUsed).toBeDefined() // Other meta preserved
    })
  })

  describe('getters', () => {
    it('getBookmarkUrls should return a combined list of unique URLs from sub-commands', () => {
      const cmd1 = new AddTagCommand(['url1', 'url2'], 'tagX')
      const cmd2 = new RemoveTagCommand(['url2', 'url3'], 'tagY')
      const composite = new CompositeTagCommand([cmd1, cmd2], 'add')

      const urls = composite.getBookmarkUrls()
      expect(urls).toHaveLength(3)
      expect(urls).toEqual(expect.arrayContaining(['url1', 'url2', 'url3']))
    })

    it('getSourceTags should return combined source tags from sub-commands', () => {
      const cmd1 = new AddTagCommand(['url1'], 'tagX, tagW')
      const cmd2 = new RemoveTagCommand(['url2'], 'tagY')
      const cmd3 = new RenameTagCommand(['url3'], 'tagZ', 'tagZNew')
      const composite = new CompositeTagCommand([cmd1, cmd2, cmd3], 'add')

      const sourceTags = composite.getSourceTags()
      // Note: splitTags in BaseTagCommand normalizes 'tagX, tagW' to ['tagX', 'tagW']
      expect(sourceTags).toEqual(
        expect.arrayContaining(['tagX', 'tagW', 'tagY', 'tagZ'])
      )
      expect(sourceTags.length).toBe(4) // Assuming no duplicates after combining
    })

    it('getTargetTags should return combined target tags from sub-commands (relevant for rename)', () => {
      const cmd1 = new AddTagCommand(['url1'], 'tagX') // No target tags
      const cmd2 = new RenameTagCommand(['url2'], 'tagY', 'tagYNew')
      const cmd3 = new RenameTagCommand(['url3'], 'tagZ', 'tagZNew, tagZ2New')
      const composite = new CompositeTagCommand([cmd1, cmd2, cmd3], 'rename')

      const targetTags = composite.getTargetTags()
      expect(targetTags).toEqual(
        expect.arrayContaining(['tagYNew', 'tagZNew', 'tagZ2New'])
      )
      expect(targetTags?.length).toBe(3)
    })

    it('getTimestamp should return the timestamp of the composite command creation', () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)
      const composite = new CompositeTagCommand([], 'add')
      expect(composite.getTimestamp()).toBe(now)
      vi.restoreAllMocks()
    })
  })
})
