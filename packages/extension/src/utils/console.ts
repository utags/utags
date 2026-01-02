const originConsole = globalThis.console
let lastLogTime = Date.now()

const formatTime = (date: Date) => {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  const s = date.getSeconds().toString().padStart(2, '0')
  const ms = date.getMilliseconds().toString().padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

const getPrefix = (isDetailed: boolean) => {
  if (isDetailed) {
    const now = Date.now()
    const diff = now - lastLogTime
    lastLogTime = now
    const timeStr = formatTime(new Date(now))
    return [`%c[utags][${timeStr}][+${diff}ms]`, 'color: #ff6361;']
  }

  return ['%c[utags]', 'color: #ff6361;']
}

const wrapConsoleMethod =
  (methodName: keyof Console, isDetailed: boolean) =>
  (...args: any[]) => {
    const [prefix, style] = getPrefix(isDetailed)
    const method = originConsole[methodName] as (...args: any[]) => void
    if (typeof method === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      method(prefix, style, ...args)
    }
  }

// eslint-disable-next-line n/prefer-global/process
const isProd = process.env.PLASMO_TAG === 'prod'
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {}

// Create a wrapper object that mimics the console interface
export const consoleWrapper = {
  ...originConsole,
  debug: isProd ? noop : wrapConsoleMethod('debug', true),
  log: isProd ? noop : wrapConsoleMethod('log', true),
  info: wrapConsoleMethod('info', true),
  warn: wrapConsoleMethod('warn', false),
  error: wrapConsoleMethod('error', false),
  // Wrap other common methods that output text
  trace: wrapConsoleMethod('trace', false),
  group: wrapConsoleMethod('group', false),
  groupCollapsed: wrapConsoleMethod('groupCollapsed', false),
} as Console

// Export as 'console' to allow easy replacement in imports
export { consoleWrapper as console }

export function setupConsole() {
  if (globalThis.console !== consoleWrapper) {
    /**
     * Inject the custom console wrapper into the global scope.
     *
     * This ensures all logging from the extension uses the standardized format
     * with [utags] prefix and timestamps.
     *
     * Note: In a Content Script environment (like Chrome Extension), the global
     * scope is isolated from the host page. Modifying `globalThis.console` here
     * only affects the extension's logs and does not interfere with the host
     * page's console or other extensions.
     */
    globalThis.console = consoleWrapper
  }
}
