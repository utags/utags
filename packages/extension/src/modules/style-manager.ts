import { getSettingsValue } from 'browser-extension-settings'
import { addElement, doc } from 'browser-extension-utils'
import baseStyleText from 'data-text:../content.scss'

import { getCurrentSiteStyle } from '../sites'

const STYLE_ID = 'utags_combined_style'

let combinedStyleCache = ''
const registeredShadowRoots = new Set<ShadowRoot>()

// Shared CSSStyleSheet instance for browsers that support adoptedStyleSheets
let sharedCSSStyleSheet: CSSStyleSheet | undefined
let sharedCSSStyleSheetText = ''

function getCustomStyles(): string {
  const host = location.host
  let styles = ''

  const customEnabled = getSettingsValue<boolean>('customStyle')
  const customValue = getSettingsValue<string>('customStyleValue') || ''
  if (customEnabled && customValue) {
    styles += '\n' + customValue
  }

  const siteCustomEnabled = getSettingsValue<boolean>(`customStyle_${host}`)
  const siteCustomValue =
    getSettingsValue<string>(`customStyleValue_${host}`) || ''
  if (siteCustomEnabled && siteCustomValue) {
    styles += '\n' + siteCustomValue
  }

  return styles
}

export function buildCombinedStyle(): string {
  const host = location.host
  const siteEnabled = getSettingsValue<boolean>(`enableCurrentSite_${host}`)
  const siteStyle = siteEnabled ? getCurrentSiteStyle() || '' : ''
  const customStyles = siteEnabled ? getCustomStyles() : ''

  return [baseStyleText, siteStyle, customStyles].filter(Boolean).join('\n')
}

function ensureStyleInRoot(root: Document | ShadowRoot, cssText: string) {
  const rootWithAdopted = root as any
  if (
    rootWithAdopted.adoptedStyleSheets &&
    typeof rootWithAdopted.adoptedStyleSheets.includes === 'function'
  ) {
    if (!sharedCSSStyleSheet) {
      sharedCSSStyleSheet = new CSSStyleSheet()
    }

    if (sharedCSSStyleSheetText !== cssText) {
      sharedCSSStyleSheet.replaceSync(cssText)
      sharedCSSStyleSheetText = cssText
    }

    if (!rootWithAdopted.adoptedStyleSheets.includes(sharedCSSStyleSheet)) {
      rootWithAdopted.adoptedStyleSheets = [
        ...rootWithAdopted.adoptedStyleSheets,
        sharedCSSStyleSheet,
      ]
    }

    // Clean up legacy style element if it exists
    // eslint-disable-next-line @typescript-eslint/no-restricted-types
    const existing: HTMLElement | null | undefined =
      root instanceof Document
        ? root.getElementById(STYLE_ID)
        : // eslint-disable-next-line @typescript-eslint/no-restricted-types
          (root.getElementById?.(STYLE_ID) as HTMLElement | null | undefined)
    if (existing) {
      existing.remove()
    }

    return
  }

  const parent: HTMLElement =
    root instanceof Document
      ? (root.head as HTMLElement) || root.documentElement
      : (root as unknown as HTMLElement)

  // eslint-disable-next-line @typescript-eslint/no-restricted-types
  const existing: HTMLElement | null | undefined =
    root instanceof Document
      ? root.getElementById(STYLE_ID)
      : // eslint-disable-next-line @typescript-eslint/no-restricted-types
        (root.getElementById?.(STYLE_ID) as HTMLElement | null | undefined)

  // console.log('ensureStyleInRoot', { root, existing, cssText })

  if (existing) {
    if (existing.textContent !== cssText) {
      existing.textContent = cssText
    }

    return
  }

  addElement(parent, 'style', {
    id: STYLE_ID,
    textContent: cssText,
  })
}

export function ensureCombinedStyleForDocument() {
  ensureStyleInRoot(doc, getCombinedStyleText())
}

export function ensureCombinedStyleForShadow(root: ShadowRoot) {
  registeredShadowRoots.add(root)
  ensureStyleInRoot(root, getCombinedStyleText())
}

export function rebuildAndApplyCombinedStyle() {
  combinedStyleCache = buildCombinedStyle()
  ensureStyleInRoot(doc, combinedStyleCache)

  for (const root of registeredShadowRoots) {
    if (root) {
      ensureStyleInRoot(root, combinedStyleCache)
    }
  }
}

export function getCombinedStyleText(): string {
  if (!combinedStyleCache) {
    combinedStyleCache = buildCombinedStyle()
  }

  return combinedStyleCache
}
