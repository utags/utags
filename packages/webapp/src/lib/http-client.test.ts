/**
 * Unit tests for HTTP client module
 * Tests environment detection and HTTP request functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  HttpClient,
  EnvironmentDetector,
  UserscriptHttpClient,
  BrowserHttpClient,
  BrowserExtensionHttpClient,
  FetchHttpClient,
  type HttpRequestOptions,
  type HttpResponse,
} from './http-client.js'

// Mock global objects
const mockGM = {
  xmlHttpRequest: vi.fn(),
}

// Mock XMLHttpRequest
class MockXMLHttpRequest {
  public status = 200
  public statusText = 'OK'
  public responseText = ''
  public timeout = 0
  public onload: (() => void) | undefined
  public onerror: (() => void) | undefined
  public ontimeout: (() => void) | undefined

  private headers: Record<string, string> = {}
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  private readonly responseHeaders =
    'content-type: application/json\r\ncontent-length: 100'

  private shouldError = false
  private shouldTimeout = false

  open(method: string, url: string, async: boolean) {
    // Mock implementation
  }

  setRequestHeader(key: string, value: string) {
    this.headers[key] = value
  }

  getAllResponseHeaders() {
    return this.responseHeaders
  }

  send(body?: string) {
    // Simulate async response
    setTimeout(() => {
      if (this.shouldError && this.onerror) {
        this.onerror()
      } else if (this.shouldTimeout && this.ontimeout) {
        this.ontimeout()
      } else if (this.onload) {
        this.onload()
      }
    }, 0)
  }

  setResponse(status: number, statusText: string, responseText: string) {
    this.status = status
    this.statusText = statusText
    this.responseText = responseText
    this.shouldError = false
    this.shouldTimeout = false
  }

  simulateError() {
    this.shouldError = true
    this.shouldTimeout = false
  }

  simulateTimeout() {
    this.shouldTimeout = true
    this.shouldError = false
  }
}

// Mock fetch
const mockFetch = vi.fn()

describe('EnvironmentDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset global objects
    delete (globalThis as any).GM
    delete (globalThis as any).XMLHttpRequest
    delete (globalThis as any).fetch
  })

  describe('isUserscriptEnvironment', () => {
    it('should return true when GM and GM.xmlHttpRequest are available', () => {
      ;(globalThis as any).GM = mockGM
      expect(EnvironmentDetector.isUserscriptEnvironment()).toBe(true)
    })

    it('should return false when GM is undefined', () => {
      expect(EnvironmentDetector.isUserscriptEnvironment()).toBe(false)
    })

    it('should return false when GM is null', () => {
      ;(globalThis as any).GM = null
      expect(EnvironmentDetector.isUserscriptEnvironment()).toBe(false)
    })

    it('should return false when GM.xmlHttpRequest is not a function', () => {
      ;(globalThis as any).GM = { xmlHttpRequest: 'not a function' }
      expect(EnvironmentDetector.isUserscriptEnvironment()).toBe(false)
    })
  })

  describe('isBrowserExtensionEnvironment', () => {
    it('should return false (placeholder implementation)', () => {
      expect(EnvironmentDetector.isBrowserExtensionEnvironment()).toBe(false)
    })
  })

  describe('isBrowserEnvironment', () => {
    it('should return true when globalThis and XMLHttpRequest are available', () => {
      ;(globalThis as any).XMLHttpRequest = MockXMLHttpRequest
      expect(EnvironmentDetector.isBrowserEnvironment()).toBe(true)
    })

    it('should return false when XMLHttpRequest is not available', () => {
      expect(EnvironmentDetector.isBrowserEnvironment()).toBe(false)
    })
  })
})

describe('UserscriptHttpClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as any).GM = mockGM
  })

  afterEach(() => {
    delete (globalThis as any).GM
  })

  it('should make successful request using GM.xmlHttpRequest', async () => {
    const mockResponse = {
      status: 200,
      statusText: 'OK',
      responseText: '{"success": true}',
      responseHeaders: 'content-type: application/json\r\ncontent-length: 17',
    }

    mockGM.xmlHttpRequest.mockImplementation((options: any) => {
      setTimeout(() => {
        options.onload(mockResponse)
      }, 0)
    })

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://example.com/api',
      headers: { Authorization: 'Bearer token' },
    }

    const response = await UserscriptHttpClient.request(options)

    expect(mockGM.xmlHttpRequest).toHaveBeenCalledWith({
      method: 'GET',
      url: 'https://example.com/api',
      headers: { Authorization: 'Bearer token' },
      data: undefined,
      onload: expect.any(Function),
      onerror: expect.any(Function),
      ontimeout: expect.any(Function),
    })

    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(await response.text()).toBe('{"success": true}')
    expect(await response.json()).toEqual({ success: true })
    expect(response.headers.get('content-type')).toBe('application/json')
  })

  it('should handle request errors', async () => {
    mockGM.xmlHttpRequest.mockImplementation((options: any) => {
      setTimeout(() => {
        options.onerror({ statusText: 'Network Error' })
      }, 0)
    })

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://example.com/api',
    }

    await expect(UserscriptHttpClient.request(options)).rejects.toThrow(
      'Request failed: Network Error'
    )
  })

  it('should handle request timeout', async () => {
    mockGM.xmlHttpRequest.mockImplementation((options: any) => {
      setTimeout(() => {
        options.ontimeout()
      }, 0)
    })

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://example.com/api',
    }

    await expect(UserscriptHttpClient.request(options)).rejects.toThrow(
      'Request timeout'
    )
  })

  it('should throw error when GM is not available', async () => {
    delete (globalThis as any).GM

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://example.com/api',
    }

    await expect(UserscriptHttpClient.request(options)).rejects.toThrow(
      'GM is not defined'
    )
  })

  it('should convert response to ArrayBuffer', async () => {
    const mockResponse = {
      status: 200,
      statusText: 'OK',
      responseText: 'Hello World',
      responseHeaders: '',
    }

    mockGM.xmlHttpRequest.mockImplementation((options: any) => {
      setTimeout(() => {
        options.onload(mockResponse)
      }, 0)
    })

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://example.com/api',
    }

    const response = await UserscriptHttpClient.request(options)
    const arrayBuffer = await response.arrayBuffer()
    const decoder = new TextDecoder()
    const text = decoder.decode(arrayBuffer)

    expect(text).toBe('Hello World')
    expect(arrayBuffer).toBeInstanceOf(ArrayBuffer)
  })
})

describe('BrowserHttpClient', () => {
  let mockXHR: MockXMLHttpRequest

  beforeEach(() => {
    vi.clearAllMocks()
    mockXHR = new MockXMLHttpRequest()
    ;(globalThis as any).XMLHttpRequest = vi.fn(() => mockXHR)
  })

  afterEach(() => {
    delete (globalThis as any).XMLHttpRequest
  })

  it('should make successful request using XMLHttpRequest', async () => {
    mockXHR.setResponse(200, 'OK', '{"success": true}')

    const options: HttpRequestOptions = {
      method: 'POST',
      url: 'https://example.com/api',
      headers: { 'Content-Type': 'application/json' },
      body: '{"test": true}',
      timeout: 5000,
    }

    const responsePromise = BrowserHttpClient.request(options)
    const response = await responsePromise

    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(await response.text()).toBe('{"success": true}')
    expect(await response.json()).toEqual({ success: true })
    expect(response.headers.get('content-type')).toBe('application/json')
  })

  it('should handle network errors', async () => {
    mockXHR.simulateError()

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://example.com/api',
    }

    await expect(BrowserHttpClient.request(options)).rejects.toThrow(
      'Network Error'
    )
  })

  it('should handle request timeout', async () => {
    mockXHR.simulateTimeout()

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://example.com/api',
      timeout: 1000,
    }

    await expect(BrowserHttpClient.request(options)).rejects.toThrow(
      'Request timeout'
    )
  })

  it('should handle non-ok status codes', async () => {
    mockXHR.setResponse(404, 'Not Found', 'Page not found')

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://example.com/api',
    }

    const response = await BrowserHttpClient.request(options)

    expect(response.ok).toBe(false)
    expect(response.status).toBe(404)
    expect(response.statusText).toBe('Not Found')
    expect(await response.text()).toBe('Page not found')
  })

  it('should convert response to ArrayBuffer', async () => {
    mockXHR.setResponse(200, 'OK', 'Hello World')

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://example.com/api',
    }

    const response = await BrowserHttpClient.request(options)
    const arrayBuffer = await response.arrayBuffer()
    const decoder = new TextDecoder()
    const text = decoder.decode(arrayBuffer)

    expect(text).toBe('Hello World')
    expect(arrayBuffer).toBeInstanceOf(ArrayBuffer)
  })
})

describe('FetchHttpClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as any).fetch = mockFetch
  })

  afterEach(() => {
    delete (globalThis as any).fetch
  })

  it('should make successful request using fetch', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: vi.fn().mockResolvedValue('{"success": true}'),
      json: vi.fn().mockResolvedValue({ success: true }),
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    }

    mockFetch.mockResolvedValue(mockResponse)

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://example.com/api',
      headers: { Authorization: 'Bearer token' },
    }

    const response = await FetchHttpClient.request(options)

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/api', {
      method: 'GET',
      headers: { Authorization: 'Bearer token' },
      body: undefined,
    })

    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(await response.text()).toBe('{"success": true}')
    expect(await response.json()).toEqual({ success: true })
  })

  it('should handle fetch errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network Error'))

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://example.com/api',
    }

    await expect(FetchHttpClient.request(options)).rejects.toThrow(
      'Network Error'
    )
  })
})

describe('BrowserExtensionHttpClient', () => {
  let mockXHR: MockXMLHttpRequest

  beforeEach(() => {
    vi.clearAllMocks()
    mockXHR = new MockXMLHttpRequest()
    ;(globalThis as any).XMLHttpRequest = vi.fn(() => mockXHR)
  })

  afterEach(() => {
    delete (globalThis as any).XMLHttpRequest
  })

  it('should fallback to BrowserHttpClient', async () => {
    mockXHR.setResponse(200, 'OK', '{"success": true}')

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://example.com/api',
    }

    const response = await BrowserExtensionHttpClient.request(options)

    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('{"success": true}')
  })
})

describe('HttpClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset all global objects
    delete (globalThis as any).GM
    delete (globalThis as any).XMLHttpRequest
    delete (globalThis as any).fetch
    // Clear cache before each test
    EnvironmentDetector.clearMessageProxyCache()
  })

  it('should use UserscriptHttpClient in userscript environment', async () => {
    ;(globalThis as any).GM = mockGM

    const mockResponse = {
      status: 200,
      statusText: 'OK',
      responseText: '{"success": true}',
      responseHeaders: '',
    }

    mockGM.xmlHttpRequest.mockImplementation((options: any) => {
      setTimeout(() => {
        options.onload(mockResponse)
      }, 0)
    })

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://example.com/api',
    }

    const response = await HttpClient.request(options)

    expect(mockGM.xmlHttpRequest).toHaveBeenCalled()
    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)
  })

  it('should use BrowserHttpClient in browser environment', async () => {
    const mockXHR = new MockXMLHttpRequest()
    ;(globalThis as any).XMLHttpRequest = vi.fn(() => mockXHR)
    mockXHR.setResponse(200, 'OK', '{"success": true}')

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://example.com/api',
    }

    const response = await HttpClient.request(options)

    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)
  })

  it('should throw error in unsupported environment', async () => {
    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://example.com/api',
    }

    await expect(HttpClient.request(options)).rejects.toThrow(
      'Unsupported environment for HTTP requests'
    )
  })

  it('should prioritize userscript environment over browser environment', async () => {
    // Set up both environments
    ;(globalThis as any).GM = mockGM
    ;(globalThis as any).XMLHttpRequest = vi.fn(() => new MockXMLHttpRequest())

    const mockResponse = {
      status: 200,
      statusText: 'OK',
      responseText: '{"success": true}',
      responseHeaders: '',
    }

    mockGM.xmlHttpRequest.mockImplementation((options: any) => {
      setTimeout(() => {
        options.onload(mockResponse)
      }, 0)
    })

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://example.com/api',
    }

    const response = await HttpClient.request(options)

    // Should use GM.xmlHttpRequest, not XMLHttpRequest
    expect(mockGM.xmlHttpRequest).toHaveBeenCalled()
    expect(response.ok).toBe(true)
  })

  it('should use message proxy when available', async () => {
    // Mock message proxy availability
    const mockMessageProxyClient = {
      request: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: vi.fn().mockResolvedValue('{"proxy": true}'),
        json: vi.fn().mockResolvedValue({ proxy: true }),
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      }),
    }

    // Mock the dynamic import
    vi.doMock('./message-proxy-http-client.js', () => ({
      messageProxyHttpClient: mockMessageProxyClient,
    }))

    // Mock EnvironmentDetector.isMessageProxyAvailable to return true
    const originalIsMessageProxyAvailable =
      EnvironmentDetector.isMessageProxyAvailable
    EnvironmentDetector.isMessageProxyAvailable = vi
      .fn()
      .mockResolvedValue(true)

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://api.example.com/data',
      headers: { Authorization: 'Bearer token' },
    }

    const response = await HttpClient.request(options)

    // Should use message proxy client
    expect(mockMessageProxyClient.request).toHaveBeenCalledWith(options)
    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)

    // Restore original method
    EnvironmentDetector.isMessageProxyAvailable =
      originalIsMessageProxyAvailable
    vi.doUnmock('./message-proxy-http-client.js')
  })

  it('should fallback to direct request when message proxy fails', async () => {
    // Mock EnvironmentDetector.isMessageProxyAvailable to throw error
    const originalIsMessageProxyAvailable =
      EnvironmentDetector.isMessageProxyAvailable
    EnvironmentDetector.isMessageProxyAvailable = vi
      .fn()
      .mockRejectedValue(new Error('Message proxy not available'))

    // Set up browser environment as fallback
    const mockXHR = new MockXMLHttpRequest()
    ;(globalThis as any).XMLHttpRequest = vi.fn(() => mockXHR)
    mockXHR.setResponse(200, 'OK', '{"fallback": true}')

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://api.example.com/data',
    }

    const response = await HttpClient.request(options)

    // Should fallback to browser client
    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('{"fallback": true}')

    // Restore original method
    EnvironmentDetector.isMessageProxyAvailable =
      originalIsMessageProxyAvailable
  })

  it('should fallback to direct request when message proxy is not available', async () => {
    // Mock EnvironmentDetector.isMessageProxyAvailable to return false
    const originalIsMessageProxyAvailable =
      EnvironmentDetector.isMessageProxyAvailable
    EnvironmentDetector.isMessageProxyAvailable = vi
      .fn()
      .mockResolvedValue(false)

    // Set up userscript environment as fallback
    ;(globalThis as any).GM = mockGM
    const mockResponse = {
      status: 200,
      statusText: 'OK',
      responseText: '{"direct": true}',
      responseHeaders: 'content-type: application/json',
    }

    mockGM.xmlHttpRequest.mockImplementation((options: any) => {
      setTimeout(() => {
        options.onload(mockResponse)
      }, 0)
    })

    const options: HttpRequestOptions = {
      method: 'GET',
      url: 'https://api.example.com/data',
    }

    const response = await HttpClient.request(options)

    // Should use direct userscript client
    expect(mockGM.xmlHttpRequest).toHaveBeenCalled()
    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)

    // Restore original method
    EnvironmentDetector.isMessageProxyAvailable =
      originalIsMessageProxyAvailable
  })

  it('should cache message proxy availability check', async () => {
    const mockIsAvailable = vi.fn().mockResolvedValue(true)
    const mockMessageProxyClient = {
      request: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue('cached response'),
        json: vi.fn().mockResolvedValue({ cached: true }),
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      }),
    }

    // Mock the dynamic import to return our mock
    vi.doMock('./message-proxy-http-client.js', () => ({
      MessageProxyEnvironmentDetector: {
        isMessageProxyAvailable: mockIsAvailable,
      },
      messageProxyHttpClient: mockMessageProxyClient,
    }))

    // Clear cache to ensure clean state
    EnvironmentDetector.clearMessageProxyCache()

    // First request should call isMessageProxyAvailable
    await HttpClient.request({
      method: 'GET',
      url: 'https://example.com/first',
    })
    expect(mockIsAvailable).toHaveBeenCalledTimes(1)

    // Second request should use cached result
    await HttpClient.request({
      method: 'GET',
      url: 'https://example.com/second',
    })
    expect(mockIsAvailable).toHaveBeenCalledTimes(1) // Still only called once

    // Both requests should use message proxy
    expect(mockMessageProxyClient.request).toHaveBeenCalledTimes(2)

    vi.doUnmock('./message-proxy-http-client.js')
  })

  it('should clear cache when clearMessageProxyCache is called', async () => {
    const mockIsAvailable = vi.fn().mockResolvedValue(true)
    const mockMessageProxyClient = {
      request: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue('response'),
        json: vi.fn().mockResolvedValue({}),
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      }),
    }

    // Mock the dynamic import
    vi.doMock('./message-proxy-http-client.js', () => ({
      MessageProxyEnvironmentDetector: {
        isMessageProxyAvailable: mockIsAvailable,
      },
      messageProxyHttpClient: mockMessageProxyClient,
    }))

    // Clear cache to ensure clean state
    EnvironmentDetector.clearMessageProxyCache()

    // First request
    await HttpClient.request({
      method: 'GET',
      url: 'https://example.com/first',
    })
    expect(mockIsAvailable).toHaveBeenCalledTimes(1)

    // Clear cache
    EnvironmentDetector.clearMessageProxyCache()

    // Second request should call isMessageProxyAvailable again
    await HttpClient.request({
      method: 'GET',
      url: 'https://example.com/second',
    })
    expect(mockIsAvailable).toHaveBeenCalledTimes(2)

    vi.doUnmock('./message-proxy-http-client.js')
  })
})

describe('HttpResponse interface compatibility', () => {
  it('should provide consistent interface across all clients', async () => {
    const testCases = [
      {
        name: 'UserscriptHttpClient',
        setup() {
          ;(globalThis as any).GM = mockGM
          const mockResponse = {
            status: 200,
            statusText: 'OK',
            responseText: '{"test": true}',
            responseHeaders: 'content-type: application/json',
          }
          mockGM.xmlHttpRequest.mockImplementation((options: any) => {
            setTimeout(() => options.onload(mockResponse), 0)
          })
          return UserscriptHttpClient
        },
      },
      {
        name: 'BrowserHttpClient',
        setup() {
          const mockXHR = new MockXMLHttpRequest()
          ;(globalThis as any).XMLHttpRequest = vi.fn(() => mockXHR)
          mockXHR.setResponse(200, 'OK', '{"test": true}')
          return BrowserHttpClient
        },
      },
      {
        name: 'FetchHttpClient',
        setup() {
          const mockResponse = {
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            text: vi.fn().mockResolvedValue('{"test": true}'),
            json: vi.fn().mockResolvedValue({ test: true }),
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
          }
          ;(globalThis as any).fetch = vi.fn().mockResolvedValue(mockResponse)
          return FetchHttpClient
        },
      },
      {
        name: 'MessageProxyHttpClient',
        setup() {
          const mockMessageProxyClient = {
            request: vi.fn().mockResolvedValue({
              ok: true,
              status: 200,
              statusText: 'OK',
              headers: new Headers({ 'content-type': 'application/json' }),
              text: vi.fn().mockResolvedValue('{"test": true}'),
              json: vi.fn().mockResolvedValue({ test: true }),
              arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
            }),
          }
          return mockMessageProxyClient
        },
      },
    ]

    for (const testCase of testCases) {
      vi.clearAllMocks()
      delete (globalThis as any).GM
      delete (globalThis as any).XMLHttpRequest
      delete (globalThis as any).fetch

      const client = testCase.setup()
      const options: HttpRequestOptions = {
        method: 'GET',
        url: 'https://example.com/api',
      }

      // eslint-disable-next-line no-await-in-loop
      const response = await client.request(options)

      // Test interface consistency
      expect(typeof response.ok).toBe('boolean')
      expect(typeof response.status).toBe('number')
      expect(typeof response.statusText).toBe('string')
      expect(response.headers).toBeInstanceOf(Headers)
      expect(typeof response.text).toBe('function')
      expect(typeof response.json).toBe('function')
      expect(typeof response.arrayBuffer).toBe('function')

      // Test method returns
      // eslint-disable-next-line no-await-in-loop
      expect(typeof (await response.text())).toBe('string')
      // eslint-disable-next-line no-await-in-loop
      expect(await response.text()).toEqual('{"test": true}')
      // eslint-disable-next-line no-await-in-loop
      expect(await response.arrayBuffer()).toBeInstanceOf(ArrayBuffer)
    }
  })
})
