import {
  createHTML,
  runWhenBodyExists,
  setAttribute,
} from 'browser-extension-utils'

import { interceptShadowDOM, SHADOW_SIGNAL_EVENT } from '../modules/shadow-root'
import { isScanTarget } from '../utils/dom-utils'
import { bindShadowRootEvents } from './global-events'
import { ensureCombinedStyleForShadow } from './style-manager'

// For userscript
interceptShadowDOM()

// 1. 业务配置：只监听这些属性，彻底防止“自我触发”导致的无限循环
const BUSINESS_ATTRIBUTES = [
  'href',
  'data-utags',
  'data-utags_link',
  'data-utags_ignore',
  'data-utags_exclude',
]
const MATCH_ATTR = 'data-utags-matched'

const DEBUG = true
const MAX_SCAN_DURATION = 8000

export type UTagsScannerStats = {
  lastScanDuration: number // 从任务开始到结束的总挂钟时间
  totalNodesProcessed: number
  pureScanDuration: number // 实际在执行扫描算法的时间，排除调度等待
}

export type UTagsScannerCallback = (
  results: Element[],
  stats: UTagsScannerStats
) => void

export type UTagsScannerOptions = {
  // 匹配元素选择器
  include?: string[]
  /**
   * 忽略元素选择器，当前节点或子节点匹配该选择器时，忽略当前匹配的元素
   * <a href="/ok" data-utags_link><span>正常的 UTags 链接</span></a>
   * <a href="/ignore1" data-utags_link><span data-utags_ignore>不会添加 UTags 的链接 1</span></a>
   * <a href="/ignore2" data-utags_link data-utags_ignore><span>不会添加 UTags 的链接 2</span></a>
   */
  ignore?: string[]
  // 排除元素选择器，当前节点或父节点匹配该选择器时，不递归扫描其子节点
  exclude?: string[]
  /**
   * 匹配前回调，返回 false 时，当前节点将被忽略
   * @param node 当前匹配到的元素节点
   * @param action 操作类型，'add' 表示添加 UTags，'delete' 表示删除 UTags
   * @returns 是否继续处理当前节点，返回 false 时，当前节点将被忽略
   */
  onBeforeMatch?: (node: Element, action: 'add' | 'delete') => boolean | void
}

type ScanTask = {
  node: Element | ShadowRoot
  scanChildren: boolean
  isInitial: boolean
}

function setDebugMark(node: Element, mark: string) {
  if (DEBUG && node instanceof HTMLElement) {
    const key = `utags_${mark}`
    const currentVal = node.dataset[key]
    const count = currentVal ? Number.parseInt(currentVal, 10) : 0
    node.dataset[key] = String(count + 1)
  }
}

// 3. UTagsScanner 核心引擎
export class UTagsScanner {
  results: Set<Element>
  initialStack: ScanTask[]
  incrementalStack: ScanTask[]
  isScanning: boolean
  isCleaning: boolean
  isStoppedDueToLoop = false
  scannedShadowRoots: WeakSet<ShadowRoot>
  observer: MutationObserver
  stats: UTagsScannerStats
  root: Element | undefined
  include = '[data-utags_link]'
  ignore = '[data-utags_ignore]'
  exclude = '[data-utags_exclude]'
  onBeforeMatch:
    | ((node: Element, action: 'add' | 'delete') => boolean | void)
    | undefined = undefined

  startTime = 0
  currentScanActiveTime = 0
  loopCount = 0
  currentScanNodesProcessed = 0

  constructor(
    public callback: UTagsScannerCallback,
    options: UTagsScannerOptions = {}
  ) {
    this.setOptions(options)

    this.results = new Set()

    // --- 核心优化：双栈隔离 ---
    // 解决全量扫描被增量任务打断、顺序错乱及耗时统计不准的问题
    this.initialStack = [] // 存放全量扫描任务 (isInitial: true)
    this.incrementalStack = [] // 存放增量更新任务 (isInitial: false)

    this.isScanning = false
    this.isCleaning = false
    this.scannedShadowRoots = new WeakSet()
    this.observer = new MutationObserver(
      this.handleMutations.bind(this) as MutationCallback
    )
    this.stats = {
      lastScanDuration: 0, // 从任务开始到结束的总挂钟时间
      totalNodesProcessed: 0,
      pureScanDuration: 0, // 实际在执行扫描算法的时间，排除调度等待
    }
    this.root = undefined

    // eslint-disable-next-line @typescript-eslint/no-this-alias, unicorn/no-this-assignment
    const self = this

    // Message from shadow-root.ts
    globalThis.addEventListener(
      SHADOW_SIGNAL_EVENT,
      (e) => {
        const host = e.target as Element
        if (
          host &&
          host.shadowRoot &&
          self.isDescendantOfRoot(host) &&
          !self.scannedShadowRoots.has(host.shadowRoot)
        ) {
          // 这样即便 MutationObserver 没抓到 attachShadow 动作，我们也能精准补扫
          self.enqueueScan(host.shadowRoot, true, false)
        }
      },
      true
    )
  }

  stopDueToLoop(reason: string) {
    if (this.isStoppedDueToLoop) return
    this.isStoppedDueToLoop = true
    this.isScanning = false
    this.isCleaning = false
    this.initialStack = []
    this.incrementalStack = []
    try {
      this.observer.disconnect()
    } catch (error) {
      console.error(error)
    }

    const elapsed = this.startTime ? performance.now() - this.startTime : 0
    console.error('[UTagsScanner] stopped due to a suspected scan loop', {
      reason,
      elapsedMs: elapsed,
      loopCount: this.loopCount,
      totalNodesProcessed: this.stats.totalNodesProcessed,
    })
  }

  callOnBeforeMatch(node: Element, action: 'add' | 'delete') {
    if (!this.onBeforeMatch) return action === 'add' ? true : undefined

    try {
      return this.onBeforeMatch(node, action)
    } catch (error) {
      console.error(error)
      return action === 'add' ? false : undefined
    }
  }

  /**
   * 检查节点是否是 root 的后代（穿透 Shadow DOM）
   */
  isDescendantOfRoot(node: Element): boolean {
    if (!this.root) return false
    let current: Element | undefined = node
    while (current) {
      if (this.root.contains(current)) return true
      const rootNode = current.getRootNode()
      if (rootNode instanceof ShadowRoot) {
        current = rootNode.host
      } else {
        return false
      }
    }

    return false
  }

  // onBeforeMatch 注意事项：
  // 如果在回调里读取了引发回流的属性（如 node.offsetHeight 或 node.getBoundingClientRect()），
  // 会强制浏览器在空闲周期内进行布局计算，这会显著增加 pureScanDuration（纯执行时间），甚至导致当前分片任务超时。
  // 建议：在回调里尽量只做写操作（如 classList.add、style.color = ...），避免读操作。
  // 避免死循环：不要在回调中修改监听列表里的属性。
  // 在回调中添加新元素时，给新元素加上 data-utags_exclude 或 data-utags_ignore 属性，确保扫描引擎跳过这些由它自己产生的节点。
  // 对称清理：在 add 时注入一个图标，在 delete（节点断开连接或被排除）时撤销该图标，避免内存泄漏或 UI 残留。
  setOptions(options: UTagsScannerOptions) {
    this.include = options.include?.join(',') || '[data-utags_link]'
    this.ignore = options.ignore?.join(',') || '[data-utags_ignore]'
    this.exclude = options.exclude?.join(',') || '[data-utags_exclude]'
    this.onBeforeMatch =
      typeof options.onBeforeMatch === 'function'
        ? options.onBeforeMatch
        : undefined
  }

  /**
   * 【核心改进】统一管理节点的匹配状态变更
   * 所有的 add/delete 逻辑全部收拢至此
   */
  _updateNodeStatus(node: Element, shouldMatch: boolean) {
    const isCurrentlyMatched = this.results.has(node)
    let finalDecision = false

    if (shouldMatch) {
      // 判定：回调函数是否有额外否定意见
      // 即使已经匹配，也再次检查，因为属性可能变化导致不再满足 onBeforeMatch 的条件
      finalDecision = this.callOnBeforeMatch(node, 'add') !== false
    }

    if (finalDecision) {
      if (!isCurrentlyMatched) {
        // DEBUG && setDebugMark(node, 'scanned_match_add')
        this.results.add(node)
        setAttribute(node as HTMLElement, MATCH_ATTR, '')
      }
    } else {
      // 准备移除逻辑
      if (
        isCurrentlyMatched ||
        // Cloned utags_ul node
        node.classList.contains('utags_ul') ||
        // Cloned utags target element
        node.hasAttribute('data-utags_id')
      ) {
        this.callOnBeforeMatch(node, 'delete')
        node.removeAttribute(MATCH_ATTR)
      }

      if (isCurrentlyMatched) {
        // DEBUG && setDebugMark(node, 'scanned_match_delete')
        this.results.delete(node)
      }
    }
  }

  /**
   * 热更新配置接口
   */
  updateConfig(newOptions: UTagsScannerOptions) {
    console.log('🚀 规则热更新中...', newOptions)

    // 统一清理：全部走 _updateNodeStatus
    for (const node of this.results) this._updateNodeStatus(node, false)
    this.results.clear()

    // 2. 更新规则
    this.setOptions(newOptions)

    // 3. 触发全量重扫：清空所有栈并标记 isInitial 为 true
    this.initialStack = []
    this.incrementalStack = []
    if (this.root) {
      this.enqueueScan(this.root, true, true)
    }
  }

  get observerConfig(): MutationObserverInit {
    return {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: BUSINESS_ATTRIBUTES, // 核心防护：忽略 MATCH_ATTR 的变动
    }
  }

  start(root: Element) {
    if (!root) return
    this.root = root
    this.observer.observe(root, this.observerConfig)
    // 首次启动定义为全量扫描模式
    this.enqueueScan(root, true, true)

    // const originalAttach = Element.prototype.attachShadow
    // // eslint-disable-next-line @typescript-eslint/no-this-alias
    // const self = this
    // Element.prototype.attachShadow = function (init) {
    //   const shadow = originalAttach.call(this, init)
    //   console.log('attachShadow', this, init, shadow)
    //   if (init && init.mode === 'open') {
    //     setTimeout(() => {
    //       if (shadow.host) {
    //         // DEBUG && setDebugMark(shadow.host, 'scanned_shadowroot_host_attached')
    //       }
    //       //   if (self.root && self.root.contains(shadow.host)) {
    //       self.observer.observe(shadow, self.observerConfig)
    //       // 动态挂载 Shadow DOM，开启增量扫描模式
    //       // TODO: 如果祖先节点已被排除，不需扫描
    //       // TODO：需要标记 shadow 是否为 exclude，因为子节点无法跨 shadow 边界访问
    //       console.log('动态挂载 Shadow DOM，开启增量扫描模式', shadow)
    //       self.enqueueScan(shadow, true, false)
    //       //   }
    //     }, 0)
    //   }

    //   return shadow
    // }
  }

  /**
   * 核心逻辑：检查节点或其祖先是否被排除
   */
  checkExcluded(node: Element | Node): boolean {
    if (!(node instanceof Element)) return false
    // 使用 closest 检查父级链，确保排除逻辑的继承性
    return Boolean(node.closest(this.exclude))
  }

  /**
   * 尝试触发回调（需满足所有队列为空且无正在进行的任务）
   */
  tryTriggerCallback() {
    if (
      this.initialStack.length === 0 &&
      this.incrementalStack.length === 0 &&
      !this.isCleaning &&
      !this.isScanning
    ) {
      this.callback(Array.from(this.results), this.stats)
    }
  }

  handleMutations(mutations: MutationRecord[]) {
    if (this.isStoppedDueToLoop) return
    let needsUpdate = false
    let hasRemoval = false

    for (const m of mutations) {
      // A. 处理删除
      if (m.removedNodes.length > 0) {
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let i = 0; i < m.removedNodes.length; i++) {
          const n = m.removedNodes[i]
          // 忽略一些特殊节点：例如 iframe, svg, path 等非 HTMLElement 类型的节点
          if (isScanTarget(n) || n.nodeType === 11) {
            hasRemoval = true
            break
          }
        }
      }

      // B. 处理新增 (增量模式)
      if (m.type === 'childList' && m.addedNodes.length > 0) {
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let i = 0; i < m.addedNodes.length; i++) {
          const n = m.addedNodes[i]
          if (n instanceof HTMLElement) {
            if (n.classList.contains('utags_ul')) {
              // Check if node is cloned utags_ul node
              this.callOnBeforeMatch(n, 'delete')
            }
            // 忽略一些特殊节点：例如 utags_ul, iframe, svg, path 等非 HTMLElement 类型的节点
            else if (isScanTarget(n)) {
              this.enqueueScan(n as Element, true, false)
              needsUpdate = true
            }
          }
        }
      }

      // C. 处理业务属性变更
      else if (m.type === 'attributes' && m.target instanceof Element) {
        // 如果当前节点变为排除项，立即物理清理其子树
        if (m.target.matches(this.exclude)) {
          this.removeFromResultsRecursive(m.target)
        }

        // 属性变更可能影响子树是否满足 exclude 条件，需增量扫描子树
        this.enqueueScan(m.target, true, false)
        needsUpdate = true
      }
    }

    // eslint-disable-next-line n/prefer-global/process
    if (process.env.PLASMO_TAG !== 'prod' && (needsUpdate || hasRemoval)) {
      console.log('[sanner] handleMutations', mutations)
    }

    if (hasRemoval && !this.isCleaning) {
      console.log('发现删除动作，触发兜底清理')
      this.isCleaning = true
      requestIdleCallback((d) => {
        this.cleanupDisconnectedNodes(d)
      })
    }

    // 只有当所有任务（全量+增量）处理完后才回调
    if (needsUpdate) {
      this.tryTriggerCallback()
    }
  }

  /**
   * 物理递归清理结果集
   */
  removeFromResultsRecursive(node: Element) {
    if (!(node instanceof Element)) return
    const cleanupStack: Array<Element | ShadowRoot> = [node]
    while (cleanupStack.length > 0) {
      const current = cleanupStack.pop()
      if (!current) continue

      if (current instanceof Element) {
        // DEBUG && setDebugMark(current, 'scanned_match_delete_recursive')
        this._updateNodeStatus(current, false)
        if (current.shadowRoot) cleanupStack.push(current.shadowRoot)
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let i = 0; i < current.children.length; i++) {
          cleanupStack.push(current.children[i])
        }
      } else if (current instanceof ShadowRoot) {
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let i = 0; i < current.children.length; i++) {
          cleanupStack.push(current.children[i])
        }
      }
    }
  }

  /**
   * 兜底清理：检查连通性及祖先排除状态
   */
  cleanupDisconnectedNodes(deadline: IdleDeadline) {
    const iterator = this.results.values()
    let current = iterator.next()
    while (!current.done && (deadline ? deadline.timeRemaining() > 1 : true)) {
      const node = current.value
      // 断开连接或祖先被排除时均需移除
      if (!node.isConnected || this.checkExcluded(node)) {
        if (node.isConnected) {
          // DEBUG && setDebugMark(node, 'scanned_match_delete_cleanup_excluded')
        } else {
          // DEBUG && setDebugMark(node, 'scanned_match_delete_cleanup_disconnected')
        }

        this._updateNodeStatus(node, false)
      }

      current = iterator.next()
    }

    if (current.done) {
      this.isCleaning = false
      this.tryTriggerCallback()
    } else {
      requestIdleCallback((d) => {
        this.cleanupDisconnectedNodes(d)
      })
    }
  }

  /**
   * 任务入队：根据模式分发到不同栈
   * @param isInitial - 是否为全量/初始扫描模式
   */
  enqueueScan(
    node: Element | ShadowRoot,
    scanChildren = true,
    isInitial = false
  ) {
    if (this.isStoppedDueToLoop) return
    const task: ScanTask = { node, scanChildren, isInitial }
    if (isInitial) {
      this.initialStack.push(task)
    } else {
      this.incrementalStack.push(task)
    }

    if (!this.isScanning) {
      this.isScanning = true
      this.startTime = performance.now()
      this.currentScanActiveTime = 0 // 初始化本次扫描的纯工作时间
      this.loopCount = 0
      this.currentScanNodesProcessed = 0
      requestIdleCallback(this.processStack.bind(this) as IdleRequestCallback)
    }
  }

  processStack(deadline: IdleDeadline) {
    if (this.isStoppedDueToLoop) return
    const cycleStart = performance.now() // 记录当前空闲周期的真实开始时间
    let currentLoopNodesProcessed = 0
    let currentLoopNodesExcluded = 0
    this.loopCount++

    const activeDurationMs = () =>
      this.currentScanActiveTime + (performance.now() - cycleStart)

    console.log(
      'processStack [start]',
      this.loopCount,
      deadline.timeRemaining(),
      activeDurationMs().toFixed(2),
      this.initialStack.length,
      this.incrementalStack.length
    )

    if (activeDurationMs() > MAX_SCAN_DURATION) {
      this.stopDueToLoop('processStack ran continuously for too long')
      return
    }

    while (deadline.timeRemaining() > 0) {
      let item: ScanTask | undefined
      let currentStackIsInitial = false

      // 调度策略：全量任务 (initialStack) 绝对优先
      if (this.initialStack.length > 0) {
        item = this.initialStack.pop()
        currentStackIsInitial = true
      } else if (this.incrementalStack.length > 0) {
        item = this.incrementalStack.pop()
        currentStackIsInitial = false
      } else {
        break
      }

      if (!item) break

      const { node, scanChildren, isInitial } = item
      this.stats.totalNodesProcessed++
      this.currentScanNodesProcessed++
      currentLoopNodesProcessed++

      if (
        currentLoopNodesProcessed % 10 === 0 &&
        activeDurationMs() > MAX_SCAN_DURATION
      ) {
        this.stopDueToLoop('processStack ran continuously for too long')
        return
      }

      if (!(node instanceof Element)) {
        if (node instanceof ShadowRoot && node.isConnected) {
          // DEBUG && setDebugMark(node.host, 'scanned_shadowroot_host2')
          // 避免重复观察 ShadowRoot
          if (!this.scannedShadowRoots.has(node)) {
            this.scannedShadowRoots.add(node)
            this.observer.observe(node, this.observerConfig)
            // Inject UTags combined style into the discovered ShadowRoot
            ensureCombinedStyleForShadow(node)
            bindShadowRootEvents(node)
          }

          // If node is ShadowRoot, treat it as container and scan children.
          const targetStack = currentStackIsInitial
            ? this.initialStack
            : this.incrementalStack

          // If it is a ShadowRoot, we just scan its children
          if (scanChildren && node.children) {
            for (let i = node.children.length - 1; i >= 0; i--) {
              // DEBUG && setDebugMark(node.children[i], 'scanned_shadowroot_child')
              targetStack.push({
                node: node.children[i],
                scanChildren: true,
                isInitial,
              })
            }
          }
        }

        continue
      }

      if (!node.isConnected) {
        this._updateNodeStatus(node, false)
        continue
      }

      // 判定排除状态
      const matchesLocalExclude = node.matches(this.exclude)
      // 增量扫描 (!isInitial) 时必须向上检查祖先状态
      const isExcluded =
        matchesLocalExclude || (!isInitial && this.checkExcluded(node))

      if (isExcluded) {
        currentLoopNodesExcluded++
        // DEBUG && setDebugMark(node, 'scanned_match_delete_exclude')
        this._updateNodeStatus(node, false)

        // 全量模式剪枝：跳过子树
        if (isInitial) continue
      }

      // 核心入库判定逻辑
      if (!isExcluded) {
        if (node.matches(this.include)) {
          const isIgnored =
            node.matches(this.ignore) ||
            node.querySelector(this.ignore) !== null
          this._updateNodeStatus(node, !isIgnored && node.isConnected)
        } else {
          this._updateNodeStatus(node, false)
        }
      }

      // 递归扫描子树及 Shadow DOM
      const targetStack = currentStackIsInitial
        ? this.initialStack
        : this.incrementalStack

      if (node.shadowRoot) {
        // DEBUG && setDebugMark(node, 'scanned_shadowroot_host1')
        // 避免重复观察 ShadowRoot
        // if (!this.scannedShadowRoots.has(node.shadowRoot)) {
        //   this.scannedShadowRoots.add(node.shadowRoot)
        //   this.observer.observe(node.shadowRoot, this.observerConfig)
        // }
        // 递归扫描 ShadowRoot 子树
        // 需要重复扫描，因为本节点或祖先节点可能被删除，重新添加
        targetStack.push({
          node: node.shadowRoot,
          scanChildren: true,
          isInitial,
        })
      }

      if (scanChildren && node.childElementCount > 0) {
        if (node.shadowRoot) {
          // DEBUG && setDebugMark(node, 'scanned_shadowroot_host_parent')
        } else {
          // DEBUG && setDebugMark(node, 'scanned_parent')
        }

        // 关键优化：逆序压栈以实现“至上而下”的深度优先扫描
        for (let i = node.children.length - 1; i >= 0; i--) {
          // DEBUG &&
          // setDebugMark(
          //   node.children[i],
          //   node.shadowRoot
          //     ? 'scanned_shadowroot_host_child'
          //     : 'scanned_child'
          // )
          targetStack.push({
            node: node.children[i],
            scanChildren: true,
            isInitial,
          })
        }
      }

      // if (DEBUG && node.childElementCount === 0) {
      //   if (node.shadowRoot) {
      //     DEBUG && setDebugMark(node, 'scanned_shadowroot_host_nochild')
      //   } else {
      //     DEBUG && setDebugMark(node, 'scanned_nochild')
      //   }
      // }
    }

    // 累加本次空闲周期内的实际执行时间
    this.currentScanActiveTime += performance.now() - cycleStart

    if (this.initialStack.length > 0 || this.incrementalStack.length > 0) {
      requestIdleCallback(this.processStack.bind(this) as IdleRequestCallback)
    } else {
      this.isScanning = false
      // 统计信息
      this.stats.lastScanDuration = performance.now() - this.startTime
      this.stats.pureScanDuration = this.currentScanActiveTime

      console.log(
        `扫描完成。总耗时: ${this.stats.lastScanDuration.toFixed(2)}ms, ` +
          `纯执行时间: ${this.stats.pureScanDuration.toFixed(2)}ms`
      )

      this.tryTriggerCallback()
    }
  }
}

export function debugUTagsScanner() {
  if (!DEBUG) {
    return
  }

  console.info('UTagsScanner debug')

  // 4. UI 与装饰逻辑
  const ui = document.createElement('div')
  ui.style.cssText = `position: fixed; bottom: 15px; right: 15px; z-index: 2147483647; background: rgba(0,0,0,0.85); color: #0f0; padding: 12px; border-radius: 10px; font-size: 11px; font-family: monospace; pointer-events: auto; border: 1px solid #0f0;`
  document.documentElement.append(ui)

  const initialOptions: UTagsScannerOptions = {
    include: ['[data-utags_link]', '[data-utags]', 'a[href*="github"]', 'a'],
    ignore: ['[data-utags_ignore]'],
    exclude: ['[data-utags_exclude]'],
    onBeforeMatch(node: Element, action: 'add' | 'delete', debug = false) {
      const htmlNode = node as HTMLElement
      if (action === 'add') {
        if (
          (htmlNode.textContent || '').includes('AD') ||
          (htmlNode.textContent || '').includes('抽奖')
        )
          return false
        if (!debug) htmlNode.style.outline = '2px solid gold'
      } else if (action === 'delete' && !debug) htmlNode.style.outline = ''
    },
  }

  let debugTimeout: ReturnType<typeof setTimeout>
  const scanner = new UTagsScanner((list, stats) => {
    console.info(
      'UTagsScanner callback',
      `Matches: ${list.length} | ActiveTime: ${stats.pureScanDuration.toFixed(2)}ms`
    )
    if (!ui.isConnected) {
      document.documentElement.append(ui)
    }

    ui.innerHTML = createHTML(`
      <div style="font-weight:bold; border-bottom:1px solid #333; margin-bottom:5px">UTAGS ENGINE v2.3</div>
      Matches: ${list.length} | ActiveTime: ${stats.pureScanDuration.toFixed(2)}ms
      <button id="utags-hot-update" style="width:100%; margin-top:5px; cursor:pointer;">TEST HOT UPDATE</button>
    `)

    clearTimeout(debugTimeout)
    debugTimeout = setTimeout(() => {
      if (scanner.isScanning || scanner.isCleaning) {
        // 又有节点添加或删除，等待下一次扫描完成
      } else {
        debugScannerDifference(scanner)
      }
    }, 100)
  }, initialOptions)

  ui.style.display = 'none'
  document.querySelector('#utags-hot-update')?.addEventListener('click', () => {
    scanner.updateConfig({
      include: ['a'],
      ignore: initialOptions.ignore,
      exclude: initialOptions.exclude,
    })
  })

  if (document.body) {
    scanner.start(document.body)
  } else {
    runWhenBodyExists(() => {
      scanner.start(document.body)
    })
  }
}

// 6. 深度对比调试逻辑
export function debugScannerDifference(scannerInstance: UTagsScanner) {
  const memorySet = scannerInstance.results
  const domFound = new Set<Element>()
  const utagsMatched = new Set<Element>()
  function findInDOM(root: Node | undefined) {
    if (!root) return
    if (root instanceof Element && root.matches(scannerInstance.include)) {
      const isIgnored =
        root.closest(scannerInstance.exclude) ||
        root.matches(scannerInstance.ignore) ||
        root.querySelector(scannerInstance.ignore) ||
        (scannerInstance.onBeforeMatch &&
          // @ts-expect-error debug
          scannerInstance.onBeforeMatch(root, 'add', true) === false)
      if (!isIgnored) domFound.add(root)
    }

    if (
      root instanceof Element &&
      root.getAttribute('data-utags_id') !== null &&
      !root.classList.contains('utags_ul')
    ) {
      utagsMatched.add(root)
    }

    if (root instanceof Element && root.shadowRoot) findInDOM(root.shadowRoot)
    let child = root.firstChild
    while (child) {
      findInDOM(child)
      child = child.nextSibling
    }
  }

  findInDOM(document.body)
  const ghostNodes = [...memorySet].filter((x) => !domFound.has(x))
  const missingNodes = [...domFound].filter((x) => !memorySet.has(x))
  const utagsGhostNodes = [...memorySet].filter((x) => !utagsMatched.has(x))
  const utagsMissingNodes = [...utagsMatched].filter((x) => !memorySet.has(x))
  console.log(`--- 扫描器一致性检查 ---`)
  console.log(`内存 Set 总数: ${memorySet.size}`)
  console.log(`实际 DOM 总数: ${domFound.size}`)
  console.log(`UTags 匹配节点总数: ${utagsMatched.size}`)

  if (ghostNodes.length > 0) console.warn(`❌ 幽灵节点:`, ghostNodes)
  if (missingNodes.length > 0) console.error(`❌ 缺失节点:`, missingNodes)
  if (utagsGhostNodes.length > 0)
    console.info(`❌ UTags 幽灵节点:`, utagsGhostNodes)
  if (utagsMissingNodes.length > 0)
    console.error(`❌ UTags 缺失节点:`, utagsMissingNodes)
  if (
    ghostNodes.length === 0 &&
    missingNodes.length === 0 &&
    utagsGhostNodes.length === 0 &&
    utagsMissingNodes.length === 0
  )
    console.info(`✅ 完全一致！`)
}
