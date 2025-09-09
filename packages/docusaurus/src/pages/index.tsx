import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import React, { useEffect } from 'react'

/**
 * Home page component that redirects to root path if current path is not root
 * @returns React component
 */
export default function Home(): React.ReactElement {
  const { siteConfig } = useDocusaurusContext()

  useEffect(() => {
    // Check if current path is not root and redirect if needed
    if (typeof globalThis === 'undefined') {
      return // Exit early if not in browser environment
    }

    const isLocalhost =
      ['localhost', '127.0.0.1'].includes(globalThis.location.hostname) ||
      globalThis.location.hostname.endsWith('.localhost')

    // Only redirect if not on root path or not on localhost
    if (globalThis.location.pathname !== '/' || !isLocalhost) {
      // globalThis.location.replace('/')
      history.replaceState({}, '', '/')
      globalThis.location.reload()
    }
  }, [])

  return (
    <Layout title={`${siteConfig.title}`} description={`${siteConfig.tagline}`}>
      <div style={{ height: '100vh' }}></div>
    </Layout>
  )
}
