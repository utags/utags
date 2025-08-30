// src/lib/event-emitter.ts
export type EventListener<T = any> = (payload: T) => void

export class EventEmitter<Events extends Record<string, any>> {
  private readonly listeners = new Map<keyof Events, EventListener[]>()

  on<K extends keyof Events>(
    event: K,
    listener: EventListener<Events[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }

    this.listeners.get(event)!.push(listener)
    return () => {
      this.off(event, listener)
    } // Return an unsubscribe function
  }

  off<K extends keyof Events>(
    event: K,
    listener: EventListener<Events[K]>
  ): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      this.listeners.set(
        event,
        eventListeners.filter((l) => l !== listener)
      )
    }
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      for (const listener of eventListeners) listener(payload)
    }
  }

  removeAllListeners<K extends keyof Events>(event?: K): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }
}
