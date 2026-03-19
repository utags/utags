// 2. 生成唯一的事件名称 (可以加上扩展 ID 的 hash，增加私密性)
// 在 ISOLATED 脚本中也需使用同样的名称监听
export const SHADOW_SIGNAL_EVENT = 'UTAGS_SHADOW_ROOT_CREATED'

function isCloudflareChallenges() {
  return (
    (document.querySelector(
      'script[src^="https://challenges.cloudflare.com/turnstile/"]'
    ) !== null &&
      (document.querySelector('#challenge-success-text') !== null ||
        document.querySelector('input[name="cf-turnstile-response"]') !==
          null ||
        document.querySelector('script[src*="/cdn-cgi/challenge-platform"]') !==
          null)) ||
    location.hostname === 'challenges.cloudflare.com' ||
    location.href.startsWith('https://linux.do/challenge')
  )
}

export function interceptShadowDOM() {
  // console.log('isCloudflareChallenges', isCloudflareChallenges(), location.href)
  if (isCloudflareChallenges()) {
    return
  }

  // 1. 立即捕获原始方法，防止被网页后续脚本劫持或循环调用
  const originalAttachShadow = Element.prototype.attachShadow

  if (typeof originalAttachShadow !== 'function') {
    return
  }

  /**
   * 重写 attachShadow
   */
  Element.prototype.attachShadow = function (init) {
    // console.log(
    //   'isCloudflareChallenges attachShadow',
    //   init,
    //   isCloudflareChallenges(),
    //   location.href
    // )
    // 核心功能：将 closed 强制转为 open
    // 这样 Scanner 才能通过 node.shadowRoot 访问到内容
    if (init && init.mode === 'closed' && !isCloudflareChallenges()) {
      init.mode = 'open'
    }

    // 调用原始方法创建 Shadow Root
    const shadow = originalAttachShadow.call(this, init) as ShadowRoot

    // 触发自定义事件通知 ISOLATED 世界的 Scanner
    // 注意：由于 shadow 对象在跨环境传输时会被结构化克隆（可能会丢失引用）
    // 我们在事件流中通过同步事件触发，ISOLATED 脚本在同一时刻能通过该节点拿到 shadowRoot
    try {
      // 创建一个自定义事件
      const event = new CustomEvent(SHADOW_SIGNAL_EVENT, {
        bubbles: true, // 向上冒泡
        composed: true, // 关键：允许事件穿透 Shadow DOM 边界
        detail: { isShadowSignal: true },
      })

      // 在宿主元素（this）上触发事件
      this.dispatchEvent(event)
    } catch (error) {
      console.error('[utags-bridge] 信号发送失败:', error)
    }

    return shadow
  }
}
