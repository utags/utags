import type {
  SyncAdapter,
  SyncServiceConfig,
  ApiCredentials,
  ApiTarget,
  CustomApiUploadResponse,
  SyncMetadata,
  AuthStatus,
} from './types.js'
import { buildSyncPath } from './sync-path-builder.js'

/**
 * Implements the SyncAdapter interface for synchronizing bookmarks with a custom API.
 */
export class CustomApiSyncAdapter
  implements SyncAdapter<ApiCredentials, ApiTarget>
{
  private config!: SyncServiceConfig<ApiCredentials, ApiTarget> // Initialized by init()
  private apiCredentials!: ApiCredentials // Initialized by init()
  private apiTarget!: ApiTarget // Initialized by init()
  private apiBaseUrl!: string // Initialized by init()
  private headers: Record<string, string> = {} // Initialized by init()
  private initialized = false
  private abortController: AbortController | undefined // For aborting fetch requests
  // TODO: support for form data upload
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  private readonly useFormData = false
  // TODO: support for PUT or POST upload
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  private readonly uploadMethod = 'PUT' // or POST

  /**
   * Initializes and configures the CustomApiSyncAdapter.
   * This method sets up the API endpoint, credentials, and headers based on the provided configuration.
   * It also performs an initial connectivity test to the API base URL.
   * This method can be called multiple times to reconfigure the adapter.
   *
   * @param config - The configuration for this sync service instance.
   * @returns A promise that resolves when initialization and configuration are complete.
   * @throws {Error} If initialization fails due to invalid configuration, missing URL, or critical connectivity issues.
   */
  async init(
    config: SyncServiceConfig<ApiCredentials, ApiTarget>
  ): Promise<void> {
    // Cancel any ongoing operations from a previous initialization
    this.abortController?.abort() // Abort previous requests if any
    this.abortController = new AbortController() // Create a new AbortController for this initialization
    this.initialized = false // Reset initialized state at the beginning

    try {
      this.config = config

      if (config.type !== 'customApi') {
        throw new Error('Invalid configuration type for CustomApiSyncAdapter.')
      }

      this.apiCredentials = config.credentials
      this.apiTarget = config.target

      if (!this.apiTarget.url) {
        throw new Error(
          'Custom API URL is not defined in target configuration.'
        )
      }

      this.apiBaseUrl = this.apiTarget.url.endsWith('/')
        ? this.apiTarget.url.slice(0, -1)
        : this.apiTarget.url

      // Clear and re-populate headers based on the new config
      this.headers = { 'Content-Type': 'application/json' }
      if (this.apiCredentials.token) {
        this.headers.Authorization = `Bearer ${this.apiCredentials.token}`
      }

      if (this.apiCredentials.apiKey) {
        this.headers['X-API-Key'] = this.apiCredentials.apiKey
      }
    } catch (error: any) {
      // Ensure configuration errors are re-thrown as per spec
      throw new Error(`Adapter configuration failed: ${error.message}`)
    }

    // Perform a quick connectivity test to the base URL
    // try {
    //   const response = await fetch(this.apiBaseUrl, {
    //     method: 'HEAD',
    //     headers: this.headers,
    //     signal: this.abortController.signal, // Pass the signal to the fetch request
    //   })

    //   // Consider 403 as a potential auth issue rather than pure connectivity for the base URL.
    //   // Other non-ok statuses might indicate a problem with the endpoint or server configuration.
    //   if (
    //     !response.ok &&
    //     response.status !== 404 && // Common for base URLs if not specifically configured for HEAD
    //     response.status !== 405 && // Method Not Allowed
    //     response.status !== 403 // Forbidden, often an auth issue
    //   ) {
    //     console.warn(
    //       `[CustomApiSyncAdapter] Initial HEAD request to base URL ${this.apiBaseUrl} returned status ${response.status}. This might indicate a configuration or server issue.`
    //     )
    //     // Depending on strictness, this could throw an error or lead to 'requires_config' or 'error' auth status later.
    //   }
    // } catch (error: any) {
    //   if (error.name === 'AbortError') {
    //     console.log('[CustomApiSyncAdapter] Initial connectivity test aborted.')
    //     // Don't throw an error if aborted, as it's an intentional cancellation
    //     return // Exit init early if aborted
    //   }
    //   console.error(
    //     `[CustomApiSyncAdapter] Initial connectivity test to ${this.apiBaseUrl} failed:`,
    //     error
    //   )
    //   throw new Error(
    //     `Failed to connect to the custom API endpoint ${this.apiBaseUrl}: ${error.message}`
    //   )
    // }

    this.initialized = true
    console.log(
      `[CustomApiSyncAdapter] Initialized and configured for ${this.config.name} (${this.apiBaseUrl})`
    )
  }

  /**
   * Cleans up resources used by the adapter.
   * This method should be called when the adapter is no longer needed to prevent memory leaks
   * and ensure graceful shutdown. It aborts any pending fetch requests.
   */
  destroy(): void {
    this.abortController?.abort() // Abort any ongoing fetch requests
    this.abortController = undefined // Reset the abort controller
    this.initialized = false
    // Optionally reset other properties if it makes sense for your application's lifecycle
    // this.config = undefined;
    // this.apiCredentials = undefined;
    // this.apiTarget = undefined;
    // this.apiBaseUrl = undefined;
    // this.headers = {};
    console.log(
      `[CustomApiSyncAdapter] Destroyed for ${this.config?.name || 'Unknown Service'}. Pending operations aborted.`
    )
  }

  /**
   * Gets the current configuration of the adapter.
   * @returns The current configuration of the adapter.
   * @throws {Error} If the adapter has not been initialized by calling `init()` first.
   */
  getConfig(): SyncServiceConfig<ApiCredentials, ApiTarget> {
    if (!this.initialized || !this.config) {
      throw new Error('Adapter not initialized. Call init() first.')
    }

    return this.config
  }

  /**
   * Retrieves remote metadata for the bookmarks file.
   * @returns A promise that resolves with the remote metadata or undefined if not found (404).
   * @throws {Error} If fetching metadata fails due to network issues, authentication problems, or server errors (other than a 'Not Found' scenario).
   */
  async getRemoteMetadata(): Promise<SyncMetadata | undefined> {
    if (!this.initialized || !this.abortController) {
      throw new Error('Adapter not initialized. Call init() first.')
    }

    const filePath = this.getFilePath()
    const url = `${this.apiBaseUrl}/${filePath}`
    const signal = this.abortController.signal

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: this.headers,
        signal, // Pass the signal to the fetch request
      })

      if (response.status === 404) {
        return undefined // File not found, as per interface spec
      }

      if (!response.ok || !response.headers.get('ETag')) {
        console.warn(
          `[CustomApiSyncAdapter] HEAD request for metadata failed or ETag missing (status ${response.status}), attempting GET for ${url}.`
        )
        const getResponse = await fetch(url, {
          method: 'GET',
          headers: this.headers,
          signal, // Pass the signal to the fetch request
        })

        if (getResponse.status === 404) {
          return undefined // File not found on GET either
        }

        if (!getResponse.ok) {
          throw new Error(
            `Failed to fetch remote metadata (GET ${url}): ${getResponse.status} ${getResponse.statusText}`
          )
        }

        // Extract metadata from GET response headers
        const etag = getResponse.headers.get('ETag')
        const lastModifiedHeader = getResponse.headers.get('Last-Modified')
        const lastModified = lastModifiedHeader
          ? new Date(lastModifiedHeader).getTime()
          : undefined
        // If API returns metadata in body for GET, parse it here
        // const bodyMeta = await getResponse.json()
        return {
          version: etag?.replace(/"/g, ''), // Clean ETag
          timestamp: lastModified,
          // sha: bodyMeta.sha, // if API provides it
        }
      }

      // Extract metadata from HEAD response headers
      const etag = response.headers.get('ETag')
      const lastModifiedHeader = response.headers.get('Last-Modified')
      const lastModified = lastModifiedHeader
        ? new Date(lastModifiedHeader).getTime()
        : undefined

      return {
        version: etag?.replace(/"/g, ''), // Clean ETag (common for ETags to be quoted)
        timestamp: lastModified,
        // sha: could be part of ETag or a custom header like X-Content-SHA
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(
          `[CustomApiSyncAdapter] getRemoteMetadata aborted for ${url}.`
        )
        // Potentially return a specific value or rethrow a custom error if needed
        // For now, let it fall through to the generic error handling or return undefined
      } else {
        console.error('Error getting remote metadata from Custom API:', error)
      }

      // Don't rethrow, allow sync process to handle null metadata gracefully or based on AbortError handling
      return undefined // Or handle as per specific requirements for aborted operations
    }
  }

  /**
   * Downloads bookmarks data from the custom API.
   * @returns A promise that resolves with an object containing the downloaded data (as string) and its remote metadata.
   * @throws {Error} If the download fails due to network issues, server errors, or if the adapter is not initialized.
   */
  async download(): Promise<{
    data: string | undefined
    remoteMeta: SyncMetadata | undefined
  }> {
    if (!this.initialized || !this.abortController) {
      throw new Error('Adapter not initialized. Call init() first.')
    }

    const filePath = this.getFilePath()
    const url = `${this.apiBaseUrl}/${filePath}`
    const signal = this.abortController.signal

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
        signal, // Pass the signal to the fetch request
      })

      if (response.status === 404) {
        return { data: undefined, remoteMeta: undefined } // No data to download
      }

      if (!response.ok) {
        // Throw an error that includes the status, which helps in testing specific error codes
        throw new Error(
          `Failed to download data from Custom API (${url}). Status: ${response.status} ${response.statusText}`
        )
      }

      const responseData = await response.text() // Get data as string

      const etag = response.headers.get('ETag')
      const lastModifiedHeader = response.headers.get('Last-Modified')
      const lastModified = lastModifiedHeader
        ? new Date(lastModifiedHeader).getTime()
        : undefined

      const remoteMeta: SyncMetadata = {
        version: etag?.replace(/"/g, ''),
        timestamp: lastModified,
      }

      return { data: responseData, remoteMeta }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`[CustomApiSyncAdapter] Download aborted for ${url}.`)
        // Return a specific state or rethrow if the calling code needs to know it was aborted
        return { data: undefined, remoteMeta: undefined } // Example: return empty on abort
      }

      console.error(`Error downloading from Custom API (${url}):`, error)
      throw error instanceof Error ? error : new Error(String(error)) // Rethrow to be handled by the sync manager
    }
  }

  /**
   * Uploads bookmarks data (as string) to the custom API.
   * @param data - The stringified bookmarks data to upload.
   * @param expectedRemoteMeta - Optional metadata of the remote file for optimistic locking (e.g., ETag/version).
   * @returns A promise that resolves with the new sync metadata of the uploaded file.
   */
  async upload(
    data: string,
    expectedRemoteMeta?: SyncMetadata
  ): Promise<SyncMetadata> {
    if (!this.initialized || !this.abortController) {
      throw new Error('Adapter not initialized. Call init() first.')
    }

    const filePath = this.getFilePath()
    const url = `${this.apiBaseUrl}/${filePath}`
    const uploadHeaders = { ...this.headers }
    const signal = this.abortController.signal

    if (expectedRemoteMeta?.sha) {
      uploadHeaders['If-Match'] = expectedRemoteMeta.sha // Use sha for conditional request
    } else if (expectedRemoteMeta?.version) {
      // If SHA is not available but a generic version (like ETag) is, use it.
      // The server must be configured to understand this header for conditional requests.
      uploadHeaders['If-Match'] = expectedRemoteMeta.version
    }

    // Create a FormData object to send the file
    const formData = new FormData()
    formData.append(
      'file',
      new Blob([data], { type: 'application/json' }),
      filePath
    )
    // Add other metadata if your API expects them as form fields
    // formData.append('filePath', filePath);
    try {
      const response = await fetch(url, {
        method: this.uploadMethod,
        headers: uploadHeaders, // Headers for auth, If-Match, etc.
        body: this.useFormData ? formData : data, // Send data as FormData
        signal, // Pass the signal to the fetch request
      })

      if (!response.ok) {
        // Attempt to read error message from response body
        let errorDetails = ''
        try {
          errorDetails = await response.text()
        } catch {
          // Ignore if error body cannot be read
        }

        throw new Error(
          `Failed to upload to Custom API: ${response.status} ${response.statusText}. Details: ${errorDetails}`
        )
      }

      const responseBody: CustomApiUploadResponse =
        (await response.json()) as CustomApiUploadResponse

      if (responseBody && responseBody.sha) {
        // The mock server returns lastModified, sha. 'version' in SyncMetadata can be the sha.
        return {
          timestamp: responseBody.lastModified,
          version: responseBody.sha, // Using sha as the version identifier
          sha: responseBody.sha,
        }
      }

      // Extract new metadata from response (e.g., new ETag, last-modified)
      const newEtag = response.headers.get('ETag')
      const newLastModifiedHeader = response.headers.get('Last-Modified')
      const newLastModified = newLastModifiedHeader
        ? new Date(newLastModifiedHeader).getTime()
        : Date.now() // Fallback to current time if header is missing
      // Fallback if sha is not provided in the response
      return {
        version: newEtag?.replace(/"/g, ''),
        timestamp: newLastModified,
        sha: '',
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`[CustomApiSyncAdapter] Upload aborted for ${url}.`)
        // Rethrow or handle as a specific error state.
        // For upload, it might be important to signal that the operation didn't complete.
        throw new Error(`Upload aborted for ${url}.`)
      }

      console.error('Error uploading to Custom API:', error)
      throw error instanceof Error ? error : new Error(String(error)) // Rethrow to be handled by the sync manager
    }
  }

  /**
   * Checks the authentication status with the custom API.
   * @returns A promise that resolves with the authentication status.
   */
  async getAuthStatus(): Promise<AuthStatus> {
    if (!this.initialized || !this.abortController) {
      // If called before init or after destroy, it's a config issue or misuse
      // However, if abortController is undefined because destroy was called,
      // it might be valid to return 'error' or 'requires_config'
      // For simplicity, let's assume init must be called and not destroyed.
      throw new Error(
        'Adapter not initialized or already destroyed. Call init() first.'
      )
    }

    const authTestPath = this.apiTarget.authTestEndpoint || 'auth/status' // Default or configured path
    const url = `${this.apiBaseUrl}/${authTestPath.startsWith('/') ? authTestPath.slice(1) : authTestPath}`
    const signal = this.abortController.signal

    // Ensure no token/API key is present if it's not configured
    if (!this.apiCredentials.token && !this.apiCredentials.apiKey) {
      return 'requires_config'
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
        signal, // Pass the signal to the fetch request
      })

      if (response.ok) {
        // Optionally, check response body for more detailed auth status if API provides it
        // const authData = await response.json();
        // if (authData.authenticated) return 'authenticated';
        return 'authenticated'
      }

      if (response.status === 401 || response.status === 403) {
        return 'unauthenticated'
      }

      // For other errors, consider it an error state
      return 'error'
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(
          `[CustomApiSyncAdapter] Auth status check aborted for ${url}.`
        )
        return 'error' // Or a more specific status indicating cancellation
      }

      console.error('Error checking auth status for Custom API:', error)
      return 'error'
    }
  }
  // acquireLock and releaseLock are optional and not implemented here
  // If your API supports locking, implement them similarly.

  /**
   * Gets the file path for the bookmarks data on the custom API.
   * This might be a specific endpoint path.
   * @returns The file path or endpoint.
   */
  private getFilePath(): string {
    if (!this.initialized || !this.config || !this.apiTarget) {
      throw new Error(
        '[CustomApiSyncAdapter] Adapter not properly initialized. Config or target is missing.'
      )
    }

    return buildSyncPath(this.apiTarget.path, this.config.scope)
  }
}
