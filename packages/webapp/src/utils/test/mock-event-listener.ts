import { vi } from 'vitest'

export function mockEventListener(
  callback?: (event: string, handler: (event: MessageEvent) => void) => void
) {
  const messageHandlerMap = new Map<
    string,
    ((event: MessageEvent) => void) | undefined
  >()

  const addEventListener: ReturnType<typeof vi.fn> = vi.fn(
    (event: string, handler: (event: MessageEvent) => void) => {
      messageHandlerMap.set(event, handler)
      if (callback) {
        callback(event, handler)
      }
    }
  )
  const removeEventListener: ReturnType<typeof vi.fn> = vi.fn(
    (event: string, handler) => {
      if (messageHandlerMap.has(event)) {
        messageHandlerMap.delete(event)
      }
    }
  )

  return {
    addEventListener,
    removeEventListener,
  }
}
