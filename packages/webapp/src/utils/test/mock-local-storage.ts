import { vi } from 'vitest'

export function mockLocalStorage() {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value.toString()
      }),
      removeItem: vi.fn((key: string) => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete store[key]
      }),
      clear: vi.fn(() => {
        store = {}
      }),
    }
  })()
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
  })
  // vi.stubGlobal('localStorage', localStorageMock)

  return localStorageMock
}
