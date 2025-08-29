import type { BookmarkMetadata } from '../../types/bookmarks.js'

/**
 * Creates a time-based filter condition for bookmarks
 * @param params - URL search parameters containing time filter conditions
 * @returns Filter condition function or undefined if no time filter specified
 */
export function createTimeCondition(params: URLSearchParams) {
  // Extract time filter parameters from URL
  const timeType = params.get('time') // 'created' or 'updated'
  if (!timeType) return undefined

  const period = params.get('period') // Time period string (e.g. '7d', '30d', '3m', '1y')
  const startDate = params.get('start') // Start date in YYYY-MM-DD format
  const endDate = params.get('end') // End date in YYYY-MM-DD format

  // Initialize date range variables
  let minDate: Date | undefined
  let maxDate: Date | undefined
  const now = new Date()

  // Calculate date range based on period or start/end dates
  if (period) {
    // Parse period string (e.g. '7d' -> 7 days)
    const unit = period.slice(-1) // Extract unit (d/m/y)
    const value = Number.parseInt(period, 10) // Extract numeric value
    const multiplier =
      {
        d: 1, // days
        m: 30, // months (approximate)
        y: 365, // years (approximate)
      }[unit] || 1 // Default to 1 if unit not recognized

    const days = value * multiplier
    minDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000) // Calculate min date
  } else {
    // Use explicit start/end dates if no period specified
    if (startDate) {
      minDate = new Date(startDate)
    }

    if (endDate) {
      maxDate = new Date(endDate)
    }
  }

  /**
   * The actual filter function that checks if bookmark meets time criteria
   * @param href - Bookmark URL (unused)
   * @param tags - Bookmark tags (unused)
   * @param meta - Bookmark metadata containing created/updated timestamps
   * @returns Boolean indicating if bookmark matches time filter
   */
  return (href: string, tags: string[], meta: BookmarkMetadata) => {
    // Get appropriate timestamp based on timeType
    const timestamp = timeType === 'created' ? meta.created : meta.updated
    const date = new Date(timestamp)

    // Check if date falls within specified range
    if (minDate && date < minDate) return false
    if (maxDate && date > maxDate) return false
    return true
  }
}
