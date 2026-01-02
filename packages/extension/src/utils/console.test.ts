import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('console wrapper', () => {
  const mockDate = new Date('2023-01-01T12:00:00.000Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    // Mock global console methods
    globalThis.console.log = vi.fn()
    globalThis.console.debug = vi.fn()
    globalThis.console.info = vi.fn()
    globalThis.console.warn = vi.fn()
    globalThis.console.error = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.resetModules() // Reset modules to allow re-importing with different env vars
    // eslint-disable-next-line n/prefer-global/process
    delete process.env.PLASMO_TAG
  })

  it('should add detailed prefix with color to log', async () => {
    const { console: customConsole } = await import('./console')

    customConsole.log('test message')

    expect(globalThis.console.log).toHaveBeenCalledWith(
      expect.stringMatching(
        /^%c\[utags]\[\d{2}:\d{2}:\d{2}\.\d{3}]\[\+\d+ms]$/
      ),
      'color: #ff6361;',
      'test message'
    )
  })

  it('should update diff time correctly with color support', async () => {
    const { console: customConsole } = await import('./console')

    // Call 1
    customConsole.log('first')

    // Advance time by 100ms
    vi.advanceTimersByTime(100)

    // Call 2
    customConsole.log('second')

    expect(globalThis.console.log).toHaveBeenLastCalledWith(
      expect.stringMatching(/\[\+100ms]$/),
      'color: #ff6361;',
      'second'
    )

    // Advance time by 50ms
    vi.advanceTimersByTime(50)

    // Call 3 (debug)
    customConsole.debug('third')

    expect(globalThis.console.debug).toHaveBeenLastCalledWith(
      expect.stringMatching(/\[\+50ms]$/),
      'color: #ff6361;',
      'third'
    )
  })

  it('should use simple prefix with color for warn and error', async () => {
    const { console: customConsole } = await import('./console')

    customConsole.warn('warning message')

    expect(globalThis.console.warn).toHaveBeenCalledWith(
      '%c[utags]',
      'color: #ff6361;',
      'warning message'
    )

    customConsole.error('error message')

    expect(globalThis.console.error).toHaveBeenCalledWith(
      '%c[utags]',
      'color: #ff6361;',
      'error message'
    )
  })

  it('should NOT update lastLogTime for warn/error calls', async () => {
    const { console: customConsole } = await import('./console')

    // Call 1 (log) - updates lastLogTime
    customConsole.log('first')

    // Advance time 200ms
    vi.advanceTimersByTime(200)

    // Call 2 (warn) - should NOT update lastLogTime
    customConsole.warn('warning')

    expect(globalThis.console.warn).toHaveBeenCalledWith(
      '%c[utags]',
      'color: #ff6361;',
      'warning'
    )

    // Advance time 300ms
    vi.advanceTimersByTime(300)

    // Call 3 (info) - should show +500ms (200ms + 300ms), NOT +300ms
    customConsole.info('info')

    expect(globalThis.console.info).toHaveBeenLastCalledWith(
      expect.stringMatching(/\[\+500ms]$/),
      'color: #ff6361;',
      'info'
    )
  })

  it('should disable log/debug in prod environment, keep info', async () => {
    // eslint-disable-next-line n/prefer-global/process
    process.env.PLASMO_TAG = 'prod'
    // Re-import module to pick up env var change
    const { console: customConsole } = await import('./console')

    customConsole.info('should info')
    customConsole.log('should not log')
    customConsole.debug('should not debug')

    expect(globalThis.console.info).toHaveBeenCalled()
    expect(globalThis.console.log).not.toHaveBeenCalled()
    expect(globalThis.console.debug).not.toHaveBeenCalled()

    // warn/error should still work
    customConsole.warn('should warn')
    expect(globalThis.console.warn).toHaveBeenCalled()

    customConsole.error('should error')
    expect(globalThis.console.error).toHaveBeenCalled()
  })
})
