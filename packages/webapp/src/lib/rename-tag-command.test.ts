import { describe, it, expect, beforeEach } from 'vitest'
import type { BookmarkKeyValuePair } from '../types/bookmarks.js'
import { RenameTagCommand } from './tag-commands.js'

function bookmarksToUrls(bookmarks: BookmarkKeyValuePair[]): string[] {
  return bookmarks.map((bookmark) => bookmark[0])
}

describe('RenameTagCommand', () => {
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
      [
        'https://other.net',
        {
          tags: ['other', 'network'],
          meta: {
            title: 'Other Network',
            created: Date.now(),
            updated: Date.now(),
          },
        },
      ],
    ]
  })

  it('should rename a tag in bookmarks that have it', () => {
    // Create command
    const command = new RenameTagCommand(
      bookmarksToUrls(testBookmarks),
      'test',
      'testing'
    )
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

    // Verify tags were renamed
    expect(testBookmarks[0][1].tags).not.toContain('test')
    expect(testBookmarks[0][1].tags).toContain('testing')
    expect(testBookmarks[0][1].tags).toEqual(['example', 'common', 'testing'])
    expect(testBookmarks[0][1].meta.updated2).toBeTypeOf('number')
    expect(testBookmarks[0][1].meta.updated2).toBeGreaterThanOrEqual(
      timestampBeforExecute
    )
    expect(testBookmarks[1][1].tags).not.toContain('test')
    expect(testBookmarks[1][1].tags).toContain('testing')
    expect(testBookmarks[1][1].tags).toEqual([
      'organization',
      'common',
      'testing',
    ])
    expect(testBookmarks[2][1].tags).not.toContain('testing')
    expect(testBookmarks[2][1].tags).toEqual(['other', 'network'])

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
    expect(originalStates.has('https://other.net')).toBe(false)

    const timestampBeforUndo = Date.now()

    // Undo command
    command.undo(testBookmarks)

    // Verify tags were restored after undo
    expect(testBookmarks[0][1].tags).toContain('test')
    expect(testBookmarks[0][1].tags).not.toContain('testing')
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'common'])
    expect(testBookmarks[0][1].meta.updated2).toBeGreaterThanOrEqual(
      timestampBeforUndo
    )
    expect(testBookmarks[1][1].tags).toContain('test')
    expect(testBookmarks[1][1].tags).not.toContain('testing')
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])
    expect(testBookmarks[2][1].tags).toEqual(['other', 'network'])
  })

  it('should not affect bookmarks that do not have the source tag', () => {
    // Create command
    const command = new RenameTagCommand(
      bookmarksToUrls(testBookmarks),
      'other',
      'alternative'
    )

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(1)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify only third bookmark was affected
    expect(testBookmarks[0][1].tags).not.toContain('other')
    expect(testBookmarks[0][1].tags).not.toContain('alternative')
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'common'])
    expect(testBookmarks[1][1].tags).not.toContain('other')
    expect(testBookmarks[1][1].tags).not.toContain('alternative')
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])
    expect(testBookmarks[2][1].tags).not.toContain('other')
    expect(testBookmarks[2][1].tags).toContain('alternative')
    expect(testBookmarks[2][1].tags).toEqual(['network', 'alternative'])

    // Verify affected map only contains the third bookmark
    expect(originalStates.size).toBe(1)
    expect(originalStates.has('https://example.com')).toBe(false)
    expect(originalStates.has('https://test.org')).toBe(false)
    expect(originalStates.get('https://other.net')!.tags).toEqual([
      'other',
      'network',
    ])

    // Undo command
    command.undo(testBookmarks)

    // Verify only third bookmark was restored
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'common'])
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])
    expect(testBookmarks[2][1].tags).toContain('other')
    expect(testBookmarks[2][1].tags).not.toContain('alternative')
    expect(testBookmarks[2][1].tags).toEqual(['other', 'network'])
  })

  it('should handle empty bookmarks array', () => {
    // Create command with empty bookmarks array
    const command = new RenameTagCommand([], 'test', 'testing')

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
      command.undo(testBookmarks)
    }).not.toThrow()
  })

  it('should handle renaming a tag that does not exist in any bookmark', () => {
    // Create command with non-existent tag
    const command = new RenameTagCommand(
      bookmarksToUrls(testBookmarks),
      'non-existent-tag',
      'new-tag'
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
    expect(testBookmarks[2][1].tags).toEqual(['other', 'network'])

    // Undo command (should not change anything)
    command.undo(testBookmarks)

    // Verify bookmarks remain unchanged
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'common'])
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])
    expect(testBookmarks[2][1].tags).toEqual(['other', 'network'])
  })

  it('should handle renaming to a tag that already exists', () => {
    // Create command to rename 'test' to 'common' (which already exists)
    const command = new RenameTagCommand(
      bookmarksToUrls(testBookmarks),
      'test',
      'common'
    )

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(2)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify tags were renamed (but no duplicates created)
    expect(testBookmarks[0][1].tags).not.toContain('test')
    expect(testBookmarks[0][1].tags).toContain('common')
    expect(
      testBookmarks[0][1].tags.filter((tag) => tag === 'common').length
    ).toBe(1) // No duplicates
    expect(testBookmarks[0][1].tags).toEqual(['example', 'common'])
    expect(testBookmarks[1][1].tags).not.toContain('test')
    expect(testBookmarks[1][1].tags).toContain('common')
    expect(
      testBookmarks[1][1].tags.filter((tag) => tag === 'common').length
    ).toBe(1) // No duplicates
    expect(testBookmarks[1][1].tags).toEqual(['organization', 'common'])
    expect(testBookmarks[2][1].tags).toEqual(['other', 'network'])

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

    // Verify tags were restored
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'common'])
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])
    expect(testBookmarks[2][1].tags).toEqual(['other', 'network'])
  })

  it('should return correct command type', () => {
    const command = new RenameTagCommand(
      bookmarksToUrls(testBookmarks),
      'test',
      'testing'
    )
    expect(command.getType()).toBe('rename')
  })

  it('should return correct source tag', () => {
    const command = new RenameTagCommand(
      bookmarksToUrls(testBookmarks),
      'test',
      'testing'
    )
    expect(command.getSourceTags()).toEqual(['test'])
  })

  it('should return correct target tag', () => {
    const command = new RenameTagCommand(
      bookmarksToUrls(testBookmarks),
      'test',
      'testing'
    )
    expect(command.getTargetTags()).toEqual(['testing'])
  })

  it('should rename multiple tags to multiple new tags', () => {
    // Create command with multiple source and target tags
    const command = new RenameTagCommand(
      bookmarksToUrls(testBookmarks),
      ['test', 'common'],
      ['testing', 'shared']
    )

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(2)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify tags were renamed
    expect(testBookmarks[0][1].tags).not.toContain('test')
    expect(testBookmarks[0][1].tags).not.toContain('common')
    expect(testBookmarks[0][1].tags).toContain('testing')
    expect(testBookmarks[0][1].tags).toContain('shared')
    expect(testBookmarks[0][1].tags).toEqual(['example', 'testing', 'shared'])

    expect(testBookmarks[1][1].tags).not.toContain('test')
    expect(testBookmarks[1][1].tags).not.toContain('common')
    expect(testBookmarks[1][1].tags).toContain('testing')
    expect(testBookmarks[1][1].tags).toContain('shared')
    expect(testBookmarks[1][1].tags).toEqual([
      'organization',
      'testing',
      'shared',
    ])

    expect(testBookmarks[2][1].tags).toEqual(['other', 'network'])

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
    expect(originalStates.has('https://other.net')).toBe(false)

    // Undo command
    command.undo(testBookmarks)

    // Verify tags were restored after undo
    expect(testBookmarks[0][1].tags).toContain('test')
    expect(testBookmarks[0][1].tags).toContain('common')
    expect(testBookmarks[0][1].tags).not.toContain('testing')
    expect(testBookmarks[0][1].tags).not.toContain('shared')
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'common'])

    expect(testBookmarks[1][1].tags).toContain('test')
    expect(testBookmarks[1][1].tags).toContain('common')
    expect(testBookmarks[1][1].tags).not.toContain('testing')
    expect(testBookmarks[1][1].tags).not.toContain('shared')
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])

    expect(testBookmarks[2][1].tags).toEqual(['other', 'network'])
  })

  it('should only rename tags if bookmark contains ALL specified source tags', () => {
    // Create command with multiple source tags where only some bookmarks have all tags
    const command = new RenameTagCommand(
      bookmarksToUrls(testBookmarks),
      ['test', 'example'],
      ['testing', 'sample']
    )

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
    expect(testBookmarks[0][1].tags).toContain('testing')
    expect(testBookmarks[0][1].tags).toContain('sample')
    expect(testBookmarks[0][1].tags).toEqual(['common', 'testing', 'sample'])

    // Second bookmark should be unchanged (has 'test' but not 'example')
    expect(testBookmarks[1][1].tags).toContain('test')
    expect(testBookmarks[1][1].tags).not.toContain('testing')
    expect(testBookmarks[1][1].tags).not.toContain('sample')
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])

    // Third bookmark should be unchanged
    expect(testBookmarks[2][1].tags).toEqual(['other', 'network'])

    // Verify affected map only contains the first bookmark
    expect(originalStates.size).toBe(1)
    expect(originalStates.get('https://example.com')!.tags).toEqual([
      'example',
      'test',
      'common',
    ])
    expect(originalStates.has('https://test.org')).toBe(false)
    expect(originalStates.has('https://other.net')).toBe(false)

    // Undo command
    command.undo(testBookmarks)

    // Verify only first bookmark was restored
    expect(testBookmarks[0][1].tags).toContain('test')
    expect(testBookmarks[0][1].tags).toContain('example')
    expect(testBookmarks[0][1].tags).not.toContain('testing')
    expect(testBookmarks[0][1].tags).not.toContain('sample')
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'common'])

    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])
    expect(testBookmarks[2][1].tags).toEqual(['other', 'network'])
  })

  it('should handle string input with multiple tags', () => {
    // Create command with comma-separated strings of tags
    const command = new RenameTagCommand(
      bookmarksToUrls(testBookmarks),
      'test,common',
      'testing,shared'
    )

    expect(command.getSourceTags()).toEqual(['test', 'common'])
    expect(command.getTargetTags()).toEqual(['testing', 'shared'])

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(2)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify tags were renamed
    expect(testBookmarks[0][1].tags).not.toContain('test')
    expect(testBookmarks[0][1].tags).not.toContain('common')
    expect(testBookmarks[0][1].tags).toContain('testing')
    expect(testBookmarks[0][1].tags).toContain('shared')
    expect(testBookmarks[0][1].tags).toEqual(['example', 'testing', 'shared'])

    expect(testBookmarks[1][1].tags).not.toContain('test')
    expect(testBookmarks[1][1].tags).not.toContain('common')
    expect(testBookmarks[1][1].tags).toContain('testing')
    expect(testBookmarks[1][1].tags).toContain('shared')
    expect(testBookmarks[1][1].tags).toEqual([
      'organization',
      'testing',
      'shared',
    ])

    // Verify affected map contains original tags
    expect(originalStates.size).toBe(2)

    // Undo command
    command.undo(testBookmarks)

    // Verify tags were restored after undo
    expect(testBookmarks[0][1].tags).toContain('test')
    expect(testBookmarks[0][1].tags).toContain('common')
    expect(testBookmarks[0][1].tags).not.toContain('testing')
    expect(testBookmarks[0][1].tags).not.toContain('shared')

    expect(testBookmarks[1][1].tags).toContain('test')
    expect(testBookmarks[1][1].tags).toContain('common')
    expect(testBookmarks[1][1].tags).not.toContain('testing')
    expect(testBookmarks[1][1].tags).not.toContain('shared')
  })

  it('should handle duplicate tags in the input arrays', () => {
    // Create command with duplicate tags
    const command = new RenameTagCommand(
      bookmarksToUrls(testBookmarks),
      ['test', 'test', 'common'],
      ['testing', 'testing', 'shared']
    )

    expect(command.getSourceTags()).toEqual(['test', 'common'])
    expect(command.getTargetTags()).toEqual(['testing', 'shared'])

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(2)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify tags were renamed without issues
    expect(testBookmarks[0][1].tags).not.toContain('test')
    expect(testBookmarks[0][1].tags).not.toContain('common')
    expect(testBookmarks[0][1].tags).toContain('testing')
    expect(testBookmarks[0][1].tags).toContain('shared')
    expect(
      testBookmarks[0][1].tags.filter((tag) => tag === 'testing').length
    ).toBe(1) // No duplicates
    expect(testBookmarks[0][1].tags).toEqual(['example', 'testing', 'shared'])

    expect(testBookmarks[1][1].tags).not.toContain('test')
    expect(testBookmarks[1][1].tags).not.toContain('common')
    expect(testBookmarks[1][1].tags).toContain('testing')
    expect(testBookmarks[1][1].tags).toContain('shared')
    expect(
      testBookmarks[1][1].tags.filter((tag) => tag === 'testing').length
    ).toBe(1) // No duplicates
    expect(testBookmarks[1][1].tags).toEqual([
      'organization',
      'testing',
      'shared',
    ])

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

  it('should handle mix of existing and non-existing source tags', () => {
    // Create command with mix of existing and non-existing tags
    const command = new RenameTagCommand(
      bookmarksToUrls(testBookmarks),
      ['test', 'non-existent-tag'],
      ['testing', 'new-tag']
    )

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(0)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify no bookmarks were affected (since not all source tags exist in any bookmark)
    expect(originalStates.size).toBe(0)
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'common'])
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])
    expect(testBookmarks[2][1].tags).toEqual(['other', 'network'])

    // Undo command (should not change anything)
    command.undo(testBookmarks)

    // Verify bookmarks remain unchanged
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'common'])
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])
    expect(testBookmarks[2][1].tags).toEqual(['other', 'network'])
  })

  it('should correctly report source and target tags for multiple tags', () => {
    // Create command with multiple tags
    const command = new RenameTagCommand(
      bookmarksToUrls(testBookmarks),
      ['tag-a', 'tag-b', 'tag-c'],
      ['new-a', 'new-b', 'new-c']
    )

    // Verify source and target tags are correctly reported
    expect(command.getSourceTags()).toEqual(['tag-a', 'tag-b', 'tag-c'])
    expect(command.getTargetTags()).toEqual(['new-a', 'new-b', 'new-c'])
    expect(command.getSourceTags()).not.toBe(command.getSourceTags()) // Should return a copy
    expect(command.getTargetTags()).not.toBe(command.getTargetTags()) // Should return a copy
  })

  it('should handle different number of source and target tags', () => {
    // Create command with more source tags than target tags
    const command = new RenameTagCommand(
      bookmarksToUrls(testBookmarks),
      ['test', 'common', 'example'],
      ['testing', 'shared']
    )

    // Execute command
    command.execute(testBookmarks)
    const executionResult = command.getExecutionResult()
    expect(executionResult).toBeDefined()
    const originalStates = executionResult!.originalStates
    expect(originalStates).toBeDefined()

    expect(executionResult!.affectedCount).toBe(1)
    expect(executionResult!.deletedCount).toBe(0)

    // Verify only first bookmark was affected (has all source tags)
    expect(testBookmarks[0][1].tags).not.toContain('test')
    expect(testBookmarks[0][1].tags).not.toContain('common')
    expect(testBookmarks[0][1].tags).not.toContain('example')
    expect(testBookmarks[0][1].tags).toContain('testing')
    expect(testBookmarks[0][1].tags).toContain('shared')
    expect(testBookmarks[0][1].tags).toEqual(['testing', 'shared'])

    // Second bookmark should be unchanged (doesn't have 'example')
    expect(testBookmarks[1][1].tags).toEqual(['test', 'organization', 'common'])

    // Verify affected map only contains the first bookmark
    expect(originalStates.size).toBe(1)
    expect(originalStates.get('https://example.com')!.tags).toEqual([
      'example',
      'test',
      'common',
    ])

    // Undo command
    command.undo(testBookmarks)

    // Verify first bookmark was restored
    expect(testBookmarks[0][1].tags).toEqual(['example', 'test', 'common'])
  })
})
