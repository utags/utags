import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  vi,
} from 'vitest'
import { HttpResponse, http } from 'msw'
import { appConfig } from '../config/app-config.js'
import { GitHubSyncAdapter } from './git-hub-sync-adapter.js'
import type {
  GithubCredentials,
  GithubTarget,
  SyncServiceConfig,
} from './types.js'
import { server } from './mocks/server.js'
import {
  resetMockGitHubDataStore,
  setMockGitHubFile,
  getMockGitHubFile,
  clearMockGitHubFile,
} from './mocks/handlers.js'

const GITHUB_API_BASE_URL = appConfig.githubApiUrl

const mockConfig: SyncServiceConfig<GithubCredentials, GithubTarget> = {
  id: 'test-github-sync',
  type: 'github',
  name: 'Test GitHub Sync',
  credentials: { token: 'test-github-token' },
  target: {
    repo: 'test-owner/test-repo',
    path: 'bookmarks-data.json',
    branch: 'main',
  },
  scope: 'all',
  enabled: true,
}

const mockConfigWithCollectionScope: SyncServiceConfig<
  GithubCredentials,
  GithubTarget
> = {
  ...mockConfig,
  id: 'test-github-sync-collection',
  scope: 'collection123',
  target: {
    ...mockConfig.target,
    path: 'data.json', // filename only for collection scope
  },
}

const mockConfigNoBranch: SyncServiceConfig<GithubCredentials, GithubTarget> = {
  ...mockConfig,
  id: 'test-github-sync-no-branch',
  target: {
    ...mockConfig.target,
    branch: undefined, // Simulate using default branch
  },
}

const mockConfigEmptyBranch: SyncServiceConfig<
  GithubCredentials,
  GithubTarget
> = {
  ...mockConfig,
  id: 'test-github-sync-empty-branch',
  target: {
    ...mockConfig.target,
    branch: '', // Simulate using default branch
  },
}

describe('GitHubSyncAdapter', () => {
  let adapter: GitHubSyncAdapter

  // Setup MSW server before all tests if mock API is used
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
    console.log('MSW server listening for mocked API calls.')
  })

  // Clean up after all tests: close the MSW server if it was used
  afterAll(() => {
    server.close()
    console.log('MSW server closed.')
  })

  beforeEach(() => {
    adapter = new GitHubSyncAdapter()
    resetMockGitHubDataStore() // Reset store before each test
  })

  afterEach(() => {
    server.resetHandlers()
    vi.restoreAllMocks() // Restore all mocks
  })

  describe('init', () => {
    it('should initialize correctly with valid config', async () => {
      await expect(adapter.init(mockConfig)).resolves.toBeUndefined()
      expect(adapter.getConfig()).toEqual(mockConfig)
    })

    it('should throw error for invalid config type', async () => {
      const invalidConfig = { ...mockConfig, type: 'webdav' } as any

      await expect(adapter.init(invalidConfig)).rejects.toThrow(
        'Invalid configuration type for GitHubSyncAdapter.'
      )
    })

    it('should throw error if token is missing', async () => {
      const configWithoutToken = {
        ...mockConfig,
        credentials: { token: '' },
      }
      await expect(adapter.init(configWithoutToken)).rejects.toThrow(
        'GitHub token is required for authentication.'
      )
    })
  })

  describe('destroy', () => {
    it('should abort ongoing requests and reset initialization state', async () => {
      await adapter.init(mockConfig)
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort')
      adapter.destroy()
      expect(abortSpy).toHaveBeenCalled()
      // Check if initialized is false (private member, so test via behavior if possible or skip)
      // For example, calling a method that requires initialization should throw
      expect(() => adapter.getConfig()).toThrow(
        '[GitHubSyncAdapter] Adapter not initialized. Call init() first.'
      )
    })
  })

  describe('getConfig', () => {
    it('should return the current config after initialization', async () => {
      await adapter.init(mockConfig)
      expect(adapter.getConfig()).toEqual(mockConfig)
    })

    it('should throw error if adapter is not initialized', () => {
      expect(() => adapter.getConfig()).toThrow(
        '[GitHubSyncAdapter] Adapter not initialized. Call init() first.'
      )
    })
  })

  describe('getFilePath', () => {
    it('should return the correct path for scope "all"', async () => {
      await adapter.init(mockConfig)
      // @ts-expect-error - access private method for testing
      expect(adapter.getFilePath()).toBe('bookmarks-data.json')
    })

    it('should return the correct path for a specific collectionId scope', async () => {
      await adapter.init(mockConfigWithCollectionScope)
      // @ts-expect-error - access private method for testing
      expect(adapter.getFilePath()).toBe('data.json')
    })

    it('should return the correct path if path includes subdirectories for scope "all"', async () => {
      const configWithSubDir: SyncServiceConfig<
        GithubCredentials,
        GithubTarget
      > = {
        ...mockConfig,
        target: {
          ...mockConfig.target,
          path: 'sync/data/bookmarks.json',
        },
      }
      await adapter.init(configWithSubDir)
      // @ts-expect-error - access private method for testing
      expect(adapter.getFilePath()).toBe('sync/data/bookmarks.json')
    })

    it('should return the correct path if path includes subdirectories for collection scope', async () => {
      const configWithSubDirAndCollection: SyncServiceConfig<
        GithubCredentials,
        GithubTarget
      > = {
        ...mockConfigWithCollectionScope,
        target: {
          ...mockConfigWithCollectionScope.target,
          path: 'sync/data/file.json', // Filename part for collection scope
        },
      }
      await adapter.init(configWithSubDirAndCollection)
      // @ts-expect-error - access private method for testing
      expect(adapter.getFilePath()).toBe('sync/data/file.json')
    })

    it('should return the correct path if path is not specified for scope "all"', async () => {
      const configWithSubDir: SyncServiceConfig<
        GithubCredentials,
        GithubTarget
      > = {
        ...mockConfig,
        target: {
          ...mockConfig.target,
          path: '',
        },
      }
      await adapter.init(configWithSubDir)
      // @ts-expect-error - access private method for testing
      expect(adapter.getFilePath()).toBe('utags-bookmarks.json')
    })

    it('should return the correct path if path is not specified for collection scope', async () => {
      const configWithSubDirAndCollection: SyncServiceConfig<
        GithubCredentials,
        GithubTarget
      > = {
        ...mockConfigWithCollectionScope,
        target: {
          ...mockConfigWithCollectionScope.target,
          path: '', // Filename part for collection scope
        },
      }
      await adapter.init(configWithSubDirAndCollection)
      // @ts-expect-error - access private method for testing
      expect(adapter.getFilePath()).toBe(`utags-collection-collection123.json`)
    })
  })

  describe('getAuthStatus', () => {
    it('should return "requires_config" if token is missing', async () => {
      // Adapter not initialized with a config that has a token
      const adapterWithoutToken = new GitHubSyncAdapter()
      // Simulate a config without a token being implicitly used or set
      // This test might need adjustment based on how getAuthStatus accesses credentials
      // If getAuthStatus relies on init being called, this test needs to reflect that
      // For now, assuming it can be called on a fresh instance or one with partial/no config
      // Or, more accurately, init with a config that lacks a token:
      const configWithoutToken: SyncServiceConfig<
        GithubCredentials,
        GithubTarget
      > = {
        id: 'test-auth-no-token',
        type: 'github',
        name: 'Test Auth No Token',
        credentials: { token: '' }, // Empty token
        target: { repo: 'owner/repo', path: 'file.json' },
        scope: 'all',
        enabled: true,
      }
      // Initialize with a config that has no token, but init itself will throw.
      // So, we need to test the state *before* init throws, or how getAuthStatus behaves
      // if it's called when credentials are not fully set up.
      // The current implementation of getAuthStatus checks this.credentials.token directly.
      // So we can instantiate and then call, it should reflect 'requires_config'.
      expect(await adapterWithoutToken.getAuthStatus()).toBe('requires_config')

      // @ts-expect-error - bypassing private member access for testing
      adapterWithoutToken.credentials = configWithoutToken.credentials
      expect(await adapterWithoutToken.getAuthStatus()).toBe('requires_config')
      // If init is called with such a config, init itself throws.
      // If we want to test getAuthStatus *after* a failed init due to no token,
      // that's a different scenario. The current getAuthStatus is designed to be callable
      // even before a successful init.
    })

    it('should return "authenticated" for a valid token', async () => {
      await adapter.init(mockConfig) // mockConfig has 'test-github-token'
      const status = await adapter.getAuthStatus()
      expect(status).toBe('authenticated')
    })

    it('should return "unauthenticated" for an invalid token', async () => {
      const configWithInvalidToken = {
        ...mockConfig,
        credentials: { token: 'invalid-github-token' },
      }
      await adapter.init(configWithInvalidToken)
      const status = await adapter.getAuthStatus()
      expect(status).toBe('unauthenticated')
    })

    it('should return "error" if API call fails for other reasons', async () => {
      const configForError = {
        ...mockConfig,
        credentials: { token: 'cause-other-error-token' }, // A token that mock will treat as causing a non-401 error
      }
      server.use(
        http.get(`${GITHUB_API_BASE_URL}/user`, ({ request }) => {
          const authHeader = request.headers.get('Authorization')
          if (authHeader === 'token cause-other-error-token') {
            return new HttpResponse(null, { status: 500 }) // Simulate server error
          }
        })
      )
      await adapter.init(configForError)
      const status = await adapter.getAuthStatus()
      expect(status).toBe('error')
    })

    it('should return "error" on network error', async () => {
      const configForNetworkError = {
        ...mockConfig,
        credentials: { token: 'network-error-token' },
      }
      server.use(
        http.get(
          `${GITHUB_API_BASE_URL}/user`,
          () => HttpResponse.error() // Simulate network error
        )
      )
      await adapter.init(configForNetworkError)
      const status = await adapter.getAuthStatus()
      expect(status).toBe('error')
    })

    it('should return "unknown" if auth status check is aborted', async () => {
      await adapter.init(mockConfig)
      const abortController = new AbortController()
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
        // Simulate an abort before fetch completes
        abortController.abort()
        throw new DOMException('Aborted', 'AbortError')
      })
      // This specific test needs to ensure the adapter's internal abortController is the one being used
      // Or, more simply, that an AbortError leads to 'unknown'
      // The adapter's destroy method calls abort. If getAuthStatus is called during destroy, or if its own signal is aborted.
      // Let's refine this: The adapter uses its own abortController. We can trigger its abort.
      const statusPromise = adapter.getAuthStatus() // Start the call
      adapter.destroy() // This will call abort on the controller used by getAuthStatus
      const status = await statusPromise
      expect(status).toBe('unknown')
    })
  })

  describe('getRemoteMetadata', () => {
    beforeEach(async () => {
      await adapter.init(mockConfig)
    })

    it('should return metadata if file exists', async () => {
      // Ensure the mock store has the file
      // @ts-expect-error - access private method for testing
      const filePath = adapter.getFilePath() // Access private method for test setup
      const [owner, repoName] = mockConfig.target.repo.split('/')
      resetMockGitHubDataStore() // Clear before setting specific state
      setMockGitHubFile(
        owner,
        repoName,
        filePath,
        mockConfig.target.branch!,
        'test data',
        { sha: 'test-sha', type: 'file', version: 'test-sha' }
      )

      const metadata = await adapter.getRemoteMetadata()
      expect(metadata).toEqual({
        sha: 'test-sha',
        timestamp: undefined, // As per current implementation
        version: 'test-sha',
      })
    })

    it('should return undefined if file does not exist (404)', async () => {
      resetMockGitHubDataStore() // Ensure store is empty for this test
      // MSW will return 404 based on empty mockGitHubDataStore for the specific path
      const metadata = await adapter.getRemoteMetadata()
      expect(metadata).toBeUndefined()
    })

    it('should throw error if API returns non-404 error', async () => {
      // @ts-expect-error - access private method for testing
      const filePath = adapter.getFilePath()
      server.use(
        http.get(
          `${GITHUB_API_BASE_URL}/repos/${mockConfig.target.repo}/contents/${filePath}`,
          () => new HttpResponse(null, { status: 500 })
        )
      )
      await expect(adapter.getRemoteMetadata()).rejects.toThrow(
        'GitHub API error (500) fetching metadata'
      )
    })

    it('should throw error if adapter is not initialized', async () => {
      const freshAdapter = new GitHubSyncAdapter()
      await expect(freshAdapter.getRemoteMetadata()).rejects.toThrow(
        '[GitHubSyncAdapter] Adapter not initialized.'
      )
    })

    it('should re-throw AbortError if fetch is aborted', async () => {
      const abortController = new AbortController()
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
        abortController.abort()
        throw new DOMException('Aborted', 'AbortError')
      })
      // Call destroy to trigger abort on the adapter's internal controller
      // Or directly mock the signal used by fetch within the adapter
      const getMetadataPromise = adapter.getRemoteMetadata()
      adapter.destroy() // This should abort the ongoing fetch
      await expect(getMetadataPromise).rejects.toThrow('Aborted')
    })

    it('should return metadata if file exists when branch is an empty string (uses default)', async () => {
      await adapter.init(mockConfigEmptyBranch) // Use config with empty branch
      // @ts-expect-error - access private method for testing
      const filePath = adapter.getFilePath()
      const [owner, repoName] = mockConfigEmptyBranch.target.repo.split('/')

      resetMockGitHubDataStore()
      setMockGitHubFile(
        owner,
        repoName,
        filePath,
        mockConfigEmptyBranch.target.branch!,
        'test data empty branch',
        {
          sha: 'test-sha-empty-branch',
          type: 'file',
          version: 'test-sha-empty-branch',
        }
      )

      const metadata = await adapter.getRemoteMetadata()
      expect(metadata).toEqual({
        sha: 'test-sha-empty-branch',
        timestamp: undefined,
        version: 'test-sha-empty-branch',
      })
    })

    it('should return metadata if file exists when branch is not specified (uses default)', async () => {
      await adapter.init(mockConfigNoBranch) // Use config without specific branch
      // @ts-expect-error - access private method for testing
      const filePath = adapter.getFilePath()
      const [owner, repoName] = mockConfigNoBranch.target.repo.split('/')
      // The mock handler for GET /contents needs to handle undefined branch by matching without ref query param
      // For simplicity, our current mock handler might need adjustment or we assume 'main' if ref is null.
      // Let's assume the mock handler is set up to use 'main' if no ref is passed or ref is 'main'.
      // We need to ensure the storeKey in mock handler matches this expectation.
      // The current mock handler uses `ref ? \`\${repoPath}?ref=\${ref}\` : repoPath;`
      // So, if branch is undefined, ref will be null, and storeKey will be just repoPath.
      // We need to set the mock file with a key that matches this.

      // Adjusting mock setup for no branch scenario:
      resetMockGitHubDataStore()
      setMockGitHubFile(
        owner,
        repoName,
        filePath,
        mockConfigNoBranch.target.branch!,
        'test data no branch',
        {
          sha: 'test-sha-no-branch',
          type: 'file',
          version: 'test-sha-no-branch',
        }
      )

      const metadata = await adapter.getRemoteMetadata()
      expect(metadata).toEqual({
        sha: 'test-sha-no-branch',
        timestamp: undefined,
        version: 'test-sha-no-branch',
      })
    })
  })

  describe('download', () => {
    beforeEach(async () => {
      await adapter.init(mockConfig)
    })

    it('should download data and metadata if file exists', async () => {
      // @ts-expect-error - access private method for testing
      const filePath = adapter.getFilePath()
      const [owner, repoName] = mockConfig.target.repo.split('/')
      const fileData = JSON.stringify({ key: 'value' })
      const fileSha = 'download-sha'
      resetMockGitHubDataStore()
      setMockGitHubFile(
        owner,
        repoName,
        filePath,
        mockConfig.target.branch!,
        fileData,
        { sha: fileSha, type: 'file', version: fileSha }
      )

      const { data, remoteMeta } = await adapter.download()
      expect(data).toBe(fileData)
      expect(remoteMeta).toEqual({
        sha: fileSha,
        timestamp: undefined,
        version: fileSha,
      })
    })

    it('should return undefined data if file does not exist', async () => {
      resetMockGitHubDataStore()
      const { data, remoteMeta } = await adapter.download()
      expect(data).toBeUndefined()
      expect(remoteMeta).toBeUndefined()
    })

    it('should throw error if fetching blob fails', async () => {
      // @ts-expect-error - access private method for testing
      const filePath = adapter.getFilePath()
      const [owner, repoName] = mockConfig.target.repo.split('/')
      const fileSha = 'error-blob-sha'
      resetMockGitHubDataStore()
      setMockGitHubFile(
        owner,
        repoName,
        filePath,
        mockConfig.target.branch!,
        'any data',
        { sha: fileSha, type: 'file', version: fileSha }
      )

      server.use(
        http.get(
          `${GITHUB_API_BASE_URL}/repos/${mockConfig.target.repo}/git/blobs/${fileSha}`,
          () => new HttpResponse(null, { status: 500 })
        )
      )

      await expect(adapter.download()).rejects.toThrow(
        'GitHub API error (500) fetching blob'
      )
    })

    it('should download data and metadata if file exists when branch is an empty string', async () => {
      await adapter.init(mockConfigEmptyBranch)
      // @ts-expect-error - access private method for testing
      const filePath = adapter.getFilePath()
      const [owner, repoName] = mockConfigEmptyBranch.target.repo.split('/')
      const fileData = JSON.stringify({ key: 'value empty branch' })
      const fileSha = 'download-sha-empty-branch'

      resetMockGitHubDataStore()
      setMockGitHubFile(
        owner,
        repoName,
        filePath,
        mockConfigEmptyBranch.target.branch!,
        fileData,
        { sha: fileSha, type: 'file', version: fileSha }
      )

      const { data, remoteMeta } = await adapter.download()
      expect(data).toBe(fileData)
      expect(remoteMeta).toEqual({
        sha: fileSha,
        timestamp: undefined,
        version: fileSha,
      })
    })

    it('should throw error if adapter is not initialized', async () => {
      const freshAdapter = new GitHubSyncAdapter()
      await expect(freshAdapter.download()).rejects.toThrow(
        '[GitHubSyncAdapter] Adapter not initialized.'
      )
    })

    it('should download data and metadata if file exists when branch is not specified', async () => {
      await adapter.init(mockConfigNoBranch)
      // @ts-expect-error - access private method for testing
      const filePath = adapter.getFilePath()
      const [owner, repoName] = mockConfigNoBranch.target.repo.split('/')
      const fileData = JSON.stringify({ key: 'value no branch' })
      const fileSha = 'download-sha-no-branch'

      resetMockGitHubDataStore()
      setMockGitHubFile(
        owner,
        repoName,
        filePath,
        mockConfigNoBranch.target.branch!,
        fileData,
        { sha: fileSha, type: 'file', version: fileSha }
      )

      const { data, remoteMeta } = await adapter.download()
      expect(data).toBe(fileData)
      expect(remoteMeta).toEqual({
        sha: fileSha,
        timestamp: undefined,
        version: fileSha,
      })
    })
  })

  describe('upload', () => {
    const uploadData = JSON.stringify({ foo: 'bar' })

    beforeEach(async () => {
      await adapter.init(mockConfig)
    })

    it('should upload data and return new metadata for a new file', async () => {
      resetMockGitHubDataStore() // Ensure no existing file
      const metadata = await adapter.upload(uploadData)
      expect(metadata.sha).toBeDefined()
      expect(metadata.version).toBeDefined()
      // Check if data is in mock store (implementation detail of mock, but good for verification)
      // @ts-expect-error - access private method for testing
      const filePath = adapter.getFilePath()
      const [owner, repoName] = mockConfig.target.repo.split('/')

      const remoteFile = getMockGitHubFile(
        owner,
        repoName,
        filePath,
        mockConfig.target.branch
      )
      expect(remoteFile).toBeDefined()
      expect(remoteFile!.data).toBe(uploadData)
    })

    it('should upload data for a new file when branch is an empty string', async () => {
      await adapter.init(mockConfigEmptyBranch)
      resetMockGitHubDataStore() // Ensure no existing file
      const metadata = await adapter.upload(uploadData)
      expect(metadata.sha).toBeDefined()
      expect(metadata.version).toBeDefined()
      // Check if data is in mock store
      // @ts-expect-error - access private method for testing
      const filePath = adapter.getFilePath()
      const [owner, repoName] = mockConfigEmptyBranch.target.repo.split('/')

      const remoteFile = getMockGitHubFile(
        owner,
        repoName,
        filePath,
        mockConfigEmptyBranch.target.branch
      )
      expect(remoteFile).toBeDefined()
      expect(remoteFile!.data).toBe(uploadData)
    })

    it('should update existing file with correct SHA', async () => {
      // @ts-expect-error - access private method for testing
      const filePath = adapter.getFilePath()
      const [owner, repoName] = mockConfig.target.repo.split('/')
      const initialSha = 'initial-upload-sha'
      resetMockGitHubDataStore()
      setMockGitHubFile(
        owner,
        repoName,
        filePath,
        mockConfig.target.branch!,
        'old data',
        { sha: initialSha, type: 'file', version: initialSha }
      )

      const newUploadData = JSON.stringify({ updated: true })
      const metadata = await adapter.upload(newUploadData, { sha: initialSha })

      expect(metadata.sha).toBeDefined()
      expect(metadata.sha).not.toBe(initialSha)

      const remoteFile = getMockGitHubFile(
        owner,
        repoName,
        filePath,
        mockConfig.target.branch
      )
      expect(remoteFile).toBeDefined()
      expect(remoteFile!.data).toBe(newUploadData)
      expect(remoteFile!.meta.sha).toBe(metadata.sha)
    })

    it('should throw 409 conflict error if SHA mismatch', async () => {
      // @ts-expect-error - access private method for testing
      const filePath = adapter.getFilePath()
      const [owner, repoName] = mockConfig.target.repo.split('/')
      const remoteSha = 'remote-sha-conflict'
      resetMockGitHubDataStore()
      setMockGitHubFile(
        owner,
        repoName,
        filePath,
        mockConfig.target.branch!,
        'remote data',
        { sha: remoteSha, type: 'file', version: remoteSha }
      )

      await expect(
        adapter.upload(uploadData, { sha: 'different-local-sha' })
      ).rejects.toThrow('Conflict (409)')
    })

    it('should throw 422 error for unprocessable entity (e.g. bad SHA for existing file)', async () => {
      // This scenario is a bit tricky to mock perfectly without knowing GitHub's exact 422 reasons.
      // The mock handler for PUT already implements a 409 for SHA mismatch.
      // A 422 might occur if 'sha' is provided but the file doesn't exist, or other structural issues.
      // For this test, we'll assume the mock handler can be adjusted or a specific case triggers it.
      // The current adapter PUT request body.sha is only set if expectedRemoteMeta.sha exists.
      // If we provide an expectedRemoteMeta.sha for a non-existent file, GitHub might return 422.
      resetMockGitHubDataStore() // File does not exist

      // Modify the server handler for this specific test case to return 422
      // This is a more direct way to test the adapter's handling of 422
      // @ts-expect-error - access private method for testing
      const tempPath = adapter.getFilePath()
      server.use(
        http.put(
          `${GITHUB_API_BASE_URL}/repos/${mockConfig.target.repo}/contents/${tempPath}`,
          async ({ request }) => {
            const body = (await request.json()) as any
            if (body.sha === 'force-422-sha') {
              return HttpResponse.json(
                { message: 'Unprocessable Entity due to forced SHA' },
                { status: 422 }
              )
            }

            // Fallback to default mock behavior if not the forced SHA
            return new HttpResponse(null, { status: 200 }) // Or your actual default mock PUT
          }
        )
      )

      await expect(
        adapter.upload(uploadData, { sha: 'force-422-sha' })
      ).rejects.toThrow('Unprocessable Entity (422)')
    })

    it('should throw error if API returns other non-OK status', async () => {
      // @ts-expect-error - access private method for testing
      const tempPath = adapter.getFilePath()
      server.use(
        http.put(
          `${GITHUB_API_BASE_URL}/repos/${mockConfig.target.repo}/contents/${tempPath}`,
          () => new HttpResponse(null, { status: 503 })
        )
      )
      await expect(adapter.upload(uploadData)).rejects.toThrow(
        'GitHub API error (503) uploading file'
      )
    })

    it('should throw error if adapter is not initialized', async () => {
      const freshAdapter = new GitHubSyncAdapter()
      await expect(freshAdapter.upload(uploadData)).rejects.toThrow(
        '[GitHubSyncAdapter] Adapter not initialized.'
      )
    })

    it('should upload data to default branch if branch is not specified', async () => {
      await adapter.init(mockConfigNoBranch)
      resetMockGitHubDataStore()
      const metadata = await adapter.upload(uploadData)
      expect(metadata.sha).toBeDefined()
      expect(metadata.version).toBeDefined()

      // @ts-expect-error - access private method for testing
      const filePath = adapter.getFilePath()
      const [owner, repoName] = mockConfigNoBranch.target.repo.split('/')
      // The mock handler for PUT /contents needs to handle undefined branch in requestBody.branch
      // It should form the storeKey without ?ref=
      const remoteFile = getMockGitHubFile(owner, repoName, filePath)
      expect(remoteFile).toBeDefined()
      expect(remoteFile!.data).toBe(uploadData)
    })

    it('should throw error if upload response is OK but content.sha is missing', async () => {
      // @ts-expect-error - access private method for testing
      const filePath = adapter.getFilePath()
      server.use(
        http.put(
          `${GITHUB_API_BASE_URL}/repos/${mockConfig.target.repo}/contents/${filePath}`,
          async () =>
            HttpResponse.json(
              {
                // Missing content.sha or content itself
                commit: { sha: 'mock-commit-sha' },
              },
              { status: 200 }
            )
        )
      )
      await expect(adapter.upload(uploadData)).rejects.toThrow(
        'Unexpected successful response format from GitHub API'
      )
    })

    it('should throw error if upload response is OK but commit.sha is missing', async () => {
      // @ts-expect-error - access private method for testing
      const filePath = adapter.getFilePath()
      server.use(
        http.put(
          `${GITHUB_API_BASE_URL}/repos/${mockConfig.target.repo}/contents/${filePath}`,
          async () =>
            HttpResponse.json(
              {
                content: { sha: 'mock-file-sha' },
                // Missing commit.sha or commit itself
              },
              { status: 200 }
            )
        )
      )
      await expect(adapter.upload(uploadData)).rejects.toThrow(
        'Unexpected successful response format from GitHub API'
      )
    })
  })
})
