export type ScannedNode = HTMLElement

type ProcessNodeFn = (node: ScannedNode) => void

const scannedNodeQueue: ScannedNode[] = []
const scannedNodeSet = new Set<ScannedNode>()

let isProcessingScannedNodeQueue = false
let isProcessingEnabled = false
let processNodeFn: ProcessNodeFn | undefined
let onQueueEmptyFn: (() => void) | undefined
let shouldDeferProcessingFn: (() => boolean) | undefined

/**
 * Sets the callback used to process each scanned node before rendering tags.
 */
export function configureScannedNodeProcessor(fn: ProcessNodeFn) {
  processNodeFn = fn
}

/**
 * Sets the callback to be called when the scanned node queue is empty.
 */
export function configureQueueEmptyCallback(fn: () => void) {
  onQueueEmptyFn = fn
}

export function configureScannedNodeProcessingBlocker(fn: () => boolean) {
  shouldDeferProcessingFn = fn
}

/**
 * Enables or disables queue processing.
 * Storage must be initialized before enabling processing to ensure data is available.
 */
export function setScannedNodeProcessingEnabled(enabled: boolean) {
  isProcessingEnabled = enabled
  if (enabled && hasScannedNodesInQueue()) {
    scheduleProcessScannedNodes()
  }
}

/**
 * Adds a single scanned node to the processing queue.
 * Duplicate nodes are ignored to avoid redundant processing.
 */
export function enqueueScannedNode(node: ScannedNode) {
  if (scannedNodeSet.has(node)) {
    return
  }

  scannedNodeQueue.push(node)
  scannedNodeSet.add(node)
  if (isProcessingEnabled) {
    scheduleProcessScannedNodes()
  }
}

/**
 * Adds a list of scanned nodes to the processing queue.
 * Duplicate nodes are ignored to avoid redundant processing.
 */
export function enqueueScannedNodes(nodes: ScannedNode[]) {
  if (nodes.length === 0) {
    return
  }

  let added = false

  for (const node of nodes) {
    if (scannedNodeSet.has(node)) {
      continue
    }

    scannedNodeQueue.push(node)
    scannedNodeSet.add(node)
    added = true
  }

  if (added && isProcessingEnabled) {
    scheduleProcessScannedNodes()
  }
}

function takeScannedNodeFromQueue(): ScannedNode | undefined {
  const node = scannedNodeQueue.shift()
  if (node) {
    scannedNodeSet.delete(node)
  }

  return node
}

function hasScannedNodesInQueue() {
  return scannedNodeQueue.length > 0
}

function processScannedNodesIdle(deadline: IdleDeadline) {
  if (!processNodeFn) {
    isProcessingScannedNodeQueue = false
    return
  }

  if (shouldDeferProcessingFn?.()) {
    requestIdleCallback(processScannedNodesIdle)
    return
  }

  /**
   * Processes queued nodes in idle time slices to avoid blocking the UI thread.
   */
  while (deadline.timeRemaining() > 1 && hasScannedNodesInQueue()) {
    const node = takeScannedNodeFromQueue()
    if (!node) {
      break
    }

    processNodeFn(node)
  }

  if (hasScannedNodesInQueue()) {
    requestIdleCallback(processScannedNodesIdle)
  } else {
    isProcessingScannedNodeQueue = false

    if (onQueueEmptyFn) {
      onQueueEmptyFn()
    }
  }
}

function scheduleProcessScannedNodes() {
  if (
    !isProcessingEnabled ||
    isProcessingScannedNodeQueue ||
    !hasScannedNodesInQueue() ||
    !processNodeFn
  ) {
    return
  }

  isProcessingScannedNodeQueue = true
  requestIdleCallback(processScannedNodesIdle)
}
