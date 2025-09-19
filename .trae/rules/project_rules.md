# UTags Project Rules Documentation

## Project Overview

UTags is a modern bookmark management tool focused on:

- Efficient bookmark organization and retrieval
- Multi-dimensional categorization and filtering
- Clean and intuitive user interface
- Cross-device synchronization support

## Core Features

### Filtering Functionality

- Triple filtering dimensions: Tags, Domains, Keywords
- Combined filtering logic supporting AND/OR conditions
- Real-time filtering result feedback

### User Interface

- Responsive layout, adaptable to desktop/mobile
- Dark/light dual theme mode
- Animation transition effects
- Keyboard shortcut support

## Development Goals and Roles

Your goal is to help users complete the bookmark WebApp design and development in a user-friendly way. You should proactively complete all work rather than waiting for multiple prompts from users.

When understanding requirements, writing code, and solving problems, always follow these principles:

### Understanding User Requirements

- Fully understand user requirements, think from the user's perspective
- As a product manager, analyze if requirements have gaps, discuss with users to refine them
- Choose the simplest solution to meet user needs

### When Writing Code

- Must use Svelte 5.x version, fully leveraging Runes syntax features
- Prioritize TypeScript for type checking to improve code quality
- Use Tailwind CSS for style design, ensuring responsive layouts
- Implement PWA functionality, supporting offline access and installation to home screen
- Add detailed English comments to each function and key code block
- Implement appropriate error handling and logging
- All user data transmission must use HTTPS

### When Solving Problems

- Thoroughly read relevant code files, understand all code functionality and logic
- Analyze the causes of errors, propose approaches to solve problems
- Interact with users multiple times, adjusting solutions based on feedback

### Project Summary and Optimization

- After completing tasks, reflect on the completion steps, consider potential issues and improvement methods
- Update README.md file, including new feature descriptions and optimization suggestions
- Consider using Svelte's advanced features such as Runes, Transitions, etc.
- Optimize application performance, including startup time and memory usage
- Ensure the application complies with PWA best practices and Web standards

Throughout the process, ensure the use of the latest Svelte and Web development best practices.

## Technical Architecture Specification

### Frontend Technology Stack

| Technology   | Version | Purpose                       |
| ------------ | ------- | ----------------------------- |
| Svelte       | 5.x     | Core Framework (Runes syntax) |
| TypeScript   | 4.9+    | Type Checking                 |
| Tailwind CSS | 3.x     | UI Styling System             |
| Vite         | 4.x     | Build Tool                    |
| Lucide       | Latest  | Icon System                   |
| ParaglideJS  | Latest  | Internationalization (i18n)   |
| Workbox      | 6.x     | PWA Support                   |

### PWA Implementation Specification

1. **Core Requirements**:

   - Must provide complete Web App Manifest
   - Must register Service Worker
   - Must support HTTPS protocol
   - Must implement offline caching strategy

2. **Caching Strategy**:

   - Static resources: CacheFirst + version control
   - API data: NetworkFirst + fallback cache
   - User-generated content: StaleWhileRevalidate
   - Static resource cache validity period of 30 days

3. **Development Considerations**:

   - Service Worker file must be placed in the project root directory
   - Avoid caching overly large files in the Service Worker
   - Update cache version number with each new version release
   - Implement appropriate cache cleanup mechanisms

4. **Testing Requirements**:

   - Verify core functionality availability in offline state
   - Test installation to home screen process
   - Check degradation handling under different network conditions
   - Verify cache update mechanism

5. **Performance Optimization**:
   - Critical resource preloading
   - Use Compression to compress static resources
   - Implement skeleton screens to improve perceived performance
   - Avoid synchronous localStorage operations

### PWA Implementation Details

```typescript
// Service Worker registration example
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            // Notify user to refresh page
          }
        })
      })
    })
  })
}
```

### ParaglideJS Internationalization (i18n) Specification

ParaglideJS, in conjunction with the Inlang ecosystem, is utilized for managing internationalization within the UTags project. It offers type-safe message handling and seamless integration with Svelte and Vite.

1. **Configuration**:

   - The core configuration resides in `project.inlang/settings.json`. This file defines source language, target languages, and necessary Inlang plugins.
   - The Vite plugin `@inlang/paraglide-js-adapter-vite` integrates ParaglideJS into the build process, enabling automatic compilation of messages and code generation.
     - Ensure `vite.config.ts` includes the Paraglide plugin, specifying the `project` path (to `project.inlang`) and `outdir` (e.g., `./src/lib/paraglide`).

2. **Message Files**:

   - Translations are stored in JSON files located at `messages/{locale}.json` (e.g., `messages/en.json`, `messages/zh-CN.json`).
   - Messages should use the ICU Message Format to support complex translations, including plurals, gender, and interpolations.
   - Example `messages/en.json`:
     ```json
     {
       "APP_TITLE": "UTags Bookmarks",
       "GREETING": "Hello, {name}!",
       "BOOKMARK_COUNT": [
         {
           "declarations": ["input count", "local countPlural = count: plural"],
           "selectors": ["countPlural"],
           "match": {
             "countPlural=one": "One bookmark",
             "countPlural=other": "{count} bookmarks"
           }
         }
       ]
     }
     ```

3. **Code Generation**:

   - ParaglideJS compiles messages into type-safe JavaScript/TypeScript modules.
   - The generated files are typically placed in the `outdir` specified in `vite.config.ts` (e.g., `src/lib/paraglide`).
   - Key generated files include:
     - `messages.js` (or `.ts`): Contains functions for each message key (e.g., `m.APP_TITLE()`, `m.GREETING({ name: 'User' })`).
     - `runtime.js` (or `.ts`): Provides runtime utilities for managing language state (e.g., `getLocale()`, `setLocale()`).

4. **Usage in Svelte Components**:

   - Import generated messages and runtime functions into your Svelte components.
   - Utilize Svelte 5 Runes for reactive language state management.

   ```svelte
   <script lang="ts">
     // Import ParaglideJS generated files
     import * as m from '../paraglide/messages' // Adjust path based on your outdir
     import { getLocale, setLocale } from '../paraglide/runtime' // Adjust path

     // Reactive state for the current language
     let currentLanguage = $state(getLocale()) // Initialize with the current language

     // Effect to update Paraglide's runtime and document lang attribute when currentLanguage changes
     $effect(() => {
       setLocale(currentLanguage)
       document.documentElement.lang = currentLanguage
       // Optionally, persist the selected language to localStorage
       if (typeof localStorage !== 'undefined') {
         localStorage.setItem('app-locale', currentLanguage)
       }
     })

     /**
      * Switches the application language.
      * @param lang The language tag to switch to (e.g., 'en', 'zh-CN').
      */
     function switchLanguage(lang: 'en' | 'zh-CN'): void {
       // Add all supported language tags here
       currentLanguage = lang
     }
   </script>

   <div>
     <h1>{m.APP_TITLE()}</h1>
     <p>{m.GREETING({ name: 'Developer' })}</p>
     <p>{m.BOOKMARK_COUNT({ count: 5 })}</p>

     <button onclick={() => switchLanguage('en')}>English</button>
     <button onclick={() => switchLanguage('zh-CN')}>中文</button>

     <p>Current Language: {currentLanguage}</p>
   </div>
   ```

5. **Best Practices**:
   - **Descriptive Keys**: Use clear and descriptive keys for messages (e.g., `SETTINGS_SAVE_BUTTON` instead of just `SAVE`).
   - **ICU Format**: Leverage the full power of ICU Message Format for complex pluralization, gender selection, and other localization needs.
   - **Centralized Management**: Keep all message files within the `messages` directory and ensure `project.inlang/settings.json` is up-to-date.
   - **Version Control**: Commit `project.inlang/settings.json` and all `messages/*.json` files to your repository. The generated `src/lib/paraglide` directory can often be added to `.gitignore` as it's build output, but this depends on team preference and CI/CD setup.
   - **CLI Usage**: Familiarize yourself with Inlang CLI commands (`npx @inlang/cli <command>`) for tasks like linting messages or manually triggering compiles if needed outside of Vite's HMR.

## Code Development Standards

### General Rules

1. **Naming Conventions**:

   - Components: PascalCase
   - Variables/Functions: camelCase
   - Constants: UPPER_SNAKE_CASE

2. **Event Binding Standards**:

   - Use native DOM event binding syntax (e.g., onclick)
   - Prohibit using Svelte legacy on: event binding syntax
   - Event handler functions require explicit type declarations

3. **Styling Standards**:

   - Prioritize Tailwind classes
   - Custom CSS only when Tailwind cannot meet requirements
   - Dark mode styles must explicitly declare `dark:` prefix

4. **State Management**:

   - Component-level state: `$state`
   - Application-level state: `$derived` + custom stores
   - URL persistence: Filter conditions automatically sync to URL hash

5. **Code Comments and Formatting**:

   - Comment content must be in English
   - Use Prettier for code formatting
   - Add function-level comments

6. **Value Handling**:

   - Prefer using `undefined` instead of `null` for representing absence of values
   - Use `undefined` for optional parameters, uninitialized variables, and missing properties
   - Reserve `null` only for cases where it has a specific semantic meaning distinct from `undefined`

7. **Language Standards**:
   - All code comments must be written in English
   - All user-facing text content must be in English (then localized through i18n)
   - Avoid using Chinese or other non-English languages in code, comments, or direct string literals

### Svelte 5 Event Handling Standards

1. **Avoid using createEventDispatcher**:

   - `createEventDispatcher` is deprecated in Svelte 5
   - Prioritize using `$bindable` for two-way data binding

2. **Component Communication Best Practices**:

   - For parent-child communication, use `$bindable` properties for two-way binding
   - For complex state management, use global state management (like custom stores)
   - For one-time events, use DOM events or callback functions

3. **Code Examples**:

```svelte
<!-- Old approach (not recommended) -->
<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  function handleChange(value) {
    dispatch('change', { value });
  }
</script>

<!-- New approach (recommended) -->
<script>
  let {
    value = $bindable(0)
  } = $props();

  function handleChange(newValue) {
    value = newValue;  // Directly modify the bound value
  }
</script>
```

4. **Parent Component Usage**:

```svelte
<!-- Old approach (not recommended) -->
<ChildComponent on:change={handleChange} />

<!-- New approach (recommended) -->
<ChildComponent bind:value={parentValue} />
```

5. **Migration Strategy**:
   - For new components, directly use `$bindable` for two-way binding
   - For existing components, gradually replace `createEventDispatcher` during refactoring
   - Ensure all component communications maintain a consistent pattern

### Component Development Template

```svelte
<script lang="ts">
  // Props type declaration
  interface Props {
    prop1: string
    prop2?: number
  }

  // State type declaration
  interface State {
    count: number
    double: number
  }

  // Props declaration
  let { prop1, prop2 = 0 }: Props = $props()

  // State management
  let count = $state<number>(0)
  $derived<number>((double = count * 2))
</script>

<!-- Template -->
<div class="container mx-auto p-4">
  <!-- Content -->
</div>

<style>
  /* Only add when Tailwind cannot satisfy requirements */
  .custom-style {
    /* ... */
  }
</style>
```

```svelte
<script>
  // Event handling uses onclick rather than on:click
  function handleClick() {
    console.log('Button clicked')
  }
</script>

<button onclick={handleClick}> Click me </button>
```

### Style Guide

1. **Layout Classes**: Prioritize Tailwind's flex system
2. **Spacing System**: Based on Tailwind's spacing scale (0.25rem increments)
3. **Color System**:
   - Primary color: blue-500
   - Secondary colors: green-500/purple-500
   - Dark mode: dark: prefix

### Icon System

- **Lucide**: Modern, lightweight icon library
- Features:
  - Import on demand, optimize package size
  - Support for custom size and color
  - Perfect integration with Tailwind style system
  - Provides rich collection of commonly used icons

## Project Structure Standards

```
/src
│── /components         # Public components
│   ├── filters/        # Filter-related components
│   ├── ui/             # Basic UI components
│   └── ...
│── /lib                # Utility libraries
│   ├── bookmarks.ts    # Bookmark operations
│   ├── filters.ts      # Filter logic
│   └── ...
│── /stores             # State management
│   ├── settings.js     # User settings
│   └── ...
└── /styles             # Global styles
    ├── base.css        # Base styles
    └── transitions.css # Animation styles
```

## Navigation Item Style Specifications

1. **Title Style**:

   - Use `flex w-full items-center gap-2 rounded-md px-2 py-1.5` base layout
   - Text style: `text-sm font-medium text-gray-700 dark:text-gray-200`
   - Hover effect: `hover:bg-gray-100 dark:hover:bg-gray-800`
   - Icon size: main icon 20px, arrow icon 16px

2. **Sub-item Style**:
   - Padding: `px-2 py-1.5`
   - Text style: `text-sm text-gray-600 dark:text-gray-300`
   - Icon size: 16px

## Development Workflow

### Code Submission

- Follow Conventional Commits specification
- Commit message format:
  ```
  <type>(<scope>): <subject>
  [optional body]
  [optional footer]
  ```
  Valid types: feat|fix|docs|style|refactor|test|chore

### Quality Control

- ESLint + Prettier code checking
- New features must maintain 80%+ test coverage
- Execute `npm test` before submission

### Development Process

1. **Branch Strategy**: Git Flow
2. **Commit Standards**: Conventional Commits
3. **Code Checking**: ESLint + Prettier
4. **Testing Strategy**: Vitest + Testing Library

## Extended Information

### Best Practices

1. **Caching Strategy Selection**

   - Static resources: CacheFirst + version control
   - API data: NetworkFirst + fallback cache
   - User-generated content: StaleWhileRevalidate

2. **Update Handling**

   - Use skipWaiting for automatic updates
   - Implement version notification UI
   - Force refresh for major updates

3. **Offline Experience**

   - Provide meaningful offline page
   - Cache critical API responses
   - Implement background sync mechanism

4. **Installation Prompts**
   - Custom installation guide process
   - Track installation events
   - Provide post-installation guidance

### Filter Condition Data Structure

```typescript
interface FilterCondition {
  type: 'tag' | 'domain' | 'keyword'
  value: string
  operator?: 'AND' | 'OR'
}
```

### Bookmark Data Structure

Complete type definition file: `src/types/bookmarks.ts`

```typescript
/**
 * The key is the URL of the bookmark.
 */
export type BookmarkKey = string

/**
 * A tuple representing a bookmark entry with its URL and associated data.
 * The first element is the bookmark URL (key), and the second element contains tags and metadata.
 * Used primarily in array-based bookmark operations and data transformations.
 */
export type BookmarkKeyValuePair = [BookmarkKey, BookmarkTagsAndMetadata]

/**
 * The value is an object containing the tags and metadata of the bookmark.
 */
export type BookmarksData = Record<BookmarkKey, BookmarkTagsAndMetadata>

/**
 * The bookmarks store.
 */
export type BookmarksStore = {
  data: BookmarksData
  meta: {
    databaseVersion: number
    created: number
    updated?: number
    exported?: number
  }
}
```

### Performance Optimization

- Virtual scrolling: Long list rendering
- Debounce processing: Search input
- Conditional rendering: Complex components

## Problems Encountered During Development and Solutions

### Svelte Attribute Value Special Character Parsing Issue

**Problem Description**:
When using Svelte's attribute binding syntax, if the attribute value contains a right parenthesis `)` character, it causes template parsing errors. For example:

```svelte
<a {href}>{href}</a>
```

When the `href` value is `http://example.com/?a=(1)`, it is incorrectly parsed as:

```html
<a href="http://example.com/?a=(1">http://example.com/?a=(1</a>)
```

**Problem Cause**:
Svelte's template compiler mistakenly recognizes the `)` in the attribute value as the end of the binding syntax, causing parsing interruption.

**Solution**:
Isolate special characters by nesting a `span` element to ensure correct parsing:

```svelte
<a {href}><span>{href}</span></a>
```

**Best Practice Recommendations**:

1. For dynamic attribute values that may contain special characters, prioritize using child elements for wrapping
2. In URL handling scenarios, consider using encodeURIComponent processing first
3. For complex URL scenarios, consider using a dedicated URL handling library

## Documentation Maintenance

1. **Update Timing**:

   - When technology stack is upgraded
   - When architecture undergoes major adjustments
   - When core features are added

2. **Multilingual Maintenance**:
   - Keep Chinese and English documentation synchronized
   - Major changes require simultaneous updates to both versions

## About This Document

This document details the project's technical features and code standards, helping new members and any AI assistants quickly understand the project context and development style. The document includes:

1. Technology stack details
2. Code structure explanation
3. Typical code patterns
4. Development conventions
5. Development goals and roles
6. Problem-solving approaches
