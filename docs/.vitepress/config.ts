import { defineConfig } from 'vitepress'

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
        text: 'CLI',
        items: [
          { text: 'Commands', link: '/reference/cli' },
          { text: 'Reporters', link: '/reference/reporters' },
        ],
      },
      {
        text: 'Legacy (Outdated)',
        collapsed: true,
        items: [
          { text: 'What is pest?', link: '/introduction/what-is-pest' },
          { text: 'Choosing a Plugin', link: '/introduction/choosing-a-plugin' },
          { text: 'Providers', link: '/concepts/providers' },
          { text: 'Writing Tests', link: '/concepts/writing-tests' },
          { text: 'When to Use What', link: '/concepts/when-to-use' },
          { text: 'Expect Matchers', link: '/strategies/matchers' },
          { text: 'Tool Call Testing', link: '/strategies/tool-call-testing' },
          { text: 'LLM-as-Judge', link: '/strategies/llm-as-judge' },
          { text: 'LLM-as-QA', link: '/strategies/llm-as-qa' },
          { text: 'Model Comparison', link: '/strategies/model-comparison' },
          { text: 'Prompt Tuning', link: '/strategies/prompt-tuning' },
          { text: 'Configuration', link: '/reference/configuration' },
          { text: 'API', link: '/reference/api' },
          { text: 'Plugins: vitest', link: '/plugins/vitest' },
          { text: 'Plugins: jest', link: '/plugins/jest' },
          { text: 'Plugins: pytest', link: '/plugins/pytest' },
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

    socialLinks: [
      { icon: 'github', link: 'https://github.com/heilgar/pest' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'pest - Prompt Evaluation & Scoring Toolkit',
    },

    editLink: {
      pattern: 'https://github.com/heilgar/pest/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },
})
