# UTags Bookmark Manager

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/utags/utags/ci-webapp.yml?branch=main)](https://github.com/utags/utags/actions)
[![UTags Official Site](https://img.shields.io/badge/UTags-Official_Site-brightgreen)](https://utags.link)

## 🚀 Project Overview

**UTags Bookmark Manager** is a modern bookmark management tool designed for developers and power users. Say goodbye to traditional bookmark chaos and embrace **flexible tagging systems** and **powerful filtering engines** to make your web resource management organized, efficient, and convenient.

🌐 [Experience the Official Website](https://utags.link/) | 🔗 [Seamless Integration with UTags Browser Extension](https://github.com/utags/utags)

## ✨ Core Features

### 🏷️ Smart Tag Management

- **Multi-dimensional Tagging System**: Add multiple tags to bookmarks for precise multi-dimensional classification
- **Hierarchical Tag Structure**: Support tree-like organization with `parent-tag/child-tag/grandchild-tag` structure
- **Tag Auto-completion**: Smart suggestions and quick input to enhance tagging efficiency (Coming soon)

### 🔍 Powerful Filtering Engine

- **Compound Logic Filtering**: Advanced filtering with AND/OR/NOT logical combinations
- **Regular Expression Matching**: Precise matching for complex search patterns
- **Progressive Filtering**: Filter within results to gradually narrow down scope
- **Real-time Search Feedback**: Instant display of matching results and statistics
- **Filter Preset Saving**: Save common filter conditions for one-click quick application
- **Smart Collections**: Create dynamic collections based on filter conditions with automatic content updates

### 🔄 Data Sync & Backup

- **Multi-platform Sync**: Cross-device data synchronization via GitHub and WebDAV
- **Automatic Cloud Backup**: Scheduled backups for data security
- **Data Import/Export**: Support for mainstream browser bookmark formats (Chrome/Edge/Firefox/Safari)

### 📱 Modern Experience

- **PWA Application**: Support for offline access, add to home screen, and native app experience
- **Responsive Design**: Perfect adaptation for desktop and mobile devices（Comming soon）
- **Light/Dark Themes**: Eye-friendly modes for different usage scenarios
- **Multiple View Modes**: List, card, compact, and other display options

## 🎯 Product Advantages

- ✅ **Completely Open Source & Free**: MIT open source license, no registration required, permanently free
- ✅ **No Ads**: Clean experience, focused purely on bookmark management
- ✅ **No Bookmark Limit**: Unlimited storage for all your bookmarks
- ✅ **Privacy & Security**: Local data storage, complete user control
- ✅ **Easy Deployment**: Support for self-hosting, one-click deployment to personal servers
- ✅ **Data Visualization**: Intuitive statistics dashboard to understand usage habits
- ✅ **Cross-browser Compatibility**: Support for all modern browsers

## ⚡ Quick Start

1. **Install Browser Extension (Optional)**
   Install the [UTags Extension](https://github.com/utags/utags) for immersive bookmarking

2. **Access Management Interface**
   Open the [UTags Web Interface](https://utags.link) to manage bookmarks

3. **Basic Operations**
   - Add bookmarks: Click the extension icon or manually enter
   - Filter bookmarks: Use compound filter conditions
   - Import bookmarks: Support importing bookmark HTML files from Chrome/Edge/Firefox/Safari

## Usages

### How to add a bookmark

- Add bookmarks on bookmark manager page
- Add bookmarks via [UTags extension/userscript](https://github.com/utags/utags)
- Make your own extension or userscript through our open API

### How to use filters

- Filter by keywords, tags, domains, and other metadata
- Multi-level filtering system supporting AND/OR/NOT logic combinations
- Regular expression matching
- Save filter presets for quick access in future sessions

## 🛣 Development Roadmap

- V1.0 TODO

  - [x] Integration with UTags extension/script
  - [x] Internationalization
  - Batch tag modification
  - Merge processing during bookmark import

- **Bookmark Management Enhancements**

  - [x] Batch delete tags
  - [x] Batch add tags
  - [x] Bulk delete bookmarks
  - Batch rename tags
  - Bulk open all bookmarks
  - Global search functionality. Launch search function through shortcuts on any website to search all bookmarks, tags, and notes

- **Bookmark Collection Solutions**

  - Add bookmarks via [UTags extension/userscript](https://github.com/utags/utags)
  - Automatic title and webpage summary retrieval
  - AI smart tag recommendations

- **Interface Styles**

  - Custom styling options
  - Navigation website style view
  - Card view
  - Note viewing interface
  - Advanced note editing/viewing interface

- **Data Interoperability**
  - Official cloud sync capability
  - Bookmark export/import enhancements
  - Use IndexedDB storage when the bookmark volume is extremely large

## 🛠 Development

Wiki: [Development Guide](https://deepwiki.com/utags/utags-bookmarks)

## 📦 Installation & Usage

### Development

```bash
npm install
npm run dev
```

Access the application at `http://localhost:5173`

### Production Deployment

#### Method 1: Build from Source

```bash
# Clone the repository
git clone https://github.com/utags/utags.git
cd utags

# Install dependencies
pnpm install

# Build for production
pnpm run build

# Option 1: Deploy the dist folder to your web server
# The built files will be in the 'dist' directory

# Option 2: Start a local preview server
pnpm run preview
# This will serve the built files at http://localhost:4173
```

#### Method 2: Deploy Pre-built Version

```bash
# Clone the gh-pages branch (contains pre-built files)
git clone -b gh-pages --single-branch https://github.com/utags/utags.git utags-bookmarks-dist
cd utags-bookmarks-dist

# Deploy the files to your web server
# All files in this directory are ready for deployment
```

**To update to the latest version:**

```bash
cd utags-bookmarks-dist

# Fetch and reset to the latest version
# Note: gh-pages branch history is overwritten with each update
git fetch origin gh-pages
git reset --hard origin/gh-pages

# Re-deploy the updated files to your web server
```

> **Note**: For production deployment, ensure your web server is configured to serve static files and handle client-side routing for the single-page application.

## 🤝 Contributing

Contributions through:

- 🐛 [GitHub Issues](https://github.com/utags/utags/issues) - for bug reports
- 💡 [Pull Requests](https://github.com/utags/utags/pulls) - for feature additions
- 💬 [GitHub Discussions](https://github.com/orgs/utags/discussions) - get help and share tips

Please follow our [contribution guidelines](CONTRIBUTING.md).

## Instances

- [https://utags.link](https://utags.link/)
- [https://utags.top](https://utags.top/)
- [https://utags.github.io](https://utags.github.io/)

## 📄 License

Copyright (c) 2025 [Pipecraft](https://www.pipecraft.net). Licensed under the [MIT License](LICENSE).

---

[![Pipecraft Projects](https://img.shields.io/badge/Pipecraft-Projects-2EAADC)](https://www.pipecraft.net)
[![UTags Offcial Site](https://img.shields.io/badge/UTags-Offcial_Site-brightgreen)](https://utags.link)
