# 贡献指南

## 开发环境要求

- Node.js 18+
- npm 9+
- 推荐使用 VS Code

## 代码规范

- 严格遵守项目中的.prettierrc.cjs 格式配置
- 使用 ESLint 进行 TypeScript 校验
- 通过 lint-staged 实现提交前自动格式化

## 提交信息规范

```
<类型>(<作用域>): <主题>

[可选正文]

[可选脚注]
```

有效类型：feat|fix|docs|style|refactor|test|chore

## 测试要求

- 新功能需保持 80%以上测试覆盖率
- 推送代码前执行 `npm test`
- 更新快照使用 `npm test -- -u`

## Issue/PR 流程

1. 使用官方模板提交
2. 关联相关 Issue
3. 仅接受 Squash 合并

## 多语言维护

- 保持 CONTRIBUTING.md 与 CONTRIBUTING.zh-CN.md 内容同步
- 重大变更需同时更新两个版本
- 翻译建议请通过 GitHub Discussions 提出

## Conventional Commits 规范

Conventional Commits 是一种标准化的 Git 提交消息格式规范，它通过特定的提交消息结构来提高项目的可维护性和自动化程度。

### 核心格式

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

### 主要组成部分

1. **Type（类型）** - 必填，表示提交的性质：

   - `feat`: 新功能
   - `fix`: bug 修复
   - `docs`: 文档变更
   - `style`: 代码样式调整（空格、格式化等）
   - `refactor`: 既不是修复 bug 也不是添加新功能的代码变更
   - `perf`: 性能优化
   - `test`: 测试相关变更
   - `build`: 构建系统或外部依赖变更
   - `ci`: CI 配置变更
   - `chore`: 其他不修改代码或测试的变更

2. **Scope（范围）** - 可选，说明影响范围：

   - 例如：`feat(login)`: 表示登录功能相关的新特性

3. **Description（描述）** - 必填，简洁的变更说明：

   - 使用现在时态（"add"而非"added"）
   - 首字母小写
   - 不加句号

4. **Body（正文）** - 可选，详细说明变更：

   - 解释"为什么"要这样修改
   - 与标题空一行

5. **Footer（页脚）** - 可选：
   - 包含破坏性变更说明（BREAKING CHANGE）
   - 关联 issue（Closes #123）

### 实际示例

```bash
feat(auth): add password strength meter

Add visual indicator for password strength validation during registration.

Closes #42
```

```bash
fix(api): handle null response in user endpoint

Prevent server error when API returns null for inactive users.

BREAKING CHANGE: Response format changed for inactive users
```

### 优势

1. **自动化生成变更日志**：可以自动提取 feat/fix 等类型生成版本变更记录
2. **语义化版本控制**：通过提交类型自动确定版本号变更（feat→ 小版本，fix→ 补丁版本）
3. **提高可读性**：标准化格式使团队协作更高效
4. **工具链集成**：与 semantic-release 等工具完美配合
