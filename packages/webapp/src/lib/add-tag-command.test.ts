import { describe, it, expect, beforeEach } from 'vitest'
import type { BookmarkKeyValuePair } from '../types/bookmarks.js'
import { DELETED_BOOKMARK_TAG } from '../config/constants.js'
import { AddTagCommand } from './tag-commands.js'

function bookmarksToUrls(bookmarks: BookmarkKeyValuePair[]): string[] {
  return bookmarks.map((bookmark) => bookmark[0])
}

describe('AddTagCommand', () => {
  // Sample bookmarks for testing
  let testBookmarks: BookmarkKeyValuePair[]

  beforeEach(() => {
    // Reset test data before each test
    testBookmarks = [
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
  })

  it('should add a tag to bookmarks that do not have it', () => {
    // Create command
    const command = new AddTagCommand(bookmarksToUrls(testBookmarks), 'new-tag')

    const timestampBeforExecute = Date.now()

    expect(testBookmarks[0][1].meta.updated2).toBeUndefined()

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    // Verify counts
    expect(executionResult!.affectedCount).toBe(2)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify tags were added
    expect(testBookmarks[0][1].tags).toContain('new-tag')
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'new-tag'])
    expect(testBookmarks[0][1].meta.updated2).toBeTypeOf('number')
    expect(testBookmarks[0][1].meta.updated2).toBeGreaterThanOrEqual(
      timestampBeforExecute
    )
    expect(testBookmarks[1][1].tags).toContain('new-tag')
    expect(testBookmarks[1][1].tags).toEqual([
      'test',
      'organization',
      'new-tag',
    ])
    expect(testBookmarks[1][1].meta.updated2).toBeTypeOf('number')
    expect(testBookmarks[1][1].meta.updated2).toBeGreaterThanOrEqual(
      timestampBeforExecute
    )

    // Verify affected map contains original tags
    expect(originalStates.size).toBe(2)
    expect(originalStates.get('https://example.com')!.tags).toEqual([
      'example',
      'test',
    ])
    expect(originalStates.get('https://test.org')!.tags).toEqual([
      'test',
      'organization',
    ])

    const timestampBeforUndo = Date.now()
    // Undo command
    command.undo(testBookmarks)

    // Verify tags were removed after undo
    expect(testBookmarks[0][1].tags).not.toContain('new-tag')
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test'])
    expect(testBookmarks[0][1].meta.updated2).toBeGreaterThanOrEqual(
      timestampBeforUndo
    )
    expect(testBookmarks[1][1].tags).not.toContain('new-tag')
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization'])
    expect(testBookmarks[1][1].meta.updated2).toBeGreaterThanOrEqual(
      timestampBeforUndo
    )
  })

  it('should not add a tag if bookmark already has it', () => {
    // Add tag to first bookmark
    testBookmarks[0][1].tags.push('existing-tag')

    // Create command
    const command = new AddTagCommand(
      bookmarksToUrls(testBookmarks),
      'existing-tag'
    )

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    // Verify counts
    expect(executionResult!.affectedCount).toBe(1) // Only the second bookmark is affected
    expect(executionResult!.deletedCount).toBe(0)

    // Verify tag was only added to second bookmark
    expect(testBookmarks[0][1].tags).toContain('existing-tag')
    expect(
      testBookmarks[0][1].tags.filter((tag) => tag === 'existing-tag').length
    ).toBe(1) // No duplicates
    expect(testBookmarks[0][1].tags).toEqual([
      'example',
      'test',
      'existing-tag',
    ])
    expect(testBookmarks[1][1].tags).toContain('existing-tag')
    expect(testBookmarks[1][1].tags).toEqual([
      'test',
      'organization',
      'existing-tag',
    ])

    // Verify affected map only contains the second bookmark
    expect(originalStates.size).toBe(1)
    expect(originalStates.has('https://example.com')).toBe(false)
    expect(originalStates.get('https://test.org')!.tags).toEqual([
      'test',
      'organization',
    ])

    // Undo command
    command.undo(testBookmarks)

    // Verify tags were restored after undo
    expect(testBookmarks[0][1].tags).toContain('existing-tag') // First bookmark is not affected, still keeps the tag
    expect(testBookmarks[0][1].tags).toEqual([
      'example',
      'test',
      'existing-tag',
    ])
    expect(testBookmarks[1][1].tags).not.toContain('existing-tag') // Second bookmark's tag is removed
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization'])
  })

  it('should handle empty bookmarks array', () => {
    // Create command with empty bookmarks array
    const command = new AddTagCommand([], 'new-tag')

    // Execute command
    command.execute([])
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    // Verify counts
    expect(executionResult!.affectedCount).toBe(0)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify no errors and empty affected map
    expect(originalStates.size).toBe(0)

    // Undo command (should not throw errors)
    expect(() => {
      command.undo([])
    }).not.toThrow()
  })

  it('should undo tag addition correctly', () => {
    // Create command
    const command = new AddTagCommand(bookmarksToUrls(testBookmarks), 'new-tag')

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    // Verify counts before undo
    expect(executionResult!.affectedCount).toBe(2)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify tags were added
    expect(testBookmarks[0][1].tags).toContain('new-tag')
    expect(testBookmarks[1][1].tags).toContain('new-tag')

    // Undo command
    command.undo(testBookmarks)

    // Verify tags were removed
    expect(testBookmarks[0][1].tags).not.toContain('new-tag')
    expect(testBookmarks[1][1].tags).not.toContain('new-tag')

    // Verify original tags are preserved
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test'])
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization'])
  })

  it('should add deletedMeta when DELETED_BOOKMARK_TAG is added and remove it on undo', () => {
    const command = new AddTagCommand(
      bookmarksToUrls(testBookmarks), // Neither bookmark has DELETED_BOOKMARK_TAG initially
      [DELETED_BOOKMARK_TAG, 'another-tag'],
      'BATCH_DELETE_BOOKMARKS'
    )
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    // Verify counts
    expect(executionResult!.affectedCount).toBe(2) // Both bookmarks get 'another-tag'
    expect(executionResult!.deletedCount).toBe(2) // Both bookmarks get DELETED_BOOKMARK_TAG

    // Verify deletedMeta is added to both bookmarks
    expect(testBookmarks[0][1].deletedMeta).toBeDefined()
    expect(testBookmarks[0][1].deletedMeta?.actionType).toBe(
      'BATCH_DELETE_BOOKMARKS'
    )
    expect(testBookmarks[0][1].deletedMeta?.deleted).toBeTypeOf('number')
    expect(testBookmarks[1][1].deletedMeta).toBeDefined()
    expect(testBookmarks[1][1].deletedMeta?.actionType).toBe(
      'BATCH_DELETE_BOOKMARKS'
    )
    expect(testBookmarks[1][1].deletedMeta?.deleted).toBeTypeOf('number')

    // Verify tags are added
    expect(testBookmarks[0][1].tags).toContain(DELETED_BOOKMARK_TAG)
    expect(testBookmarks[0][1].tags).toContain('another-tag')
    expect(testBookmarks[1][1].tags).toContain(DELETED_BOOKMARK_TAG)
    expect(testBookmarks[1][1].tags).toContain('another-tag')

    // Undo command
    command.undo(testBookmarks)

    // Verify deletedMeta is removed after undo for both bookmarks
    expect(testBookmarks[0][1].deletedMeta).toBeUndefined()
    expect(testBookmarks[1][1].deletedMeta).toBeUndefined()

    // Verify tags were removed after undo
    expect(testBookmarks[0][1].tags).not.toContain(DELETED_BOOKMARK_TAG)
    expect(testBookmarks[0][1].tags).not.toContain('another-tag')
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test'])
    expect(testBookmarks[1][1].tags).not.toContain(DELETED_BOOKMARK_TAG)
    expect(testBookmarks[1][1].tags).not.toContain('another-tag')
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization'])
  })

  it('should preserve existing DELETED_BOOKMARK_TAG and its deletedMeta on undo if DELETED_BOOKMARK_TAG was already present', () => {
    // Pre-condition: First bookmark already has DELETED_BOOKMARK_TAG and deletedMeta
    const initialDeletedTime = Date.now() - 10_000 // A time in the past
    testBookmarks[0][1].tags.push(DELETED_BOOKMARK_TAG)
    testBookmarks[0][1].deletedMeta = {
      deleted: initialDeletedTime,
      actionType: 'LAST_TAG_REMOVED',
    }

    // Attempt to add DELETED_BOOKMARK_TAG (which is already there for the first bookmark)
    // and 'new-common-tag' to both bookmarks
    const command = new AddTagCommand(
      bookmarksToUrls(testBookmarks),
      [DELETED_BOOKMARK_TAG, 'new-common-tag'],
      'BATCH_DELETE_BOOKMARKS' // This actionType will be used for the second bookmark
    )
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    // Verify counts
    // First bookmark: only 'new-common-tag' is new. DELETED_BOOKMARK_TAG was already there.
    // Second bookmark: both DELETED_BOOKMARK_TAG and 'new-common-tag' are new.
    expect(executionResult!.affectedCount).toBe(2) // Both bookmarks get 'new-common-tag'
    expect(executionResult!.deletedCount).toBe(1) // Only the second bookmark is newly marked as deleted

    // Verify the first bookmark's deletedMeta is NOT overwritten by the command's actionType or timestamp
    // because DELETED_BOOKMARK_TAG was already present.
    // Its deletedMeta should remain as it was.
    expect(testBookmarks[0][1].deletedMeta).toBeDefined()
    expect(testBookmarks[0][1].deletedMeta?.actionType).toBe('LAST_TAG_REMOVED')
    expect(testBookmarks[0][1].deletedMeta?.deleted).toBe(initialDeletedTime)
    expect(testBookmarks[0][1].tags).toContain(DELETED_BOOKMARK_TAG)
    expect(testBookmarks[0][1].tags).toContain('new-common-tag')

    // Verify the second bookmark gets DELETED_BOOKMARK_TAG and new deletedMeta
    expect(testBookmarks[1][1].deletedMeta).toBeDefined()
    expect(testBookmarks[1][1].deletedMeta?.actionType).toBe(
      'BATCH_DELETE_BOOKMARKS'
    )
    expect(testBookmarks[1][1].deletedMeta?.deleted).not.toBe(
      initialDeletedTime
    )
    expect(testBookmarks[1][1].tags).toContain(DELETED_BOOKMARK_TAG)
    expect(testBookmarks[1][1].tags).toContain('new-common-tag')

    // Undo command
    command.undo(testBookmarks)

    // Verify the first bookmark still has DELETED_BOOKMARK_TAG and its original deletedMeta
    expect(testBookmarks[0][1].tags).toContain(DELETED_BOOKMARK_TAG)
    expect(testBookmarks[0][1].deletedMeta).toBeDefined()
    expect(testBookmarks[0][1].deletedMeta?.actionType).toBe('LAST_TAG_REMOVED')
    expect(testBookmarks[0][1].deletedMeta?.deleted).toBe(initialDeletedTime)
    expect(testBookmarks[0][1].tags).not.toContain('new-common-tag') // new-common-tag should be removed
    expect(testBookmarks[0][1].tags).toEqual([
      'example',
      'test',
      DELETED_BOOKMARK_TAG,
    ])

    // Verify the second bookmark has DELETED_BOOKMARK_TAG and deletedMeta removed
    expect(testBookmarks[1][1].tags).not.toContain(DELETED_BOOKMARK_TAG)
    expect(testBookmarks[1][1].deletedMeta).toBeUndefined()
    expect(testBookmarks[1][1].tags).not.toContain('new-common-tag')
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization'])
  })

  it('should return correct command type', () => {
    const command = new AddTagCommand(bookmarksToUrls(testBookmarks), 'new-tag')
    expect(command.getType()).toBe('add')
  })

  it('should return correct source tag', () => {
    const command = new AddTagCommand(bookmarksToUrls(testBookmarks), 'new-tag')
    expect(command.getSourceTags()).toEqual(['new-tag'])
  })

  it('should return undefined for target tag', () => {
    const command = new AddTagCommand(bookmarksToUrls(testBookmarks), 'new-tag')
    expect(command.getTargetTags()).toBeUndefined()
  })

  it('should add multiple tags to bookmarks that do not have them', () => {
    // Create command with multiple tags
    const command = new AddTagCommand(bookmarksToUrls(testBookmarks), [
      'new-tag-1',
      'new-tag-2',
    ])

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    // Verify counts
    expect(executionResult!.affectedCount).toBe(2)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify tags were added
    expect(testBookmarks[0][1].tags).toContain('new-tag-1')
    expect(testBookmarks[0][1].tags).toContain('new-tag-2')
    expect(testBookmarks[0][1].tags).toEqual([
      'example',
      'test',
      'new-tag-1',
      'new-tag-2',
    ])
    expect(testBookmarks[1][1].tags).toContain('new-tag-1')
    expect(testBookmarks[1][1].tags).toContain('new-tag-2')
    expect(testBookmarks[1][1].tags).toEqual([
      'test',
      'organization',
      'new-tag-1',
      'new-tag-2',
    ])

    // Verify affected map contains original tags
    expect(originalStates.size).toBe(2)
    expect(originalStates.get('https://example.com')!.tags).toEqual([
      'example',
      'test',
    ])
    expect(originalStates.get('https://test.org')!.tags).toEqual([
      'test',
      'organization',
    ])

    // Undo command
    command.undo(testBookmarks)

    // Verify tags were removed after undo
    expect(testBookmarks[0][1].tags).not.toContain('new-tag-1')
    expect(testBookmarks[0][1].tags).not.toContain('new-tag-2')
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test'])
    expect(testBookmarks[1][1].tags).not.toContain('new-tag-1')
    expect(testBookmarks[1][1].tags).not.toContain('new-tag-2')
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization'])
  })

  it('should only add tags that do not already exist in bookmarks', () => {
    // Add one tag to first bookmark
    testBookmarks[0][1].tags.push('existing-tag-1')

    // Create command with a mix of existing and new tags
    const command = new AddTagCommand(bookmarksToUrls(testBookmarks), [
      'existing-tag-1',
      'new-tag-3',
    ])

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    // Verify counts
    // First bookmark: only 'new-tag-3' is new.
    // Second bookmark: both 'existing-tag-1' and 'new-tag-3' are new.
    expect(executionResult!.affectedCount).toBe(2) // Both bookmarks have at least one new tag added
    expect(executionResult!.deletedCount).toBe(0)

    // Verify only new tags were added to first bookmark
    expect(testBookmarks[0][1].tags).toContain('existing-tag-1')
    expect(testBookmarks[0][1].tags).toContain('new-tag-3')
    expect(
      testBookmarks[0][1].tags.filter((tag) => tag === 'existing-tag-1').length
    ).toBe(1) // No duplicates
    expect(testBookmarks[0][1].tags).toEqual([
      'example',
      'test',
      'existing-tag-1',
      'new-tag-3',
    ])

    // Verify all tags were added to second bookmark
    expect(testBookmarks[1][1].tags).toContain('existing-tag-1')
    expect(testBookmarks[1][1].tags).toContain('new-tag-3')
    expect(testBookmarks[1][1].tags).toEqual([
      'test',
      'organization',
      'existing-tag-1',
      'new-tag-3',
    ])

    // Verify affected map contains correct bookmarks
    expect(originalStates.size).toBe(2)
    expect(originalStates.get('https://example.com')!.tags).toEqual([
      'example',
      'test',
      'existing-tag-1',
    ])
    expect(originalStates.get('https://test.org')!.tags).toEqual([
      'test',
      'organization',
    ])

    // Undo command
    command.undo(testBookmarks)

    // Verify tags were restored after undo
    expect(testBookmarks[0][1].tags).toContain('existing-tag-1') // First bookmark keeps existing tag
    expect(testBookmarks[0][1].tags).not.toContain('new-tag-3')
    expect(testBookmarks[0][1].tags).toEqual([
      'example',
      'test',
      'existing-tag-1',
    ])
    expect(testBookmarks[1][1].tags).not.toContain('existing-tag-1')
    expect(testBookmarks[1][1].tags).not.toContain('new-tag-3')
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization'])
  })

  it('should handle duplicate tags in the input array', () => {
    // Create command with duplicate tags
    const command = new AddTagCommand(bookmarksToUrls(testBookmarks), [
      'duplicate-tag',
      'duplicate-tag',
      'another-tag',
    ])

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    // Verify counts - duplicates in input are effectively ignored if tag already exists or is added once
    expect(executionResult!.affectedCount).toBe(2) // Both bookmarks get 'new-tag-1' and 'new-tag-2'
    expect(executionResult!.deletedCount).toBe(0)

    // Verify tags were added without duplicates
    expect(testBookmarks[0][1].tags).toContain('duplicate-tag')
    expect(testBookmarks[0][1].tags).toContain('another-tag')
    expect(
      testBookmarks[0][1].tags.filter((tag) => tag === 'duplicate-tag').length
    ).toBe(1) // No duplicates
    expect(testBookmarks[0][1].tags).toEqual([
      'example',
      'test',
      'duplicate-tag',
      'another-tag',
    ])

    expect(testBookmarks[1][1].tags).toContain('duplicate-tag')
    expect(testBookmarks[1][1].tags).toContain('another-tag')
    expect(
      testBookmarks[1][1].tags.filter((tag) => tag === 'duplicate-tag').length
    ).toBe(1) // No duplicates
    expect(testBookmarks[1][1].tags).toEqual([
      'test',
      'organization',
      'duplicate-tag',
      'another-tag',
    ])

    // Verify affected map contains original tags
    expect(originalStates.size).toBe(2)
    expect(originalStates.get('https://example.com')!.tags).toEqual([
      'example',
      'test',
    ])
    expect(originalStates.get('https://test.org')!.tags).toEqual([
      'test',
      'organization',
    ])

    // Undo command
    command.undo(testBookmarks)

    // Verify tags were removed after undo
    expect(testBookmarks[0][1].tags).not.toContain('duplicate-tag')
    expect(testBookmarks[0][1].tags).not.toContain('another-tag')
    expect(testBookmarks[1][1].tags).not.toContain('duplicate-tag')
    expect(testBookmarks[1][1].tags).not.toContain('another-tag')
  })

  it('should handle string input with multiple tags', () => {
    // Create command with comma-separated string of tags
    const command = new AddTagCommand(
      bookmarksToUrls(testBookmarks),
      'tag1,  , , tag2 ， tag3'
    )

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    // Verify counts
    expect(executionResult!.affectedCount).toBe(2)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify all tags were added
    expect(testBookmarks[0][1].tags).toContain('tag1')
    expect(testBookmarks[0][1].tags).toContain('tag2')
    expect(testBookmarks[0][1].tags).toContain('tag3')
    expect(testBookmarks[0][1].tags).toEqual([
      'example',
      'test',
      'tag1',
      'tag2',
      'tag3',
    ])

    expect(testBookmarks[1][1].tags).toContain('tag1')
    expect(testBookmarks[1][1].tags).toContain('tag2')
    expect(testBookmarks[1][1].tags).toContain('tag3')
    expect(testBookmarks[1][1].tags).toEqual([
      'test',
      'organization',
      'tag1',
      'tag2',
      'tag3',
    ])

    // Verify affected map contains original tags
    expect(originalStates.size).toBe(2)

    // Undo command
    command.undo(testBookmarks)

    // Verify tags were removed after undo
    expect(testBookmarks[0][1].tags).not.toContain('tag1')
    expect(testBookmarks[0][1].tags).not.toContain('tag2')
    expect(testBookmarks[0][1].tags).not.toContain('tag3')
    expect(testBookmarks[1][1].tags).not.toContain('tag1')
    expect(testBookmarks[1][1].tags).not.toContain('tag2')
    expect(testBookmarks[1][1].tags).not.toContain('tag3')
  })

  it('should correctly report source tags', () => {
    // Create command with multiple tags
    const command = new AddTagCommand(bookmarksToUrls(testBookmarks), [
      'tag-a',
      'tag-b',
      'tag-c',
    ])

    // Verify source tags are correctly reported
    expect(command.getSourceTags()).toEqual(['tag-a', 'tag-b', 'tag-c'])
    expect(command.getSourceTags()).not.toBe(command.getSourceTags()) // Should return a copy
  })
})
