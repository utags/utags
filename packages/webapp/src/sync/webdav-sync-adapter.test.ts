import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setupServer, type SetupServerApi } from 'msw/node'
import { http, HttpResponse, type RequestHandler } from 'msw'
import { WebDAVSyncAdapter } from './webdav-sync-adapter.js'
import type {
  SyncServiceConfig,
  WebDAVCredentials,
  WebDAVTarget,
  SyncMetadata,
} from './types.js'

const server: SetupServerApi = setupServer()

/**
 * Creates a default configuration for WebDAVSyncAdapter for testing.
 * @returns A default SyncServiceConfig object for WebDAV.
 */
const createDefaultConfig = (): SyncServiceConfig<
  WebDAVCredentials,
  WebDAVTarget
> => ({
  id: 'test-webdav-config-1',
  type: 'webdav',
  name: 'Test WebDAV Service',
  credentials: {
    username: 'testuser',
    password: 'testpassword',
  },
  target: {
    url: 'http://localhost:1234/dav',
    path: 'utags/bookmarks.json', // Relative path to url
  },
  scope: 'all',
  enabled: true,
})

type CreatePropfindHandlerOptions = {
  status?: number
  body?: string | undefined // XML string or null for empty body
  headers?: Record<string, string>
  checkAuth?: boolean
  isCollection?: boolean // To determine if it's a collection or file for default XML
  etag?: string
  lastModified?: string // UTC string, e.g., new Date().toUTCString()
  resourcePathOverride?: string // Override the path used in the XML response href, if needed
  once?: boolean // If true, the handler will only be used once
}

/**
 * Creates an MSW RequestHandler for PROPFIND requests.
 * @param currentServiceConfig The service configuration containing credentials.
 * @param requestPath The path for the PROPFIND request (e.g., '/', '/utags/bookmarks.json').
 * @param options Options to customize the mock response.
 * @returns An MSW RequestHandler.
 */
const createPropfindHandler = (
  currentServiceConfig: SyncServiceConfig<WebDAVCredentials, WebDAVTarget>,
  requestPath: string, // Should start with '/' if it's an absolute path from server root
  options: CreatePropfindHandlerOptions = {}
): RequestHandler => {
  const {
    status = 207,
    body,
    headers,
    isCollection,
    etag,
    lastModified,
    checkAuth = true,
    resourcePathOverride,
    once = false,
  } = options
  const fullPath =
    currentServiceConfig.target.url +
    (requestPath.startsWith('/') ? requestPath : `/${requestPath}`)
  console.log('create createPropfindHandler', fullPath, options)
  return http.all(
    fullPath,
    async ({ request }) => {
      if (request.method.toUpperCase() !== 'PROPFIND') {
        return undefined
      }

      console.log('access createPropfindHandler', request.url, options)

      if (checkAuth) {
        const authHeader = request.headers.get('Authorization')
        // eslint-disable-next-line no-restricted-globals
        const expectedAuth = `Basic ${btoa(
          `${currentServiceConfig.credentials.username}:${currentServiceConfig.credentials.password}`
        )}`
        if (!authHeader || authHeader !== expectedAuth) {
          return new HttpResponse(null, { status: 401 })
        }
      }

      let responseBody = body

      // Handle non-207/200 status codes directly if status is explicitly set to an error
      if (status && status !== 207 && status !== 200) {
        if (status === 404) {
          return new HttpResponse(null, { status: 404 })
        }

        return new HttpResponse(
          responseBody === undefined ? null : responseBody,
          {
            status,
            headers,
          }
        )
      }

      if (responseBody === undefined && status === 207) {
        // Construct default XML if not provided and status is 207
        const resourceType = isCollection ? '<D:collection/>' : ''
        const etagProp = etag ? `<D:getetag>${etag}</D:getetag>` : ''
        const lastModProp = lastModified
          ? `<D:getlastmodified>${lastModified}</D:getlastmodified>`
          : ''
        const hrefPath = resourcePathOverride || requestPath

        responseBody = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>${hrefPath}</D:href>
    <D:propstat>
      <D:prop>
        ${etagProp}
        ${lastModProp}
        <D:resourcetype>${resourceType}</D:resourcetype>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`
      }

      return new HttpResponse(responseBody, {
        status,
        headers: { 'Content-Type': 'application/xml', ...headers },
      })
    },
    { once }
  )
}

// Helper function to create an MKCOL request handler
const createMkcolHandler = (
  config: SyncServiceConfig,
  path: string,
  options: {
    status?: number
    checkAuth?: boolean
    once?: boolean
  } = {}
) => {
  const url = config.target.url
  const { username, password } = config.credentials
  const fullPath = `${url}${path}`
  console.log('create createMkcolHandler', fullPath, options)
  return http.all(
    fullPath, // Use http.all and then check method
    async ({ request }) => {
      if (request.method.toUpperCase() !== 'MKCOL') {
        return undefined // Let other handlers for this path process it
      }

      console.log('access createMkcolHandler', fullPath, options)

      if (options.checkAuth) {
        const authHeader = request.headers.get('Authorization')
        // eslint-disable-next-line no-restricted-globals
        const expectedAuth = `Basic ${btoa(`${username}:${password}`)}`
        if (authHeader !== expectedAuth) {
          return new HttpResponse(null, { status: 401 })
        }
      }

      return new HttpResponse(null, { status: options.status || 201 })
    },
    { once: options.once }
  )
}

describe('WebDAVSyncAdapter', () => {
  let adapter: WebDAVSyncAdapter
  let serviceConfig: SyncServiceConfig<WebDAVCredentials, WebDAVTarget>

  beforeEach(() => {
    serviceConfig = createDefaultConfig()
    adapter = new WebDAVSyncAdapter()
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterEach(() => {
    server.resetHandlers()
    server.close()
    vi.clearAllMocks()
  })

  // Helper to get the full file path relative to server root
  const getTestFilePath = () => `/${createDefaultConfig().target.path}`

  describe('init', () => {
    it('should initialize correctly and test connection with a successful PROPFIND on root', async () => {
      server.use(
        createPropfindHandler(serviceConfig, '/', {
          checkAuth: true,
          isCollection: true,
        })
      )

      await adapter.init(serviceConfig)
      expect(adapter.getConfig()).toEqual(serviceConfig)
    })

    it('should throw an error if initial connection test fails (PROPFIND 500)', async () => {
      server.use(
        createPropfindHandler(serviceConfig, '/', {
          status: 500,
          checkAuth: true,
        })
      )

      await expect(adapter.init(serviceConfig)).rejects.toThrow(
        'WebDAV initial connection test failed:'
      )
    })

    it('should throw an error if initial connection test fails (PROPFIND 401)', async () => {
      server.use(
        createPropfindHandler(serviceConfig, '/', { status: 401 }) // checkAuth: false, let status handle it
      )
      // Modify config to make auth fail if checkAuth was true, or rely on server returning 401
      const badAuthConfig = {
        ...serviceConfig,
        credentials: { ...serviceConfig.credentials, password: 'wrong' },
      }
      // The handler above will return 401 regardless of password because checkAuth is false and status is 401.
      // If we wanted to test the adapter's auth sending, we'd use checkAuth:true and let it fail.
      // For this test, we assume the server itself returns 401 for any reason.

      await expect(adapter.init(badAuthConfig)).rejects.toThrow(
        'WebDAV initial connection test failed: Invalid response: 401 Unauthorized'
      )
    })

    it('should throw an error if config is not provided to init', async () => {
      // @ts-expect-error Testing invalid input
      await expect(adapter.init(undefined)).rejects.toThrow(
        'Configuration must be provided for WebDAVSyncAdapter.'
      )
    })
  })

  describe('destroy', () => {
    it('should run without errors', async () => {
      server.use(
        createPropfindHandler(serviceConfig, '/', {
          isCollection: true,
          checkAuth: true,
        })
      )
      await adapter.init(serviceConfig)
      expect(() => {
        adapter.destroy()
      }).not.toThrow()
    })
  })

  describe('getConfig', () => {
    it('should return the current configuration after init', async () => {
      server.use(
        createPropfindHandler(serviceConfig, '/', {
          isCollection: true,
          checkAuth: true,
        })
      )
      await adapter.init(serviceConfig)
      expect(adapter.getConfig()).toEqual(serviceConfig)
    })

    it('should throw an error if getConfig is called before init', () => {
      expect(() => adapter.getConfig()).toThrow(
        'WebDAVSyncAdapter not initialized. Call init() first.'
      )
    })
  })

  describe('getAuthStatus', () => {
    beforeEach(async () => {
      // Mock for the init() call's stat('/')
      server.use(
        createPropfindHandler(serviceConfig, '/', {
          isCollection: true,
          checkAuth: true,
        })
      )
      await adapter.init(serviceConfig)
    })

    it('should return "authenticated" if a PROPFIND request to the base path is successful', async () => {
      // This mock is for the getAuthStatus() call's stat('/')
      server.use(
        createPropfindHandler(serviceConfig, '/', {
          isCollection: true,
          checkAuth: true,
        })
      )
      const authStatus = await adapter.getAuthStatus()
      expect(authStatus).toBe('authenticated')
    })

    it('should return "unauthenticated" if PROPFIND request fails with 401', async () => {
      server.use(createPropfindHandler(serviceConfig, '/', { status: 401 }))
      const authStatus = await adapter.getAuthStatus()
      expect(authStatus).toBe('unauthenticated')
    })

    it('should return "error" if PROPFIND request fails with other errors (e.g., 500)', async () => {
      server.use(createPropfindHandler(serviceConfig, '/', { status: 500 }))
      const authStatus = await adapter.getAuthStatus()
      expect(authStatus).toBe('error')
    })

    it('should return "requires_config" if adapter is not initialized (simulated by missing client/config)', async () => {
      const freshAdapter = new WebDAVSyncAdapter()
      // To truly test requires_config, we ensure config is not set or is incomplete.
      // @ts-expect-error Deliberately not initializing or setting incomplete config
      freshAdapter.config = null
      let authStatus = await freshAdapter.getAuthStatus()
      expect(authStatus).toBe('requires_config')

      // @ts-expect-error Deliberately not initializing or setting incomplete config
      freshAdapter.config = { credentials: {}, target: {} } // Simulate partial config without url
      authStatus = await freshAdapter.getAuthStatus()
      expect(authStatus).toBe('requires_config')
    })
  })

  describe('getRemoteMetadata', () => {
    const filePath = getTestFilePath()
    beforeEach(async () => {
      server.use(
        createPropfindHandler(serviceConfig, '/', {
          isCollection: true,
          checkAuth: true,
        })
      )
      await adapter.init(serviceConfig)
    })

    it('should return metadata if file exists', async () => {
      const mockEtag = '"xyz123"'
      const mockLastMod = new Date().toUTCString()

      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          etag: mockEtag,
          lastModified: mockLastMod,
          isCollection: false, // It's a file
          checkAuth: true,
        })
      )

      const metadata = await adapter.getRemoteMetadata()
      expect(metadata).toEqual({
        version: mockEtag.replaceAll('"', ''),
        sha: mockEtag.replaceAll('"', ''),
        timestamp: new Date(mockLastMod).getTime(),
      })
    })

    it('should return undefined if file does not exist (404)', async () => {
      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          status: 404,
          checkAuth: true,
        })
      )

      const metadata = await adapter.getRemoteMetadata()
      expect(metadata).toBeUndefined()
    })

    it('should return undefined if the path is not found (409)', async () => {
      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          status: 409, // Simulate a conflict/path not found
          checkAuth: true,
        })
      )

      const metadata = await adapter.getRemoteMetadata()
      expect(metadata).toBeUndefined()
    })

    it('should throw an error if API call fails with other errors (500)', async () => {
      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          status: 500,
          checkAuth: true,
        })
      )

      await expect(adapter.getRemoteMetadata()).rejects.toThrow(
        'WebDAV getRemoteMetadata failed:'
      )
    })

    it('should throw an error if adapter is not initialized', async () => {
      const freshAdapter = new WebDAVSyncAdapter()
      await expect(freshAdapter.getRemoteMetadata()).rejects.toThrow(
        'WebDAVSyncAdapter not initialized.'
      )
    })
  })

  describe('download', () => {
    const filePath = getTestFilePath()
    beforeEach(async () => {
      server.use(
        createPropfindHandler(serviceConfig, '/', {
          isCollection: true,
          checkAuth: true,
        })
      )
      await adapter.init(serviceConfig)
    })

    it('should download data and metadata if file exists', async () => {
      const mockData = JSON.stringify({ foo: 'bar' })
      const mockEtag = '"abc789"'
      const mockLastMod = new Date().toUTCString()

      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          etag: mockEtag,
          lastModified: mockLastMod,
          isCollection: false,
          checkAuth: true,
        }),
        http.get(
          `${serviceConfig.target.url}${filePath}`,
          async ({ request }) => {
            const authHeader = request.headers.get('Authorization')
            // eslint-disable-next-line no-restricted-globals
            const expectedAuth = `Basic ${btoa(
              `${serviceConfig.credentials.username}:${serviceConfig.credentials.password}`
            )}`
            if (!authHeader || authHeader !== expectedAuth) {
              return new HttpResponse(null, { status: 401 })
            }

            return new HttpResponse(mockData, {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                ETag: mockEtag,
                'Last-Modified': mockLastMod,
              },
            })
          }
        )
      )

      const result = await adapter.download()
      expect(result.data).toBe(mockData)
      expect(result.remoteMeta).toEqual({
        version: mockEtag.replaceAll('"', ''),
        sha: mockEtag.replaceAll('"', ''),
        timestamp: new Date(mockLastMod).getTime(),
      })
    })

    it('should download empty data and metadata if remote file is empty', async () => {
      const mockData = ''
      const mockEtag = '"emptyfileEtag"'
      const mockLastMod = new Date().toUTCString()

      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          etag: mockEtag,
          lastModified: mockLastMod,
          isCollection: false,
          checkAuth: true,
        }),
        http.get(
          `${serviceConfig.target.url}${filePath}`,
          async ({ request }) => {
            const authHeader = request.headers.get('Authorization')
            // eslint-disable-next-line no-restricted-globals
            const expectedAuth = `Basic ${btoa(
              `${serviceConfig.credentials.username}:${serviceConfig.credentials.password}`
            )}`
            if (!authHeader || authHeader !== expectedAuth) {
              return new HttpResponse(null, { status: 401 })
            }

            return new HttpResponse(mockData, {
              status: 200,
              headers: {
                'Content-Type': 'text/plain', // Or application/json if server still sends that for empty
                ETag: mockEtag,
                'Last-Modified': mockLastMod,
              },
            })
          }
        )
      )

      const result = await adapter.download()
      expect(result.data).toBe(mockData)
      expect(result.remoteMeta).toEqual({
        version: mockEtag.replaceAll('"', ''),
        sha: mockEtag.replaceAll('"', ''),
        timestamp: new Date(mockLastMod).getTime(),
      })
    })

    it('should download non-JSON data and metadata if remote file is not JSON', async () => {
      const mockData = 'This is not a JSON string.'
      const mockEtag = '"nonJsonEtag"'
      const mockLastMod = new Date().toUTCString()

      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          etag: mockEtag,
          lastModified: mockLastMod,
          isCollection: false,
          checkAuth: true,
        }),
        http.get(
          `${serviceConfig.target.url}${filePath}`,
          async ({ request }) => {
            const authHeader = request.headers.get('Authorization')
            // eslint-disable-next-line no-restricted-globals
            const expectedAuth = `Basic ${btoa(
              `${serviceConfig.credentials.username}:${serviceConfig.credentials.password}`
            )}`
            if (!authHeader || authHeader !== expectedAuth) {
              return new HttpResponse(null, { status: 401 })
            }

            return new HttpResponse(mockData, {
              status: 200,
              headers: {
                'Content-Type': 'text/plain',
                ETag: mockEtag,
                'Last-Modified': mockLastMod,
              },
            })
          }
        )
      )

      const result = await adapter.download()
      expect(result.data).toBe(mockData)
      expect(result.remoteMeta).toEqual({
        version: mockEtag.replaceAll('"', ''),
        sha: mockEtag.replaceAll('"', ''),
        timestamp: new Date(mockLastMod).getTime(),
      })
    })

    it('should return undefined data and metadata if file does not exist (404 on PROPFIND)', async () => {
      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          status: 404,
          checkAuth: true,
        })
      )

      const result = await adapter.download()
      expect(result.data).toBeUndefined()
      expect(result.remoteMeta).toBeUndefined()
    })

    it('should return undefined data and metadata if path is not found (409 on PROPFIND)', async () => {
      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          status: 409, // Simulate a conflict/path not found
          checkAuth: true,
        })
      )

      const result = await adapter.download()
      expect(result.data).toBeUndefined()
      expect(result.remoteMeta).toBeUndefined()
    })

    it('should throw an error if PROPFIND fails with non-404 error (500)', async () => {
      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          status: 500,
          checkAuth: true,
        })
      )
      await expect(adapter.download()).rejects.toThrow(
        'WebDAV download failed:'
      )
    })

    it('should throw an error if GET fails after successful PROPFIND', async () => {
      const mockEtag = '"def456"'
      const mockLastMod = new Date().toUTCString()
      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          etag: mockEtag,
          lastModified: mockLastMod,
          isCollection: false,
          checkAuth: true,
        }),
        http.get(
          `${serviceConfig.target.url}${filePath}`,
          async ({ request }) => {
            // Basic auth check for GET too
            const authHeader = request.headers.get('Authorization')
            // eslint-disable-next-line no-restricted-globals
            const expectedAuth = `Basic ${btoa(
              `${serviceConfig.credentials.username}:${serviceConfig.credentials.password}`
            )}`
            if (!authHeader || authHeader !== expectedAuth) {
              return new HttpResponse(null, { status: 401 })
            }

            return new HttpResponse(null, { status: 500 }) // Simulate GET failure
          }
        )
      )
      await expect(adapter.download()).rejects.toThrow(
        'WebDAV download failed:'
      )
    })

    it('should throw an error if adapter is not initialized', async () => {
      const freshAdapter = new WebDAVSyncAdapter()
      await expect(freshAdapter.download()).rejects.toThrow(
        'WebDAVSyncAdapter not initialized.'
      )
    })
  })

  describe('upload', () => {
    const filePath = getTestFilePath()
    const mockUploadData = JSON.stringify({ data: 'to upload' })
    const initialEtag = '"initialEtag"'
    const newEtag = '"newEtag123"'
    const newLastMod = new Date().toUTCString()
    const pathSegments = filePath.split('/')
    const dirPath = `${pathSegments.slice(0, -1).join('/')}`

    beforeEach(async () => {
      server.use(
        createPropfindHandler(serviceConfig, '/', {
          isCollection: true,
          checkAuth: true,
        })
      )
      await adapter.init(serviceConfig)
    })

    const mockSuccessfulPut = (expectedIfMatch?: string) =>
      http.put(
        `${serviceConfig.target.url}${filePath}`,
        async ({ request }) => {
          const authHeader = request.headers.get('Authorization')
          // eslint-disable-next-line no-restricted-globals
          const expectedAuth = `Basic ${btoa(
            `${serviceConfig.credentials.username}:${serviceConfig.credentials.password}`
          )}`
          if (!authHeader || authHeader !== expectedAuth) {
            return new HttpResponse(null, { status: 401 })
          }

          if (expectedIfMatch) {
            const ifMatchHeader = request.headers.get('If-Match')
            if (
              ifMatchHeader &&
              ifMatchHeader.replaceAll('"', '') !==
                expectedIfMatch.replaceAll('"', '')
            ) {
              return new HttpResponse(null, { status: 412 }) // Precondition Failed
            }
          }

          return new HttpResponse(null, {
            status: expectedIfMatch ? 204 : 201,
            headers: { ETag: newEtag, 'Last-Modified': newLastMod },
          })
        }
      )

    it('should upload data and return new metadata (file does not exist initially, parent dir exists)', async () => {
      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          status: 404,
          checkAuth: true,
          once: true, // For the getRemoteMetadata call in the test
        }),
        // 1. STAT on parent directory (by upload() to check if parent exists) - returns existing metadata
        createPropfindHandler(serviceConfig, dirPath, {
          isCollection: true,
          checkAuth: true,
          once: true,
        }),
        // 2. PUT request to upload the file
        mockSuccessfulPut(),
        // 3. PROPFIND after PUT (this is called by adapter.upload to get the new metadata)
        createPropfindHandler(serviceConfig, filePath, {
          etag: newEtag,
          lastModified: newLastMod,
          checkAuth: true,
        })
      )

      const metadata = await adapter.getRemoteMetadata()
      expect(metadata).toBeUndefined()

      const newRemoteMetadata = await adapter.upload(mockUploadData)
      expect(newRemoteMetadata).toEqual({
        version: newEtag.replaceAll('"', ''),
        sha: newEtag.replaceAll('"', ''),
        timestamp: new Date(newLastMod).getTime(),
      })
    })

    it('should upload data and return new metadata (file exists, If-Match provided, parent dir exists)', async () => {
      const initialRemoteMeta: SyncMetadata = {
        version: initialEtag.replaceAll('"', ''),
        sha: initialEtag.replaceAll('"', ''),
        timestamp: Date.now() - 10_000,
      }

      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          etag: initialEtag,
          lastModified: new Date(initialRemoteMeta.timestamp!).toUTCString(),
          checkAuth: true,
          once: true,
        }),
        createPropfindHandler(serviceConfig, dirPath, {
          isCollection: true,
          checkAuth: true,
          once: true,
        }),
        mockSuccessfulPut(initialEtag),
        createPropfindHandler(serviceConfig, filePath, {
          etag: newEtag,
          lastModified: newLastMod,
          checkAuth: true,
        })
      )

      const metadata = await adapter.getRemoteMetadata()
      expect(metadata).toEqual({
        version: initialEtag.replaceAll('"', ''),
        sha: initialEtag.replaceAll('"', ''),
        timestamp: new Date(
          new Date(initialRemoteMeta.timestamp!).toUTCString()
        ).getTime(),
      })

      const newRemoteMetadata = await adapter.upload(mockUploadData, metadata)
      expect(newRemoteMetadata).toEqual({
        version: newEtag.replaceAll('"', ''),
        sha: newEtag.replaceAll('"', ''),
        timestamp: new Date(newLastMod).getTime(),
      })
    })

    it('should create parent directories if they do not exist', async () => {
      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          status: 404,
          checkAuth: true,
          once: true,
        }),
        createPropfindHandler(serviceConfig, dirPath, {
          status: 404,
          checkAuth: true,
          once: false,
        }),
        createMkcolHandler(serviceConfig, dirPath, {
          checkAuth: true,
          once: true,
        }),
        mockSuccessfulPut(),
        createPropfindHandler(serviceConfig, filePath, {
          etag: newEtag,
          lastModified: newLastMod,
          checkAuth: true,
        })
      )

      const result = await adapter.upload(mockUploadData)
      expect(result).toEqual({
        version: newEtag.replaceAll('"', ''),
        sha: newEtag.replaceAll('"', ''),
        timestamp: new Date(newLastMod).getTime(),
      })
    })

    it('should create parent directory and upload file when parent dir check returns 409', async () => {
      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          status: 409,
          checkAuth: true,
          once: true,
        }),
        createPropfindHandler(serviceConfig, dirPath, {
          status: 409,
          checkAuth: true,
          once: true,
        }),
        // dir check should return 404 not 409
        createPropfindHandler(serviceConfig, dirPath, {
          status: 404,
          checkAuth: true,
          once: false,
        }),
        createMkcolHandler(serviceConfig, dirPath, {
          checkAuth: true,
          once: true,
        }),
        mockSuccessfulPut(),
        createPropfindHandler(serviceConfig, filePath, {
          etag: newEtag,
          lastModified: newLastMod,
          checkAuth: true,
        })
      )

      const result = await adapter.upload(mockUploadData)
      expect(result).toEqual({
        version: newEtag.replaceAll('"', ''),
        sha: newEtag.replaceAll('"', ''),
        timestamp: new Date(newLastMod).getTime(),
      })
    })

    it('should throw error if MKCOL fails', async () => {
      const expectedErrorMessage = `WebDAV upload failed: Failed to create parent directory '${dirPath}'. Original error: Invalid response: 500 Internal Server Error`

      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          status: 404,
          checkAuth: true,
          once: true,
        }),
        createPropfindHandler(serviceConfig, dirPath, {
          status: 404,
          checkAuth: true,
          once: false,
        }),
        createMkcolHandler(serviceConfig, dirPath, {
          status: 500,
          checkAuth: true,
          once: true,
        })
      )

      await expect(adapter.upload(mockUploadData)).rejects.toThrow(
        expectedErrorMessage
      )
    })

    it('should throw error if parent path is a file', async () => {
      const expectedErrorMessage = `WebDAV upload failed: Parent path component '${dirPath}' is a file, not a directory.`
      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          status: 404,
          checkAuth: true,
          once: true,
        }),
        createPropfindHandler(serviceConfig, dirPath, {
          isCollection: false,
          checkAuth: true,
          once: true,
        })
      )

      await expect(adapter.upload(mockUploadData)).rejects.toThrow(
        expectedErrorMessage
      )
    })

    it('should throw error if PUT fails', async () => {
      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          status: 404,
          checkAuth: true,
          once: true,
        }),
        createPropfindHandler(serviceConfig, dirPath, {
          isCollection: true,
          checkAuth: true,
          once: true,
        }),
        http.put(
          `${serviceConfig.target.url}${filePath}`,
          async () => new HttpResponse(null, { status: 500 })
        )
      )

      await expect(adapter.upload(mockUploadData)).rejects.toThrow(
        `WebDAV upload failed: Failed to upload file to '${filePath}'. Original error: Invalid response: 500 Internal Server Error`
      )
    })

    it('should throw error if If-Match header does not match remote ETag (412 Precondition Failed)', async () => {
      const remoteMeta: SyncMetadata = {
        version: initialEtag,
        sha: initialEtag,
        timestamp: Date.now() - 10_000,
      }

      server.use(
        createPropfindHandler(serviceConfig, filePath, {
          etag: initialEtag,
          lastModified: new Date(remoteMeta.timestamp!).toUTCString(),
          checkAuth: true,
          once: true,
        }),
        createPropfindHandler(serviceConfig, dirPath, {
          isCollection: true,
          checkAuth: true,
          once: true,
        }),
        http.put(
          `${serviceConfig.target.url}${filePath}`,
          async ({ request }) => {
            const ifMatchHeader = request.headers.get('If-Match')
            if (
              ifMatchHeader &&
              ifMatchHeader.replaceAll('"', '') ===
                initialEtag.replaceAll('"', '')
            ) {
              return new HttpResponse(null, { status: 412 })
            }

            return new HttpResponse(null, { status: 204 })
          }
        ),
        // 3. PROPFIND after PUT (this is called by adapter.upload to get the new metadata)
        // Should not be called
        createPropfindHandler(serviceConfig, filePath, {
          etag: newEtag,
          lastModified: newLastMod,
          checkAuth: true,
        })
      )

      await expect(adapter.upload(mockUploadData, remoteMeta)).rejects.toThrow(
        `WebDAV upload failed: Precondition Failed (ETag mismatch or other condition). Original error: Invalid response: 412 Precondition Failed`
      )
    })

    it('should throw an error if adapter is not initialized', async () => {
      const freshAdapter = new WebDAVSyncAdapter()
      await expect(freshAdapter.upload(mockUploadData)).rejects.toThrow(
        'WebDAVAdapter not initialized. Call init() first.'
      )
    })
  })
})
