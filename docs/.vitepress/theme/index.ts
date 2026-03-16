import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import ExtensionSwitcher from './ExtensionSwitcher.vue'
import ExtensionBlock from './ExtensionBlock.vue'
import './style.css'

export default {
  extends: DefaultTheme,

  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h(ExtensionSwitcher),
    })
  },

  enhanceApp({ app }) {
    app.component('ExtensionBlock', ExtensionBlock)
    // Backward-compat alias for legacy docs
    app.component('PluginBlock', ExtensionBlock)
  },
}
