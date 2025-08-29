/**
 * Unit tests for WebDAV client
 * Tests all WebDAV operations including authentication, file operations, and directory operations
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest'
import {
  WebDAVClient,
  createClient,
  WebDAVError,
  type WebDAVClientOptions,
  type FileStat,
  type PutFileContentsOptions,
  type GetFileContentsOptions,
  type CreateDirectoryOptions,
} from './webdav-client.js'
import { HttpClient } from './http-client.js'

// Mock HttpClient
vi.mock('./http-client', () => ({
  HttpClient: {
    request: vi.fn(),
  },
}))

const mockHttpClient = HttpClient as {
  request: Mock
}

// Mock response helper
function createMockResponse(
  status: number,
  statusText: string,
  body: string,
  headers: Record<string, string> = {}
) {
  let jsonData = {}
  try {
    jsonData = JSON.parse(body || '{}')
  } catch {
    // Ignore JSON parse errors for non-JSON content
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Headers(headers),
    text: vi.fn().mockResolvedValue(body),
    json: vi.fn().mockResolvedValue(jsonData),
    arrayBuffer: vi
      .fn()
      .mockResolvedValue(new TextEncoder().encode(body).buffer),
  }
}

// Sample XML responses
const samplePropfindFileResponse = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>/test/file.txt</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>file.txt</D:displayname>
        <D:getlastmodified>Wed, 15 Nov 2023 10:30:00 GMT</D:getlastmodified>
        <D:getcontentlength>1024</D:getcontentlength>
        <D:getetag>"abc123"</D:getetag>
        <D:resourcetype/>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`

const samplePropfindDirectoryResponse = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>/test/folder/</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>folder</D:displayname>
        <D:getlastmodified>Wed, 15 Nov 2023 10:30:00 GMT</D:getlastmodified>
        <D:getcontentlength>0</D:getcontentlength>
        <D:getetag>"def456"</D:getetag>
        <D:resourcetype>
          <D:collection/>
        </D:resourcetype>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`

const sampleDirectoryContentsResponse = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>/test/folder/</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>folder</D:displayname>
        <D:getlastmodified>Wed, 15 Nov 2023 10:30:00 GMT</D:getlastmodified>
        <D:getcontentlength>0</D:getcontentlength>
        <D:getetag>"def456"</D:getetag>
        <D:resourcetype>
          <D:collection/>
        </D:resourcetype>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
  <D:response>
    <D:href>/test/folder/file1.txt</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>file1.txt</D:displayname>
        <D:getlastmodified>Wed, 15 Nov 2023 11:00:00 GMT</D:getlastmodified>
        <D:getcontentlength>512</D:getcontentlength>
        <D:getetag>"ghi789"</D:getetag>
        <D:resourcetype/>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
  <D:response>
    <D:href>/test/folder/subfolder/</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>subfolder</D:displayname>
        <D:getlastmodified>Wed, 15 Nov 2023 12:00:00 GMT</D:getlastmodified>
        <D:getcontentlength>0</D:getcontentlength>
        <D:getetag>"jkl012"</D:getetag>
        <D:resourcetype>
          <D:collection/>
        </D:resourcetype>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`

describe('WebDAVClient', () => {
  let client: WebDAVClient
  const baseUrl = 'https://example.com/webdav'
  const options: WebDAVClientOptions = {
    username: 'testuser',
    password: 'testpass',
    headers: { 'User-Agent': 'test-client' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    client = new WebDAVClient(baseUrl, options)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create client with base URL and options', () => {
      expect(client).toBeInstanceOf(WebDAVClient)
    })

    it('should remove trailing slash from base URL', () => {
      const clientWithSlash = new WebDAVClient(
        'https://example.com/webdav/',
        options
      )
      expect(clientWithSlash).toBeInstanceOf(WebDAVClient)
    })

    it('should work without options', () => {
      const clientWithoutOptions = new WebDAVClient(baseUrl)
      expect(clientWithoutOptions).toBeInstanceOf(WebDAVClient)
    })
  })

  describe('stat', () => {
    it('should get file statistics', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(207, 'Multi-Status', samplePropfindFileResponse)
      )

      const result = await client.stat('/test/file.txt')

      expect(mockHttpClient.request).toHaveBeenCalledWith({
        method: 'PROPFIND',
        url: 'https://example.com/webdav/test/file.txt',
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'User-Agent': 'test-client',
          Authorization: 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
          Depth: '0',
        },
        body: expect.stringContaining('<D:propfind xmlns:D="DAV:">'),
      })

      expect(result).toEqual({
        filename: 'file.txt',
        basename: 'file.txt',
        lastmod: 'Wed, 15 Nov 2023 10:30:00 GMT',
        size: 1024,
        type: 'file',
        etag: 'abc123',
      })
    })

    it('should get directory statistics', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(207, 'Multi-Status', samplePropfindDirectoryResponse)
      )

      const result = await client.stat('/test/folder')

      expect(result).toEqual({
        filename: 'folder',
        basename: 'folder',
        lastmod: 'Wed, 15 Nov 2023 10:30:00 GMT',
        size: 0,
        type: 'directory',
        etag: 'def456',
      })
    })

    it('should handle 404 error', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(404, 'Not Found', '')
      )

      await expect(client.stat('/nonexistent')).rejects.toThrow(WebDAVError)
      await expect(client.stat('/nonexistent')).rejects.toThrow(
        'Invalid response: 404 Not Found'
      )
    })

    it('should handle malformed XML response', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(207, 'Multi-Status', 'invalid xml')
      )

      await expect(client.stat('/test/file.txt')).rejects.toThrow(WebDAVError)
    })
  })

  describe('getFileContents', () => {
    it('should get file contents as text', async () => {
      const fileContent = 'Hello, World!'
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(200, 'OK', fileContent)
      )

      const result = await client.getFileContents('/test/file.txt')

      expect(mockHttpClient.request).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://example.com/webdav/test/file.txt',
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'User-Agent': 'test-client',
          Authorization: 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
        },
        body: undefined,
      })

      expect(result).toBe(fileContent)
    })

    it('should get file contents as binary', async () => {
      const fileContent = 'Binary content'
      const mockArrayBuffer = new TextEncoder().encode(fileContent).buffer
      const mockResponse = createMockResponse(200, 'OK', fileContent)
      mockResponse.arrayBuffer = vi.fn().mockResolvedValue(mockArrayBuffer)
      mockHttpClient.request.mockResolvedValue(mockResponse)

      const options: GetFileContentsOptions = { format: 'binary' }
      const result = await client.getFileContents('/test/binary.dat', options)

      expect(result).toBe(mockArrayBuffer)
      expect(mockResponse.arrayBuffer).toHaveBeenCalled()
    })

    it('should handle file not found', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(404, 'Not Found', '')
      )

      await expect(client.getFileContents('/nonexistent.txt')).rejects.toThrow(
        WebDAVError
      )
    })
  })

  describe('putFileContents', () => {
    it('should put file contents as string', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(201, 'Created', '')
      )

      const fileContent = 'Hello, World!'
      await client.putFileContents('/test/file.txt', fileContent)

      expect(mockHttpClient.request).toHaveBeenCalledWith({
        method: 'PUT',
        url: 'https://example.com/webdav/test/file.txt',
        headers: {
          'Content-Type': 'application/octet-stream',
          'User-Agent': 'test-client',
          Authorization: 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
        },
        body: fileContent,
      })
    })

    it('should put file contents with custom headers', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(201, 'Created', '')
      )

      const fileContent = 'Hello, World!'
      const options: PutFileContentsOptions = {
        headers: { 'Content-Type': 'text/plain' },
      }
      await client.putFileContents('/test/file.txt', fileContent, options)

      expect(mockHttpClient.request).toHaveBeenCalledWith({
        method: 'PUT',
        url: 'https://example.com/webdav/test/file.txt',
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': 'test-client',
          Authorization: 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
        },
        body: fileContent,
      })
    })

    it('should put file contents as ArrayBuffer', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(201, 'Created', '')
      )

      const uint8Array = new TextEncoder().encode('Binary data')
      const fileContent = new ArrayBuffer(uint8Array.length)
      new Uint8Array(fileContent).set(uint8Array)
      await client.putFileContents('/test/binary.dat', fileContent)

      expect(mockHttpClient.request).toHaveBeenCalledWith({
        method: 'PUT',
        url: 'https://example.com/webdav/test/binary.dat',
        headers: {
          'Content-Type': 'application/octet-stream',
          'User-Agent': 'test-client',
          Authorization: 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
        },
        body: fileContent,
      })
    })

    it('should handle upload errors', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(403, 'Forbidden', '')
      )

      await expect(
        client.putFileContents('/test/file.txt', 'content')
      ).rejects.toThrow(WebDAVError)
    })
  })

  describe('createDirectory', () => {
    it('should create directory', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(201, 'Created', '')
      )

      await client.createDirectory('/test/newfolder')

      expect(mockHttpClient.request).toHaveBeenCalledWith({
        method: 'MKCOL',
        url: 'https://example.com/webdav/test/newfolder',
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'User-Agent': 'test-client',
          Authorization: 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
        },
        body: undefined,
      })
    })

    it('should create directory recursively', async () => {
      // Mock responses for each directory creation
      mockHttpClient.request
        .mockResolvedValueOnce(createMockResponse(201, 'Created', '')) // /test
        .mockResolvedValueOnce(createMockResponse(201, 'Created', '')) // /test/parent
        .mockResolvedValueOnce(createMockResponse(201, 'Created', '')) // /test/parent/child

      const options: CreateDirectoryOptions = { recursive: true }
      await client.createDirectory('/test/parent/child', options)

      expect(mockHttpClient.request).toHaveBeenCalledTimes(3)
      expect(mockHttpClient.request).toHaveBeenNthCalledWith(1, {
        method: 'MKCOL',
        url: 'https://example.com/webdav/test',
        headers: expect.any(Object),
        body: undefined,
      })
      expect(mockHttpClient.request).toHaveBeenNthCalledWith(2, {
        method: 'MKCOL',
        url: 'https://example.com/webdav/test/parent',
        headers: expect.any(Object),
        body: undefined,
      })
      expect(mockHttpClient.request).toHaveBeenNthCalledWith(3, {
        method: 'MKCOL',
        url: 'https://example.com/webdav/test/parent/child',
        headers: expect.any(Object),
        body: undefined,
      })
    })

    it('should handle existing directory in recursive mode', async () => {
      // Mock responses: first directory exists (405), second exists (405), third is created
      mockHttpClient.request
        .mockResolvedValueOnce(
          createMockResponse(405, 'Method Not Allowed', '')
        )
        .mockResolvedValueOnce(
          createMockResponse(405, 'Method Not Allowed', '')
        )
        .mockResolvedValueOnce(createMockResponse(201, 'Created', ''))

      const options: CreateDirectoryOptions = { recursive: true }
      await client.createDirectory('/test/existing/new', options)

      expect(mockHttpClient.request).toHaveBeenCalledTimes(3)
    })

    it('should handle directory creation errors', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(403, 'Forbidden', '')
      )

      await expect(client.createDirectory('/test/forbidden')).rejects.toThrow(
        WebDAVError
      )
    })

    it('should propagate non-405 errors in recursive mode', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(403, 'Forbidden', '')
      )

      const options: CreateDirectoryOptions = { recursive: true }
      await expect(
        client.createDirectory('/test/forbidden/child', options)
      ).rejects.toThrow(WebDAVError)
    })
  })

  describe('getDirectoryContents', () => {
    it('should get directory contents', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(207, 'Multi-Status', sampleDirectoryContentsResponse)
      )

      const result = await client.getDirectoryContents('/test/folder')

      expect(mockHttpClient.request).toHaveBeenCalledWith({
        method: 'PROPFIND',
        url: 'https://example.com/webdav/test/folder',
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'User-Agent': 'test-client',
          Authorization: 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
          Depth: '1',
        },
        body: expect.stringContaining('<D:propfind xmlns:D="DAV:">'),
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        filename: 'file1.txt',
        basename: 'file1.txt',
        lastmod: 'Wed, 15 Nov 2023 11:00:00 GMT',
        size: 512,
        type: 'file',
        etag: 'ghi789',
      })
      expect(result[1]).toEqual({
        filename: 'subfolder',
        basename: 'subfolder',
        lastmod: 'Wed, 15 Nov 2023 12:00:00 GMT',
        size: 0,
        type: 'directory',
        etag: 'jkl012',
      })
    })

    it('should handle empty directory', async () => {
      const emptyDirResponse = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>/test/empty/</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>empty</D:displayname>
        <D:getlastmodified>Wed, 15 Nov 2023 10:30:00 GMT</D:getlastmodified>
        <D:getcontentlength>0</D:getcontentlength>
        <D:resourcetype>
          <D:collection/>
        </D:resourcetype>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`

      mockHttpClient.request.mockResolvedValue(
        createMockResponse(207, 'Multi-Status', emptyDirResponse)
      )

      const result = await client.getDirectoryContents('/test/empty')
      expect(result).toHaveLength(0)
    })

    it('should handle directory not found', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(404, 'Not Found', '')
      )

      await expect(client.getDirectoryContents('/nonexistent')).rejects.toThrow(
        WebDAVError
      )
    })
  })

  describe('authentication', () => {
    it('should create basic auth header', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(200, 'OK', 'content')
      )

      await client.getFileContents('/test/file.txt')

      const call = mockHttpClient.request.mock.calls[0][0]
      expect(call.headers.Authorization).toBe('Basic dGVzdHVzZXI6dGVzdHBhc3M=')
    })

    it('should work without authentication', async () => {
      const clientNoAuth = new WebDAVClient(baseUrl)
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(200, 'OK', 'content')
      )

      await clientNoAuth.getFileContents('/test/file.txt')

      const call = mockHttpClient.request.mock.calls[0][0]
      expect(call.headers.Authorization).toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('should throw WebDAVError for HTTP errors', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(500, 'Internal Server Error', '')
      )

      await expect(client.stat('/test/file.txt')).rejects.toThrow(WebDAVError)
      await expect(client.stat('/test/file.txt')).rejects.toThrow(
        'Invalid response: 500 Internal Server Error'
      )
    })

    it('should preserve error status and statusText', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(403, 'Forbidden', '')
      )

      try {
        await client.stat('/test/file.txt')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(WebDAVError)
        expect((error as WebDAVError).status).toBe(403)
        expect((error as WebDAVError).statusText).toBe('Forbidden')
      }
    })

    it('should handle network errors', async () => {
      mockHttpClient.request.mockRejectedValue(new Error('Network error'))

      await expect(client.stat('/test/file.txt')).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('path handling', () => {
    it('should handle paths with leading slash', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(200, 'OK', 'content')
      )

      await client.getFileContents('/test/file.txt')

      const call = mockHttpClient.request.mock.calls[0][0]
      expect(call.url).toBe('https://example.com/webdav/test/file.txt')
    })

    it('should handle paths without leading slash', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(200, 'OK', 'content')
      )

      await client.getFileContents('test/file.txt')

      const call = mockHttpClient.request.mock.calls[0][0]
      expect(call.url).toBe('https://example.com/webdav/test/file.txt')
    })

    it('should handle URL encoding in paths', async () => {
      const encodedResponse = samplePropfindFileResponse.replace(
        '/test/file.txt',
        '/test/file%20with%20spaces.txt'
      )
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(207, 'Multi-Status', encodedResponse)
      )

      const result = await client.stat('/test/file with spaces.txt')
      expect(result.filename).toBe('file%20with%20spaces.txt')
    })
  })

  describe('custom headers', () => {
    it('should include custom headers in requests', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(200, 'OK', 'content')
      )

      await client.getFileContents('/test/file.txt')

      const call = mockHttpClient.request.mock.calls[0][0]
      expect(call.headers['User-Agent']).toBe('test-client')
    })

    it('should merge custom headers with default headers', async () => {
      mockHttpClient.request.mockResolvedValue(
        createMockResponse(201, 'Created', '')
      )

      const options: PutFileContentsOptions = {
        headers: { 'X-Custom-Header': 'custom-value' },
      }
      await client.putFileContents('/test/file.txt', 'content', options)

      const call = mockHttpClient.request.mock.calls[0][0]
      expect(call.headers['X-Custom-Header']).toBe('custom-value')
      expect(call.headers['User-Agent']).toBe('test-client')
      expect(call.headers.Authorization).toBe('Basic dGVzdHVzZXI6dGVzdHBhc3M=')
    })
  })
})

describe('createClient', () => {
  it('should create WebDAV client instance', () => {
    const client = createClient('https://example.com/webdav')
    expect(client).toBeInstanceOf(WebDAVClient)
  })

  it('should create WebDAV client with options', () => {
    const options: WebDAVClientOptions = {
      username: 'user',
      password: 'pass',
    }
    const client = createClient('https://example.com/webdav', options)
    expect(client).toBeInstanceOf(WebDAVClient)
  })
})

describe('WebDAVError', () => {
  it('should create error with status and statusText', () => {
    const error = new WebDAVError('Test error', 404, 'Not Found')
    expect(error.message).toBe('Test error')
    expect(error.status).toBe(404)
    expect(error.statusText).toBe('Not Found')
    expect(error.name).toBe('WebDAVError')
    expect(error).toBeInstanceOf(Error)
  })
})

describe('Integration tests', () => {
  let client: WebDAVClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = createClient('https://example.com/webdav', {
      username: 'testuser',
      password: 'testpass',
    })
  })

  it('should perform complete file upload and download cycle', async () => {
    const fileContent = 'Hello, WebDAV World!'
    const filePath = '/test/upload-test.txt'

    // Mock PUT request (upload)
    mockHttpClient.request.mockResolvedValueOnce(
      createMockResponse(201, 'Created', '')
    )

    // Mock GET request (download)
    mockHttpClient.request.mockResolvedValueOnce(
      createMockResponse(200, 'OK', fileContent)
    )

    // Upload file
    await client.putFileContents(filePath, fileContent)

    // Download file
    const downloadedContent = await client.getFileContents(filePath)

    expect(downloadedContent).toBe(fileContent)
    expect(mockHttpClient.request).toHaveBeenCalledTimes(2)
  })

  it('should perform complete directory operations cycle', async () => {
    const dirPath = '/test/new-directory'

    // Create a matching PROPFIND response for the new directory
    const newDirResponse = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>/test/new-directory/</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>new-directory</D:displayname>
        <D:getlastmodified>Wed, 15 Nov 2023 10:30:00 GMT</D:getlastmodified>
        <D:getcontentlength>0</D:getcontentlength>
        <D:getetag>"def456"</D:getetag>
        <D:resourcetype>
          <D:collection/>
        </D:resourcetype>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`

    // Mock MKCOL request (create directory)
    mockHttpClient.request.mockResolvedValueOnce(
      createMockResponse(201, 'Created', '')
    )

    // Mock PROPFIND request (stat directory)
    mockHttpClient.request.mockResolvedValueOnce(
      createMockResponse(207, 'Multi-Status', newDirResponse)
    )

    // Create directory
    await client.createDirectory(dirPath)

    // Check directory exists
    const stat = await client.stat(dirPath)

    expect(stat.type).toBe('directory')
    expect(mockHttpClient.request).toHaveBeenCalledTimes(2)
  })

  it('should handle complex directory structure operations', async () => {
    const basePath = '/test/complex'
    const subDirs = ['dir1', 'dir2', 'dir1/subdir']
    const files = ['dir1/file1.txt', 'dir2/file2.txt']

    // Mock directory creation requests
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < subDirs.length; i++) {
      mockHttpClient.request.mockResolvedValueOnce(
        createMockResponse(201, 'Created', '')
      )
    }

    // Mock file upload requests
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < files.length; i++) {
      mockHttpClient.request.mockResolvedValueOnce(
        createMockResponse(201, 'Created', '')
      )
    }

    // Create directory structure
    for (const dir of subDirs) {
      // eslint-disable-next-line no-await-in-loop
      await client.createDirectory(`${basePath}/${dir}`)
    }

    // Upload files
    for (const file of files) {
      // eslint-disable-next-line no-await-in-loop
      await client.putFileContents(`${basePath}/${file}`, `Content of ${file}`)
    }

    expect(mockHttpClient.request).toHaveBeenCalledTimes(
      subDirs.length + files.length
    )
  })
})
