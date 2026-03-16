<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useExtension, type Extension } from './useExtension'

const props = defineProps<{
  // New prop names
  extension?: Extension
  extensions?: Extension[]
  // Legacy prop names (backward compat with <PluginBlock plugin="vitest">)
  plugin?: Extension
  plugins?: Extension[]
}>()

const { selectedExtension } = useExtension()
const mounted = ref(false)

onMounted(() => {
  mounted.value = true
})

const isVisible = computed(() => {
  const ext = props.extension ?? props.plugin
  const exts = props.extensions ?? props.plugins
  const targets = exts ?? (ext ? [ext] : null)
  if (!targets) return true

  // Before mount (SSR / pre-hydration): show the default extension's content
  if (!mounted.value) return targets.includes('vitest')

  return targets.includes(selectedExtension.value)
})
</script>

<template>
  <div v-if="isVisible" class="extension-block">
    <slot />
  </div>
</template>
