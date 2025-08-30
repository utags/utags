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
import fetch from 'node-fetch'
import { CustomApiSyncAdapter } from './custom-api-sync-adapter.js'
import type { SyncServiceConfig, ApiCredentials, ApiTarget } from './types.js'
import { server } from './mocks/server.js' // Import the MSW server
import { resetMockDataStore } from './mocks/handlers.js' // Import reset function

// Mock the global fetch
vi.stubGlobal('fetch', fetch)

// Determine if we should use the mock API based on an environment variable
const runTestSuites = (shouldUseMockApi: boolean) => {
  describe(`CustomApiSyncAdapter (mockApi: ${shouldUseMockApi})`, () => {
    const mockApiUrl = 'http://localhost:3001' // This should be your actual API URL for real tests
    let adapter: CustomApiSyncAdapter

    const baseConfig: SyncServiceConfig = {
      id: 'test-custom-api',
      type: 'customApi',
      name: 'Test Custom API',
      credentials: {
        token: 'test-auth-token',
        // apiKey: 'test-api-key', // Uncomment if your mock server uses X-API-Key
      } as ApiCredentials,
      target: {
        url: mockApiUrl,
        path: 'test-bookmarks.json',
        authTestEndpoint: 'auth/status',
      } as ApiTarget,
      scope: 'all',
      enabled: true,
    }

    // Setup MSW server before all tests if mock API is used
    beforeAll(() => {
      if (shouldUseMockApi) {
        server.listen({ onUnhandledRequest: 'warn' })
        console.log('MSW server listening for mocked API calls.')
      }
    })

    // Reset MSW handlers and mock data store before each test if mock API is used
    beforeEach(async () => {
      if (shouldUseMockApi) {
        server.resetHandlers()
        resetMockDataStore() // Reset our mock data store
      }

      // Ensure the mock server's data directory is clean or reset if needed before each test.
      // For this example, we assume the mock server handles its state or is reset externally.
      adapter = new CustomApiSyncAdapter()
      // The adapter will always be initialized with the baseConfig.
      // If MSW is active, it will intercept calls to mockApiUrl.
      // If MSW is not active, calls will go to the real API at mockApiUrl.
      await adapter.init(baseConfig)
    })

    // Clean up after all tests: close the MSW server if it was used
    afterAll(() => {
      if (shouldUseMockApi) {
        server.close()
        console.log('MSW server closed.')
      }
    })

    it('should be defined', () => {
      expect(adapter).toBeDefined()
    })

    describe('getAuthStatus', () => {
      it('should return "authenticated" with valid credentials', async () => {
        const authStatus = await adapter.getAuthStatus()
        expect(authStatus).toBe('authenticated')
      })

      it('should return "unauthenticated" with invalid token', async () => {
        const configWithInvalidToken: SyncServiceConfig = {
          ...baseConfig,
          credentials: {
            token: 'invalid-token',
          } as ApiCredentials,
        }
        // Re-initialize adapter with bad config for this specific test
        const adapterWithInvalidToken = new CustomApiSyncAdapter()
        await adapterWithInvalidToken.init(configWithInvalidToken)
        const authStatus = await adapterWithInvalidToken.getAuthStatus()
        // The mock server currently returns 403 for invalid token, which our adapter should map to 'unauthenticated'
        // If the mock server returned 401, it would also be 'unauthenticated'
        expect(authStatus).toBe('unauthenticated')
      })

      it('should return "requires_config" if no token or apiKey is provided', async () => {
        const configWithoutCredentials: SyncServiceConfig = {
          ...baseConfig,
          credentials: {} as ApiCredentials, // No token or apiKey
        }
        const adapterWithoutCredentials = new CustomApiSyncAdapter()
        await adapterWithoutCredentials.init(configWithoutCredentials)
        const authStatus = await adapterWithoutCredentials.getAuthStatus()
        expect(authStatus).toBe('requires_config')
      })
    })

    describe('getRemoteMetadata', () => {
      it('should return undefined if file does not exist', async () => {
        const configForNonExistentFile: SyncServiceConfig = {
          ...baseConfig,
          target: {
            ...baseConfig.target,
            path: 'non-existent-file.json',
          } as ApiTarget,
        }
        const adapterForNonExistentFile = new CustomApiSyncAdapter()
        await adapterForNonExistentFile.init(configForNonExistentFile)
        const metadata = await adapterForNonExistentFile.getRemoteMetadata()
        expect(metadata).toBeUndefined()
      })

      it('should retrieve metadata for an existing file', async () => {
        // First, upload some data to ensure the file exists
        const initialData = JSON.stringify({ message: 'Hello Metadata!' })
        await adapter.upload(initialData)

        const metadata = await adapter.getRemoteMetadata()
        expect(metadata).toBeDefined()
        expect(metadata?.version).toBeTypeOf('string') // Mock server provides 'sha' as 'version'
        // FIXME: timestamp is undefined in the mock server
        if (metadata?.timestamp) {
          expect(metadata?.timestamp).toBeTypeOf('number')
        }

        // FIXME: sha is undefined in the mock server
        if (metadata?.sha) {
          expect(metadata?.sha).toBeTypeOf('string') // Mock server provides 'sha'
        }
      })
    })

    describe('download', () => {
      it('should return undefined data and meta if file does not exist', async () => {
        const configForNonExistentFile: SyncServiceConfig = {
          ...baseConfig,
          target: {
            ...baseConfig.target,
            path: 'non-existent-download.json',
          } as ApiTarget,
        }
        const adapterForNonExistentFile = new CustomApiSyncAdapter()
        await adapterForNonExistentFile.init(configForNonExistentFile)
        const { data, remoteMeta } = await adapterForNonExistentFile.download()
        expect(data).toBeUndefined()
        expect(remoteMeta).toBeUndefined()
      })

      it('should download data and metadata for an existing file', async () => {
        const testData = { content: 'Download me!' }
        const stringData = JSON.stringify(testData)
        await adapter.upload(stringData) // Upload first

        const { data, remoteMeta } = await adapter.download()
        expect(remoteMeta).toBeDefined()
        expect(remoteMeta?.version).toBeTypeOf('string')
        expect(data).toEqual(stringData)
      })
    })

    describe('upload', () => {
      it('should upload data and return new metadata', async () => {
        const dataToUpload = { message: 'Hello, uploader!' }
        const stringData = JSON.stringify(dataToUpload)

        const newMeta = await adapter.upload(stringData)
        expect(newMeta).toBeDefined()
        expect(newMeta.version).toBeTypeOf('string') // Corresponds to SHA from mock server
        expect(newMeta.timestamp).toBeTypeOf('number')

        // Verify by downloading
        const { data: downloadedData } = await adapter.download()
        expect(downloadedData).toEqual(stringData)
      })

      it('should handle conflict (412) if If-Match header (version) does not match', async () => {
        const initialData = JSON.stringify({ version: 1 })
        const initialMeta = await adapter.upload(initialData)
        expect(initialMeta?.version).toBeDefined()

        // Simulate another client updating the data
        const updatedDataByOther = JSON.stringify({ version: 2 })
        await adapter.upload(updatedDataByOther) // No If-Match, so it overwrites

        // Try to upload with the old metadata (stale version)
        const conflictingData = JSON.stringify({ version: 3 })
        try {
          await adapter.upload(conflictingData, initialMeta) // Use stale version
          // Should not reach here
          expect(true).toBe(false)
        } catch (error: any) {
          // Type assertion for error
          expect(error).toBeInstanceOf(Error)
          expect(error.message).toContain('412') // Check for conflict error message
          // expect(error.message).toContain('Conflict detected')
          expect(error.message).toContain('Precondition Failed')
        }
      })

      it('should upload successfully if If-Match header (version) matches', async () => {
        const initialData = JSON.stringify({ step: 'one' })
        const initialMeta = await adapter.upload(initialData)

        expect(initialMeta?.version).toBeDefined()

        const newData = JSON.stringify({ step: 'two' })
        const newMeta = await adapter.upload(newData, initialMeta)

        expect(newMeta).toBeDefined()
        expect(newMeta.version).not.toEqual(initialMeta.version)
        if (newMeta.sha) {
          expect(newMeta.sha).not.toEqual(initialMeta.sha)
        }

        expect(newMeta.timestamp).toBeTypeOf('number')

        // Verify the new data
        const { data: downloadedData } = await adapter.download()
        expect(downloadedData).toEqual(newData)
      })
    })

    if (shouldUseMockApi) {
      describe('Error Handling (when API is down or misbehaving - primarily for mock tests)', () => {
        // These tests are more meaningful with a mock server that can simulate these conditions.
        // Skip these if not using mock API, or adapt them if your real API can be put into these states for testing.
        it('should handle API down (503) during download', async () => {
          const configForApiDown: SyncServiceConfig = {
            ...baseConfig,
            target: {
              ...baseConfig.target,
              path: 'api-down-test', // Special path for mock handler
            } as ApiTarget,
          }
          await adapter.init(configForApiDown)
          try {
            await adapter.download()
            // Should not reach here
            expect(true).toBe(false)
          } catch (error: any) {
            expect(error).toBeInstanceOf(Error)
            // Check for a message that indicates the server error, e.g., containing '503'
            expect(error.message).toMatch(/failed to download data.*503/i)
          }
        })

        it('should handle network error during download', async () => {
          const configForNetworkError: SyncServiceConfig = {
            ...baseConfig,
            target: {
              ...baseConfig.target,
              path: 'network-error-test', // Special path for mock handler
            } as ApiTarget,
          }
          await adapter.init(configForNetworkError)
          try {
            await adapter.download()
            // Should not reach here
            expect(true).toBe(false)
          } catch (error: any) {
            expect(error).toBeInstanceOf(Error)
            // MSW's HttpResponse.error() often results in a generic fetch error message
            expect(error.message).toMatch(/failed to fetch/i) // Or a more specific message if available
          }
        })
      })
    }

    // Clean up mock data file after all tests in this suite if possible.
    // This might require an additional call to the mock server if it has a delete endpoint,
    // or manual cleanup of the .mock-data directory.
    afterEach(async () => {
      // Attempt to delete the test file on the mock server to clean up.
      // This requires the mock server to support DELETE or a similar mechanism.
      // For simplicity, this example doesn't implement a server-side delete.
      // If your mock server stores files, you might need to manually clear them
      // or add a DELETE endpoint to the mock server.
      // Example: (if mock server had a DELETE endpoint)
      // try {
      //   await fetch(`${mockApiUrl}/${baseConfig.target.path}`, {
      //     method: 'DELETE',
      //     headers: { Authorization: `Bearer ${baseConfig.credentials.token}` },
      //   });
      // } catch (e) {
      //   // console.warn('Could not clean up test file:', e.message);
      // }
    })
  })
}

runTestSuites(true)
// eslint-disable-next-line n/prefer-global/process
if (process.env.USE_REAL_API) {
  runTestSuites(false)
}
