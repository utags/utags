import type {
  AuthStatus,
  BrowserExtensionCredentials,
  BrowserExtensionTarget,
  Message,
  MessageType,
  SyncAdapter,
  SyncMetadata,
  SyncServiceConfig,
} from './types.js'

// Constants for message types and sources

const SOURCE_WEBAPP = 'utags-webapp'
const SOURCE_EXTENSION = 'utags-extension'
const PING_MESSAGE_TYPE = 'PING'
const PONG_MESSAGE_TYPE = 'PONG'
const DISCOVER_MESSAGE_TYPE = 'DISCOVER_UTAGS_TARGETS'
const DISCOVERY_RESPONSE_TYPE = 'DISCOVERY_RESPONSE'
const GET_REMOTE_METADATA_MESSAGE_TYPE = 'GET_REMOTE_METADATA'
const DOWNLOAD_MESSAGE_TYPE = 'DOWNLOAD_DATA'
const UPLOAD_MESSAGE_TYPE = 'UPLOAD_DATA'
const GET_AUTH_STATUS_MESSAGE_TYPE = 'GET_AUTH_STATUS'

/**
 * Custom error class for browser extension sync adapter errors.
 */
export class BrowserExtensionSyncError extends Error {
  static timeout(
    targetExtensionId: string | undefined,
    messageType: string,
    requestId: string,
    timeoutMs: number
  ): BrowserExtensionSyncError {
    return new BrowserExtensionSyncError(
      `Request timed out for ${targetExtensionId}: ${messageType} (ID: ${requestId}, ${timeoutMs}ms)`,
      'TIMEOUT',
      { targetExtensionId, messageType, requestId, timeoutMs }
    )
  }

  static notInitialized(): BrowserExtensionSyncError {
    return new BrowserExtensionSyncError(
      'Adapter not initialized',
      'NOT_INITIALIZED'
    )
  }

  static invalidEnvironment(): BrowserExtensionSyncError {
    return new BrowserExtensionSyncError(
      'Browser environment not available',
      'INVALID_ENVIRONMENT'
    )
  }

  static adapterDestroyed(): BrowserExtensionSyncError {
    return new BrowserExtensionSyncError(
      'Adapter has been destroyed',
      'ADAPTER_DESTROYED'
    )
  }

  static invalidConfig(details: string): BrowserExtensionSyncError {
    return new BrowserExtensionSyncError(
      `Invalid configuration: ${details}`,
      'INVALID_CONFIG'
    )
  }

  static communicationError(details: string): BrowserExtensionSyncError {
    return new BrowserExtensionSyncError(
      `Communication error: ${details}`,
      'COMMUNICATION_ERROR'
    )
  }

  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'BrowserExtensionSyncError'
  }
}

// Message types for communication with the extension
export type BrowserExtensionMessage<T = unknown> = Message<T> & {
  source: 'utags-webapp'
  targetExtensionId: string
}

export type BrowserExtensionResponse<R = unknown> = Message<R> & {
  source: 'utags-extension'
  extensionId: string
}

/**
 * Adapter for synchronizing data with another browser extension.
 * Communicates via browser extension messaging (content script bridge using window.postMessage).
 *
 * Key Features:
 * - Uses window.postMessage for cross-extension communication
 * - Supports target discovery and direct connection
 * - Handles message timeouts and cleanup
 * - Maintains connection state and request tracking
 *
 * Important Notes:
 * 1. This adapter requires a browser environment with window.postMessage support
 * 2. Discovery messages will always timeout as they are broadcast messages
 * 3. Each discovery process must be followed by a destroy() call to clean up resources
 * 4. Target extension ID must be provided for direct communication
 */
export class BrowserExtensionSyncAdapter implements SyncAdapter<
  BrowserExtensionCredentials,
  BrowserExtensionTarget
> {
  private readonly eventTarget = new EventTarget()
  private config!: SyncServiceConfig<
    BrowserExtensionCredentials,
    BrowserExtensionTarget
  >

  private targetExtensionId: string | undefined // Default, should be set in init
  private initialized = false
  private listenerAttached = false
  private discovering = false
  private readonly listeners: Array<
    [string, EventListenerOrEventListenerObject]
  > = []

  private readonly discoveredTargets = new Map<string, Record<string, string>>()
  private readonly outstandingRequests = new Map<
    string,
    {
      resolve: (value: any) => void
      reject: (reason?: any) => void
      timeoutId: number
    }
  >()

  constructor() {
    // Configuration will be provided via the init method
    this.handleExtensionMessage = this.handleExtensionMessage.bind(this)
  }

  /**
   * Initializes the adapter with a specific configuration.
   *
   * Initialization Process:
   * 1. Validates browser environment and configuration
   * 2. Sets up message event listeners
   * 3. Attempts to establish connection with target extension
   * 4. Cleans up on failure
   *
   * Important:
   * - Can only be initialized once
   * - Requires valid extensionId in target
   * - Will throw if browser environment is not available
   * - Automatically cleans up resources on initialization failure
   *
   * @param config - The configuration for this sync service instance
   * @throws {TypeError} When browser environment is unavailable or target are invalid
   * @throws {Error} When connection to target extension fails
   */
  async init(
    config: SyncServiceConfig<
      BrowserExtensionCredentials,
      BrowserExtensionTarget
    >
  ): Promise<void> {
    if (this.initialized) {
      console.warn('[BrowserExtensionSyncAdapter] Adapter already initialized.')
      return
    }

    // eslint-disable-next-line unicorn/prefer-global-this
    if (typeof window === 'undefined') {
      throw BrowserExtensionSyncError.invalidEnvironment()
    }

    if (!config.target.extensionId) {
      throw BrowserExtensionSyncError.invalidConfig('Missing targetExtensionId')
    }

    this.config = config
    this.targetExtensionId = config.target.extensionId

    if (!this.listenerAttached) {
      window.addEventListener('message', this.handleExtensionMessage)
      this.listenerAttached = true
    }

    console.info(
      `[BrowserExtensionSyncAdapter] Initializing connection to ${this.targetExtensionId}...`
    )

    try {
      const response = await this.sendMessageToExtension<
        undefined,
        { status: string }
      >(
        {
          type: PING_MESSAGE_TYPE,
        },
        5000
      )
      if (response && response.status === PONG_MESSAGE_TYPE) {
        this.initialized = true
        console.info(
          `[BrowserExtensionSyncAdapter] Successfully connected to target extension ${this.targetExtensionId}.`
        )
      } else {
        throw BrowserExtensionSyncError.communicationError(
          'Invalid PONG response.'
        )
      }
    } catch (error) {
      this.destroy() // Clean up on failure
      const err =
        error instanceof BrowserExtensionSyncError
          ? error
          : BrowserExtensionSyncError.communicationError(
              (error as Error).message
            )
      console.error(
        `[BrowserExtensionSyncAdapter] Failed to connect to ${this.targetExtensionId}:`,
        err
      )
      throw err
    }
  }

  /**
   * Broadcasts a message to discover available sync targets.
   *
   * Discovery Process:
   * 1. Clears previous discovery results
   * 2. Broadcasts discovery message to all potential targets
   * 3. Collects responses until timeout
   * 4. Emits 'targetFound' event with all discovered targets
   *
   * Important Notes:
   * - Discovery messages ALWAYS timeout as they are broadcast messages
   * - Only one discovery can be in progress at a time
   * - Automatically cleans up after discovery (calls destroy)
   * - Requires browser environment with window.postMessage support
   *
   * @throws {TypeError} When browser environment is unavailable
   */
  async discoverTargets(): Promise<void> {
    if (this.discovering) {
      console.warn(
        '[BrowserExtensionSyncAdapter] Discovery already in progress.'
      )
      return
    }

    // eslint-disable-next-line unicorn/prefer-global-this
    if (typeof window === 'undefined') {
      throw BrowserExtensionSyncError.invalidEnvironment()
    }

    if (!this.listenerAttached) {
      window.addEventListener('message', this.handleExtensionMessage)
      this.listenerAttached = true
    }

    this.discoveredTargets.clear()
    this.discovering = true
    // Temporarily set for logging purposes during broadcast
    this.targetExtensionId = 'BROADCAST'

    console.info(
      '[BrowserExtensionSyncAdapter] Starting discovery for sync targets...'
    )

    try {
      // The 'DISCOVER_UTAGS_TARGETS' message is not expected to be resolved.
      // Instead, it relies on a timeout to conclude the discovery process.
      // During this time, 'DISCOVERY_RESPONSE' messages are collected.
      await this.sendMessageToExtension(
        {
          type: DISCOVER_MESSAGE_TYPE,
        },
        3000,
        '*' // Broadcast to all available extensions/targets.
      )
    } catch (error) {
      if (
        error instanceof BrowserExtensionSyncError &&
        error.code === 'ADAPTER_DESTROYED'
      ) {
        // If destroyed, just re-throw to reject the discoverTargets promise.
        // Don't dispatch any events.
        throw error
      }

      if (
        error instanceof BrowserExtensionSyncError &&
        error.code === 'TIMEOUT'
      ) {
        // This is the expected success case for discovery.
        const targets = Array.from(this.discoveredTargets.values())
        console.info(
          `[BrowserExtensionSyncAdapter] Discovery finished. Found ${targets.length} targets.`
        )
        // IMPORTANT: Do not re-throw timeout error. This allows the discoverTargets promise to resolve successfully.
        return
      }

      // Any other error is a failure.
      console.error('[BrowserExtensionSyncAdapter] Discovery failed:', error)
      throw error // Rethrow to allow callers to handle it.
    } finally {
      this.discovering = false
      this.destroy() // Clean up resources after discovery.
    }
  }

  /**
   * Binds a listener to an event.
   *
   * Event Types:
   * - targetFound: Emitted when discovery process completes
   * - error: Emitted when an error occurs during communication
   *
   * Note: Listeners are tracked internally for cleanup during destroy()
   *
   * @param event - The event name to listen for
   * @param listener - The function to call when the event is emitted
   */
  on(event: string, listener: EventListenerOrEventListenerObject): void {
    this.eventTarget.addEventListener(event, listener)
    this.listeners.push([event, listener])
  }

  /**
   * Unbinds a listener from an event.
   *
   * Important:
   * - Should be called when the listener is no longer needed
   * - Helps prevent memory leaks
   * - Does not affect the internal listeners tracking
   *
   * @param event - The event name to stop listening to
   * @param listener - The function to remove from the event's listeners
   */
  off(event: string, listener: EventListenerOrEventListenerObject): void {
    this.eventTarget.removeEventListener(event, listener)
  }

  /**
   * Cleans up resources used by the adapter.
   *
   * Cleanup Process:
   * 1. Removes all registered event listeners
   * 2. Detaches window message event listener
   * 3. Clears all pending request timeouts
   * 4. Resets all internal state flags and collections
   *
   * Important:
   * - Must be called after discovery process completes
   * - Safe to call multiple times
   * - Required for proper resource cleanup and memory management
   * - Resets adapter to uninitialized state
   */
  destroy(): void {
    console.log('Destroying adapter and cleaning up resources.')

    // Clean up listeners and other resources
    for (const [event, listener] of this.listeners) {
      this.eventTarget.removeEventListener(event, listener)
    }

    // eslint-disable-next-line unicorn/prefer-global-this
    if (typeof window !== 'undefined' && this.listenerAttached) {
      window.removeEventListener('message', this.handleExtensionMessage)
      this.listenerAttached = false
    }

    // Reject any outstanding requests
    if (this.outstandingRequests.size > 0) {
      console.log(
        `Rejecting ${this.outstandingRequests.size} outstanding requests.`
      )
      for (const [, request] of this.outstandingRequests) {
        clearTimeout(request.timeoutId)
        request.reject(BrowserExtensionSyncError.adapterDestroyed())
      }
    }

    this.outstandingRequests.clear()
    this.discoveredTargets.clear()
    this.initialized = false
    this.discovering = false
    console.info('[BrowserExtensionSyncAdapter] Destroyed.')
  }

  /**
   * Gets the current configuration of the adapter.
   *
   * Important:
   * - Must be called after successful initialization
   * - Configuration includes target extension ID and other sync settings
   * - Used for maintaining sync state and connection details
   *
   * @returns The current configuration of the adapter
   * @throws {Error} When adapter is not initialized or configuration is not set
   */
  getConfig(): SyncServiceConfig<
    BrowserExtensionCredentials,
    BrowserExtensionTarget
  > {
    if (!this.initialized || !this.config) {
      throw new Error(
        'Adapter not initialized or configuration not set. Call init() first.'
      )
    }

    return this.config
  }

  /**
   * Retrieves metadata of the remote file/data.
   *
   * Process:
   * 1. Verifies adapter initialization
   * 2. Sends GET_REMOTE_METADATA message to extension
   * 3. Waits for response with metadata
   *
   * Important:
   * - Requires initialized adapter
   * - Used for sync conflict detection
   * - Returns undefined if no remote data exists
   *
   * @returns A promise that resolves with the remote metadata, or undefined if not found
   * @throws {Error} When adapter is not initialized
   */
  async getRemoteMetadata(): Promise<SyncMetadata | undefined> {
    if (!this.initialized) {
      throw BrowserExtensionSyncError.notInitialized()
    }

    try {
      const response = await this.sendMessageToExtension<
        undefined, // No payload for GET_REMOTE_METADATA
        { metadata: SyncMetadata | undefined } // Expected response type
      >({
        type: GET_REMOTE_METADATA_MESSAGE_TYPE,
      })
      return response.metadata
    } catch (error) {
      console.error('Failed to get remote metadata:', error)
      throw error
    }
  }

  /**
   * Downloads data from the remote service.
   *
   * Process:
   * 1. Verifies adapter initialization
   * 2. Sends DOWNLOAD_DATA message to extension
   * 3. Waits for response with data and metadata
   *
   * Important:
   * - Requires initialized adapter
   * - Handles both data and metadata in single request
   * - Returns undefined data if remote has no data
   * - Extension handles incremental download internally if needed
   *
   * @returns A promise that resolves with an object containing the downloaded data (string) and its remote metadata
   * @throws {Error} When adapter is not initialized
   */
  async download(): Promise<{
    data: string | undefined
    remoteMeta: SyncMetadata | undefined
  }> {
    if (!this.initialized) {
      throw BrowserExtensionSyncError.notInitialized()
    }

    try {
      console.time('download-request')
      const response = await this.sendMessageToExtension<
        undefined, // No payload for DOWNLOAD_DATA
        { data: string | undefined; remoteMeta: SyncMetadata | undefined } // Expected response type
      >({
        type: DOWNLOAD_MESSAGE_TYPE,
      })
      console.timeEnd('download-request')
      return response
    } catch (error) {
      console.timeEnd('download-request') // Ensure timer ends on error
      console.error('Failed to download data:', error)
      throw error
    }
  }

  /**
   * Uploads data to the remote service.
   *
   * Process:
   * 1. Verifies adapter initialization
   * 2. Sends UPLOAD_DATA message with data and optional metadata
   * 3. Waits for response with updated metadata
   *
   * Important:
   * - Requires initialized adapter
   * - Supports optimistic locking via expectedRemoteMeta
   * - Data must be stringified before upload
   * - Always returns new metadata after successful upload
   *
   * @param data - The stringified bookmark data to upload
   * @param expectedRemoteMeta - Optional metadata of the remote file for optimistic locking
   * @returns A promise that resolves with the metadata of the uploaded/updated remote file
   * @throws {Error} When adapter is not initialized
   */
  async upload(
    data: string, // Data is now a string as per SyncAdapter interface
    expectedRemoteMeta?: SyncMetadata
  ): Promise<SyncMetadata> {
    if (!this.initialized) {
      throw BrowserExtensionSyncError.notInitialized()
    }

    try {
      console.time('upload-request')
      const response = await this.sendMessageToExtension<
        { data: string; metadata?: SyncMetadata }, // Payload type for UPLOAD_DATA
        { metadata: SyncMetadata } // Expected response type
      >({
        type: UPLOAD_MESSAGE_TYPE,
        payload: { data, metadata: expectedRemoteMeta },
      })
      console.timeEnd('upload-request')
      return response.metadata
    } catch (error) {
      console.timeEnd('upload-request') // Ensure timer ends on error
      console.error('Failed to upload data:', error)
      throw error
    }
  }

  /**
   * Checks the authentication status with the remote service.
   *
   * Process:
   * 1. Checks adapter initialization state
   * 2. Sends GET_AUTH_STATUS message to extension
   * 3. Validates received status
   * 4. Handles timeout and invalid responses
   *
   * Important:
   * - Can be called before initialization (returns 'unknown')
   * - Uses 10 second timeout for auth check
   * - Validates response against known status values
   * - Returns 'error' for invalid or unexpected responses
   *
   * Valid Status Values:
   * - 'authenticated': Successfully connected and authorized
   * - 'unauthenticated': Connection established but not authorized
   * - 'error': Authentication or connection error
   * - 'requires_config': Additional configuration needed
   * - 'unknown': Status cannot be determined
   *
   * @returns A promise that resolves with the authentication status
   */
  async getAuthStatus(): Promise<AuthStatus> {
    if (!this.initialized) {
      console.warn(
        '[BrowserExtensionSyncAdapter] getAuthStatus called before successful initialization.'
      )
      return 'unknown'
    }

    try {
      const response = await this.sendMessageToExtension<
        never,
        { status: AuthStatus }
      >(
        {
          type: GET_AUTH_STATUS_MESSAGE_TYPE,
        },
        10_000
      )

      if (this._isValidAuthStatusResponse(response)) {
        return response.status
      }

      console.error(
        `[BrowserExtensionSyncAdapter] Invalid auth status received from ${this.targetExtensionId}:`,
        response
      )
      return 'error'
    } catch (error) {
      if (
        error instanceof BrowserExtensionSyncError &&
        error.code === 'TIMEOUT'
      ) {
        console.error(
          '[BrowserExtensionSyncAdapter] Auth status check timed out.'
        )
      } else {
        console.error(
          '[BrowserExtensionSyncAdapter] Failed to get auth status:',
          error
        )
      }

      return 'error'
    }
  }

  private _isValidAuthStatusResponse(
    response: any
  ): response is { status: AuthStatus } {
    if (!response || typeof response.status !== 'string') {
      return false
    }

    const validStatuses: AuthStatus[] = [
      'authenticated',
      'unauthenticated',
      'error',
      'requires_config',
      'unknown',
    ]
    return validStatuses.includes(response.status as AuthStatus)
  }

  /**
   * Sends a message to the target browser extension via window.postMessage.
   *
   * Message Sending Process:
   * 1. Generates a unique request ID for tracking
   * 2. Sets a timeout for the request
   * 3. Stores the request's promise handlers
   * 4. Posts the message to the window
   * 5. Handles potential errors during postMessage
   *
   * Important:
   * - Uses '*' as targetOrigin for broad compatibility with extensions
   * - Manages request lifecycle with timeouts and promise handlers
   * - Rejects promise on timeout or send error
   * - Logs sent messages for debugging
   *
   * @template T - The type of the message payload.
   * @template R - The expected type of the response payload.
   * @param messageData - Object containing the type and payload of the message.
   * @param timeoutMs - Timeout duration in milliseconds.
   * @param targetExtensionId - The ID of the target extension, or '*' for broadcast.
   * @returns A promise that resolves with the response from the extension.
   * @throws {Error} When browser environment is unavailable, message sending fails, or timeout occurs.
   */
  private async sendMessageToExtension<T, R>(
    messageData: {
      type: MessageType
      payload?: T
    },
    timeoutMs = 30_000, // Default timeout, can be overridden
    targetExtensionId: string | undefined = this.targetExtensionId
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line unicorn/prefer-global-this
      if (typeof window === 'undefined') {
        reject(BrowserExtensionSyncError.invalidEnvironment())
        return
      }

      const requestId = crypto.randomUUID()
      const message: BrowserExtensionMessage<T> = {
        ...messageData,
        source: SOURCE_WEBAPP,
        id: requestId,
        targetExtensionId: targetExtensionId || '*', // Use '*' for broadcast
      }

      const timeoutId = globalThis.setTimeout(() => {
        this.outstandingRequests.delete(requestId)
        reject(
          BrowserExtensionSyncError.timeout(
            targetExtensionId,
            message.type,
            requestId,
            timeoutMs
          )
        )
      }, timeoutMs) as unknown as number

      this.outstandingRequests.set(requestId, { resolve, reject, timeoutId })

      try {
        // For security, we should ideally use a specific targetOrigin.
        // However, for browser extension communication, '*' is acceptable
        // as the messages are handled by the extension's content script.
        window.postMessage(message, '*')

        const logMessage =
          targetExtensionId === '*'
            ? '[BrowserExtensionSyncAdapter] Broadcasting message:'
            : `[BrowserExtensionSyncAdapter] Sent message to extension ${targetExtensionId}:`
        console.debug(logMessage, { type: message.type, id: message.id })
      } catch (error) {
        clearTimeout(timeoutId)
        this.outstandingRequests.delete(requestId)

        const err = BrowserExtensionSyncError.communicationError(
          `Failed to send message: ${(error as Error).message}`
        )
        console.error(`[BrowserExtensionSyncAdapter] ${err.message}`)
        reject(err)
      }
    })
  }

  /**
   * Handles messages received from the extension.
   *
   * Message Handling Process:
   * 1. Validates message source and structure
   * 2. Handles discovery responses separately
   * 3. Matches response to an outstanding request by ID
   * 4. Resolves or rejects the corresponding promise
   * 5. Cleans up request tracking and timeout timer
   *
   * Important:
   * - Ignores messages not from 'utags-extension'
   * - During discovery, accepts responses from any extension
   * - For other messages, validates that the response is from the configured target
   * - Safely handles errors and unexpected responses
   *
   * @param event - The MessageEvent from window.onmessage.
   */
  private handleExtensionMessage(event: MessageEvent): void {
    if (!this.listenerAttached) {
      return
    }

    // Basic validation of the event origin and data structure
    // Note: For browser extension communication, origin check is less critical
    // as the messages are handled by the extension's content script.
    // The source and extensionId checks below provide the necessary validation.
    const response = event.data as BrowserExtensionResponse<any>

    if (
      response?.source !== SOURCE_EXTENSION ||
      !response.id ||
      !response.extensionId
    ) {
      return
    }

    // During discovery, any extension can respond
    if (response.type === DISCOVERY_RESPONSE_TYPE) {
      this.handleDiscoveryResponse(response)
      return
    }

    // For regular operations, ensure the response is from the configured target
    if (response.extensionId === this.targetExtensionId) {
      this.handleTargetResponse(response)
    }
  }

  /**
   * Handles discovery response messages from potential sync targets.
   *
   * @param response - The discovery response message
   */
  private handleDiscoveryResponse(
    response: BrowserExtensionResponse<any>
  ): void {
    const { extensionId, extensionName } = response.payload as {
      extensionId: string
      extensionName: string
    }
    if (
      this.discovering &&
      Boolean(extensionId) &&
      !this.discoveredTargets.has(extensionId)
    ) {
      const target = { extensionId, extensionName }
      this.discoveredTargets.set(extensionId, target)
      console.info(
        `[BrowserExtensionSyncAdapter] Discovered potential target: ${extensionId}`,
        { name: extensionName }
      )
      this.eventTarget.dispatchEvent(
        new CustomEvent('targetFound', {
          detail: target,
        })
      )
    }
  }

  /**
   * Handles response messages from the configured target extension.
   *
   * @param response - The response message from the target
   */
  private handleTargetResponse(response: BrowserExtensionResponse<any>): void {
    console.debug(
      `[BrowserExtensionSyncAdapter] Received message from ${this.targetExtensionId}:`,
      { type: response.type, id: response.id }
    )

    const requestCallbacks = this.outstandingRequests.get(response.id)
    if (!requestCallbacks) {
      console.warn(
        `[BrowserExtensionSyncAdapter] Received response for unknown or timed out request:`,
        { id: response.id, type: response.type }
      )
      return
    }

    clearTimeout(requestCallbacks.timeoutId)
    this.outstandingRequests.delete(response.id)

    if (response.error) {
      const errorMessage =
        typeof response.error === 'string'
          ? response.error
          : JSON.stringify(response.error)
      requestCallbacks.reject(
        BrowserExtensionSyncError.communicationError(
          `Error from extension ${this.targetExtensionId}: ${errorMessage}`
        )
      )
    } else {
      requestCallbacks.resolve(response.payload)
    }
  }
}

/*
TODO: [Security] Implement message signing to ensure message integrity and authenticity.
This would involve:
1. A key exchange or pre-shared key mechanism between the web app and the extension.
2. Signing messages on the sender side (sendMessageToExtension).
3. Verifying signatures on the receiver side (handleExtensionMessage).
This will prevent message tampering and spoofing.
*/
