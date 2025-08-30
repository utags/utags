import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { BookmarkKeyValuePair } from '../types/bookmarks.js'
import { DELETED_BOOKMARK_TAG } from '../config/constants.js'
import { RemoveTagCommand } from './tag-commands.js'

function bookmarksToUrls(bookmarks: BookmarkKeyValuePair[]): string[] {
  return bookmarks.map((bookmark) => bookmark[0])
}

describe('RemoveTagCommand', () => {
  // Sample bookmarks for testing
  let testBookmarks: BookmarkKeyValuePair[]

  beforeEach(() => {
    // Reset test data before each test
    testBookmarks = [
      [
        'https://example.com',
        {
          tags: ['example', 'test', 'common'],
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
          tags: ['test', 'organization', 'common'],
          meta: {
            title: 'Test Organization',
            created: Date.now(),
            updated: Date.now(),
          },
        },
      ],
    ]
  })

  it('should remove a tag from bookmarks that have it', () => {
    // Create command
    const command = new RemoveTagCommand(bookmarksToUrls(testBookmarks), 'test')
    const timestampBeforExecute = Date.now()

    expect(testBookmarks[0][1].meta.updated2).toBeUndefined()

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(2)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify tags were removed
    expect(testBookmarks[0][1].tags).not.toContain('test')
    expect(testBookmarks[0][1].tags).toEqual(['example', 'common'])
    expect(testBookmarks[0][1].meta.updated2).toBeTypeOf('number')
    expect(testBookmarks[0][1].meta.updated2).toBeGreaterThanOrEqual(
      timestampBeforExecute
    )
    expect(testBookmarks[1][1].tags).not.toContain('test')
    expect(testBookmarks[1][1].tags).toEqual(['organization', 'common'])

    // Verify affected map contains original tags
    expect(originalStates.size).toBe(2)
    expect(originalStates.get('https://example.com')!.tags).toEqual([
      'example',
      'test',
      'common',
    ])
    expect(originalStates.get('https://test.org')!.tags).toEqual([
      'test',
      'organization',
      'common',
    ])

    const timestampBeforUndo = Date.now()

    // Undo command
    command.undo(testBookmarks)

    // Verify tags were restored after undo
    expect(testBookmarks[0][1].tags).toContain('test')
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'common'])
    expect(testBookmarks[0][1].meta.updated2).toBeGreaterThanOrEqual(
      timestampBeforUndo
    )
    expect(testBookmarks[1][1].tags).toContain('test')
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])
  })

  it('should not affect bookmarks that do not have the tag', () => {
    // Remove tag from first bookmark
    testBookmarks[0][1].tags = testBookmarks[0][1].tags.filter(
      (tag) => tag !== 'test'
    )

    // Create command
    const command = new RemoveTagCommand(bookmarksToUrls(testBookmarks), 'test')

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(1)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify only second bookmark was affected
    expect(testBookmarks[0][1].tags).not.toContain('test')
    expect(testBookmarks[0][1].tags).toEqual(['example', 'common'])
    expect(testBookmarks[1][1].tags).not.toContain('test')
    expect(testBookmarks[1][1].tags).toEqual(['organization', 'common'])

    // Verify affected map only contains the second bookmark
    expect(originalStates.size).toBe(1)
    expect(originalStates.has('https://example.com')).toBe(false)
    expect(originalStates.get('https://test.org')!.tags).toEqual([
      'test',
      'organization',
      'common',
    ])

    // Undo command
    command.undo(testBookmarks)

    // Verify only second bookmark was restored
    expect(testBookmarks[0][1].tags).not.toContain('test') // First bookmark is not affected
    expect(testBookmarks[0][1].tags).toEqual(['example', 'common'])
    expect(testBookmarks[1][1].tags).toContain('test') // Second bookmark's tag is restored
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])
  })

  it('should handle empty bookmarks array', () => {
    // Create command with empty bookmarks array
    const command = new RemoveTagCommand([], 'test')

    // Execute command
    command.execute([])
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(0)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify no errors and empty affected map
    expect(originalStates.size).toBe(0)

    // Undo command (should not throw errors)
    expect(() => {
      command.undo([])
    }).not.toThrow()
  })

  it('should handle removing a tag that does not exist in any bookmark', () => {
    // Create command with non-existent tag
    const command = new RemoveTagCommand(
      bookmarksToUrls(testBookmarks),
      'non-existent-tag'
    )

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(0)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify no bookmarks were affected
    expect(originalStates.size).toBe(0)
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'common'])
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])

    // Undo command (should not change anything)
    command.undo(testBookmarks)

    // Verify bookmarks remain unchanged
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'common'])
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])
  })

  it('should return correct command type', () => {
    const command = new RemoveTagCommand(bookmarksToUrls(testBookmarks), 'test')
    expect(command.getType()).toBe('remove')
  })

  it('should return correct source tag', () => {
    const command = new RemoveTagCommand(bookmarksToUrls(testBookmarks), 'test')
    expect(command.getSourceTags()).toEqual(['test'])
  })

  it('should return undefined for target tag', () => {
    const command = new RemoveTagCommand(bookmarksToUrls(testBookmarks), 'test')
    expect(command.getTargetTags()).toBeUndefined()
  })

  it('should remove multiple tags from bookmarks that have them', () => {
    // Create command with multiple tags
    const command = new RemoveTagCommand(bookmarksToUrls(testBookmarks), [
      'test',
      'common',
    ])

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(2)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify tags were removed
    expect(testBookmarks[0][1].tags).not.toContain('test')
    expect(testBookmarks[0][1].tags).not.toContain('common')
    expect(testBookmarks[0][1].tags).toEqual(['example'])
    expect(testBookmarks[1][1].tags).not.toContain('test')
    expect(testBookmarks[1][1].tags).not.toContain('common')
    expect(testBookmarks[1][1].tags).toEqual(['organization'])

    // Verify affected map contains original tags
    expect(originalStates.size).toBe(2)
    expect(originalStates.get('https://example.com')!.tags).toEqual([
      'example',
      'test',
      'common',
    ])
    expect(originalStates.get('https://test.org')!.tags).toEqual([
      'test',
      'organization',
      'common',
    ])

    // Undo command
    command.undo(testBookmarks)

    // Verify tags were restored after undo
    expect(testBookmarks[0][1].tags).toContain('test')
    expect(testBookmarks[0][1].tags).toContain('common')
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'common'])
    expect(testBookmarks[1][1].tags).toContain('test')
    expect(testBookmarks[1][1].tags).toContain('common')
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])
  })

  it('should only remove tags if bookmark contains ALL specified tags', () => {
    // Create command with multiple tags where one bookmark has all tags and one doesn't
    const command = new RemoveTagCommand(bookmarksToUrls(testBookmarks), [
      'test',
      'example',
    ])

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(1)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify only first bookmark was affected (has both 'test' and 'example')
    expect(testBookmarks[0][1].tags).not.toContain('test')
    expect(testBookmarks[0][1].tags).not.toContain('example')
    expect(testBookmarks[0][1].tags).toEqual(['common'])

    // Second bookmark should be unchanged (has 'test' but not 'example')
    expect(testBookmarks[1][1].tags).toContain('test')
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])

    // Verify affected map only contains the first bookmark
    expect(originalStates.size).toBe(1)
    expect(originalStates.get('https://example.com')!.tags).toEqual([
      'example',
      'test',
      'common',
    ])
    expect(originalStates.has('https://test.org')).toBe(false)

    // Undo command
    command.undo(testBookmarks)

    // Verify only first bookmark was restored
    expect(testBookmarks[0][1].tags).toContain('test')
    expect(testBookmarks[0][1].tags).toContain('example')
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'common'])
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])
  })

  it('should handle string input with multiple tags', () => {
    // Create command with comma-separated string of tags
    const command = new RemoveTagCommand(
      bookmarksToUrls(testBookmarks),
      'test,common'
    )

    // Verify source tags are correctly reported
    expect(command.getSourceTags()).toEqual(['test', 'common'])

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(2)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify tags were removed
    expect(testBookmarks[0][1].tags).not.toContain('test')
    expect(testBookmarks[0][1].tags).not.toContain('common')
    expect(testBookmarks[0][1].tags).toEqual(['example'])
    expect(testBookmarks[1][1].tags).not.toContain('test')
    expect(testBookmarks[1][1].tags).not.toContain('common')
    expect(testBookmarks[1][1].tags).toEqual(['organization'])

    // Verify affected map contains original tags
    expect(originalStates.size).toBe(2)

    // Undo command
    command.undo(testBookmarks)

    // Verify tags were restored after undo
    expect(testBookmarks[0][1].tags).toContain('test')
    expect(testBookmarks[0][1].tags).toContain('common')
    expect(testBookmarks[1][1].tags).toContain('test')
    expect(testBookmarks[1][1].tags).toContain('common')
  })

  it('should handle duplicate tags in the input array', () => {
    // Create command with duplicate tags
    const command = new RemoveTagCommand(bookmarksToUrls(testBookmarks), [
      'test',
      'test',
      'common',
    ])

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(2)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify tags were removed without issues
    expect(testBookmarks[0][1].tags).not.toContain('test')
    expect(testBookmarks[0][1].tags).not.toContain('common')
    expect(testBookmarks[0][1].tags).toEqual(['example'])
    expect(testBookmarks[1][1].tags).not.toContain('test')
    expect(testBookmarks[1][1].tags).not.toContain('common')
    expect(testBookmarks[1][1].tags).toEqual(['organization'])

    // Verify affected map contains original tags
    expect(originalStates.size).toBe(2)

    // Undo command
    command.undo(testBookmarks)

    // Verify tags were restored after undo
    expect(testBookmarks[0][1].tags).toContain('test')
    expect(testBookmarks[0][1].tags).toContain('common')
    expect(testBookmarks[1][1].tags).toContain('test')
    expect(testBookmarks[1][1].tags).toContain('common')
  })

  it('should handle mix of existing and non-existing tags', () => {
    // Create command with mix of existing and non-existing tags
    const command = new RemoveTagCommand(bookmarksToUrls(testBookmarks), [
      'test',
      'non-existent-tag',
    ])

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(0)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify no bookmarks were affected (since not all tags exist in any bookmark)
    expect(originalStates.size).toBe(0)
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'common'])
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])

    // Undo command (should not change anything)
    command.undo(testBookmarks)

    // Verify bookmarks remain unchanged
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'common'])
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])
  })

  it('should correctly report source tags for multiple tags', () => {
    // Create command with multiple tags
    const command = new RemoveTagCommand(bookmarksToUrls(testBookmarks), [
      'tag-a',
      'tag-b',
      'tag-c',
    ])

    // Verify source tags are correctly reported
    expect(command.getSourceTags()).toEqual(['tag-a', 'tag-b', 'tag-c'])
    expect(command.getSourceTags()).not.toBe(command.getSourceTags()) // Should return a copy
  })

  it('should mark bookmark as deleted if all tags are removed', () => {
    // Setup a bookmark with only one tag
    testBookmarks = [
      [
        'https://example.com/single-tag',
        {
          tags: ['only-tag'],
          meta: {
            title: 'Single Tag Bookmark',
            created: Date.now(),
            updated: Date.now(),
          },
        },
      ],
    ]

    // Create command to remove the last tag
    const command = new RemoveTagCommand(
      bookmarksToUrls(testBookmarks),
      'only-tag',
      'LAST_TAG_REMOVED' // Provide an actionType
    )
    const deletionTimestamp = Date.now() // Capture timestamp before execution for comparison

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(1)
    expect(executionResult!.deletedCount).toBe(1)

    // Verify bookmark is marked as deleted
    expect(testBookmarks[0][1].tags).toEqual(['only-tag', DELETED_BOOKMARK_TAG])
    expect(testBookmarks[0][1].deletedMeta).toBeDefined()
    expect(testBookmarks[0][1].deletedMeta?.actionType).toBe('LAST_TAG_REMOVED')
    // Check if the deletion timestamp is close to the captured one
    expect(testBookmarks[0][1].deletedMeta?.deleted).toBeGreaterThanOrEqual(
      deletionTimestamp
    )
    expect(testBookmarks[0][1].deletedMeta?.deleted).toBeLessThanOrEqual(
      Date.now() + 100 // Allow a small buffer for execution time
    )

    // Verify affected map contains original tags
    expect(originalStates.size).toBe(1)
    expect(originalStates.get('https://example.com/single-tag')!.tags).toEqual([
      'only-tag',
    ])

    // Undo command
    command.undo(testBookmarks)

    // Verify bookmark is restored
    expect(testBookmarks[0][1].tags).toEqual(['only-tag'])
    expect(testBookmarks[0][1].deletedMeta).toBeUndefined()
  })

  it('should remove DELETED_BOOKMARK_TAG and its deletedMeta when other tags exist, and restore on undo', () => {
    const initialDeletedTime = Date.now() - 5000
    testBookmarks[0][1].tags = ['tagA', DELETED_BOOKMARK_TAG, 'tagB']
    testBookmarks[0][1].deletedMeta = {
      deleted: initialDeletedTime,
      actionType: 'BATCH_DELETE_BOOKMARKS',
    }
    // Ensure the second bookmark is not affected by this specific test logic
    testBookmarks[1][1].tags = ['tagC']
    delete testBookmarks[1][1].deletedMeta

    const command = new RemoveTagCommand(
      [testBookmarks[0][0]], // Only operate on the first bookmark
      DELETED_BOOKMARK_TAG
    )
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(1)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify DELETED_BOOKMARK_TAG and deletedMeta are removed
    expect(testBookmarks[0][1].tags).toEqual(['tagA', 'tagB'])
    expect(testBookmarks[0][1].deletedMeta).toBeUndefined()
    expect(originalStates.get(testBookmarks[0][0])).toBeDefined()
    expect(originalStates.get(testBookmarks[0][0])!.deletedMeta).toBeDefined()
    expect(
      originalStates.get(testBookmarks[0][0])!.deletedMeta!.actionType
    ).toEqual('BATCH_DELETE_BOOKMARKS')
    expect(
      originalStates.get(testBookmarks[0][0])!.deletedMeta!.deleted
    ).toEqual(initialDeletedTime)

    // Verify affected map
    expect(originalStates.size).toBe(1)
    expect(originalStates.get('https://example.com')!.tags).toEqual([
      'tagA',
      DELETED_BOOKMARK_TAG,
      'tagB',
    ])

    command.undo(testBookmarks)

    // Verify DELETED_BOOKMARK_TAG and deletedMeta are restored
    expect(testBookmarks[0][1].tags).toContain(DELETED_BOOKMARK_TAG)
    expect(testBookmarks[0][1].tags).toEqual([
      'tagA',
      DELETED_BOOKMARK_TAG,
      'tagB',
    ])
    expect(testBookmarks[0][1].deletedMeta).toBeDefined()
    expect(testBookmarks[0][1].deletedMeta?.actionType).toBe(
      'BATCH_DELETE_BOOKMARKS'
    )
    expect(testBookmarks[0][1].deletedMeta?.deleted).toBe(initialDeletedTime)
  })

  it('should remove DELETED_BOOKMARK_TAG, another tag, and deletedMeta simultaneously, and restore on undo', () => {
    const initialDeletedTime = Date.now() - 6000
    testBookmarks[0][1].tags = ['tagA', DELETED_BOOKMARK_TAG, 'tagB']
    testBookmarks[0][1].deletedMeta = {
      deleted: initialDeletedTime,
      actionType: 'LAST_TAG_REMOVED',
    }
    testBookmarks[1][1].tags = ['tagC'] // Not involved
    delete testBookmarks[1][1].deletedMeta

    const command = new RemoveTagCommand(
      [testBookmarks[0][0]],
      [DELETED_BOOKMARK_TAG, 'tagA']
    )
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(1)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify tags and deletedMeta are removed
    expect(testBookmarks[0][1].tags).toEqual(['tagB'])
    expect(testBookmarks[0][1].deletedMeta).toBeUndefined()
    expect(originalStates.get(testBookmarks[0][0])).toBeDefined()
    expect(originalStates.get(testBookmarks[0][0])!.deletedMeta).toBeDefined()
    expect(
      originalStates.get(testBookmarks[0][0])!.deletedMeta!.actionType
    ).toEqual('LAST_TAG_REMOVED')

    command.undo(testBookmarks)

    // Verify tags and deletedMeta are restored
    expect(testBookmarks[0][1].tags).toEqual([
      'tagA',
      DELETED_BOOKMARK_TAG,
      'tagB',
    ])
    expect(testBookmarks[0][1].deletedMeta).toBeDefined()
    expect(testBookmarks[0][1].deletedMeta?.actionType).toBe('LAST_TAG_REMOVED')
    expect(testBookmarks[0][1].deletedMeta?.deleted).toBe(initialDeletedTime)
  })

  it('should correctly handle removing DELETED_BOOKMARK_TAG when it is the only tag and deletedMeta exists', () => {
    // This test verifies the behavior when removing DELETED_BOOKMARK_TAG results in an empty tag list,
    // and the bookmark already has deletedMeta. This triggers the 'else' branch in RemoveTagCommand.execute(testBookmarks).
    const initialDeletedTime = Date.now() - 7000
    const originalActionType = 'SOME_PREVIOUS_DELETE_ACTION'
    testBookmarks[0][1].tags = [DELETED_BOOKMARK_TAG]
    testBookmarks[0][1].deletedMeta = {
      deleted: initialDeletedTime,
      // @ts-expect-error - This is for testing purposes
      actionType: originalActionType,
    }

    const command = new RemoveTagCommand(
      [testBookmarks[0][0]],
      DELETED_BOOKMARK_TAG,
      // @ts-expect-error - This is for testing purposes
      'EXPLICIT_UNDELETE_ATTEMPT' // This actionType would be used if new deletedMeta was created
    )
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(1)
    expect(executionResult!.deletedCount).toBe(0)

    // Based on the updated RemoveTagCommand logic (as of the last review):
    // 1. Removing DELETED_BOOKMARK_TAG makes newTags empty.
    // 2. The 'else' block in execute(testBookmarks) runs.
    // 3. DELETED_BOOKMARK_TAG is added back to bookmark[1].tags.
    // 4. Crucially, the condition `if (isRemoveDeletedBookmarkTag && bookmark[1].deletedMeta)` is true.
    //    This means the existing `deletedMeta` (with `originalActionType`) is *kept*, and no new `deletedMeta` is created.
    //    The console.log confirms this branch is taken.
    // expect(testBookmarks[0][1].tags).toEqual([DELETED_BOOKMARK_TAG])
    // expect(testBookmarks[0][1].deletedMeta).toBeDefined()
    // expect(testBookmarks[0][1].deletedMeta?.actionType).toBe(originalActionType)
    // expect(testBookmarks[0][1].deletedMeta?.deleted).toBe(initialDeletedTime)
    // The original deletedMeta should be preserved
    // expect(originalStates.get('https://example.com')!.deletedMeta).toBeUndefined()
    expect(testBookmarks[0][1].tags).toEqual([])
    expect(testBookmarks[0][1].deletedMeta).toBeUndefined()
    expect(originalStates.get('https://example.com')!.deletedMeta).toBeDefined()

    expect(originalStates.size).toBe(1)
    expect(originalStates.get('https://example.com')!.tags).toEqual([
      DELETED_BOOKMARK_TAG,
    ])

    command.undo(testBookmarks)

    // Undo should restore the original tags and the original deletedMeta state.
    // 1. `bookmark[1].tags` is restored to `[DELETED_BOOKMARK_TAG]` from `affected`.
    // 2. The `deletedMeta` handling in `undo` runs:
    //    - First `if` condition: `!bookmark[1].deletedMeta` (false, it's defined) -> skipped.
    //    - Second `else if` condition: `bookmark[1].deletedMeta` (true) `&& !originalTags.includes(DELETED_BOOKMARK_TAG)` (false, originalTags is `[DELETED_BOOKMARK_TAG]`) -> skipped.
    //    - The `else` block is reached, meaning no changes to `deletedMeta` are made by the undo logic itself in this specific path.
    // This is correct because the `execute` method preserved the original `deletedMeta`.
    expect(testBookmarks[0][1].tags).toEqual([DELETED_BOOKMARK_TAG])
    expect(testBookmarks[0][1].deletedMeta).toBeDefined()
    expect(testBookmarks[0][1].deletedMeta?.actionType).toBe(originalActionType)
    expect(testBookmarks[0][1].deletedMeta?.deleted).toBe(initialDeletedTime)
  })
})

describe('RemoveTagCommand', () => {
  // Sample bookmarks for testing
  let testBookmarks: BookmarkKeyValuePair[]

  beforeEach(() => {
    // Reset test data before each test
    testBookmarks = [
      [
        'https://example.com',
        {
          tags: ['example', 'test', 'common'],
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
          tags: ['test', 'organization', 'common', DELETED_BOOKMARK_TAG],
          meta: {
            title: 'Test Organization (Deleted)',
            created: Date.now(),
            updated: Date.now(),
          },
          // Simulating a previously deleted bookmark
          deletedMeta: {
            deleted: Date.now() - 100_000,
            // @ts-expect-error - This is for testing purposes
            actionType: 'MANUAL_DELETE',
          },
        },
      ],
      [
        'https://another.net',
        {
          tags: [DELETED_BOOKMARK_TAG, 'unique'],
          meta: {
            title: 'Another Net (Deleted & Unique)',
            created: Date.now(),
            updated: Date.now(),
          },
          deletedMeta: {
            deleted: Date.now() - 50_000,
            actionType: 'BATCH_DELETE_BOOKMARKS',
          },
        },
      ],
      [
        'https://only-deleted.com',
        {
          tags: [DELETED_BOOKMARK_TAG],
          meta: {
            title: 'Only Deleted Tag',
            created: Date.now(),
            updated: Date.now(),
          },
          deletedMeta: {
            deleted: Date.now() - 20_000,
            actionType: 'LAST_TAG_REMOVED',
          },
        },
      ],
    ]
  })

  it('should remove DELETED_BOOKMARK_TAG and clear deletedMeta if it is the only tag being removed', () => {
    const bookmarkToTest = testBookmarks[1] // https://test.org (has DELETED_BOOKMARK_TAG and other tags)
    const initialDeletedMeta = { ...bookmarkToTest[1].deletedMeta! }

    const command = new RemoveTagCommand(
      [bookmarkToTest[0]],
      DELETED_BOOKMARK_TAG,
      // @ts-expect-error - This is for testing purposes
      'UNDELETE' // Explicitly undeleting
    )
    command.execute([bookmarkToTest])
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(1)
    expect(executionResult!.deletedCount).toBe(0)

    expect(bookmarkToTest[1].tags).not.toContain(DELETED_BOOKMARK_TAG)
    expect(bookmarkToTest[1].tags).toEqual(['test', 'organization', 'common'])
    expect(bookmarkToTest[1].deletedMeta).toBeUndefined()
    expect(originalStates.get(bookmarkToTest[0])).toBeDefined()
    expect(originalStates.get(bookmarkToTest[0])!.deletedMeta).toEqual(
      initialDeletedMeta
    )

    command.undo([bookmarkToTest])

    expect(bookmarkToTest[1].tags).toContain(DELETED_BOOKMARK_TAG)
    expect(bookmarkToTest[1].tags).toEqual([
      'test',
      'organization',
      'common',
      DELETED_BOOKMARK_TAG,
    ])
    expect(bookmarkToTest[1].deletedMeta).toEqual(initialDeletedMeta)
  })

  it('should remove DELETED_BOOKMARK_TAG along with other tags, and clear deletedMeta', () => {
    const bookmarkToTest = testBookmarks[1] // https://test.org
    const initialDeletedMeta = { ...bookmarkToTest[1].deletedMeta! }

    const command = new RemoveTagCommand(
      [bookmarkToTest[0]],
      [DELETED_BOOKMARK_TAG, 'common'],
      // @ts-expect-error - This is for testing purposes
      'UNDELETE_AND_CLEANUP'
    )
    command.execute([bookmarkToTest])
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(1)
    expect(executionResult!.deletedCount).toBe(0)

    expect(bookmarkToTest[1].tags).not.toContain(DELETED_BOOKMARK_TAG)
    expect(bookmarkToTest[1].tags).not.toContain('common')
    expect(bookmarkToTest[1].tags).toEqual(['test', 'organization'])
    expect(bookmarkToTest[1].deletedMeta).toBeUndefined()
    expect(originalStates.get(bookmarkToTest[0])).toBeDefined()
    expect(originalStates.get(bookmarkToTest[0])!.deletedMeta).toEqual(
      initialDeletedMeta
    )

    command.undo([bookmarkToTest])

    expect(bookmarkToTest[1].tags).toContain(DELETED_BOOKMARK_TAG)
    expect(bookmarkToTest[1].tags).toContain('common')
    expect(bookmarkToTest[1].tags).toEqual([
      'test',
      'organization',
      'common',
      DELETED_BOOKMARK_TAG,
    ])
    expect(bookmarkToTest[1].deletedMeta).toEqual(initialDeletedMeta)
  })

  it('should NOT remove DELETED_BOOKMARK_TAG if other tags are removed but DELETED_BOOKMARK_TAG is not specified for removal', () => {
    const bookmarkToTest = testBookmarks[1] // https://test.org
    const initialDeletedMeta = { ...bookmarkToTest[1].deletedMeta! }

    const command = new RemoveTagCommand(
      [bookmarkToTest[0]],
      ['common', 'test'] // DELETED_BOOKMARK_TAG is not in this list
    )
    command.execute([bookmarkToTest])
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(1)
    expect(executionResult!.deletedCount).toBe(0)

    expect(bookmarkToTest[1].tags).toContain(DELETED_BOOKMARK_TAG) // Should still be there
    expect(bookmarkToTest[1].tags).not.toContain('common')
    expect(bookmarkToTest[1].tags).not.toContain('test')
    expect(bookmarkToTest[1].tags).toEqual([
      'organization',
      DELETED_BOOKMARK_TAG,
    ])
    expect(bookmarkToTest[1].deletedMeta).toEqual(initialDeletedMeta) // Should be unchanged

    command.undo([bookmarkToTest])

    expect(bookmarkToTest[1].tags).toContain(DELETED_BOOKMARK_TAG)
    expect(bookmarkToTest[1].tags).toContain('common')
    expect(bookmarkToTest[1].tags).toContain('test')
    expect(bookmarkToTest[1].tags).toEqual([
      'test',
      'organization',
      'common',
      DELETED_BOOKMARK_TAG,
    ])
    expect(bookmarkToTest[1].deletedMeta).toEqual(initialDeletedMeta)
  })

  it('should preserve deletedMeta if DELETED_BOOKMARK_TAG is removed but other tags cause it to remain deleted (edge case, depends on strict sourceTags match)', () => {
    const bookmarkToTest = testBookmarks[2] // Has [DELETED_BOOKMARK_TAG, 'unique']
    const initialDeletedMeta = { ...bookmarkToTest[1].deletedMeta! }

    const command = new RemoveTagCommand(
      [bookmarkToTest[0]],
      [DELETED_BOOKMARK_TAG, 'foo']
    )
    command.execute([bookmarkToTest])
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(0)
    expect(executionResult!.deletedCount).toBe(0)

    expect(originalStates.size).toBe(0) // No bookmarks should be affected
    expect(bookmarkToTest[1].tags).toEqual([DELETED_BOOKMARK_TAG, 'unique'])
    expect(bookmarkToTest[1].deletedMeta).toEqual(initialDeletedMeta)

    command.undo([bookmarkToTest])
    expect(bookmarkToTest[1].tags).toEqual([DELETED_BOOKMARK_TAG, 'unique'])
    expect(bookmarkToTest[1].deletedMeta).toEqual(initialDeletedMeta)
  })

  it('should correctly remove DELETED_BOOKMARK_TAG when it is the only tag on a bookmark, effectively undeleting it', () => {
    const bookmarkToTest = testBookmarks[3] // https://only-deleted.com, tags: [DELETED_BOOKMARK_TAG]
    const initialDeletedMeta = { ...bookmarkToTest[1].deletedMeta! }

    const command = new RemoveTagCommand(
      [bookmarkToTest[0]],
      DELETED_BOOKMARK_TAG,
      // @ts-expect-error - This is for testing purposes
      'UNDELETE_SINGLE'
    )
    command.execute([bookmarkToTest])
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(1)
    expect(executionResult!.deletedCount).toBe(0)

    // expect(bookmarkToTest[1].tags).toEqual([DELETED_BOOKMARK_TAG]) // All tags removed except DELETED_BOOKMARK_TAG
    // expect(bookmarkToTest[1].deletedMeta).toEqual(initialDeletedMeta)
    expect(bookmarkToTest[1].tags).toEqual([]) // All tags removed except DELETED_BOOKMARK_TAG
    expect(bookmarkToTest[1].deletedMeta).toBeUndefined()
    expect(originalStates.get(bookmarkToTest[0])!.deletedMeta).toBeDefined()

    command.undo([bookmarkToTest])

    expect(bookmarkToTest[1].tags).toEqual([DELETED_BOOKMARK_TAG])
    expect(bookmarkToTest[1].deletedMeta).toEqual(initialDeletedMeta)
  })

  it('should add DELETED_BOOKMARK_TAG if all other specified tags are removed and no other tags remain', () => {
    const bookmark = [
      'https://example.com/toBeDeleted',
      {
        tags: ['tag1', 'tag2'],
        meta: {
          title: 'To Be Deleted',
          created: Date.now(),
          updated: Date.now(),
        },
      },
    ] as BookmarkKeyValuePair

    const command = new RemoveTagCommand(
      [bookmark[0]],
      ['tag1', 'tag2'],
      // @ts-expect-error - This is for testing purposes
      'ALL_SPECIFIED_REMOVED'
    )
    const deletionTimestamp = Date.now()
    command.execute([bookmark])
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(1)
    expect(executionResult!.deletedCount).toBe(1)

    expect(bookmark[1].tags).toEqual(['tag1', 'tag2', DELETED_BOOKMARK_TAG]) // Should keep original tags
    expect(bookmark[1].deletedMeta).toBeDefined()
    expect(bookmark[1].deletedMeta?.actionType).toBe('ALL_SPECIFIED_REMOVED')
    expect(bookmark[1].deletedMeta?.deleted).toBeGreaterThanOrEqual(
      deletionTimestamp
    )
    expect(originalStates.get(bookmark[0])!.tags).toEqual(['tag1', 'tag2'])

    command.undo([bookmark])

    expect(bookmark[1].tags).toEqual(['tag1', 'tag2'])
    expect(bookmark[1].deletedMeta).toBeUndefined()
  })

  it('should add DELETED_BOOKMARK_TAG with default actionType if all tags removed and no actionType provided', () => {
    const bookmark = [
      'https://example.com/toBeDeletedImplicitly',
      {
        tags: ['sole-tag'],
        meta: {
          title: 'To Be Deleted Implicitly',
          created: Date.now(),
          updated: Date.now(),
        },
      },
    ] as BookmarkKeyValuePair

    const command = new RemoveTagCommand([bookmark[0]], 'sole-tag') // No actionType
    const deletionTimestamp = Date.now()
    command.execute([bookmark])
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(1)
    expect(executionResult!.deletedCount).toBe(1)

    expect(bookmark[1].tags).toEqual(['sole-tag', DELETED_BOOKMARK_TAG]) // Should keep original tags
    expect(bookmark[1].deletedMeta).toBeDefined()
    expect(bookmark[1].deletedMeta?.actionType).toBe('BATCH_REMOVE_TAGS') // Default actionType
    expect(bookmark[1].deletedMeta?.deleted).toBeGreaterThanOrEqual(
      deletionTimestamp
    )
    expect(originalStates.get(bookmark[0])!.tags).toEqual(['sole-tag'])

    command.undo([bookmark])
    expect(bookmark[1].tags).toEqual(['sole-tag'])
    expect(bookmark[1].deletedMeta).toBeUndefined()
  })

  it('should keep original deletedMeta and preserve original tags when removing all other tags from an already deleted bookmark', () => {
    const initialDeletionTimestamp = Date.now() - 10_000 // An older timestamp
    const initialActionType = 'PREVIOUS_DELETE_ACTION'

    testBookmarks = [
      [
        'https://example.com/already-deleted-multiple-tags',
        {
          tags: ['tagX', 'tagY', DELETED_BOOKMARK_TAG],
          meta: {
            title: 'Already Deleted, Multiple Tags',
            created: Date.now(),
            updated: Date.now(),
          },
          deletedMeta: {
            deleted: initialDeletionTimestamp,
            // @ts-expect-error - This is for testing purposes
            actionType: initialActionType,
          },
        },
      ],
    ]

    // Spy on console.warn to check if it's called
    const consoleWarnSpy = vi.spyOn(console, 'warn')

    // Command to remove 'tagX' and 'tagY', leaving only DELETED_BOOKMARK_TAG effectively
    const command = new RemoveTagCommand(
      bookmarksToUrls(testBookmarks),
      ['tagX', 'tagY'],
      // @ts-expect-error - This is for testing purposes
      'CLEANUP_TAGS_ON_DELETED' // A new action type for this operation
    )

    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    // executionResult.deletedCount should be 0 because the bookmark was already deleted
    // and we are just cleaning up its other tags.
    expect(executionResult!.affectedCount).toBe(1)
    expect(executionResult!.deletedCount).toBe(0) // IMPORTANT: Not a new deletion

    const updatedBookmark = testBookmarks[0][1]

    // Verify tags: original tags ('tagX', 'tagY') should be preserved alongside DELETED_BOOKMARK_TAG
    // due to the logic `bookmarkData.tags = addTags(bookmarkData.tags, DELETED_BOOKMARK_TAG)`
    // where `bookmarkData.tags` refers to the state *before* removal of 'tagX', 'tagY'.
    expect(updatedBookmark.tags).toEqual(['tagX', 'tagY', DELETED_BOOKMARK_TAG])

    // Verify deletedMeta is UNCHANGED
    expect(updatedBookmark.deletedMeta).toBeDefined()
    expect(updatedBookmark.deletedMeta?.deleted).toBe(initialDeletionTimestamp)
    expect(updatedBookmark.deletedMeta?.actionType).toBe(initialActionType)

    // Verify console.warn was called because it's re-confirming deletion
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      `Bookmark https://example.com/already-deleted-multiple-tags is already deleted or being re-deleted, keeping original deletedMeta information.`
    )

    // Verify original state stored for undo
    expect(originalStates.size).toBe(1)
    const storedOriginalState = originalStates.get(
      'https://example.com/already-deleted-multiple-tags'
    )
    expect(storedOriginalState).toBeDefined()
    expect(storedOriginalState!.tags).toEqual([
      'tagX',
      'tagY',
      DELETED_BOOKMARK_TAG,
    ])
    expect(storedOriginalState!.deletedMeta?.deleted).toBe(
      initialDeletionTimestamp
    )
    expect(storedOriginalState!.deletedMeta?.actionType).toBe(initialActionType)

    // Undo command
    command.undo(testBookmarks)

    // Verify bookmark is restored to its state before the command
    const restoredBookmark = testBookmarks[0][1]
    expect(restoredBookmark.tags).toEqual([
      'tagX',
      'tagY',
      DELETED_BOOKMARK_TAG,
    ])
    expect(restoredBookmark.deletedMeta).toBeDefined()
    expect(restoredBookmark.deletedMeta?.deleted).toBe(initialDeletionTimestamp)
    expect(restoredBookmark.deletedMeta?.actionType).toBe(initialActionType)

    // Restore console.warn
    consoleWarnSpy.mockRestore()
  })
})
