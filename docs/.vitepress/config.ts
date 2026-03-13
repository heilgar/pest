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
      { text: 'Reference', link: '/reference/matchers' },
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
          { text: 'Providers', link: '/guide/providers' },
          { text: 'Writing Tests', link: '/guide/writing-tests' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Expect Matchers', link: '/reference/matchers' },
          { text: 'Tool Call Testing', link: '/reference/tool-call-testing' },
          { text: 'LLM-as-Judge', link: '/reference/llm-as-judge' },
          { text: 'LLM-as-QA', link: '/reference/llm-as-qa' },
          { text: 'Model Comparison', link: '/reference/model-comparison' },
          { text: 'Prompt Tuning', link: '/reference/prompt-tuning' },
          { text: 'Reporters', link: '/reference/reporters' },
          { text: 'CLI', link: '/reference/cli' },
          { text: 'API', link: '/reference/api' },
        ],
      },
    ],

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
