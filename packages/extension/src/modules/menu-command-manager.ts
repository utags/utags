import { getSettingsValue } from 'browser-extension-settings'
import {
  registerMenuCommand,
  type RegisterMenuCommandOptions,
} from 'browser-extension-utils'
import { splitTags } from 'utags-utils'

import { i } from '../messages'

/**
 * Interface for menu command state
 */
type MenuCommandState = {
  isRegistering: boolean
  menuId: string | number | undefined
  lastTags: string[] | undefined
}

/**
 * Interface for quick tag menu command state
 */
type QuickTagCommandState = {
  isRegistering: boolean
  menuId: string | number | undefined
  tag: string
  hasTag: boolean
}

/**
 * Class to manage menu commands for adding tags to current page
 */
export class MenuCommandManager {
  private state: MenuCommandState = {
    isRegistering: false,
    menuId: undefined,
    lastTags: undefined,
  }

  private readonly quickTagStates = new Map<string, QuickTagCommandState>()

  /**
   * Constructor for MenuCommandManager
   * @param onClickHandler - Callback function to execute when menu command is clicked
   * @param onQuickTagClickHandler - Callback function to execute when quick tag menu command is clicked
   */
  constructor(
    private readonly onClickHandler: () => void,
    private readonly onQuickTagClickHandler: (
      tag: string,
      remove: boolean
    ) => void
  ) {}

  /**
   * Register or update menu command with new tags
   * @param tags - Optional array of tags to display in menu
   */
  async updateMenuCommand(tags?: string[]): Promise<void> {
    // Prevent concurrent registration
    if (this.state.isRegistering) {
      return
    }

    // Skip if menu exists and tags haven't changed
    if (this.state.menuId && !this.hasTagsChanged(tags)) {
      return
    }

    this.state.lastTags = tags
    this.state.isRegistering = true

    try {
      const title = this.generateMenuTitle(tags)
      if (this.state.menuId) {
        // Update existing menu command
        const options: RegisterMenuCommandOptions = {
          id: String(this.state.menuId),
          accessKey: 'u',
        }
        await registerMenuCommand(title, this.onClickHandler, options)
      } else {
        // Register new menu command
        const options: RegisterMenuCommandOptions = {
          accessKey: 'u',
        }
        this.state.menuId = await registerMenuCommand(
          title,
          this.onClickHandler,
          options
        )
      }
    } catch (error) {
      console.error('Failed to register menu command:', error)
    } finally {
      this.state.isRegistering = false
    }
  }

  /**
   * Get current menu command ID
   * @returns Current menu ID or undefined
   */
  getMenuId(): string | number | undefined {
    return this.state.menuId
  }

  /**
   * Get current registration status
   * @returns True if currently registering a menu command
   */
  isRegistering(): boolean {
    return this.state.isRegistering
  }

  /**
   * Update quick tag menu commands based on current tags and settings
   * @param currentTags - Array of current page tags
   */
  async updateQuickTagMenuCommands(currentTags: string[] = []): Promise<void> {
    const quickTagsValue = getSettingsValue<string>('quickTags') || '★'
    const quickTags = splitTags(quickTagsValue)

    // Remove menu commands for tags that are no longer in settings
    for (const [tag, state] of this.quickTagStates.entries()) {
      if (!quickTags.includes(tag)) {
        this.quickTagStates.delete(tag)
      }
    }

    // Update or create menu commands for each quick tag
    for (const tag of quickTags) {
      // eslint-disable-next-line no-await-in-loop
      await this.updateQuickTagMenuCommand(tag, currentTags)
    }
  }

  /**
   * Reset the menu command manager state
   */
  reset(): void {
    this.state = {
      isRegistering: false,
      menuId: undefined,
      lastTags: undefined,
    }
    this.quickTagStates.clear()
  }

  /**
   * Generate menu command title based on tags
   * @param tags - Array of tags to display in title
   * @returns Formatted title string
   */
  private generateMenuTitle(tags?: string[]): string {
    if (tags && tags.length > 0) {
      return '🏷️ ' + i('menu.modifyCurrentPageTags') + ' #' + tags.join(', ')
    }

    return '🏷️ ' + i('menu.addTagsToCurrentPage')
  }

  /**
   * Generate quick tag menu command title
   * @param tag - The quick tag
   * @param hasTag - Whether current page has this tag
   * @returns Formatted title string
   */
  private generateQuickTagMenuTitle(tag: string, hasTag: boolean): string {
    if (hasTag) {
      return '➖ ' + i('menu.removeQuickTag').replace('{tag}', tag)
    }

    return '➕ ' + i('menu.addQuickTag').replace('{tag}', tag)
  }

  /**
   * Check if tags have changed since last update
   * @param tags - Current tags array
   * @returns True if tags are different from last update
   */
  private hasTagsChanged(tags?: string[]): boolean {
    const currentTagsString = tags?.join(',') || ''
    const lastTagsString = this.state.lastTags?.join(',') || ''
    return currentTagsString !== lastTagsString
  }

  /**
   * Update a single quick tag menu command
   * @param tag - The quick tag
   * @param currentTags - Array of current page tags
   */
  private async updateQuickTagMenuCommand(
    tag: string,
    currentTags: string[]
  ): Promise<void> {
    const hasTag = currentTags.includes(tag)
    const existingState = this.quickTagStates.get(tag)

    // Skip if already registering or state hasn't changed
    if (
      existingState?.isRegistering ||
      (existingState && existingState.hasTag === hasTag)
    ) {
      return
    }

    // Initialize or update state
    const state: QuickTagCommandState = {
      isRegistering: true,
      menuId: existingState?.menuId,
      tag,
      hasTag,
    }
    this.quickTagStates.set(tag, state)

    try {
      const title = this.generateQuickTagMenuTitle(tag, hasTag)
      const clickHandler = () => {
        this.onQuickTagClickHandler(tag, hasTag)
      }

      if (state.menuId) {
        // Update existing menu command
        const options: RegisterMenuCommandOptions = {
          id: String(state.menuId),
        }
        await registerMenuCommand(title, clickHandler, options)
      } else {
        // Register new menu command
        const options: RegisterMenuCommandOptions = {}
        state.menuId = await registerMenuCommand(title, clickHandler, options)
      }

      state.isRegistering = false
      this.quickTagStates.set(tag, state)
    } catch (error) {
      console.error(
        `Failed to register quick tag menu command for ${tag}:`,
        error
      )
      state.isRegistering = false
      this.quickTagStates.set(tag, state)
    }
  }
}

/**
 * Create a new MenuCommandManager instance
 * @param onClickHandler - Callback function for menu command clicks
 * @param onQuickTagClickHandler - Callback function for quick tag menu command clicks
 * @returns New MenuCommandManager instance
 */
export function createMenuCommandManager(
  onClickHandler: () => void,
  onQuickTagClickHandler: (tag: string, remove: boolean) => void
): MenuCommandManager {
  return new MenuCommandManager(onClickHandler, onQuickTagClickHandler)
}
