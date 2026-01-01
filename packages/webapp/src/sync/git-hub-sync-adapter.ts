import { appConfig } from '../config/app-config.js'
import {
  prettyPrintJson,
  prettyPrintJsonSafe,
} from '../utils/pretty-print-json.js'
import type {
  AuthStatus,
  GithubCredentials,
  GithubTarget,
  GitHubBlobResponse,
  GitHubContentsResponse,
  GitHubCreateUpdateFileResponse,
  SyncAdapter,
  SyncMetadata,
  SyncServiceConfig,
} from './types.js'
import { buildSyncPath } from './sync-path-builder.js'

const GITHUB_API_BASE_URL = appConfig.githubApiUrl

/**
 * Implements the SyncAdapter interface for GitHub, allowing synchronization of bookmarks
 * with a file stored in a GitHub repository.
 */
export class GitHubSyncAdapter implements SyncAdapter<
  GithubCredentials,
  GithubTarget
> {
  private config!: SyncServiceConfig<GithubCredentials, GithubTarget>
  private credentials!: GithubCredentials
  private target!: GithubTarget
  private initialized = false
  private abortController: AbortController | undefined

  /**
   * Initializes the adapter with the given configuration.
   * @param config - The synchronization service configuration for GitHub.
   * @throws Error if the configuration type is invalid or if the GitHub token is missing.
   */
  public async init(
    config: SyncServiceConfig<GithubCredentials, GithubTarget>
  ): Promise<void> {
    if (config.type !== 'github') {
      throw new Error('Invalid configuration type for GitHubSyncAdapter.')
    }

    this.config = config
    this.credentials = config.credentials
    this.target = config.target

    if (!this.credentials.token) {
      console.error('[GitHubSyncAdapter] GitHub token is missing.')
      // This state should ideally be reflected in getAuthStatus returning 'requires_config'
      // Throwing an error here prevents initialization if token is mandatory from the start.
      throw new Error('GitHub token is required for authentication.')
    }

    this.abortController = new AbortController()
    this.initialized = true
    console.log(
      `[GitHubSyncAdapter] Initialized for ${this.config.name}. Scope: ${this.config.scope}, Path: ${this.target.path}`
    )
  }

  /**
   * Cleans up resources used by the adapter, such as aborting ongoing fetch requests.
   */
  public destroy(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = undefined
    }

    this.initialized = false
    console.log(
      `[GitHubSyncAdapter] Destroyed for ${this.config.name || 'Unknown Config'}.`
    )
  }

  /**
   * Retrieves the current configuration of the sync adapter.
   * @returns The current sync service configuration.
   * @throws Error if the adapter is not initialized.
   */
  public getConfig(): SyncServiceConfig<GithubCredentials, GithubTarget> {
    if (!this.initialized || !this.config) {
      throw new Error(
        '[GitHubSyncAdapter] Adapter not initialized. Call init() first.'
      )
    }

    return this.config
  }

  /**
   * Fetches metadata for the remote file from GitHub.
   * This includes the SHA of the file, which is used for versioning.
   * @returns A promise that resolves with the sync metadata if the file exists, or undefined otherwise.
   * @throws Error if the adapter is not initialized or if there's an API error.
   */
  public async getRemoteMetadata(): Promise<SyncMetadata | undefined> {
    if (!this.initialized) {
      throw new Error('[GitHubSyncAdapter] Adapter not initialized.')
    }

    const filePath = this.getFilePath()
    const url = `${GITHUB_API_BASE_URL}/repos/${this.target.repo}/contents/${filePath}${this.target.branch ? `?ref=${this.target.branch}` : ''}`

    try {
      const response = await fetch(url, {
        signal: this.abortController?.signal,
        headers: {
          Authorization: `token ${this.credentials.token}`,

          Accept: 'application/vnd.github.v3+json',
        },
      })

      if (response.status === 404) {
        console.log(`[GitHubSyncAdapter] File not found at ${filePath}`)
        return undefined // File not found
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error(
          `[GitHubSyncAdapter] GitHub API error (${response.status}) fetching metadata for ${filePath}: ${errorText}`
        )
        throw new Error(
          `GitHub API error (${response.status}) fetching metadata: ${errorText}`
        )
      }

      const content: GitHubContentsResponse =
        (await response.json()) as GitHubContentsResponse
      console.log(
        '[GitHubSyncAdapter] Remote metadata:',
        prettyPrintJson(content)
      )
      // The 'contents' API doesn't directly provide a reliable last modified timestamp for the file itself.
      // The commit timestamp would be more accurate but requires another API call.
      // For simplicity, we use the blob's SHA as version and leave timestamp undefined here.
      // It will be populated more accurately during an upload operation.
      return {
        sha: content.sha, // Blob SHA of the file content
        timestamp: undefined, // Timestamp is not reliably available from this endpoint for file mtime
        version: content.sha, // Using blob SHA as a version identifier
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[GitHubSyncAdapter] Fetch remote metadata aborted.')
        // Re-throw the AbortError so it can be handled by the caller if needed
        throw error instanceof Error ? error : new Error(String(error))
      }

      console.error(
        `[GitHubSyncAdapter] Error fetching remote metadata for ${filePath}:`,
        error
      )
      // Re-throw original error or a wrapped one to ensure the caller is aware of the failure
      throw error instanceof Error ? error : new Error(String(error))
    }
  }

  /**
   * Downloads the content of the remote file from GitHub.
   * @returns A promise that resolves with an object containing the file data and its remote metadata.
   *          Returns undefined for data if the file doesn't exist or an error occurs.
   * @throws Error if the adapter is not initialized or if there's an API error during download.
   */
  public async download(): Promise<{
    data: string | undefined
    remoteMeta: SyncMetadata | undefined
  }> {
    if (!this.initialized) {
      throw new Error('[GitHubSyncAdapter] Adapter not initialized.')
    }

    const remoteMeta = await this.getRemoteMetadata()

    if (!remoteMeta || !remoteMeta.sha) {
      // File doesn't exist or metadata couldn't be fetched
      console.warn(
        '[GitHubSyncAdapter] Download skipped: Remote metadata or SHA not found.'
      )
      return { data: undefined, remoteMeta: undefined }
    }

    // Use the blob SHA to get the raw content
    const url = `${GITHUB_API_BASE_URL}/repos/${this.target.repo}/git/blobs/${remoteMeta.sha}`

    try {
      const response = await fetch(url, {
        signal: this.abortController?.signal,
        headers: {
          Authorization: `token ${this.credentials.token}`,
          // Request raw content; GitHub's blobs API returns base64 by default if this is not set correctly.
          // 'application/vnd.github.v3.raw' or 'Accept: application/octet-stream' for raw

          Accept: 'application/vnd.github.v3.raw',
        },
      })

      if (response.status === 404) {
        // This case should ideally be caught by getRemoteMetadata, but as a safeguard:
        console.warn(
          `[GitHubSyncAdapter] Blob not found for SHA ${remoteMeta.sha}, though metadata was present.`
        )
        return { data: undefined, remoteMeta } // Return metadata as it was fetched, but no data
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error(
          `[GitHubSyncAdapter] GitHub API error (${response.status}) fetching blob ${remoteMeta.sha}: ${errorText}`
        )
        throw new Error(
          `GitHub API error (${response.status}) fetching blob: ${errorText}`
        )
      }

      const rawData = await response.text()
      // Data fetched with 'application/vnd.github.v3.raw' is plain text.
      // If it were base64, it would need: atob(jsonData.content)
      return { data: rawData, remoteMeta }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[GitHubSyncAdapter] Download aborted.')
        throw error instanceof Error ? error : new Error(String(error))
      }

      console.error(
        `[GitHubSyncAdapter] Error downloading file content for SHA ${remoteMeta.sha}:`,
        error
      )
      throw error instanceof Error ? error : new Error(String(error))
    }
  }

  /**
   * Uploads data to the specified file in the GitHub repository.
   * If expectedRemoteMeta is provided and its SHA matches the remote file's SHA,
   * the file is updated. Otherwise, a new file is created or an error is thrown if there's a conflict.
   * @param data - The string data to upload.
   * @param expectedRemoteMeta - Optional. The expected metadata of the remote file. Used for conflict detection.
   * @returns A promise that resolves with the sync metadata of the uploaded file.
   * @throws Error if the adapter is not initialized, if there's an API error, or if a conflict occurs (e.g., 409 or 422 HTTP status).
   */
  public async upload(
    data: string,
    expectedRemoteMeta?: SyncMetadata
  ): Promise<SyncMetadata> {
    if (!this.initialized) {
      throw new Error('[GitHubSyncAdapter] Adapter not initialized.')
    }

    const filePath = this.getFilePath()
    const url = `${GITHUB_API_BASE_URL}/repos/${this.target.repo}/contents/${filePath}`

    // Encode content to base64. GitHub API requires content to be base64 encoded.
    // Standard UTF-8 to Base64 encoding
    // eslint-disable-next-line no-restricted-globals
    const contentEncoded = btoa(unescape(encodeURIComponent(data)))

    const body: {
      message: string
      content: string
      sha?: string
      branch?: string
    } = {
      message: `Sync bookmarks: ${new Date().toISOString()}`,
      content: contentEncoded,
      branch: this.target.branch || undefined, // Use specified branch or repository's default if undefined
    }

    if (expectedRemoteMeta && expectedRemoteMeta.sha) {
      body.sha = expectedRemoteMeta.sha // Required for updating an existing file
    }

    try {
      const response = await fetch(url, {
        method: 'PUT',
        signal: this.abortController?.signal,
        headers: {
          Authorization: `token ${this.credentials.token}`,

          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        let errorBody = ''
        try {
          // Try to get error details from the response body as text
          errorBody = await response.text()
        } catch (error) {
          // Ignore if reading body as text fails
          console.warn(
            '[GitHubSyncAdapter] Failed to read error response body as text:',
            error
          )
        }

        const errorMessage =
          errorBody || `Status: ${response.status} ${response.statusText}`
        console.error(
          `[GitHubSyncAdapter] GitHub API error (${response.status}) uploading to ${filePath}: ${errorMessage}`
        )
        if (response.status === 409) {
          // Conflict: SHA mismatch, meaning remote file changed
          throw new Error(
            `Conflict (409) updating file on GitHub. Remote file has changed. Please sync (download & merge) first. Details: ${errorMessage}`
          )
        } else if (response.status === 422) {
          // Unprocessable Entity: Often due to missing SHA for existing file or bad SHA
          throw new Error(
            `Unprocessable Entity (422) updating file on GitHub. SHA mismatch or invalid request. Details: ${errorMessage}`
          )
        }

        throw new Error(
          `GitHub API error (${response.status}) uploading file: ${errorMessage}`
        )
      }

      // Only attempt to parse JSON if the response is OK
      const responseBody: GitHubCreateUpdateFileResponse =
        (await response.json()) as GitHubCreateUpdateFileResponse
      console.log(
        '[GitHubSyncAdapter] Response of upload:',
        prettyPrintJson(responseBody)
      )

      // Check for application-level errors if any (e.g., GitHub might return 200 OK but with an error object)
      // This part depends on how GitHub API structures its successful but problematic responses.
      // For typical file upload, a 200 or 201 with the content details is expected.
      if (
        responseBody.content &&
        responseBody.content.sha &&
        responseBody.commit &&
        responseBody.commit.sha
      ) {
        return {
          sha: responseBody.content.sha, // Blob SHA of the new/updated content
          // The commit timestamp is a more reliable indicator of when the content was last changed on the server.
          // timestamp: new Date(result.commit.committer.date).getTime(),
          timestamp: undefined, // Per previous logic, keeping timestamp handling consistent
          version: responseBody.commit.sha, // Commit SHA can serve as a version
        }
      }

      // This case might indicate an unexpected successful response format
      console.error(
        `[GitHubSyncAdapter] Unexpected successful response format from GitHub API for ${filePath}:`,
        responseBody
      )
      throw new Error(
        `Unexpected successful response format from GitHub API uploading to ${filePath}. Details: ${JSON.stringify(responseBody)}`
      )
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[GitHubSyncAdapter] Upload aborted.')
        throw error instanceof Error ? error : new Error(String(error))
      }

      console.error(
        `[GitHubSyncAdapter] Error uploading file to ${filePath}:`,
        error
      )
      // If error is already an Error object with a message, rethrow it.
      // Otherwise, wrap it or provide a default message.
      if (error instanceof Error) {
        throw error
      }

      throw new Error(`Failed to upload file: ${String(error)}`)
    }
  }

  /**
   * Checks the authentication status with GitHub using the provided credentials.
   * @returns A promise that resolves with the authentication status ('authenticated', 'unauthenticated', 'requires_config', 'error', 'unknown').
   */
  public async getAuthStatus(): Promise<AuthStatus> {
    // No need to check this.initialized here, as this can be called before init to check config
    if (!this.credentials || !this.credentials.token) {
      return 'requires_config'
    }

    const url = `${GITHUB_API_BASE_URL}/user`
    try {
      const response = await fetch(url, {
        // Use a new AbortController for auth status check if main one is not available or for isolation
        signal: this.abortController?.signal, // Or a new AbortController().signal for short-lived check
        headers: {
          Authorization: `token ${this.credentials.token}`,

          Accept: 'application/vnd.github.v3+json',
        },
      })

      if (response.ok) {
        return 'authenticated'
      }

      if (response.status === 401) {
        console.warn(
          '[GitHubSyncAdapter] GitHub token is invalid or revoked (401).'
        )
        return 'unauthenticated' // Token is invalid or revoked
      }

      // Other non-OK statuses
      const errorText = await response.text()
      console.error(
        `[GitHubSyncAdapter] GitHub API error (${response.status}) checking auth status: ${errorText}`
      )
      return 'error'
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[GitHubSyncAdapter] Auth status check aborted.')
        // Depending on desired behavior, could return 'unknown' or rethrow
        return 'unknown' // Or 'error' as the operation didn't complete
      }

      console.error(
        '[GitHubSyncAdapter] Network error checking GitHub auth status:',
        error
      )
      return 'error' // Network errors or other unexpected issues
    }
  }

  /**
   * Constructs the full file path in the repository based on the configuration scope.
   * If the scope is 'all', it uses the direct target path.
   * If the scope is a specific collection ID, it prepends the collection ID to the filename.
   * @returns The full file path for the GitHub repository.
   * @throws Error if the adapter is not initialized.
   */
  private getFilePath(): string {
    if (!this.initialized || !this.config || !this.target) {
      throw new Error(
        '[GitHubSyncAdapter] Adapter not properly initialized. Config or target is missing.'
      )
    }

    return buildSyncPath(this.target.path, this.config.scope)
  }
}
