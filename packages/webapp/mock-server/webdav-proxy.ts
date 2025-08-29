import process from 'node:process'
import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import { createProxyMiddleware, type Options } from 'http-proxy-middleware'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const port = process.env.PORT || 3002

// The target WebDAV server
const webdavProxyConfigJson = process.env.WEBDAV_PROXY_CONFIG
console.log(webdavProxyConfigJson)
if (!webdavProxyConfigJson) {
  console.error('WEBDAV_PROXY_CONFIG environment variable is not set.')
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1)
}

let webdavProxyConfig: Record<string, string>

try {
  webdavProxyConfig = JSON.parse(webdavProxyConfigJson) as Record<
    string,
    string
  >
} catch (error) {
  console.error('Failed to parse WEBDAV_PROXY_CONFIG:', error)
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1)
}

app.use('/', (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS, PROPFIND, MKCOL'
  )
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Depth, If-Match'
  )
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
    return
  }

  next()
})

const proxyOptions: Partial<Options> = {
  changeOrigin: true,
  on: {
    proxyReq(proxyReq, req, res) {
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization)
      }

      console.log(`[WebDAV Proxy] Forwarding request: ${req.method} ${req.url}`)
    },
    proxyRes(proxyRes, req, res) {
      console.log(`[WebDAV Proxy] Received response: ${proxyRes.statusCode}`)
    },
    error(err, req, res) {
      console.error('[WebDAV Proxy] Proxy error:', err)
      if (
        'writeHead' in res &&
        typeof res.writeHead === 'function' &&
        !res.headersSent
      ) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('Proxy error')
      }
    },
  },
}

for (const path in webdavProxyConfig) {
  if (Object.hasOwn(webdavProxyConfig, path)) {
    const originalTarget = webdavProxyConfig[path]
    const target = originalTarget.endsWith('/')
      ? originalTarget.slice(0, -1)
      : originalTarget
    app.use(
      path,
      createProxyMiddleware({
        ...proxyOptions,
        target,
        pathRewrite: {
          [`^${path}`]: '/', // rewrite path to root
        },
      })
    )
    console.log(`Proxying requests from ${path} to ${target}`)
  }
}

app.listen(port, () => {
  console.log(`WebDAV proxy server listening on http://localhost:${port}`)
})
