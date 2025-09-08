import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'workers-qb',
  description: 'Zero dependencies Query Builder for Cloudflare Workers',
  sitemap: {
    hostname: 'https://workers-qb.massadas.com'
  },
  lastUpdated: true,
  cleanUrls: true,
  head: [
    [
      'link',
      {
        rel: 'icon',
        type: 'image/png',
        href: 'https://raw.githubusercontent.com/G4brym/workers-qb/refs/heads/main/docs/assets/logo-icon.png',
      },
    ],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: 'https://raw.githubusercontent.com/G4brym/workers-qb/refs/heads/main/docs/assets/logo-icon.png',
    outline: [2, 3],
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Docs', link: '/introduction' },
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/introduction' },
          { text: 'Basic Queries', link: '/basic-queries' },
          { text: 'Advanced Queries', link: '/advanced-queries' },
          { text: 'JSON Queries', link: '/json-queries' },
          { text: 'Background Writes', link: '/background-writes' },
          { text: 'Migrations', link: '/migrations' },
          { text: 'Type Checking', link: '/type-check' },
          { text: 'Logger', link: '/logger' },
        ],
      },
      {
        text: 'Databases',
        items: [
          { text: 'D1', link: '/databases/d1' },
          { text: 'Durable Objects', link: '/databases/do' },
          { text: 'PostgreSQL', link: '/databases/postgresql' },
          { text: 'Bring your own', link: '/databases/byodb' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/G4brym/workers-qb' },
      { icon: 'x', link: 'https://x.com/G4brym' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Gabriel Massadas',
    },
  },
})
