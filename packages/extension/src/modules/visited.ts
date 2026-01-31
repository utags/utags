import { getSettingsValue } from 'browser-extension-settings'
import { addEventListener, doc } from 'browser-extension-utils'

const TAG_VISITED_KEY = 'utags_visited'
const host = location.host
let useVisitedFunction = false
let displayMark = false
let isAvailable = false
let cache: Record<string, number> = {}
let dataUpdated = false
let visitedValueChangeListener: () => void | undefined
let eventListenerInited = false

/**
 * Clears the visited links cache to free memory
 * Should be called when the extension is being unloaded or reset
 */
export function clearVisitedCache(): void {
  cache = {}
}

export function isAvailableOnCurrentSite() {
  return isAvailable
}

export function setVisitedAvailable(value: boolean) {
  isAvailable = value
}

export function onSettingsChange() {
  useVisitedFunction = getSettingsValue(`useVisitedFunction_${host}`)
  displayMark =
    getSettingsValue(`displayEffectOfTheVisitedContent_${host}`) !== '0'

  if (!useVisitedFunction || eventListenerInited) {
    return
  }

  eventListenerInited = true

  addEventListener(globalThis, 'storage', (event: StorageEvent) => {
    if (event.key === TAG_VISITED_KEY) {
      dataUpdated = true
      if (doc.hidden) {
        return
      }

      valueChangeHandler()
    }
  })

  addEventListener(doc, 'visibilitychange', async () => {
    console.log(
      '[visited] visibilitychange: hidden -',
      doc.hidden,
      'dataUpdated -',
      dataUpdated
    )

    if (!doc.hidden && dataUpdated) {
      valueChangeHandler()
    }
  })
}

function getVisitedLinks(): string[] {
  if (!useVisitedFunction) {
    return []
  }

  return (
    (JSON.parse(localStorage.getItem(TAG_VISITED_KEY) || '[]') as string[]) ||
    []
  )
}

function saveVisitedLinks(newVisitedLinks: string[]) {
  if (useVisitedFunction) {
    localStorage.setItem(TAG_VISITED_KEY, JSON.stringify(newVisitedLinks))
    dataUpdated = true
    valueChangeHandler()
  }
}

function convertKey(url: string) {
  if (url.startsWith('http')) {
    return url.replace(/^https?:\/\/[^/]+\//, '')
  }

  return url
}

export const TAG_VISITED = ':visited'

export function addVisited(key: string) {
  // Only add it once each time the page is loaded.
  if (key && !cache[key]) {
    cache[key] = 1
  } else {
    return
  }

  key = convertKey(key)
  const visitedLinks = getVisitedLinks()
  if (!visitedLinks.includes(key)) {
    visitedLinks.push(key)
    saveVisitedLinks(visitedLinks)
  }
}

export function removeVisited(key: string) {
  key = convertKey(key)
  const visitedLinks = getVisitedLinks()
  if (visitedLinks.includes(key)) {
    const newVisitedLinks = visitedLinks.filter(
      (value: string) => value !== key
    )
    saveVisitedLinks(newVisitedLinks)
  }
}

export function isVisited(key: string) {
  if (!displayMark) {
    return false
  }

  key = convertKey(key)
  const visitedLinks = getVisitedLinks()
  return visitedLinks.includes(key)
}

export function markElementWhetherVisited(key: string, element: HTMLElement) {
  if (isVisited(key)) {
    element.dataset.utags_visited = '1'
  } else if (element.dataset.utags_visited === '1') {
    delete element.dataset.utags_visited
  }
}

export function addVisitedValueChangeListener(func: () => void) {
  visitedValueChangeListener = func
}

const valueChangeHandler = () => {
  dataUpdated = false
  if (typeof visitedValueChangeListener === 'function') {
    requestAnimationFrame(() => {
      visitedValueChangeListener()
    })
  }
}
