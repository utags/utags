import process from 'node:process'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url)
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(__filename)
const app = express()
const port = process.env.PORT || 3001 // Mock server port

const MOCK_DATA_DIR = path.join(__dirname, '.mock-data') // Directory to store mock data files

const AUTH_TOKEN = 'test-auth-token' // Example auth token

app.use(express.json()) // Middleware to parse JSON bodies

// Add CORS headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*') // Allow all origins
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  )
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-API-Key, If-Match'
  )
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
  } else {
    next()
  }
})

/**
 * Ensures the mock data directory exists.
 */
async function ensureMockDataDir(): Promise<void> {
  try {
    await fs.mkdir(MOCK_DATA_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating mock data directory:', error)
    // Depending on the error, you might want to throw it or handle it differently
  }
}

/**
 * Calculates SHA256 hash of the data.
 * @param data - The data to hash (string or Buffer).
 * @returns The hex-encoded SHA256 hash.
 */
// eslint-disable-next-line @typescript-eslint/no-restricted-types
function calculateSha(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Middleware to check for Authorization header.
 */
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token && !req.headers['x-api-key']) {
    // Allow if no token and no api key, for simpler testing of some endpoints
    // Or enforce token for all protected routes
    // If you want to allow access, call next() and return
    // next();
    // return;
  }

  if (
    token &&
    token !== AUTH_TOKEN &&
    req.headers['x-api-key'] !== 'test-api-key'
  ) {
    res.status(403).json({ message: 'Forbidden: Invalid token or API key' })
    return // Added return here
  }

  next()
}

// Endpoint to get file metadata
app.get(
  '/:filePath',
  authenticateToken,
  async (req: Request, res: Response) => {
    const { filePath } = req.params
    const { meta } = req.query
    const fullPath = path.join(MOCK_DATA_DIR, filePath)

    if (meta !== 'true') {
      // If not requesting metadata, assume it's a regular file download request
      try {
        const data = await fs.readFile(fullPath, 'utf8')
        res.status(200).json(JSON.parse(data))
        return // Added return
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          res.status(404).json({ message: 'File not found' })
        } else {
          console.error(`Error reading file ${filePath}:`, error)
          res.status(500).json({ message: 'Internal server error' })
        }

        return // Added return
      }
    }

    // Metadata request
    try {
      const stats = await fs.stat(fullPath)
      const fileContent = await fs.readFile(fullPath, 'utf8')
      const sha = calculateSha(fileContent)

      res.status(200).json({
        lastModified: stats.mtime.getTime(),
        sha,
        size: stats.size,
        id: filePath,
      })
      // Added return
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        res.status(404).json({ message: 'File metadata not found' })
      } else {
        console.error(`Error getting metadata for ${filePath}:`, error)
        res.status(500).json({ message: 'Internal server error' })
      }
      // Added return
    }
  }
)

// Endpoint to upload/update a file
app.put(
  '/:filePath',
  authenticateToken,
  async (req: Request, res: Response) => {
    const { filePath } = req.params
    const fullPath = path.join(MOCK_DATA_DIR, filePath)
    const dataToSave: Record<string, unknown> = req.body as Record<
      string,
      unknown
    >

    const ifMatchSha = req.headers['if-match']

    try {
      if (ifMatchSha) {
        try {
          const currentContent = await fs.readFile(fullPath, 'utf8')
          const currentSha = calculateSha(currentContent)
          if (ifMatchSha !== currentSha) {
            res
              .status(412)
              .json({ message: 'Precondition Failed: SHA mismatch' })
            return // Added return
          }
        } catch (error: any) {
          if (error.code !== 'ENOENT') {
            console.warn(
              `If-Match check: Could not read current file ${filePath} for SHA comparison, proceeding with write. Error: ${error.message}`
            )
            // Even if reading fails for If-Match, if it's not ENOENT, it might be a server error.
            // Depending on strictness, you might want to return 500 here.
            // For now, we let it proceed as per previous logic.
          }
        }
      }

      await fs.writeFile(fullPath, JSON.stringify(dataToSave, null, 2), 'utf8')
      const stats = await fs.stat(fullPath)
      const newSha = calculateSha(JSON.stringify(dataToSave, null, 2))

      res.status(200).json({
        message: 'File uploaded successfully',
        lastModified: stats.mtime.getTime(),
        sha: newSha,
        size: stats.size,
        id: filePath,
      })
      // Added return
    } catch (error: any) {
      console.error(`Error writing file ${filePath}:`, error)
      res.status(500).json({ message: 'Internal server error' })
      // Added return
    }
  }
)

// Endpoint to check auth status (example)
app.get('/auth/status', authenticateToken, (req: Request, res: Response) => {
  // If authenticateToken middleware passes, user is considered authenticated
  res.status(200).json({ authenticated: true, user: 'mockUser' })
})

app.listen(port, async () => {
  await ensureMockDataDir()
  console.log(`Mock sync server listening on http://localhost:${port}`)
  console.log(`Mock data will be stored in: ${MOCK_DATA_DIR}`)
})
