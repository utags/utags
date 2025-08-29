# Contribution Guidelines

## Development Environment

- Node.js 18+
- npm 9+
- VS Code (recommended)

## Code Style

- Follow Prettier rules from `.prettierrc.cjs`
- ESLint for TypeScript validation
- Commit hooks via `lint-staged`

## Commit Message

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

Valid types: feat|fix|docs|style|refactor|test|chore

## Testing

- 80% minimum coverage for new features
- Run `npm test` before pushing
- Update snapshots with `npm test -- -u`

## Issue/PR Process

1. Use provided templates
2. Link related issues
3. Squash merge only

## Multilingual Maintenance

- Keep CONTRIBUTING.md & CONTRIBUTING.zh-CN.md synchronized
- Update both versions for major changes
- Use GitHub Discussions for translation proposals
