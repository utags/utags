import { beforeEach, describe, expect, it, vi } from 'vitest'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type QueueModule = typeof import('./scanned-node-queue')

let queueModule: QueueModule

function createIdleDeadline(timeRemaining: () => number): IdleDeadline {
  return {
    timeRemaining,
  } as IdleDeadline
}

beforeEach(async () => {
  vi.resetModules()

  const requestIdleCallbackMock = vi.fn(
    (callback: (deadline: IdleDeadline) => void) => {
      const deadline = createIdleDeadline(() => 50)
      callback(deadline)
      return 1
    }
  )

  ;(globalThis as any).requestIdleCallback = requestIdleCallbackMock

  queueModule = await import('./scanned-node-queue')
})

describe('scanned-node-queue', () => {
  it('does not schedule processing when processor is not configured', () => {
    const requestIdleCallbackMock =
      globalThis.requestIdleCallback as unknown as ReturnType<typeof vi.fn>

    queueModule.setScannedNodeProcessingEnabled(true)

    const node = document.createElement('div') as HTMLElement
    queueModule.enqueueScannedNode(node)

    expect(requestIdleCallbackMock).not.toHaveBeenCalled()
  })

  it('processes a single node when enabled and processor is configured', () => {
    const processNodeMock = vi.fn()
    queueModule.configureScannedNodeProcessor(processNodeMock)

    queueModule.setScannedNodeProcessingEnabled(true)

    const node = document.createElement('div') as HTMLElement
    queueModule.enqueueScannedNode(node)

    expect(processNodeMock).toHaveBeenCalledTimes(1)
    expect(processNodeMock).toHaveBeenCalledWith(node)
  })

  it('processes nodes that were enqueued before processing is enabled', () => {
    const processNodeMock = vi.fn()
    queueModule.configureScannedNodeProcessor(processNodeMock)

    queueModule.setScannedNodeProcessingEnabled(false)

    const node = document.createElement('div') as HTMLElement
    queueModule.enqueueScannedNode(node)

    expect(processNodeMock).not.toHaveBeenCalled()

    queueModule.setScannedNodeProcessingEnabled(true)

    expect(processNodeMock).toHaveBeenCalledTimes(1)
    expect(processNodeMock).toHaveBeenCalledWith(node)
  })

  it('processes multiple nodes from enqueueScannedNodes when enabled', () => {
    const processNodeMock = vi.fn()
    queueModule.configureScannedNodeProcessor(processNodeMock)

    queueModule.setScannedNodeProcessingEnabled(true)

    const node1 = document.createElement('div') as HTMLElement
    const node2 = document.createElement('span') as HTMLElement
    const node3 = document.createElement('a') as HTMLElement

    queueModule.enqueueScannedNodes([node1, node2, node3])

    expect(processNodeMock).toHaveBeenCalledTimes(3)
    expect(processNodeMock).toHaveBeenNthCalledWith(1, node1)
    expect(processNodeMock).toHaveBeenNthCalledWith(2, node2)
    expect(processNodeMock).toHaveBeenNthCalledWith(3, node3)
  })

  it('does not enqueue the same node multiple times via enqueueScannedNode', () => {
    const processNodeMock = vi.fn()
    queueModule.configureScannedNodeProcessor(processNodeMock)

    const node = document.createElement('div') as HTMLElement

    queueModule.enqueueScannedNode(node)
    queueModule.enqueueScannedNode(node)

    queueModule.setScannedNodeProcessingEnabled(true)

    expect(processNodeMock).toHaveBeenCalledTimes(1)
    expect(processNodeMock).toHaveBeenCalledWith(node)
  })

  it('does not enqueue duplicate nodes in enqueueScannedNodes', () => {
    const processNodeMock = vi.fn()
    queueModule.configureScannedNodeProcessor(processNodeMock)

    const node1 = document.createElement('div') as HTMLElement
    const node2 = document.createElement('div') as HTMLElement

    queueModule.enqueueScannedNodes([node1, node2, node1, node2])
    queueModule.enqueueScannedNodes([node1, node2, node1, node2])

    queueModule.setScannedNodeProcessingEnabled(true)

    expect(processNodeMock).toHaveBeenCalledTimes(2)
    expect(processNodeMock).toHaveBeenNthCalledWith(1, node1)
    expect(processNodeMock).toHaveBeenNthCalledWith(2, node2)
  })

  it('splits processing across idle callbacks when timeRemaining is exhausted', async () => {
    const callbacks: Array<(deadline: IdleDeadline) => void> = []
    const timeRemainingValues = [0, 50]

    const requestIdleCallbackMock = vi.fn(
      (callback: (deadline: IdleDeadline) => void) => {
        callbacks.push(callback)
        const value =
          timeRemainingValues.length > 0 ? timeRemainingValues.shift()! : 50
        const deadline = createIdleDeadline(() => value)
        callback(deadline)
        return callbacks.length
      }
    )

    ;(globalThis as any).requestIdleCallback = requestIdleCallbackMock

    queueModule = await import('./scanned-node-queue')

    const processNodeMock = vi.fn()
    queueModule.configureScannedNodeProcessor(processNodeMock)
    queueModule.setScannedNodeProcessingEnabled(true)

    const node1 = document.createElement('div') as HTMLElement
    const node2 = document.createElement('div') as HTMLElement

    queueModule.enqueueScannedNodes([node1, node2])

    expect(processNodeMock).toHaveBeenCalledTimes(2)
    expect(processNodeMock).toHaveBeenNthCalledWith(1, node1)
    expect(processNodeMock).toHaveBeenNthCalledWith(2, node2)
    expect(requestIdleCallbackMock).toHaveBeenCalledTimes(2)
  })

  it('calls onQueueEmptyFn when queue processing is complete', () => {
    const processNodeMock = vi.fn()
    const onQueueEmptyMock = vi.fn()
    queueModule.configureScannedNodeProcessor(processNodeMock)
    queueModule.configureQueueEmptyCallback(onQueueEmptyMock)

    queueModule.setScannedNodeProcessingEnabled(true)

    const node = document.createElement('div') as HTMLElement
    queueModule.enqueueScannedNode(node)

    expect(processNodeMock).toHaveBeenCalledWith(node)
    expect(onQueueEmptyMock).toHaveBeenCalledTimes(1)
  })

  it('defers processing while blocker returns true, then resumes', async () => {
    vi.resetModules()

    const callbacks: Array<(deadline: IdleDeadline) => void> = []

    const requestIdleCallbackMock = vi.fn(
      (callback: (deadline: IdleDeadline) => void) => {
        callbacks.push(callback)
        return callbacks.length
      }
    )

    ;(globalThis as any).requestIdleCallback = requestIdleCallbackMock

    queueModule = await import('./scanned-node-queue')

    let isBlocked = true
    const processNodeMock = vi.fn()

    queueModule.configureScannedNodeProcessor(processNodeMock)
    queueModule.configureScannedNodeProcessingBlocker(() => isBlocked)
    queueModule.setScannedNodeProcessingEnabled(true)

    const node1 = document.createElement('div') as HTMLElement
    const node2 = document.createElement('div') as HTMLElement
    queueModule.enqueueScannedNodes([node1, node2])

    expect(requestIdleCallbackMock).toHaveBeenCalledTimes(1)
    expect(processNodeMock).not.toHaveBeenCalled()

    callbacks[0]?.(createIdleDeadline(() => 50))
    expect(processNodeMock).not.toHaveBeenCalled()
    expect(requestIdleCallbackMock).toHaveBeenCalledTimes(2)

    isBlocked = false
    callbacks[1]?.(createIdleDeadline(() => 50))
    expect(processNodeMock).toHaveBeenCalledTimes(2)
    expect(processNodeMock).toHaveBeenNthCalledWith(1, node1)
    expect(processNodeMock).toHaveBeenNthCalledWith(2, node2)
  })
})
