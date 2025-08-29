import { describe, it, expect } from 'vitest'
import { buildSyncPath } from './sync-path-builder.js'

describe('buildSyncPath', () => {
  // Test cases based on JSDoc examples
  it('should return correct path for directory and scope all', () => {
    expect(buildSyncPath('/path/to/dir/', 'all')).toBe(
      'path/to/dir/utags-bookmarks.json'
    )
  })

  it('should return correct path for directory and specific scope', () => {
    expect(buildSyncPath('/path/to/dir/', '12345')).toBe(
      'path/to/dir/utags-collection-12345.json'
    )
  })

  it('should return correct path for root directory and scope all', () => {
    expect(buildSyncPath('/', 'all')).toBe('utags-bookmarks.json')
  })

  it('should return correct path for root directory and specific scope', () => {
    expect(buildSyncPath('/', '12345')).toBe('utags-collection-12345.json')
  })

  it('should return correct path for empty path and scope all', () => {
    expect(buildSyncPath('', 'all')).toBe('utags-bookmarks.json')
    expect(buildSyncPath(undefined, 'all')).toBe('utags-bookmarks.json')
  })

  it('should return correct path for empty path and specific scope', () => {
    expect(buildSyncPath('', '12345')).toBe('utags-collection-12345.json')
    expect(buildSyncPath(undefined, '12345')).toBe(
      'utags-collection-12345.json'
    )
  })

  it('should return correct path for path with filename and scope all', () => {
    expect(buildSyncPath('/path/to/filename', 'all')).toBe(
      'path/to/filename.json'
    )
  })

  it('should return correct path for path with filename and specific scope', () => {
    // If a filename is provided, scope for collectionId is ignored for filename part
    expect(buildSyncPath('/path/to/filename', '12345')).toBe(
      'path/to/filename.json'
    )
  })

  it('should return correct path for filename only and scope all', () => {
    expect(buildSyncPath('filename', 'all')).toBe('filename.json')
  })

  it('should return correct path for filename only and specific scope', () => {
    // If a filename is provided, scope for collectionId is ignored for filename part
    expect(buildSyncPath('filename', '12345')).toBe('filename.json')
  })

  it('should return correct path for filename with dot and scope all', () => {
    expect(buildSyncPath('filename.data', 'all')).toBe('filename.data.json')
  })

  it('should return correct path for filename with dot and specific scope', () => {
    // If a filename is provided, scope for collectionId is ignored for filename part
    expect(buildSyncPath('filename.data', '12345')).toBe('filename.data.json')
  })

  // Additional test cases
  it('should handle paths with leading/trailing spaces', () => {
    expect(buildSyncPath('  /path/to/dir/  ', 'all  ')).toBe(
      'path/to/dir/utags-bookmarks.json'
    )
    expect(buildSyncPath('  filename.data  ', '  12345  ')).toBe(
      'filename.data.json'
    )
  })

  it('should handle existing .json extension in path', () => {
    expect(buildSyncPath('/path/to/filename.json', 'all')).toBe(
      'path/to/filename.json'
    )
    expect(buildSyncPath('filename.json', '12345')).toBe('filename.json')
  })

  it('should handle existing .JSON extension (uppercase) in path', () => {
    expect(buildSyncPath('/path/to/filename.JSON', 'all')).toBe(
      'path/to/filename.json'
    )
  })

  it('should use custom prefix when provided', () => {
    expect(buildSyncPath('/path/to/dir/', 'all', 'my-prefix')).toBe(
      'path/to/dir/my-prefix-bookmarks.json'
    )
    expect(buildSyncPath('/path/to/dir/', '12345', 'my-prefix')).toBe(
      'path/to/dir/my-prefix-collection-12345.json'
    )
    expect(buildSyncPath('', 'all', 'custom')).toBe('custom-bookmarks.json')
  })

  it('should handle empty scope string correctly (treat as all)', () => {
    expect(buildSyncPath('/path/to/dir/', '')).toBe(
      'path/to/dir/utags-bookmarks.json'
    )
    expect(buildSyncPath('/path/to/dir/', undefined)).toBe(
      'path/to/dir/utags-bookmarks.json'
    )
  })

  it('should handle multiple slashes in path', () => {
    expect(buildSyncPath('//path///to//dir//', 'all')).toBe(
      'path/to/dir/utags-bookmarks.json'
    )
  })

  it('should handle path that is just a filename with spaces and scope', () => {
    expect(buildSyncPath('  my data file  ', 'all')).toBe('my data file.json')
  })

  it('should handle path that is just a directory with spaces and scope', () => {
    expect(buildSyncPath('  my data dir /  ', '12345')).toBe(
      'my data dir/utags-collection-12345.json'
    )
  })
})
