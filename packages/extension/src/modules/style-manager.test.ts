import { getSettingsValue } from 'browser-extension-settings'
import { addElement, doc } from 'browser-extension-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCurrentSiteStyle } from '../sites'
import {
  ensureCombinedStyleForDocument,
  ensureCombinedStyleForShadow,
  getCombinedStyleText,
  rebuildAndApplyCombinedStyle,
} from './style-manager'

// Mock dependencies
vi.mock('browser-extension-settings', () => ({
  getSettingsValue: vi.fn(),
}))

vi.mock('browser-extension-utils', () => ({
  addElement: vi.fn(),
  doc: {
    head: {
      querySelector: vi.fn(),
      appendChild: vi.fn(),
    },
    documentElement: {
      dataset: {},
    },
    querySelector: vi.fn(),
    getElementById: vi.fn(),
  },
}))

vi.mock('../sites', () => ({
  getCurrentSiteStyle: vi.fn(),
}))

describe('style-manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getSettingsValue as any).mockReturnValue('')
    ;(getCurrentSiteStyle as any).mockReturnValue('')
  })

  it('should use adoptedStyleSheets if supported', () => {
    const mockCSSStyleSheet = {
      replaceSync: vi.fn(),
    }
    // eslint-disable-next-line prefer-arrow-callback
    globalThis.CSSStyleSheet = vi.fn(function () {
      return mockCSSStyleSheet
    }) as any

    const mockShadowRoot = {
      adoptedStyleSheets: [],
      getElementById: vi.fn().mockReturnValue(null),
    } as any as ShadowRoot

    // Ensure cssText is different from initial value to trigger replaceSync
    // By default getCombinedStyleText returns empty string or cached value
    // We need to make sure buildCombinedStyle returns something non-empty
    // or we manually call ensureStyleInRoot logic indirectly via ensureCombinedStyleForShadow
    // But ensureCombinedStyleForShadow calls getCombinedStyleText which uses cache.
    // Let's force a cache update or just rely on initial state.
    // Initially sharedCSSStyleSheetText is '', if getCombinedStyleText() returns ''
    // then sharedCSSStyleSheetText !== cssText is false ('', '')
    // So replaceSync is NOT called.

    // Let's mock getCurrentSiteStyle to return something
    vi.mocked(getCurrentSiteStyle).mockReturnValue('some-style')
    ;(getSettingsValue as any).mockReturnValue(true)

    // Clear cache by rebuilding
    rebuildAndApplyCombinedStyle()

    // Now ensureCombinedStyleForShadow will use the non-empty style
    ensureCombinedStyleForShadow(mockShadowRoot)

    expect(globalThis.CSSStyleSheet).toHaveBeenCalled()
    // It might not be called if sharedCSSStyleSheetText matches cssText from rebuildAndApplyCombinedStyle
    // rebuildAndApplyCombinedStyle calls ensureStyleInRoot(doc, ...) which updates sharedCSSStyleSheetText
    // So when we call ensureCombinedStyleForShadow, text matches, replaceSync NOT called again.

    // Actually, rebuildAndApplyCombinedStyle calls ensureStyleInRoot(doc).
    // If doc supports adoptedStyleSheets (it's a mock), it updates sharedCSSStyleSheetText.
    // Our mock doc in test doesn't have adoptedStyleSheets property explicitly defined in beforeEach
    // but we didn't add it to doc mock.

    // Let's just reset the shared variables? We can't easily access module internals.
    // Instead, we can verify that replaceSync WAS called during rebuildAndApplyCombinedStyle OR ensureCombinedStyleForShadow
    // If doc doesn't support adoptedStyleSheets, then sharedCSSStyleSheet is NOT created there.
    // Our mock doc:
    // doc: { head: ..., documentElement: ..., querySelector..., getElementById... }
    // It does NOT have adoptedStyleSheets.

    // So sharedCSSStyleSheet is created inside ensureCombinedStyleForShadow(mockShadowRoot).
    // And cssText will be 'some-style'. sharedCSSStyleSheetText is ''.
    // So replaceSync SHOULD be called.

    expect(mockCSSStyleSheet.replaceSync).toHaveBeenCalledWith(
      expect.stringContaining('some-style')
    )
    expect(mockShadowRoot.adoptedStyleSheets).toContain(mockCSSStyleSheet)

    // Cleanup
    delete (globalThis as any).CSSStyleSheet
  })

  it('should remove legacy style element when using adoptedStyleSheets', () => {
    const mockCSSStyleSheet = {
      replaceSync: vi.fn(),
    }
    // eslint-disable-next-line prefer-arrow-callback
    globalThis.CSSStyleSheet = vi.fn(function () {
      return mockCSSStyleSheet
    }) as any

    const mockLegacyStyle = {
      remove: vi.fn(),
    }
    const mockShadowRoot = {
      adoptedStyleSheets: [],
      getElementById: vi.fn().mockReturnValue(mockLegacyStyle),
    } as any as ShadowRoot

    ensureCombinedStyleForShadow(mockShadowRoot)

    expect(mockLegacyStyle.remove).toHaveBeenCalled()

    // Cleanup
    delete (globalThis as any).CSSStyleSheet
  })

  it('should ensure style in document', () => {
    // Since doc is a mock object, instanceof Document is false.
    // So it behaves like ShadowRoot path in ensureStyleInRoot logic:
    // parent = root (doc)
    // existing = root.getElementById(...)

    ;(doc.getElementById as any).mockReturnValue(null)
    ensureCombinedStyleForDocument()
    // Expect parent to be doc (the mock object), not doc.head
    expect(addElement).toHaveBeenCalledWith(doc, 'style', expect.any(Object))
  })

  it('should update existing style only if content changed', () => {
    const mockStyle = { textContent: 'old' }
    // ensureStyleInRoot uses getElementById for non-Document root (our mock doc)
    ;(doc.getElementById as any).mockReturnValue(mockStyle)

    // Force siteEnabled to be true
    ;(getSettingsValue as any).mockReturnValue(true)

    // Force a specific style content
    vi.mocked(getCurrentSiteStyle).mockReturnValue('new-style')

    rebuildAndApplyCombinedStyle()

    // verify textContent is updated
    expect(mockStyle.textContent).toContain('new-style')

    // Call again with same content
    const currentText = mockStyle.textContent
    // We want to verify that setter is NOT called if content is same.
    // We can use a proxy or defineProperty to spy on setter.
    let setterCalled = false
    Object.defineProperty(mockStyle, 'textContent', {
      get: () => currentText,
      set(v) {
        setterCalled = true
      },
      configurable: true,
    })

    rebuildAndApplyCombinedStyle()
    expect(setterCalled).toBe(false)

    // Now change content and verify setter is called
    vi.mocked(getCurrentSiteStyle).mockReturnValue('newer-style')
    // Reset cache? rebuildAndApplyCombinedStyle rebuilds cache.

    rebuildAndApplyCombinedStyle()
    expect(setterCalled).toBe(true)
  })

  it('should ensure style in shadow root', () => {
    const mockShadowRoot = {
      querySelector: vi.fn().mockReturnValue(null),
      getElementById: vi.fn().mockReturnValue(null),
    } as any as ShadowRoot

    ensureCombinedStyleForShadow(mockShadowRoot)
    expect(addElement).toHaveBeenCalledWith(
      mockShadowRoot,
      'style',
      expect.any(Object)
    )
  })
})
