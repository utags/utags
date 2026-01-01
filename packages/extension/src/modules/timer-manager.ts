/**
 * Timer Manager Module
 *
 * This module provides a centralized way to manage timers (setTimeout and setInterval)
 * to prevent memory leaks by ensuring all timers are properly cleared when the page unloads.
 */

// Store timeout and interval IDs to ensure they can be cleared when the page unloads
// Using NodeJS.Timeout type to handle both browser and Node.js environments
export type TimerId = number | NodeJS.Timeout
const timeoutIds = new Set<TimerId>()
const intervalIds = new Set<TimerId>()

/**
 * Creates a managed timeout that will be automatically cleared on page unload
 *
 * @param callback Function to execute after the timer expires
 * @param delay Time in milliseconds to wait before executing the callback
 * @param args Arguments to pass to the callback function
 * @returns The timeout ID that can be used with clearTimeout
 */

export function createTimeout<TArgs extends any[]>(
  callback: (...args: TArgs) => void,
  delay: number,
  ...args: TArgs
): TimerId {
  // Handle the case where no additional arguments are provided
  // In this case, we need to use a different approach to avoid type errors
  if (args.length === 0) {
    const timeoutId = setTimeout(() => {
      timeoutIds.delete(timeoutId)
      // @ts-expect-error no arguments
      callback()
    }, delay) as TimerId

    timeoutIds.add(timeoutId)
    return timeoutId
  }

  // Handle the case where additional arguments are provided
  const timeoutId = setTimeout(
    (...callbackArgs) => {
      timeoutIds.delete(timeoutId)
      callback(...callbackArgs)
    },
    delay,
    ...args
  ) as TimerId

  timeoutIds.add(timeoutId)
  return timeoutId
}

/**
 * Creates a managed interval that will be automatically cleared on page unload
 *
 * @param callback Function to execute repeatedly
 * @param delay Time in milliseconds between executions
 * @param args Arguments to pass to the callback function
 * @returns The interval ID that can be used with clearInterval
 */

export function createInterval<TArgs extends any[]>(
  callback: (...args: TArgs) => void,
  delay: number,
  ...args: TArgs
): TimerId {
  // Handle the case where no additional arguments are provided
  if (args.length === 0) {
    const intervalId = setInterval(callback, delay) as TimerId
    intervalIds.add(intervalId)
    return intervalId
  }

  // Handle the case where additional arguments are provided
  const intervalId = setInterval(callback, delay, ...args) as TimerId
  intervalIds.add(intervalId)
  return intervalId
}

/**
 * Clears a managed timeout
 *
 * @param timeoutId The ID of the timeout to clear
 */
export function clearManagedTimeout(timeoutId: TimerId): void {
  if (timeoutIds.has(timeoutId)) {
    clearTimeout(timeoutId as number)
    timeoutIds.delete(timeoutId)
  }
}

/**
 * Clears a managed interval
 *
 * @param intervalId The ID of the interval to clear
 */
export function clearManagedInterval(intervalId: TimerId): void {
  if (intervalIds.has(intervalId)) {
    clearInterval(intervalId as number)
    intervalIds.delete(intervalId)
  }
}

/**
 * Clears all managed timeouts and intervals
 * This should be called when the page unloads to prevent memory leaks
 */
export function clearAllTimers(): void {
  // Clear all timeouts
  for (const id of timeoutIds) {
    clearTimeout(id as number)
  }

  timeoutIds.clear()

  // Clear all intervals
  for (const id of intervalIds) {
    clearInterval(id as number)
  }

  intervalIds.clear()
}
