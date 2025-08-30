import { describe, it, expect } from 'vitest'
import type {
  GitHubBlobResponse,
  GitHubContentsResponse,
  GitHubCreateUpdateFileResponse,
} from './types.js'

describe('GitHub API Types', () => {
  it('should validate GitHubContentsResponse type', () => {
    const mockResponse: GitHubContentsResponse = {
      name: 'bookmarks.json',
      path: 'data/bookmarks.json',
      sha: 'abc123def456',
      size: 1024,
      url: 'https://api.github.com/repos/user/repo/contents/data/bookmarks.json',
      html_url: 'https://github.com/user/repo/blob/main/data/bookmarks.json',
      git_url: 'https://api.github.com/repos/user/repo/git/blobs/abc123def456',
      download_url:
        'https://raw.githubusercontent.com/user/repo/main/data/bookmarks.json',
      type: 'file',
      content: 'eyJib29rbWFya3MiOltdfQ==', // Base64 encoded JSON
      encoding: 'base64',
      _links: {
        self: 'https://api.github.com/repos/user/repo/contents/data/bookmarks.json',
        git: 'https://api.github.com/repos/user/repo/git/blobs/abc123def456',
        html: 'https://github.com/user/repo/blob/main/data/bookmarks.json',
      },
    }

    expect(mockResponse.name).toBe('bookmarks.json')
    expect(mockResponse.type).toBe('file')
    expect(mockResponse.sha).toBe('abc123def456')
  })

  it('should validate GitHubBlobResponse type', () => {
    const mockResponse: GitHubBlobResponse = {
      sha: 'abc123def456',
      node_id: 'MDQ6QmxvYmFiYzEyM2RlZjQ1Ng==',
      size: 1024,
      url: 'https://api.github.com/repos/user/repo/git/blobs/abc123def456',
      content: 'eyJib29rbWFya3MiOltdfQ==', // Base64 encoded JSON
      encoding: 'base64',
    }

    expect(mockResponse.sha).toBe('abc123def456')
    expect(mockResponse.encoding).toBe('base64')
    expect(mockResponse.size).toBe(1024)
  })

  it('should validate GitHubCreateUpdateFileResponse type', () => {
    const mockResponse: GitHubCreateUpdateFileResponse = {
      content: {
        name: 'bookmarks.json',
        path: 'data/bookmarks.json',
        sha: 'def456ghi789',
        size: 2048,
        url: 'https://api.github.com/repos/user/repo/contents/data/bookmarks.json',
        html_url: 'https://github.com/user/repo/blob/main/data/bookmarks.json',
        git_url:
          'https://api.github.com/repos/user/repo/git/blobs/def456ghi789',
        download_url:
          'https://raw.githubusercontent.com/user/repo/main/data/bookmarks.json',
        type: 'file',
        _links: {
          self: 'https://api.github.com/repos/user/repo/contents/data/bookmarks.json',
          git: 'https://api.github.com/repos/user/repo/git/blobs/def456ghi789',
          html: 'https://github.com/user/repo/blob/main/data/bookmarks.json',
        },
      },
      commit: {
        sha: 'commit123abc456',
        node_id: 'MDY6Q29tbWl0Y29tbWl0MTIzYWJjNDU2',
        url: 'https://api.github.com/repos/user/repo/git/commits/commit123abc456',
        html_url: 'https://github.com/user/repo/commit/commit123abc456',
        author: {
          name: 'Test User',
          email: 'test@example.com',
          date: '2024-01-01T12:00:00Z',
        },
        committer: {
          name: 'Test User',
          email: 'test@example.com',
          date: '2024-01-01T12:00:00Z',
        },
        tree: {
          sha: 'tree123def456',
          url: 'https://api.github.com/repos/user/repo/git/trees/tree123def456',
        },
        message: 'Update bookmarks.json',
        parents: [
          {
            sha: 'parent123abc',
            url: 'https://api.github.com/repos/user/repo/git/commits/parent123abc',
            html_url: 'https://github.com/user/repo/commit/parent123abc',
          },
        ],
        verification: {
          verified: false,
          reason: 'unsigned',
          signature: undefined,
          payload: undefined,
        },
      },
    }

    expect(mockResponse.content.name).toBe('bookmarks.json')
    expect(mockResponse.commit.sha).toBe('commit123abc456')
    expect(mockResponse.commit.message).toBe('Update bookmarks.json')
  })

  it('should handle optional properties correctly', () => {
    // Test GitHubContentsResponse without optional content and encoding
    const responseWithoutContent: GitHubContentsResponse = {
      name: 'folder',
      path: 'data',
      sha: 'folder123',
      size: 0,
      url: 'https://api.github.com/repos/user/repo/contents/data',
      html_url: 'https://github.com/user/repo/tree/main/data',
      git_url: 'https://api.github.com/repos/user/repo/git/trees/folder123',
      download_url: 'https://raw.githubusercontent.com/user/repo/main/data',
      type: 'dir',
      _links: {
        self: 'https://api.github.com/repos/user/repo/contents/data',
        git: 'https://api.github.com/repos/user/repo/git/trees/folder123',
        html: 'https://github.com/user/repo/tree/main/data',
      },
    }

    expect(responseWithoutContent.type).toBe('dir')
    expect(responseWithoutContent.content).toBeUndefined()
    expect(responseWithoutContent.encoding).toBeUndefined()
  })
})
