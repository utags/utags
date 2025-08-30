/**
 * This script reads all JSON files in the messages directory,
 * sorts the keys alphabetically, and saves them back to the original file
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Path to the messages directory
const messagesDir = path.join(__dirname, 'messages')

/**
 * Sort object keys alphabetically
 * @param {Object} obj - The object to sort
 * @returns {Object} - Returns a new object with sorted keys
 */
function sortObjectKeys(obj) {
  // First ensure the $schema key remains at the top
  const schemaValue = obj.$schema

  // Delete the $schema key so it doesn't participate in sorting
  delete obj.$schema

  // Get all keys and sort them alphabetically
  const sortedKeys = Object.keys(obj).sort()

  // Create a new object, first adding the $schema key
  const sortedObj = {
    $schema: schemaValue,
  }

  // Add other keys in sorted order
  for (const key of sortedKeys) {
    sortedObj[key] = obj[key]
  }

  return sortedObj
}

/**
 * Process a single JSON file
 * @param {string} filePath - Path to the JSON file
 */
function processJsonFile(filePath) {
  try {
    // Read the JSON file
    const fileContent = readFileSync(filePath, 'utf8')

    // Parse the JSON content
    const jsonData = JSON.parse(fileContent)

    // Sort the object keys
    const sortedJsonData = sortObjectKeys(jsonData)

    // Convert the sorted object back to a JSON string, maintaining indentation
    const sortedJsonString = JSON.stringify(sortedJsonData, null, 2)

    // Write back to the file
    writeFileSync(filePath, sortedJsonString + '\n')

    console.log(`✅ Processed: ${path.basename(filePath)}`)
  } catch (error) {
    console.error(
      `❌ Error processing ${path.basename(filePath)}: ${error.message}`
    )
  }
}

/**
 * Main function - Process all JSON files in the messages directory
 */
function main() {
  try {
    // Read all files in the messages directory
    const files = readdirSync(messagesDir)

    // Filter out JSON files
    const jsonFiles = files.filter((file) => file.endsWith('.json'))

    console.log(`Found ${jsonFiles.length} JSON files to process...`)

    // Process each JSON file
    for (const jsonFile of jsonFiles) {
      const filePath = path.join(messagesDir, jsonFile)
      processJsonFile(filePath)
    }

    console.log('All files processed successfully!')
  } catch (error) {
    console.error('Error during processing:', error.message)
  }
}

// Execute the main function
main()
