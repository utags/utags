import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url)
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(__filename)

const buildDir = process.argv[2]

if (!buildDir) {
  console.error("Please provide the build directory as an argument.")
  process.exit(1)
}

const absoluteBuildDir = path.resolve(process.cwd(), buildDir)

if (!fs.existsSync(absoluteBuildDir)) {
  console.error(`Build directory does not exist: ${absoluteBuildDir}`)
  process.exit(1)
}

const files = fs.readdirSync(absoluteBuildDir)
const shadowRootFile = files.find(
  (file) => file.startsWith("shadow-root.") && file.endsWith(".js")
)

if (shadowRootFile) {
  const filePath = path.join(absoluteBuildDir, shadowRootFile)
  const content = fs.readFileSync(filePath, "utf8")

  // Check if already wrapped to prevent double wrapping if run multiple times
  if (content.trim().startsWith(";(() => {")) {
    console.log(`${shadowRootFile} is already wrapped.`)
  } else {
    const wrappedContent = `;(() => {${content}})()`
    fs.writeFileSync(filePath, wrappedContent)
    console.log(`Wrapped ${shadowRootFile} in IIFE.`)
  }
} else {
  console.log("No shadow-root.js file found.")
}
