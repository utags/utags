/**
 * @vitest-environment jsdom
 */
import {
  describe,
  it,
  expect,
  vi,
  type Mock,
  beforeEach,
  afterEach,
} from 'vitest'
import { spaNavigateAttachment } from './spa-navigate-attachment.js'

// Mock global objects and functions
const mockPushState = vi.fn()
const mockWindowOpen = vi.fn()
const mockConsoleError = vi.fn()

type ClickHandler = (event: MouseEvent) => void

// Define a type for our mock location
type MockLocation = {
  href: string
  origin: string
  assign?: (url: string) => void // For fallback navigation spy
}
let mockLocation: MockLocation

/**
 * Helper function to create a mock HTMLAnchorElement.
 * @param {string | null | undefined} href - The href attribute for the anchor.
 * @returns {HTMLAnchorElement} A mock anchor element.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
const createMockAnchor = (href?: string | null): HTMLAnchorElement => {
  const anchor = document.createElement('a')
  if (href === null) {
    anchor.removeAttribute('href')
  } else if (href !== undefined) {
    anchor.setAttribute('href', href)
  }

  // Spy on addEventListener and removeEventListener to check if they are called correctly
  vi.spyOn(anchor, 'addEventListener')
  vi.spyOn(anchor, 'removeEventListener')
  return anchor
}

/**
 * Helper function to create a mock MouseEvent.
 * @param {number} button - The mouse button pressed.
 * @param {boolean} ctrlKey - Whether the Ctrl key was pressed.
 * @param {boolean} metaKey - Whether the Meta key was pressed.
 * @param {boolean} shiftKey - Whether the Shift key was pressed.
 * @param {boolean} altKey - Whether the Alt key was pressed.
 * @returns {MouseEvent} A mock MouseEvent.
 */
const createMockEvent = (
  button = 0,
  ctrlKey = false,
  metaKey = false,
  shiftKey = false,
  altKey = false
): MouseEvent => {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    button,
    ctrlKey,
    metaKey,
    shiftKey,
    altKey,
  })
  // Spy on preventDefault to check if it's called
  vi.spyOn(event, 'preventDefault')
  return event
}

describe('spaNavigateAttachment', () => {
  beforeEach(() => {
    // Reset mocks and setup global environment for each test
    mockLocation = {
      href: 'http://localhost:3000/current-page',
      origin: 'http://localhost:3000',
      assign: vi.fn(), // Mock for location.assign for fallback
    }

    // Stub global objects. Vitest's `vi.stubGlobal` is preferred.
    vi.stubGlobal('location', mockLocation)
    // `window.location` should also point to `mockLocation`
    // `history` and `window.open` are part of `window`
    vi.stubGlobal('window', {
      location: mockLocation,
      history: { pushState: mockPushState },
      open: mockWindowOpen,
      // Mock document.createElement if not in a JSDOM environment (Vitest usually provides JSDOM)
      document: globalThis.document, // Use JSDOM's document
      URL: globalThis.URL, // Use JSDOM's URL
    })
    vi.stubGlobal('history', { pushState: mockPushState }) // Also stub global history
    vi.stubGlobal('console', { error: mockConsoleError })
  })

  afterEach(() => {
    // Restore all stubbed globals and clear mocks
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('should add a click event listener to the element', () => {
    const anchor = createMockAnchor('/')
    spaNavigateAttachment(anchor)
    // Check that addEventListener was called with 'click' and a function
    expect(anchor.addEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function)
    )
  })

  it('should return a cleanup function that removes the event listener', () => {
    const anchor = createMockAnchor('/')
    const cleanup = spaNavigateAttachment(anchor)
    // Get the actual listener function passed to addEventListener
    const addedListener = (anchor.addEventListener as Mock).mock
      .calls[0][1] as ClickHandler
    cleanup()
    // Check that removeEventListener was called with the same listener
    expect(anchor.removeEventListener).toHaveBeenCalledWith(
      'click',
      addedListener
    )
  })

  it('should do nothing if href attribute is missing', () => {
    const anchor = createMockAnchor(null) // href is null
    const event = createMockEvent()
    spaNavigateAttachment(anchor)
    const handleClick = (anchor.addEventListener as Mock).mock
      .calls[0][1] as ClickHandler
    handleClick(event)

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(mockPushState).not.toHaveBeenCalled()
    expect(mockWindowOpen).not.toHaveBeenCalled()
  })

  describe('modified clicks', () => {
    // Test cases for various modified clicks (Ctrl, Meta, Shift, Alt, non-left button)
    const testCases = [
      { name: 'Ctrl+Click', eventParams: { ctrlKey: true } },
      { name: 'Meta+Click (Cmd+Click)', eventParams: { metaKey: true } },
      { name: 'Shift+Click', eventParams: { shiftKey: true } },
      { name: 'Alt+Click', eventParams: { altKey: true } },
      { name: 'Middle mouse button click', eventParams: { button: 1 } },
      { name: 'Right mouse button click', eventParams: { button: 2 } },
    ]

    for (const { name, eventParams } of testCases) {
      it(`should not handle ${name} and allow default browser behavior`, () => {
        const anchor = createMockAnchor('/internal-link')
        const event = createMockEvent(
          eventParams.button,
          eventParams.ctrlKey,
          eventParams.metaKey,
          eventParams.shiftKey,
          eventParams.altKey
        )
        spaNavigateAttachment(anchor)
        const handleClick = (anchor.addEventListener as Mock).mock
          .calls[0][1] as ClickHandler
        handleClick(event)

        expect(event.preventDefault).not.toHaveBeenCalled()
        expect(mockPushState).not.toHaveBeenCalled()
        expect(mockWindowOpen).not.toHaveBeenCalled()
      })
    }
  })

  describe('internal navigation (same origin)', () => {
    it('should call history.pushState for a different internal URL', () => {
      const targetHref = '/new-internal-page'
      const anchor = createMockAnchor(targetHref)
      const event = createMockEvent()
      spaNavigateAttachment(anchor)
      const handleClick = (anchor.addEventListener as Mock).mock
        .calls[0][1] as ClickHandler
      handleClick(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockPushState).toHaveBeenCalledWith(
        {},
        '',
        `${mockLocation.origin}${targetHref}`
      )
      expect(mockWindowOpen).not.toHaveBeenCalled()
    })

    it('should resolve relative URLs correctly when current location ends with /', () => {
      mockLocation.href = 'http://localhost:3000/current-page/sub/' // Set current location
      const targetHref = 'another-page' // Relative to /current-page/sub/
      const anchor = createMockAnchor(targetHref)
      const event = createMockEvent()
      spaNavigateAttachment(anchor)
      const handleClick = (anchor.addEventListener as Mock).mock
        .calls[0][1] as ClickHandler
      handleClick(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockPushState).toHaveBeenCalledWith(
        {},
        '',
        `${mockLocation.origin}/current-page/sub/${targetHref}` // Appends to the path
      )
    })

    it('should resolve relative URLs correctly when current location does not end with /', () => {
      mockLocation.href = 'http://localhost:3000/current-page/sub/file.html' // Set current location
      const targetHref = 'another-file.html' // Relative, replaces 'file.html'
      const anchor = createMockAnchor(targetHref)
      const event = createMockEvent()
      spaNavigateAttachment(anchor)
      const handleClick = (anchor.addEventListener as Mock).mock
        .calls[0][1] as ClickHandler
      handleClick(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockPushState).toHaveBeenCalledWith(
        {},
        '',
        `${mockLocation.origin}/current-page/sub/${targetHref}` // Replaces the last segment of the path
      )
    })

    it('should handle targetHref starting with ? when current URL does not end with /', () => {
      mockLocation.href = 'http://localhost:3000/current-page'
      const targetHref = '?query=new&val=1'
      const anchor = createMockAnchor(targetHref)
      const event = createMockEvent()
      spaNavigateAttachment(anchor)
      const handleClick = (anchor.addEventListener as Mock).mock
        .calls[0][1] as ClickHandler
      handleClick(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockPushState).toHaveBeenCalledWith(
        {},
        '',
        `${mockLocation.origin}/current-page${targetHref}`
      )
    })

    it('should handle targetHref starting with ? when current URL ends with /', () => {
      mockLocation.href = 'http://localhost:3000/current-page/sub/'
      const targetHref = '?filter=active'
      const anchor = createMockAnchor(targetHref)
      const event = createMockEvent()
      spaNavigateAttachment(anchor)
      const handleClick = (anchor.addEventListener as Mock).mock
        .calls[0][1] as ClickHandler
      handleClick(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockPushState).toHaveBeenCalledWith(
        {},
        '',
        `${mockLocation.origin}/current-page/sub/${targetHref}`
      )
    })

    it('should handle targetHref starting with / (absolute path) when current URL does not end with /', () => {
      mockLocation.href = 'http://localhost:3000/current-page/sub'
      const targetHref = '/new-root-path'
      const anchor = createMockAnchor(targetHref)
      const event = createMockEvent()
      spaNavigateAttachment(anchor)
      const handleClick = (anchor.addEventListener as Mock).mock
        .calls[0][1] as ClickHandler
      handleClick(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockPushState).toHaveBeenCalledWith(
        {},
        '',
        `${mockLocation.origin}${targetHref}`
      )
    })

    it('should handle targetHref starting with / (absolute path) when current URL ends with /', () => {
      mockLocation.href = 'http://localhost:3000/current-page/sub/'
      const targetHref = '/another-root-path?id=123'
      const anchor = createMockAnchor(targetHref)
      const event = createMockEvent()
      spaNavigateAttachment(anchor)
      const handleClick = (anchor.addEventListener as Mock).mock
        .calls[0][1] as ClickHandler
      handleClick(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockPushState).toHaveBeenCalledWith(
        {},
        '',
        `${mockLocation.origin}${targetHref}`
      )
    })

    it('should not call history.pushState if the target URL is the same as current location', () => {
      const targetHref = '/current-page'
      mockLocation.href = `${mockLocation.origin}${targetHref}` // Current location is already the target
      const anchor = createMockAnchor(targetHref)
      const event = createMockEvent()
      spaNavigateAttachment(anchor)
      const handleClick = (anchor.addEventListener as Mock).mock
        .calls[0][1] as ClickHandler
      handleClick(event)

      expect(event.preventDefault).toHaveBeenCalled() // Still prevents default
      expect(mockPushState).not.toHaveBeenCalled()
      expect(mockWindowOpen).not.toHaveBeenCalled()
    })

    it('should handle URLs with query parameters and hashes correctly', () => {
      const targetHref = '/search?query=test#results'
      const anchor = createMockAnchor(targetHref)
      const event = createMockEvent()
      spaNavigateAttachment(anchor)
      const handleClick = (anchor.addEventListener as Mock).mock
        .calls[0][1] as ClickHandler
      handleClick(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockPushState).toHaveBeenCalledWith(
        {},
        '',
        `${mockLocation.origin}${targetHref}`
      )
    })
  })

  describe('external navigation (different origin)', () => {
    it('should call window.open for an external URL', () => {
      const targetHref = 'http://external.com/page'
      const anchor = createMockAnchor(targetHref)
      const event = createMockEvent()
      spaNavigateAttachment(anchor)
      const handleClick = (anchor.addEventListener as Mock).mock
        .calls[0][1] as ClickHandler
      handleClick(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockWindowOpen).toHaveBeenCalledWith(
        targetHref,
        '_blank',
        'noopener noreferrer'
      )
      expect(mockPushState).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should fallback to standard navigation and log error if URL parsing fails', () => {
      const originalURL = globalThis.URL
      // Mock globalThis.URL to throw an error to simulate parsing failure
      // @ts-expect-error - Mocking URL constructor
      globalThis.URL = vi.fn(() => {
        throw new Error('Test URL parsing error')
      })

      const hrefAttribute = '/some-path'
      const anchor = createMockAnchor(hrefAttribute)
      const event = createMockEvent()

      spaNavigateAttachment(anchor)
      const handleClick = (anchor.addEventListener as Mock).mock
        .calls[0][1] as ClickHandler
      handleClick(event)

      expect(event.preventDefault).toHaveBeenCalled() // preventDefault is called before try-catch
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error during client-side navigation:',
        expect.any(Error)
      )
      // Check if fallback navigation occurred by checking if location.href was set
      expect(mockLocation.href).toBe(hrefAttribute)
      expect(mockPushState).not.toHaveBeenCalled()
      expect(mockWindowOpen).not.toHaveBeenCalled()

      globalThis.URL = originalURL // Restore original URL constructor
    })
  })
})
