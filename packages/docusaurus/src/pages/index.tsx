import React, { useEffect } from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

/**
 * Home page component that redirects to root path if current path is not root
 * @returns React component
 */
export default function Home(): React.ReactElement {
  const { siteConfig } = useDocusaurusContext();

  useEffect(() => {
    // Check if current path is not root and redirect if needed
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.replace('/');
    }
  }, []);

  return (
    <Layout
      title={`${siteConfig.title}`}
      description={`${siteConfig.tagline}`}>
      <main>
        {/* Home page content */}
        <div className="container margin-vert--xl">
          <div className="row">
            <div className="col col--8 col--offset-2">
              <h1 className="text--center">{siteConfig.title}</h1>
              <p className="text--center">{siteConfig.tagline}</p>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}