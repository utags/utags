// src/sync/mocks/handlers.ts
import { http, HttpResponse } from 'msw'
import type { SyncMetadata, CustomApiUploadResponse } from '../types.js'
import { appConfig } from '../../config/app-config.js' // Import appConfig

const mockApiUrl = appConfig.customApiUrl || 'http://localhost:3001' // Use appConfig or fallback
const githubApiBaseUrl = appConfig.githubApiUrl // Use appConfig

const mockDataStore: Record<string, { data: string; meta: SyncMetadata }> = {}
const mockGitHubDataStore: Record<
  string, // repo/owner/path or repo/owner/path?ref=branch
  { data: string; meta: SyncMetadata & { type?: string } } // Removed content from meta as it's derived
> = {}

function buildGitHubStoreKey(
  owner: string,
  repoName: string,
  path: string,
  branch?: string
): string {
  const repoFullName = `${owner}/${repoName}`
  return branch
    ? `${repoFullName}/${path}?ref=${branch}`
    : `${repoFullName}/${path}`
}

/**
 * Sets a specific file's content and metadata in the mock GitHub data store.
 * @param owner - The repository owner.
 * @param repoName - The repository name.
 * @param path - The file path within the repository.
 * @param branch - The branch name.
 * @param data - The file content.
 * @param meta - The file metadata.
 */
// eslint-disable-next-line max-params
export function setMockGitHubFile(
  owner: string,
  repoName: string,
  path: string,
  branch: string,
  data: string,
  meta: SyncMetadata & { type?: string }
): void {
  const storeKey = buildGitHubStoreKey(owner, repoName, path, branch)
  mockGitHubDataStore[storeKey] = { data, meta }
}

/**
 * Get a specific file from the mock GitHub data store.
 * @param owner - The repository owner.
 * @param repoName - The repository name.
 * @param path - The file path within the repository.
 * @param branch - The branch name.
 */
export function getMockGitHubFile(
  owner: string,
  repoName: string,
  path: string,
  branch?: string
): { data: string; meta: SyncMetadata & { type?: string } } | undefined {
  const storeKey = buildGitHubStoreKey(owner, repoName, path, branch)
  return mockGitHubDataStore[storeKey]
}

/**
 * Clears a specific file from the mock GitHub data store.
 * @param owner - The repository owner.
 * @param repoName - The repository name.
 * @param path - The file path within the repository.
 * @param branch - The branch name.
 */
export function clearMockGitHubFile(
  owner: string,
  repoName: string,
  path: string,
  branch?: string
): void {
  const storeKey = buildGitHubStoreKey(owner, repoName, path, branch)
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete mockGitHubDataStore[storeKey]
}

/**
 * Resets the mock GitHub data store.
 */
export function resetMockGitHubDataStore(): void {
  for (const key in mockGitHubDataStore) {
    if (Object.hasOwn(mockGitHubDataStore, key)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete mockGitHubDataStore[key]
    }
  }
}

/**
 * Resets the mock custom API data store.
 */
export function resetMockDataStore(): void {
  for (const key in mockDataStore) {
    if (Object.hasOwn(mockDataStore, key)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete mockDataStore[key]
    }
  }
}

/**
 * Calculates a simple mock SHA for data.
 * @param data - The data to hash.
 * @returns A mock SHA string.
 */
function calculateMockSha(data: string): string {
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    // eslint-disable-next-line unicorn/prefer-code-point
    const char = data.charCodeAt(i)
    // eslint-disable-next-line no-bitwise
    hash = (hash << 5) - hash + char
    hash = Math.trunc(hash) // Convert to 32bit integer
  }

  return `mock-sha-${Math.abs(hash).toString(16)}`
}

// Helper to encode content to Base64, handling UTF-8 characters correctly
function base64Encode(str: string): string {
  try {
    // eslint-disable-next-line no-restricted-globals
    return btoa(unescape(encodeURIComponent(str)))
  } catch (error) {
    // Fallback for environments where btoa might not be available or for invalid characters
    console.error('Base64 encoding failed:', error)
    return Buffer.from(str).toString('base64') // Node.js fallback
  }
}

// Helper to decode content from Base64, handling UTF-8 characters correctly
function base64Decode(str: string): string {
  try {
    // eslint-disable-next-line no-restricted-globals
    return decodeURIComponent(escape(atob(str)))
  } catch (error) {
    // Fallback for environments where atob might not be available or for invalid characters
    console.error('Base64 decoding failed:', error)
    return Buffer.from(str, 'base64').toString() // Node.js fallback
  }
}

export const handlers = [
  // Handler for simulating API down (503 Service Unavailable)
  http.get(`${mockApiUrl}/api-down-test*`, () => {
    return new HttpResponse(null, { status: 503 })
  }),

  // Handler for simulating network error
  http.get(`${mockApiUrl}/network-error-test*`, () => {
    return HttpResponse.error()
  }),

  // Mock for Custom API GET /auth/status
  http.get(`${mockApiUrl}/auth/status`, ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    const apiKeyHeader = request.headers.get('X-API-Key')
    const token = authHeader?.split(' ')[1]

    if (
      (token && token === 'test-auth-token') ||
      apiKeyHeader === 'test-api-key'
    ) {
      return HttpResponse.json({ authenticated: true, user: 'mockUser' })
    }

    if (!token && !apiKeyHeader) {
      return new HttpResponse(null, { status: 401 })
    }

    return new HttpResponse(null, { status: 403 }) // Invalid token
  }),

  // Mock for Custom API HEAD /{filePath} (getRemoteMetadata)
  http.head(`${mockApiUrl}/:filePath`, ({ params }) => {
    const filePath = params.filePath as string
    if (mockDataStore[filePath]) {
      return new HttpResponse(null, {
        status: 200,
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          ETag: `"${mockDataStore[filePath].meta.version}"`,
          'Last-Modified': new Date(
            mockDataStore[filePath].meta.timestamp || 0
          ).toUTCString(),
        },
      })
    }

    return new HttpResponse(null, { status: 404 })
  }),

  // Mock for Custom API GET /{filePath} (download)
  http.get(`${mockApiUrl}/:filePath`, ({ params }) => {
    const filePath = params.filePath as string
    if (mockDataStore[filePath]) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return HttpResponse.json(JSON.parse(mockDataStore[filePath].data), {
        status: 200,
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          ETag: `"${mockDataStore[filePath].meta.version}"`,
          'Last-Modified': new Date(
            mockDataStore[filePath].meta.timestamp || 0
          ).toUTCString(),
        },
      })
    }

    return new HttpResponse(null, { status: 404 })
  }),

  // Mock for Custom API PUT /{filePath} (upload)
  http.put(`${mockApiUrl}/:filePath`, async ({ request, params }) => {
    const filePath = params.filePath as string
    const requestData = (await request.json()) as Record<string, unknown>
    const stringData = JSON.stringify(requestData)
    const ifMatchHeader = request.headers.get('If-Match')

    if (mockDataStore[filePath] && ifMatchHeader) {
      const currentVersion = mockDataStore[filePath].meta.version
      if (ifMatchHeader.replaceAll('"', '') !== `${currentVersion}`) {
        return new HttpResponse('Precondition Failed: Version mismatch', {
          status: 412,
        })
      }
    }

    const newTimestamp = Date.now()
    const newVersion = calculateMockSha(stringData)

    mockDataStore[filePath] = {
      data: stringData,
      meta: {
        timestamp: newTimestamp,
        version: newVersion,
        sha: newVersion, // Using version as SHA for simplicity in mock
      },
    }

    const responseBody: CustomApiUploadResponse = {
      message: 'File uploaded successfully (mock)',
      lastModified: newTimestamp,
      sha: newVersion,
      size: stringData.length,
      id: filePath,
    }
    return HttpResponse.json(responseBody, {
      status: 200,
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ETag: `"${newVersion}"`,
        'Last-Modified': new Date(newTimestamp).toUTCString(),
      },
    })
  }),
  // Fallback for any other unhandled Custom API requests
  http.all(`${mockApiUrl}/*`, ({ request }) => {
    // Fallback every else to 503, 'Invalid request'
    console.error(
      `[MSW] Unhandled Custom API request caught by fallback handler: ${request.method} ${request.url}`
    )
    return new HttpResponse('Invalid request', { status: 503 })
  }),

  // --- GitHub API Mocks ---
  // Mock for GET /user (getAuthStatus)
  http.get(`${githubApiBaseUrl}/user`, ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]

    if (token === 'test-github-token') {
      return HttpResponse.json({ login: 'mockUser' })
    }

    if (token === 'invalid-github-token') {
      return new HttpResponse(null, { status: 401 }) // Unauthorized
    }

    return new HttpResponse(null, { status: 403 }) // Forbidden for other cases
  }),

  /* eslint-disable @typescript-eslint/restrict-template-expressions */
  // Mock for GET /repos/{owner}/{repo}/contents/{path} (getRemoteMetadata & initial part of download)
  http.get(
    `${githubApiBaseUrl}/repos/:owner/:repo/contents/:path`,
    ({ params, request }) => {
      const { owner, repo, path } = params
      const url = new URL(request.url)
      const ref = url.searchParams.get('ref') // Get branch from query params
      const storeKey = buildGitHubStoreKey(
        owner as string,
        repo as string,
        path as string,
        ref!
      )

      if (mockGitHubDataStore[storeKey]) {
        const file = mockGitHubDataStore[storeKey]
        return HttpResponse.json({
          name: (path as string).split('/').pop(),
          path: path as string,
          sha: file.meta.sha,
          size: file.data.length, // Size of the original data, not base64 encoded
          type: file.meta.type || 'file',
          content:
            file.meta.type === 'file' ? base64Encode(file.data) : undefined,
          encoding: file.meta.type === 'file' ? 'base64' : undefined,
          _links: {
            self: request.url,
            git: `${githubApiBaseUrl}/repos/${owner}/${repo}/git/blobs/${file.meta.sha}`,
            html: `https://github.com/${owner}/${repo}/blob/${ref || 'main'}/${path as string}`,
          },
        })
      }

      return new HttpResponse(null, { status: 404 })
    }
  ),

  // Mock for GET /repos/{owner}/{repo}/git/blobs/{sha} (download content for large files)
  http.get(
    `${githubApiBaseUrl}/repos/:owner/:repo/git/blobs/:sha`,
    ({ params, request }) => {
      const { sha } = params
      const foundEntry = Object.values(mockGitHubDataStore).find(
        (entry) => entry.meta.sha === sha
      )

      if (foundEntry) {
        const acceptHeader = request.headers.get('Accept')

        if (acceptHeader === 'application/vnd.github.v3.raw') {
          // If raw content is requested, return it directly as text
          return HttpResponse.text(foundEntry.data, {
            status: 200,
            headers: {
              'Content-Type': 'application/octet-stream', // Or appropriate content type for raw data
            },
          })
        }

        // Otherwise, return JSON with base64 encoded content (default behavior)
        return HttpResponse.json({
          sha: foundEntry.meta.sha,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          node_id: `mock-node-id-${sha}`,
          size: foundEntry.data.length,
          url: `${githubApiBaseUrl}/repos/${params.owner as string}/${params.repo as string}/git/blobs/${sha as string}`,
          content: base64Encode(foundEntry.data),
          encoding: 'base64',
        })
      }

      return new HttpResponse(null, { status: 404 })
    }
  ),

  // Mock for PUT /repos/{owner}/{repo}/contents/{path} (upload)
  http.put(
    `${githubApiBaseUrl}/repos/:owner/:repo/contents/:path`,
    async ({ request, params }) => {
      const { owner, repo, path } = params
      const requestBody = (await request.json()) as {
        message: string
        content: string // base64 encoded
        sha?: string // SHA of the file being replaced
        branch?: string
      }

      const storeKey = buildGitHubStoreKey(
        owner as string,
        repo as string,
        path as string,
        requestBody.branch
      )
      const existingFile = mockGitHubDataStore[storeKey]

      // If sha is provided, it means we are updating an existing file, so check for conflicts
      if (
        requestBody.sha &&
        existingFile &&
        requestBody.sha !== existingFile.meta.sha
      ) {
        return HttpResponse.json(
          { message: 'SHA does not match' },
          { status: 409 }
        ) // Conflict
      }
      // If sha is not provided, but file exists, it's also a conflict unless creating a new file
      // For simplicity, this mock assumes if no SHA, it's a new file or overwriting without check, which GitHub might reject.
      // A more accurate mock might require SHA for updates.

      const decodedContent = base64Decode(requestBody.content)
      const newFileSha = `mock-file-sha-${Math.random().toString(36).slice(2, 15)}`
      const newCommitSha = `mock-commit-sha-${Math.random().toString(36).slice(2, 15)}`

      mockGitHubDataStore[storeKey] = {
        data: decodedContent,
        meta: {
          sha: newFileSha,
          version: newCommitSha, // Use commit SHA as a version identifier
          timestamp: Date.now(),
          type: 'file',
        },
      }

      return HttpResponse.json({
        content: {
          name: (path as string).split('/').pop(),
          path: path as string,
          sha: newFileSha,
          size: decodedContent.length,
          type: 'file',
          // ... other fields like download_url, etc.
        },
        commit: {
          sha: newCommitSha,
          message: requestBody.message,
          // ... other commit fields
        },
      })
    }
  ),
  /* eslint-enable @typescript-eslint/restrict-template-expressions */
  // Fallback for any other unhandled GitHub API requests
  http.all(`${githubApiBaseUrl}/*`, ({ request }) => {
    // Fallback every else to 503, 'Invalid request'
    console.error(
      `[MSW] Unhandled GitHub API request caught by fallback handler: ${request.method} ${request.url}`
    )
    return new HttpResponse('Invalid request', { status: 503 })
  }),
]
