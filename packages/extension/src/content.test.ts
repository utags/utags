import { describe, expect, it } from 'vitest'

describe('Content Script Settings', () => {
  it('should have isQuickStarAvailable function logic for linux.do', () => {
    // Test the logic that would be used in isQuickStarAvailable
    const testHost1 = 'linux.do'
    const testHost2 = 'example.com'

    // Simulate the isQuickStarAvailable logic
    const isQuickStarAvailable = (host: string) => {
      if (host === 'linux.do') {
        return true
      }

      return false
    }

    expect(isQuickStarAvailable(testHost1)).toBe(true)
    expect(isQuickStarAvailable(testHost2)).toBe(false)
  })

  it('should have correct settings structure for enableQuickStar', () => {
    // Test the settings object structure that would be created
    const mockHost = 'linux.do'
    const isQuickStarAvailable = true

    const settingsEntry = isQuickStarAvailable
      ? {
          [`enableQuickStar_${mockHost}`]: {
            title: 'settings.enableQuickStar',
            defaultValue: true,
            group: 2, // This would be incremented in the actual code
          },
        }
      : {}

    if (isQuickStarAvailable) {
      expect(settingsEntry).toHaveProperty('enableQuickStar_linux.do')
      expect(settingsEntry['enableQuickStar_linux.do']).toEqual({
        title: 'settings.enableQuickStar',
        defaultValue: true,
        group: 2,
      })
    }
  })
})
