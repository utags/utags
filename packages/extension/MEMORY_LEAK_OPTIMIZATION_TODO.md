# Content.ts 内存泄漏优化方案 TODO List

## 高优先级优化项

### 1. 事件监听器清理机制 ✅

- [x] **问题**: 全局事件监听器未在页面卸载时清理
- [x] **位置**: `content.ts` 全局作用域的事件监听器
- [x] **解决方案**: 实现统一的事件监听器管理和清理机制
- [x] **预期效果**: 防止页面切换时的内存泄漏
- [x] **实施详情**:
  - 创建了 `EventListenerManager` 类来统一管理事件监听器
  - 修改了 `bindDocumentEvents` 和 `bindWindowEvents` 函数接受 eventManager 参数
  - 在页面卸载时（beforeunload, pagehide, locationchange）自动清理所有事件监听器
  - 同时清理 MutationObserver 和全局变量 utagsIdSet
  - **模块化重构**: 将 `EventListenerManager` 类提取到独立文件 `utils/event-listener-manager.ts`
  - 增强了类型安全性，添加了 `removeEventListener` 方法用于移除特定监听器
  - 更新了相关导入和类型定义，确保代码模块化和可重用性
  - **修复了 this 上下文丢失问题**: 在 `global-events.ts` 中，将 `eventManager?.addEventListener` 改为箭头函数包装，确保 `this` 上下文正确绑定
  - **修复了 SPA 应用路由切换问题**: 将 `locationchange` 事件处理从完全清理改为重新初始化，确保在 SPA 应用中路由切换后功能仍然可用

### 2. 全局变量和集合清理

- [x] **问题**: `globalTagsSet`、`globalDomainsSet` 等全局集合未清理
- [x] **位置**: 全局变量声明区域
- [x] **解决方案**: 添加页面卸载时的清理函数
- [x] **预期效果**: 释放大量标签和域名数据占用的内存
- [x] **实施状态**: 已完成
  - ✅ 为 `content.ts` 中的 `utagsIdSet` 添加了清理机制
  - ✅ 为 `storage/bookmarks.ts` 中的 `cachedUrlMap` 添加了 `clearCachedUrlMap()` 清理函数
  - ✅ 为 `modules/visited.ts` 中的 `cache` 对象添加了 `clearVisitedCache()` 清理函数
  - ✅ 为 `modules/advanced-tag-manager.ts` 中的全局变量添加了 `clearTagManagerCache()` 清理函数
  - ✅ 在 `content.ts` 的 `cleanup()` 函数中统一调用所有清理函数
  - ✅ 确保页面卸载时自动释放内存占用

### 3. DOM 引用循环清理 ✅

- [x] **问题**: DOM 元素引用可能形成循环引用
- [x] **位置**: DOM 操作相关函数
- [x] **解决方案**: 使用 WeakMap 存储 DOM 引用，添加显式清理
- [x] **预期效果**: 避免 DOM 元素无法被垃圾回收
- [x] **实施详情**:
  - 创建了 `dom-reference-manager.ts` 模块，使用 WeakMap 存储 DOM 元素与 utags 数据的映射
  - 实现了 `setElementUtags`、`getElementUtags`、`deleteElementUtags` 和 `hasElementUtags` 函数
  - 创建了 `dom-utils.ts` 辅助模块，提供 `setUtags`、`getUtags` 和 `removeUtags` 便捷函数
  - 修改了 `sites/index.ts` 中的 DOM 处理逻辑，使用 WeakMap 替代直接在 DOM 元素上存储 utags 属性
  - 更新了 `sites/z001/027-discourse.ts` 作为示例站点文件，使用新的 DOM 引用管理方式
  - 在 `content.ts` 的 `cleanup()` 函数中添加了 `clearDomReferences()` 调用，确保页面卸载时清理 DOM 引用

## 中等优先级优化项

### 4. 定时器管理优化

- [ ] **问题**: `setTimeout`/`setInterval` 可能未正确清理
- [ ] **位置**: 异步操作和延迟执行代码
- [ ] **解决方案**: 实现定时器注册表和统一清理机制
- [ ] **预期效果**: 防止定时器持续运行导致的内存泄漏

### 5. 闭包引用优化

- [ ] **问题**: 事件处理函数中的闭包可能持有不必要的引用
- [ ] **位置**: 事件处理函数和回调函数
- [ ] **解决方案**: 重构闭包结构，减少不必要的变量捕获
- [ ] **预期效果**: 减少闭包持有的内存占用

### 6. 生命周期管理实现

- [ ] **问题**: 缺乏统一的组件生命周期管理
- [ ] **位置**: 整个 content.ts 文件
- [ ] **解决方案**: 实现 init/destroy 生命周期方法
- [ ] **预期效果**: 提供统一的资源管理机制

## 低优先级优化项

### 7. 性能监控添加

- [ ] **问题**: 缺乏内存使用情况监控
- [ ] **位置**: 全局
- [ ] **解决方案**: 添加内存使用监控和报告机制
- [ ] **预期效果**: 便于发现和定位内存问题

### 8. 代码结构重构

- [ ] **问题**: 代码结构可能不利于内存管理
- [ ] **位置**: 整体架构
- [ ] **解决方案**: 重构为更模块化的结构
- [ ] **预期效果**: 提高代码可维护性和内存管理效率

## 实施计划

1. **第一阶段**: 完成高优先级优化项 (1-3)
2. **第二阶段**: 完成中等优先级优化项 (4-6)
3. **第三阶段**: 完成低优先级优化项 (7-8)

## 测试验证

每完成一项优化后，需要进行以下测试：

- [ ] 功能回归测试
- [ ] 内存使用情况对比
- [ ] 页面切换时的内存释放验证
- [ ] 长时间运行稳定性测试

---

**注意**: 每项优化完成后需要确认无误再进行下一项，确保不影响现有功能。
