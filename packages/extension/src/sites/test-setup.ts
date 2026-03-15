import { vi } from 'vitest'

if (!globalThis.requestIdleCallback) {
  globalThis.requestIdleCallback = vi.fn((cb) => {
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => 50,
      })
    }, 0)
  }) as any
  globalThis.cancelIdleCallback = vi.fn((id: number) => {
    clearTimeout(id)
  }) as any
}
