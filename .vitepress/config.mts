import {defineConfig} from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: './docs',
  title: "workers-qb",
  text: "Zero dependencies Query Builder for Cloudflare Workers",
  cleanUrls: true,
  head: [['link', {rel: 'icon', type: "image/png", href: 'https://raw.githubusercontent.com/G4brym/workers-qb/refs/heads/main/docs/assets/logo-icon.png'}]],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: 'https://raw.githubusercontent.com/G4brym/workers-qb/refs/heads/main/docs/assets/logo-icon.png',
    nav: [
      {text: 'Home', link: '/'},
      {text: 'Docs', link: '/introduction'}
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          {text: 'Introduction', link: '/introduction'},
          {text: 'Basic Queries', link: '/basic-queries'},
          {text: 'Advanced Queries', link: '/advanced-queries'},
          {text: 'Migrations', link: '/migrations'},
          {text: 'Type Checking', link: '/type-check'},
        ]
      },
      {
        text: 'Databases',
        items: [
          {text: 'D1', link: '/databases/d1'},
          {text: 'Durable Objects', link: '/databases/do'},
          {text: 'PostgreSQL', link: '/databases/postgresql'},
          {text: 'Bring your own', link: '/databases/byodb'},
        ]
      },
    ],
    socialLinks: [
      {icon: 'github', link: 'https://github.com/G4brym/workers-qb'},
      {icon: 'x', link: 'https://x.com/G4brym'}
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Gabriel Massadas'
    }
  }
})
