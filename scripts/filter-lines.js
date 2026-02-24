import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const args = process.argv.slice(2)

if (args.length < 2) {
  console.error('Usage: node scripts/filter-lines.js <directory> <keyword>')
  console.error(
    'Example: node scripts/filter-lines.js docs/userscript-desc Coomer'
  )
  process.exit(1)
}

const targetDir = args[0]
const keyword = args[1]

// Handle relative paths from current working directory
const absoluteDir = path.resolve(process.cwd(), targetDir)

if (!fs.existsSync(absoluteDir)) {
  console.error(`Directory not found: ${absoluteDir}`)
  process.exit(1)
}

console.log(`Scanning directory: ${absoluteDir}`)
console.log(`Filtering keyword: "${keyword}"`)

try {
  const files = fs.readdirSync(absoluteDir)
  let processedCount = 0
  let changedCount = 0

  files.forEach((file) => {
    // Only process text files, e.g., .md, .txt
    if (file.endsWith('.md') || file.endsWith('.txt')) {
      const filePath = path.join(absoluteDir, file)
      const content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n')

      const newLines = lines.filter((line) => !line.includes(keyword))

      if (lines.length !== newLines.length) {
        fs.writeFileSync(filePath, newLines.join('\n'))
        console.log(
          `Updated: ${file} (removed ${lines.length - newLines.length} lines)`
        )
        changedCount++
      }
      processedCount++
    }
  })

  console.log(
    `\nDone. Processed ${processedCount} files, updated ${changedCount} files.`
  )
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
}
