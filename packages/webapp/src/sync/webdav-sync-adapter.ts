import {
  createClient,
  type WebDAVClient as WebDAVClientType,
  type FileStat,
  type PutFileContentsOptions,
} from '../lib/webdav-client.js'
import type {
  AuthStatus,
  SyncAdapter,
  SyncMetadata,
  SyncServiceConfig,
  WebDAVCredentials,
  WebDAVTarget,
} from './types.js'
import { buildSyncPath } from './sync-path-builder.js'

// eslint-disable-next-line @typescript-eslint/naming-convention
export class WebDAVSyncAdapter implements SyncAdapter<
  WebDAVCredentials,
  WebDAVTarget
> {
  private config: SyncServiceConfig<WebDAVCredentials, WebDAVTarget> | undefined
  private client: WebDAVClientType | undefined

  /**
   * Initializes the WebDAV sync adapter with the given configuration.
   * It sets up the WebDAV client and performs an initial connection test.
   * @param config - The configuration for the WebDAV service, including credentials and target path.
   * @throws Error if configuration is not provided or if the initial connection test fails.
   */
  async init(
    config: SyncServiceConfig<WebDAVCredentials, WebDAVTarget>
  ): Promise<void> {
    if (!config) {
      // Check if config is provided
      throw new Error('Configuration must be provided for WebDAVSyncAdapter.')
    }

    this.config = config
    // Initialize WebDAV client
    this.client = createClient(this.config.target.url, {
      username: this.config.credentials.username,
      password: this.config.credentials.password,
    })
    // console.log('WebDAVSyncAdapter initialized with config:', config)
    // You might want to add a simple connectivity test here, e.g., trying to list the root directory
    try {
      await this.client.getDirectoryContents('/') // Test connection
    } catch (error: any) {
      console.error('WebDAV initial connection test failed:', error)
      // Re-throw a more specific error to be caught by tests or calling code
      throw new Error(
        `WebDAV initial connection test failed: ${(error.message as string) || error}`
      )
    }
  }

  /**
   * Cleans up resources used by the adapter.
   */
  destroy(): void {
    // The 'webdav' client library doesn't seem to have an explicit close/destroy method for the client instance.
    // Garbage collection should handle it. If specific resources were opened, close them here.
    console.log('WebDAVSyncAdapter destroyed.')
  }

  /**
   * Gets the current configuration of the adapter.
   * @returns The current configuration of the adapter.
   */
  getConfig(): SyncServiceConfig<WebDAVCredentials, WebDAVTarget> {
    if (!this.config) {
      throw new Error('WebDAVSyncAdapter not initialized. Call init() first.')
    }

    return this.config
  }

  /**
   * Retrieves metadata of the remote file from the WebDAV server.
   * @returns A promise that resolves with the remote metadata, or undefined if not found.
   */
  async getRemoteMetadata(): Promise<SyncMetadata | undefined> {
    if (!this.client) {
      throw new Error('WebDAVSyncAdapter not initialized.')
    }

    const filePath = this.getFilePath() // + Use getFilePath
    try {
      const stat = await this.client.stat(filePath)
      return {
        version: stat.etag!,
        sha: stat.etag!,
        timestamp: new Date(stat.lastmod).getTime(),
        // size: stat.size,
      }
    } catch (error: any) {
      // Handle file not found (404) or conflict (409) which can indicate the file/path doesn't exist.
      if (error.status === 404 || error.status === 409) {
        console.log(
          `WebDAV metadata: file or path not found at ${filePath} (status: ${error.status})`
        )
        return undefined
      }

      console.error(`WebDAV getRemoteMetadata for ${filePath} failed:`, error)
      throw new Error(`WebDAV getRemoteMetadata failed: ${error.message}`)
    }
  }

  /**
   * Downloads data from the WebDAV server.
   * @returns A promise that resolves with the downloaded data and its metadata.
   */
  async download(): Promise<{
    data: string | undefined
    remoteMeta: SyncMetadata | undefined
  }> {
    if (!this.client) {
      throw new Error('WebDAVSyncAdapter not initialized.')
    }

    const filePath = this.getFilePath() // + Use getFilePath
    try {
      const stat = await this.client.stat(filePath)
      const fileContents = (await this.client.getFileContents(filePath, {
        format: 'text',
      })) as string

      return {
        data: fileContents,
        remoteMeta: {
          version: stat.etag!,
          sha: stat.etag!,
          timestamp: new Date(stat.lastmod).getTime(),
          // size: stat.size,
        },
      }
    } catch (error: any) {
      // Handle file not found (404) or conflict (409) which can indicate the file/path doesn't exist.
      if (error.status === 404 || error.status === 409) {
        console.log(
          `WebDAV file or path not found at ${filePath} (status: ${error.status})`
        )
        return { data: undefined, remoteMeta: undefined }
      }

      console.error(`WebDAV download from ${filePath} failed:`, error)
      throw new Error(`WebDAV download failed: ${error.message}`)
    }
  }

  /**
   * Uploads data to the WebDAV server.
   * @param data - The stringified data to upload.
   * @param expectedRemoteMeta - Optional metadata of the remote file for optimistic locking.
   * @returns A promise that resolves with the metadata of the uploaded file.
   * @throws {Error} If the upload fails.
   */
  async upload(
    data: string,
    expectedRemoteMeta?: SyncMetadata
  ): Promise<SyncMetadata> {
    if (!this.client || !this.config) {
      throw new Error('WebDAVAdapter not initialized. Call init() first.')
    }

    const filePath = this.getFilePath()
    // Get parent path using string manipulation for browser compatibility
    const parentPath = filePath.slice(0, Math.max(0, filePath.lastIndexOf('/')))

    try {
      // Check if parent directory exists, create if not
      try {
        const testStat = await this.client.stat(parentPath)
        if (testStat.type !== 'directory') {
          // Path component is a file, not a directory
          throw new Error(
            `WebDAV upload failed: Parent path component '${parentPath}' is a file, not a directory.`
          )
        }
      } catch (error: any) {
        // A 404 or 409 status indicates that the directory does not exist.
        if (error.status === 404 || error.status === 409) {
          // Directory does not exist, create it recursively
          try {
            await this.client.createDirectory(parentPath, { recursive: true })
          } catch (createDirError: any) {
            // Throw a more specific error if directory creation fails
            console.error(
              `Failed to create parent directory ${parentPath}:`,
              createDirError
            )
            throw new Error(
              `WebDAV upload failed: Failed to create parent directory '${parentPath}'. Original error: ${createDirError.message || createDirError}`
            )
          }
        } else {
          // Other stat error, re-throw or handle specifically if needed
          // If the error is already in the desired format, just re-throw
          if ((error.message as string)?.startsWith('WebDAV upload failed:')) {
            throw error as Error
          }

          // Otherwise, wrap it for consistency
          console.error(
            `WebDAV stat error for parent path ${parentPath}:`,
            error
          )
          throw new Error(
            `WebDAV upload failed: Error checking parent path '${parentPath}'. Original error: ${error.message || error}`
          )
        }
      }

      const options: PutFileContentsOptions = {}
      if (expectedRemoteMeta?.version) {
        options.headers = { 'If-Match': expectedRemoteMeta.version }
      }

      try {
        await this.client.putFileContents(filePath, data, options)
      } catch (error: any) {
        console.log(error)
        if (error.status === 412) {
          // Precondition Failed (ETag mismatch)
          console.warn(
            `WebDAV upload failed due to ETag mismatch for ${filePath}. Expected: ${expectedRemoteMeta?.version}`
          )
          // It's important to throw a specific error or handle this case appropriately
          // so the SyncManager can potentially trigger a merge or re-fetch.
          throw new Error(
            `WebDAV upload failed: Precondition Failed (ETag mismatch or other condition). Original error: ${error.message || error}`
          )
        }

        throw new Error(
          `WebDAV upload failed: Failed to upload file to '${filePath}'. Original error: ${error.message || error}`
        )
      }

      // After successful upload, get the new metadata (ETag and Last-Modified)
      const stat = await this.client.stat(filePath)
      return {
        version: stat.etag!,
        sha: stat.etag!, // Using ETag as SHA for WebDAV
        timestamp: new Date(stat.lastmod).getTime(),
      }
    } catch (error: any) {
      // Other stat error, re-throw or handle specifically if needed
      // If the error is already in the desired format, just re-throw
      if ((error.message as string)?.startsWith('WebDAV upload failed:')) {
        throw error as Error
      }

      console.error(`WebDAV upload error for ${filePath}:`, error)
      throw new Error(`WebDAV upload failed: ${error.message || error}`)
    }
  }

  /**
   * Checks the authentication status with the WebDAV server.
   * @returns A promise that resolves with the AuthStatus.
   */
  async getAuthStatus(): Promise<AuthStatus> {
    if (!this.client) {
      // If client didn't even initialize (e.g. bad URL in config), it's a config issue
      if (!this.config?.target?.url) return 'requires_config'
      // If client init failed for other reasons, treat as error for now
      return 'error'
    }

    try {
      // Attempt a lightweight operation, like listing the root directory or STAT on root.
      // Some servers might not allow listing root, so STAT might be better if path is known.
      await this.client.stat('/') // Or use a known base path from config if applicable
      return 'authenticated'
    } catch (error: any) {
      console.warn('WebDAV auth status check failed:', error)
      if (error.status === 401) {
        return 'unauthenticated'
      }

      // Other errors (network, server misconfiguration) are treated as 'error'
      return 'error'
    }
  }

  /**
   * @private
   * @method getFilePath
   * @description Builds the full file path for WebDAV operations using buildSyncPath.
   * @returns {string} The full file path.
   */
  private getFilePath(): string {
    if (!this.config) {
      throw new Error(
        '[WebDAVSyncAdapter] Adapter not properly initialized. Config is missing.'
      )
    }

    // Use the 'path' from 'target' and 'scope' from 'config' for buildSyncPath
    return '/' + buildSyncPath(this.config.target.path, this.config.scope)
  }
}
