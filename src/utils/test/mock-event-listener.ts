import { vi } from "vitest"

/**
 * Creates mock event listener functions with a callback to track handlers.
 * @param onAddListener - Callback function to handle event listener registration
 * @returns Object containing mock addEventListener and removeEventListener functions
 */
export function mockEventListener(
  onAddListener: (event: string, handler: any) => void
) {
  const eventHandlers = new Map<string, Set<any>>()

  const addEventListener = vi.fn((event: string, handler: any) => {
    if (!eventHandlers.has(event)) {
      eventHandlers.set(event, new Set())
    }

    eventHandlers.get(event)?.add(handler)
    onAddListener(event, handler)
  })

  const removeEventListener = vi.fn((event: string, handler: any) => {
    eventHandlers.get(event)?.delete(handler)
  })

  return {
    addEventListener,
    removeEventListener,
    eventHandlers,
  }
}
