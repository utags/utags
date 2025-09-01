# Star Handler Module

## Overview

The `star-handler` module provides a clean, optimized implementation for toggling star tags on bookmarks. It was extracted from the main `content.ts` file to improve code organization and maintainability. The module uses a singleton pattern with initialization to allow usage across multiple files.

## Features

- **Type Safety**: Full TypeScript support with proper interfaces
- **Input Validation**: Validates bookmark metadata before processing
- **Error Handling**: Graceful error handling with console logging
- **Global Access**: Can be used from any file after initialization
- **Data Sanitization**: Filters out empty title and description values
- **Singleton Pattern**: Ensures consistent behavior across the application

## Usage

### Initialization (in content.ts)

```typescript
import { initStarHandler, toggleStarHandler } from './modules/star-handler'

// Initialize the handler with required dependencies (call once during startup)
initStarHandler(showCurrentPageLinkUtagsPrompt)
```

### Usage (in any file)

```typescript
import { toggleStarHandler } from './modules/star-handler'

// Use the handler anywhere in the application
toggleStarHandler('https://example.com', 'Page Title', 'Page Description')
```

## API

### `initStarHandler(promptFunction)`

Initializes the star handler with required dependencies. Must be called once during application startup.

**Parameters:**

- `promptFunction`: Function to show the utags prompt
  - Type: `(tag?: string, remove?: boolean, options?: Record<string, any>) => void`

**Returns:**

- `void`

### `toggleStarHandler(href, title?, description?)`

Handles toggling star tag for a bookmark. Can be called from any file after initialization.

**Parameters:**

- `href`: The URL of the bookmark (required)
- `title`: Optional title for the bookmark
- `description`: Optional description for the bookmark

**Returns:**

- `void`

### `STAR_TAG`

Exported constant containing the star character: `'★'`

## Types

### `BookmarkMetadata`

```typescript
interface BookmarkMetadata {
  href: string
  title?: string
  description?: string
}
```

## Implementation Details

1. **Initialization**: The module must be initialized once with `initStarHandler()` before use
2. **Validation**: The handler validates input parameters before processing
3. **Star Detection**: Checks if the bookmark already has a star tag
4. **Options Creation**: Creates a clean options object with only non-empty values
5. **Error Handling**: Catches and logs any errors during processing

## Benefits of New Architecture

- **Global Accessibility**: Can be imported and used from any file in the project
- **Separation of Concerns**: Star handling logic is isolated from main content script
- **Reusability**: Easily reusable across different parts of the application
- **Maintainability**: Cleaner code structure and better organization
- **Type Safety**: Improved type checking and IntelliSense support
- **Singleton Pattern**: Ensures consistent state and behavior

## Migration from Factory Pattern

The module was refactored from a factory function pattern to a singleton pattern to enable global access:

**Before:**

```typescript
// Factory pattern - limited to local scope
const toggleStarHandler = createStarToggleHandler({
  showCurrentPageLinkUtagsPrompt,
})
```

**After:**

```typescript
// Singleton pattern - global access after initialization
initStarHandler(showCurrentPageLinkUtagsPrompt)
// Now toggleStarHandler can be imported and used anywhere
```

This change allows the `toggleStarHandler` function to be used in site-specific modules and other parts of the application without requiring dependency injection at each usage point.
