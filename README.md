# UTags - Universal Tagging System

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/utags/utags/ci-webapp.yml?branch=main)](https://github.com/utags/utags/actions)
[![UTags Official Site](https://img.shields.io/badge/UTags-Official_Site-brightgreen)](https://utags.link)

> English | [中文](README.zh-CN.md)

## 🚀 Project Overview

**UTags** is a comprehensive tagging ecosystem that revolutionizes how you organize and manage web content. This monorepo contains two complementary applications:

- **🏷️ UTags Extension/Userscript**: Add custom tags and notes to links, users, posts, and videos across the web
- **📚 UTags Bookmark Manager**: A modern web application for advanced bookmark management with powerful filtering

Together, they provide a complete solution for organizing, tagging, and managing your digital content with unprecedented flexibility and control.

🌐 [Experience UTags Live](https://utags.link/) | 📦 [Install Browser Extension](https://chromewebstore.google.com/detail/utags-add-usertags-to-lin/kofjcnaphffjoookgahgjidofbdplgig)

## 📁 Repository Structure

```
utags/
├── packages/
│   ├── extension/          # Browser extension & userscript
│   └── webapp/             # Web-based bookmark manager
├── docs/                   # Documentation
├── assets/                 # Shared assets and screenshots
└── custom-style-examples/  # CSS customization examples
```

## ✨ Key Features

### 🌐 Universal Web Tagging

- Tag users, posts, videos, and links across 50+ websites
- Special tags with filtering effects (hide, block, favorite, etc.)
- Cross-platform synchronization via GitHub and WebDAV
- Support for Chrome, Firefox, Edge, and userscript managers

### 📊 Advanced Bookmark Management

- Powerful filtering engine with AND/OR/NOT logic
- Hierarchical tag organization
- Real-time search and progressive filtering
- Data visualization and usage analytics
- PWA support for offline access

### 🔄 Seamless Integration

- Automatic sync between extension and web app
- Import/export from major browsers
- Open API for custom integrations
- Multi-language support (12+ languages)

## 🚀 Quick Start

### Option 1: Use Both Components (Recommended)

1. **Install the Extension**:

   - [Chrome Web Store](https://chromewebstore.google.com/detail/utags-add-usertags-to-lin/kofjcnaphffjoookgahgjidofbdplgig)
   - [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/utags/)
   - [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/utags-add-usertags-to-l/bhlbflbehfoccjjenpekilgabbjjnphe)
   - [Userscript](https://greasyfork.org/scripts/460718-utags-add-usertags-to-links)

2. **Access the Web App**: Visit [https://utags.link](https://utags.link) for advanced bookmark management

3. **Start Tagging**: Add tags while browsing, manage them in the web app

### Option 2: Extension Only

Install the browser extension to add tags directly while browsing websites.

### Option 3: Web App Only

Use the [web application](https://utags.link) for bookmark management without the extension.

## 📦 Packages

### 🏷️ UTags Extension

**Location**: [`packages/extension/`](packages/extension/)

A browser extension and userscript that enables tagging of web content across 50+ supported websites.

#### Supported Websites

- **Social**: X (Twitter), Reddit, Facebook, Instagram, Threads, TikTok, YouTube
- **Development**: GitHub, Greasy Fork, Hacker News, Stack Overflow
- **Chinese Sites**: Bilibili, Zhihu, Weibo, Douyin, Xiaohongshu, V2EX
- **Forums**: Discourse, Flarum, NGA, Linux.do, NodeSeek
- **And 30+ more sites**

#### Key Features

- 🏷️ **Smart Tagging**: Add tags to users, posts, videos, and links
- 🎯 **Special Tags**: Use tags like `block`, `hide`, `favorite` for content filtering
- 📱 **Touch Support**: Works on mobile browsers
- 🔄 **Auto Sync**: Synchronize data across devices
- 🎨 **Customizable**: Apply custom styles and themes
- 🌍 **Multi-language**: Support for 12+ languages

#### Installation

- **Chrome**: [Chrome Web Store](https://chromewebstore.google.com/detail/utags-add-usertags-to-lin/kofjcnaphffjoookgahgjidofbdplgig)
- **Firefox**: [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/utags/)
- **Edge**: [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/utags-add-usertags-to-l/bhlbflbehfoccjjenpekilgabbjjnphe)
- **Userscript**: [Greasy Fork](https://greasyfork.org/scripts/460718-utags-add-usertags-to-links)

#### Usage

1. Hover over usernames, post titles, or links
2. Click the 🏷️ tag icon that appears
3. Add tags separated by commas
4. Use special tags for filtering effects

---

### 📚 UTags Bookmark Manager

**Location**: [`packages/webapp/`](packages/webapp/)

A modern web application for advanced bookmark management with powerful tagging and filtering capabilities.

#### Key Features

- 🔍 **Advanced Filtering**: AND/OR/NOT logic, regex support, progressive filtering
- 🏷️ **Hierarchical Tags**: Organize with `parent/child/grandchild` structure
- 📊 **Data Visualization**: Usage statistics and analytics dashboard
- 🔄 **Multi-platform Sync**: GitHub and WebDAV synchronization
- 📱 **PWA Support**: Offline access, add to home screen
- 🌓 **Themes**: Light and dark mode support
- 🌍 **Responsive**: Perfect for desktop and mobile

#### Product Advantages

- ✅ **Completely Free**: MIT license, no registration required
- ✅ **No Ads**: Clean, focused experience
- ✅ **Unlimited Bookmarks**: No storage limits
- ✅ **Privacy First**: Local data storage, user control
- ✅ **Self-hostable**: Deploy to your own server
- ✅ **Cross-browser**: Works with all modern browsers

#### Live Instances

- [https://utags.link](https://utags.link/) (Primary)
- [https://utags.top](https://utags.top/)
- [https://utags.github.io](https://utags.github.io/)

#### Self-hosting

**Quick Deploy**:

```bash
# Clone and build
git clone https://github.com/utags/utags.git
cd utags/packages/webapp
npm install && npm run build

# Deploy dist/ folder to your web server
```

**Pre-built Version**:

```bash
# Clone pre-built files
git clone -b gh-pages --single-branch https://github.com/utags/utags.git utags-bookmarks-dist
cd utags-bookmarks-dist
# Deploy to your web server
```

## 🛠 Development

### Prerequisites

- Node.js 18+
- pnpm 8+

### Setup

```bash
# Clone the repository
git clone https://github.com/utags/utags.git
cd utags

# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm test
```

### Package-specific Development

**Extension Development**:

```bash
cd packages/extension
pnpm dev          # Development build
pnpm build        # Production build
pnpm package      # Create distribution package
```

**Webapp Development**:

```bash
cd packages/webapp
pnpm dev          # Start dev server at http://localhost:5173
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm package      # Create distribution package
```

### Available Scripts

- `pnpm format` - Format all code
- `pnpm lint` - Lint and fix issues
- `pnpm build` - Build all packages
- `pnpm package` - Package all distributions
- `pnpm test` - Run tests

## 📸 Screenshots

![Extension in action](assets/screenshots-01.png)
_Adding tags to users and posts_

![Bookmark Manager](assets/screenshots-02.png)
_Advanced filtering and tag management_

![Special Tags](assets/screenshots-03.png)
_Special tags with filtering effects_

## 🛣 Roadmap

### Extension

- [ ] Custom site rules editor
- [ ] Advanced tag styling options
- [ ] Community tag sharing
- [ ] AI-powered tag suggestions

### Webapp

- [ ] Mobile app (React Native)
- [ ] Advanced note-taking features
- [ ] Team collaboration features
- [ ] API marketplace

### Shared

- [ ] Real-time sync improvements
- [ ] Enhanced security features
- [ ] Plugin ecosystem
- [ ] Enterprise features

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Ways to Contribute

- 🐛 [Report bugs](https://github.com/utags/utags/issues)
- 💡 [Request features](https://github.com/utags/utags/issues)
- 🔧 [Submit pull requests](https://github.com/utags/utags/pulls)
- 📖 [Improve documentation](https://github.com/utags/utags/tree/main/docs)
- 🌍 [Help with translations](https://github.com/utags/utags/tree/main/packages/webapp/messages)

## 📄 License

Copyright (c) 2023-2025 [Pipecraft](https://www.pipecraft.net). Licensed under the [MIT License](LICENSE).

## 🔗 Links

- 🌐 **Official Website**: [https://utags.link](https://utags.link)
- 📦 **Chrome Extension**: [Chrome Web Store](https://chromewebstore.google.com/detail/utags-add-usertags-to-lin/kofjcnaphffjoookgahgjidofbdplgig)
- 🦊 **Firefox Add-on**: [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/utags/)
- 📜 **Userscript**: [Greasy Fork](https://greasyfork.org/scripts/460718-utags-add-usertags-to-links)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/orgs/utags/discussions)
- 📺 **Video Demos**: [YouTube](https://www.youtube.com/watch?v=WzUzBA5V91A)

---

[![Pipecraft](https://img.shields.io/badge/Pipecraft-Projects-2EAADC)](https://www.pipecraft.net)
[![UTags](https://img.shields.io/badge/UTags-Official_Site-brightgreen)](https://utags.link)
