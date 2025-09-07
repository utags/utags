/**
 * Star icon SVG for use across the application
 */

/**
 * Returns a star icon SVG with the specified size
 * @param size - The width and height of the SVG (default: 20)
 * @returns Star icon SVG string
 */
export function getStarIconSvg(size = 20): string {
  return `<svg class="favIcon" width="${size}" height="${size}" viewBox="0 0 20 20">
    <path d="M10 1L12.59 6.26L18.5 7.13L14 11.21L15.31 17L10 14.26L4.69 17L6 11.21L1.5 7.13L7.41 6.26L10 1Z"></path>
  </svg>`
}
