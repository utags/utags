/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'

let updateConfigCalls: unknown[] = []

vi.mock('../modules/utags-scanner', () => {
  class UTagsScanner {
    isScanning = false
    isCleaning = false
    start = vi.fn()
    updateConfig = vi.fn((newOptions: unknown) => {
      updateConfigCalls.push(newOptions)
    })
  }

  return {
    UTagsScanner,
    debugScannerDifference: vi.fn(),
  }
})

describe('updateMatchedNodesSelector', () => {
  it('should call scanner.updateConfig when selector changed', async () => {
    vi.resetModules()
    updateConfigCalls = []

    const { scanDom, updateMatchedNodesSelector } = await import('./index')
    scanDom()

    updateMatchedNodesSelector('a.foo')

    expect(updateConfigCalls).toHaveLength(1)
    expect(updateConfigCalls[0]).toEqual(
      expect.objectContaining({
        include: expect.arrayContaining(['a.foo']),
      })
    )
  })

  it('should not call scanner.updateConfig when selector does not change', async () => {
    vi.resetModules()
    updateConfigCalls = []

    const { scanDom, updateMatchedNodesSelector } = await import('./index')
    scanDom()

    updateMatchedNodesSelector('a.foo')
    updateMatchedNodesSelector('a.foo')

    expect(updateConfigCalls).toHaveLength(1)
  })

  it('should call scanner.updateConfig when selector is cleared after being set', async () => {
    vi.resetModules()
    updateConfigCalls = []

    const { scanDom, updateMatchedNodesSelector } = await import('./index')
    scanDom()

    updateMatchedNodesSelector('a.foo')
    updateMatchedNodesSelector('')

    expect(updateConfigCalls).toHaveLength(2)
    const lastCallArg = updateConfigCalls.at(-1) as
      | { include?: string[] }
      | undefined
    expect(lastCallArg?.include).toBeDefined()
    expect(lastCallArg?.include).not.toContain('a.foo')
  })
})
