import type * as Preset from '@docusaurus/preset-classic'
import type { Config } from '@docusaurus/types'
import { themes as prismThemes } from 'prism-react-renderer'

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'UTags',
  tagline: 'UTags are cool',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://utags.link',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'utags', // Usually your GitHub org/user name.
  projectName: 'utags', // Usually your repo name.
  trailingSlash: true,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-CN'],
    localeConfigs: {
      'zh-CN': {
        label: '简体中文',
      },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/help',
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/utags/utags/tree/main/packages/docusaurus/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/utags/utags/tree/main/packages/docusaurus/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'UTags',
      logo: {
        alt: 'UTags Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          to: '/help/',
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Help',
        },
        { to: '/blog/', label: 'Blog', position: 'left' },
        {
          to: '/contact',
          position: 'left',
          className: 'navbar__link--contact',
          label: 'Contact Us',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/utags/utags',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Help',
              to: '/help/',
            },
          ],
        },
        {
          title: 'Feedback',
          items: [
            {
              label: 'GitHub Issues',
              href: 'https://github.com/utags/utags/issues',
            },
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/utags/utags/discussions',
            },
            {
              label: 'Greasy Fork',
              href: 'https://greasyfork.org/scripts/460718-utags-add-usertags-to-links/feedback',
            },
            {
              label: 'LINUX.DO',
              href: 'https://linux.do/t/topic/903643',
            },
            {
              label: 'V2EX',
              href: 'https://www.v2ex.com/t/924103',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog/',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/utags/utags',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} UTags. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
}

export default config
