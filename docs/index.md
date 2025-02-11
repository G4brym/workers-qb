---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "workers-qb"
  image: https://raw.githubusercontent.com/G4brym/workers-qb/refs/heads/main/docs/assets/logo-icon.png
  tagline: Zero dependencies Query Builder for Cloudflare Workers
  actions:
    - theme: brand
      text: Introduction
      link: /introduction
    - theme: alt
      text: Migrations
      link: /migrations

features:
  - title: ✨ Zero Dependencies
    details: Enjoy a lean and fast query builder with absolutely no external dependencies, perfect for performance-critical Cloudflare Workers.
  - title: ⚡️ Raw Performance
    details: Bypass ORM overhead and maintain raw query performance with convenient, type-safe query building methods.
  - title: 🔒 Full TypeScript Support
    details: Benefit from end-to-end type safety, ensuring data integrity and a smooth development experience.
  - title: 🛠️ Modular SELECT Builder
    details: Use a chainable, intuitive methods to construct complex queries step-by-step with ease.
    link: /advanced-queries#modular-select-queries
  - title: ⚙️ Database Migrations
    details: Manage your database schema evolution with built-in migration tools, keeping your database changes organized.
    link: /migrations
  - title: ☁️ Cloudflare Optimized
    details: Specifically designed and optimized for Cloudflare Workers and edge environments.
---
