import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'pest',
  description: 'Prompt Evaluation & Scoring Toolkit',

  base: '/pest/',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/pest/logo.svg' }],
  ],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Architecture', link: '/architecture/packages' },
      { text: 'Reference', link: '/architecture/matchers' },
      { text: 'Demo', link: 'https://github.com/heilgar/pest/tree/main/demo' },
      {
        text: 'GitHub',
        link: 'https://github.com/heilgar/pest',
      },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'Examples', link: '/guide/examples' },
          { text: 'Local LLMs', link: '/guide/local-llms' },
        ],
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Package Architecture', link: '/architecture/packages' },
          { text: 'Matchers', link: '/architecture/matchers' },
          { text: 'Core API', link: '/architecture/core-api' },
        ],
      },
      {
        text: 'Extensions',
        items: [
          { text: 'Vitest', link: '/extensions/vitest' },
          { text: 'Jest', link: '/extensions/jest' },
          { text: 'Playwright', link: '/extensions/playwright' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'API', link: '/reference/api' },
          { text: 'Configuration', link: '/reference/configuration' },
          { text: 'CLI', link: '/reference/cli' },
          { text: 'Reporters', link: '/reference/reporters' },
        ],
      },
    ],

    outline: {
      level: [2, 4],
      label: 'On this page',
    },

    search: {
      provider: 'local',
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/heilgar/pest' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'pest - Prompt Evaluation & Scoring Toolkit',
    },

    editLink: {
      pattern: 'https://github.com/heilgar/pest/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },
});
