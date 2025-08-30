import type {
  BookmarkKeyValuePair,
  BookmarkMetadata,
} from '../types/bookmarks.js'

/**
 * Type definition for a filter condition function
 * @param href - The bookmark URL
 * @param tags - Array of tags associated with the bookmark
 * @param meta - Metadata object containing additional bookmark info
 * @param params - URL search parameters for filter configuration
 * @returns Boolean indicating whether the bookmark matches the condition
 */
export type FilterCondition = (
  href: string,
  tags: string[],
  meta: BookmarkMetadata
) => boolean

export const rejectAllCondition = () => false

/**
 * Registry class for managing and applying bookmark filters
 */
export default class FilterRegistry {
  /**
   * Map storing filter condition factories keyed by parameter name
   */
  private readonly conditionFactories = new Map<
    string,
    (params: URLSearchParams) => FilterCondition | undefined
  >()

  /**
   * Registers a new filter condition factory
   * @param paramName - The URL parameter name that activates this filter
   * @param factory - Function that creates the filter condition
   * @returns The FilterRegistry instance for chaining
   */
  register(
    paramName: string,
    factory: (params: URLSearchParams) => FilterCondition | undefined
  ) {
    this.conditionFactories.set(paramName, factory)
    return this
  }

  /**
   * Applies registered filters to bookmark entries
   * @param entries - Array of bookmark entries to filter
   * @param searchParams - URL search parameters string
   * @returns Filtered array of bookmarks
   */
  apply(
    entries: BookmarkKeyValuePair[],
    searchParams: string | URLSearchParams
  ) {
    const params = new URLSearchParams(searchParams)
    const activeConditions: FilterCondition[] = []

    // Dynamically create conditions based on URL parameters
    for (const [paramName, factory] of this.conditionFactories) {
      if (params.has(paramName)) {
        const condition = factory(params)
        if (condition) activeConditions.push(condition)
      }
    }

    if (activeConditions.length === 0) return entries
    if (activeConditions.includes(rejectAllCondition)) return []

    return entries.filter(([href, { tags, meta }]) =>
      activeConditions.every((condition) => condition(href, tags, meta))
    )
  }
}

/**
 * Default instance of FilterRegistry for global use
 */
export const defaultFilterRegistry = new FilterRegistry()
