/**
 * Event listener management utility for memory leak prevention
 * Tracks all event listeners and provides cleanup functionality
 */
export class EventListenerManager {
  private readonly listeners: Array<{
    target: EventTarget
    type: string
    listener: EventListener
    options?: boolean | AddEventListenerOptions
  }>

  constructor() {
    this.listeners = []
  }

  /**
   * Add event listener with tracking for cleanup
   * @param target - The event target to attach listener to
   * @param type - The event type
   * @param listener - The event listener function
   * @param options - Optional event listener options
   */
  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(type, listener, options)
    this.listeners.push({ target, type, listener, options })
  }

  /**
   * Remove all tracked event listeners
   * Safely removes all event listeners that were added through this manager
   */
  removeAllEventListeners(): void {
    for (const { target, type, listener, options } of this.listeners) {
      try {
        target.removeEventListener(type, listener, options)
      } catch (error) {
        console.warn('Failed to remove event listener:', error)
      }
    }

    this.listeners.length = 0
  }

  /**
   * Get count of tracked listeners for debugging
   * @returns The number of currently tracked event listeners
   */
  getListenerCount(): number {
    return this.listeners.length
  }

  /**
   * Remove a specific event listener
   * @param target - The event target
   * @param type - The event type
   * @param listener - The event listener function
   * @param options - Optional event listener options
   */
  removeEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    const index = this.listeners.findIndex(
      (item) =>
        item.target === target &&
        item.type === type &&
        item.listener === listener
    )

    if (index !== -1) {
      try {
        target.removeEventListener(type, listener, options)
        this.listeners.splice(index, 1)
      } catch (error) {
        console.warn('Failed to remove specific event listener:', error)
      }
    }
  }
}
