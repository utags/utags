import { getSettingsValue } from 'browser-extension-settings'
import {
  addValueChangeListener,
  getValue,
  setValue,
} from 'browser-extension-storage'
import { splitTags } from 'utags-utils'

import type { RecentTag } from '../types.js'

/**
 * Storage keys for different tag collections
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
const STORAGE_KEY_RECENT_TAGS = 'extension.utags.recenttags'
// eslint-disable-next-line @typescript-eslint/naming-convention
const STORAGE_KEY_MOST_USED_TAGS = 'extension.utags.mostusedtags'
// eslint-disable-next-line @typescript-eslint/naming-convention
const STORAGE_KEY_RECENT_ADDED_TAGS = 'extension.utags.recentaddedtags'

/**
 * Calculates a weighted score based on current timestamp
 * Used for tag ranking and sorting
 * @param weight Multiplier for the score calculation
 * @returns Normalized score value
 */
function getScore(weight = 1): number {
  return (Math.floor(Date.now() / 1000) / 1_000_000_000) * weight
}

// Concurrency control lock and queue for tag updates
let isUpdating = false
const updateQueue: Array<{ newTags: string[]; oldTags: string[] }> = []

/**
 * Adds new tags to the recent tags list and updates related tag collections
 * @param newTags Array of new tags to add
 * @param oldTags Array of existing tags to compare against
 */
export async function addRecentTags(
  newTags: string[],
  oldTags: string[]
): Promise<void> {
  if (newTags.length === 0) return

  // If an update is already in progress, queue the current update
  if (isUpdating) {
    return new Promise<void>((resolve) => {
      updateQueue.push({ newTags, oldTags })
      resolve()
    })
  }

  isUpdating = true
  try {
    await processTagUpdate(newTags, oldTags)

    // Process remaining updates in the queue
    while (updateQueue.length > 0) {
      const nextUpdate = updateQueue.shift()
      if (nextUpdate) {
        // eslint-disable-next-line no-await-in-loop
        await processTagUpdate(nextUpdate.newTags, nextUpdate.oldTags)
      }
    }
  } finally {
    isUpdating = false
  }
}

async function processTagUpdate(
  newTags: string[],
  oldTags: string[]
): Promise<void> {
  // Filter out tags that already exist in oldTags
  const uniqueNewTags =
    oldTags?.length > 0
      ? newTags.filter((tag) => tag && !oldTags.includes(tag))
      : newTags.filter(Boolean)

  if (uniqueNewTags.length === 0) return

  // Retrieve existing recent tags or initialize new array
  const recentTags: RecentTag[] =
    ((await getValue(STORAGE_KEY_RECENT_TAGS)) as RecentTag[]) || []
  const score = getScore()

  // Add new tags with current score
  for (const tag of uniqueNewTags) {
    recentTags.push({ tag, score })
  }

  // Maintain maximum size of recent tags list
  if (recentTags.length > 1000) {
    recentTags.splice(0, 100) // Remove oldest 100 tags
  }

  // Update storage and related tag collections
  await setValue(STORAGE_KEY_RECENT_TAGS, recentTags)
  await generateMostUsedAndRecentAddedTags(recentTags)
}

/**
 * Generates most used and recently added tags from the recent tags collection
 * @param recentTags Array of recent tags with scores
 */
async function generateMostUsedAndRecentAddedTags(
  recentTags: RecentTag[]
): Promise<void> {
  // Aggregate tag scores
  const tagScores: Record<string, RecentTag> = {}

  for (const recentTag of recentTags) {
    if (!recentTag.tag) {
      continue
    }

    if (tagScores[recentTag.tag]) {
      tagScores[recentTag.tag].score += recentTag.score
    } else {
      tagScores[recentTag.tag] = {
        tag: recentTag.tag,
        score: recentTag.score,
      }
    }
  }

  // Generate most used tags list
  const mostUsedTags = Object.values(tagScores)
    .filter((tag) => tag.score > getScore(1.5)) // Tags used at least twice
    .sort((a, b) => b.score - a.score)
    .map((tag) => tag.tag)
    .slice(0, 200) // Limit to top 200 tags

  // Generate recent added tags list (unique, maintaining order)
  const recentAddedTags = Array.from(
    new Set(
      recentTags
        .map((tag) => tag.tag)
        .reverse()
        .filter(Boolean)
    )
  ).slice(0, 200) // Limit to latest 200 tags

  // Update storage
  await Promise.all([
    setValue(STORAGE_KEY_MOST_USED_TAGS, mostUsedTags),
    setValue(STORAGE_KEY_RECENT_ADDED_TAGS, recentAddedTags),
  ])
}

/**
 * Retrieves the list of most frequently used tags
 * @returns Array of most used tag strings
 */
export async function getMostUsedTags(): Promise<string[]> {
  return ((await getValue(STORAGE_KEY_MOST_USED_TAGS)) as string[]) || []
}

/**
 * Retrieves the list of recently added tags
 * @returns Array of recently added tag strings
 */
export async function getRecentAddedTags(): Promise<string[]> {
  return ((await getValue(STORAGE_KEY_RECENT_ADDED_TAGS)) as string[]) || []
}

/**
 * Retrieves the list of pinned tags from settings
 * @returns Array of pinned tag strings
 */
export async function getPinnedTags(): Promise<string[]> {
  return splitTags((getSettingsValue('pinnedTags') as string) || '')
}

/**
 * Retrieves the list of emoji tags from settings
 * @returns Array of emoji tag strings
 */
export async function getEmojiTags(): Promise<string[]> {
  return splitTags((getSettingsValue('emojiTags') as string) || '')
}
