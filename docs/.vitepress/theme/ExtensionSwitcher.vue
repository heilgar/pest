<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { type Extension, useExtension } from './useExtension';

const { selectedExtension } = useExtension();
const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const VALID_EXTENSIONS: Extension[] = ['vitest', 'jest', 'playwright', 'phpunit'];

// Dropdown → code-group tabs: click the matching label in every code group on the page
watch(selectedExtension, (ext) => {
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;

  document
    .querySelectorAll<HTMLLabelElement>(
      `.vp-code-group .tabs label[data-title="${ext}"]`,
    )
    .forEach((label) => label.click());

  window.scrollTo(scrollX, scrollY);
});

// Code-group tabs → dropdown: update extension when user clicks a tab
function handleTabClick(e: MouseEvent) {
  const label = (e.target as Element).closest<HTMLLabelElement>(
    '.vp-code-group .tabs label',
  );
  if (!label) return;
  const title = label.dataset.title?.toLowerCase() as Extension | undefined;
  if (!title || !VALID_EXTENSIONS.includes(title)) return;
  if (title === selectedExtension.value) return; // already in sync
  selectedExtension.value = title;
}

interface SelectableItem {
  id: Extension;
  label: string;
  color: string;
  disabled?: false;
  comingSoon?: false;
}

interface DisabledItem {
  id: string;
  label: string;
  color: string;
  disabled: true;
  comingSoon: true;
}

type ExtensionItem = SelectableItem | DisabledItem;

const extensions: ExtensionItem[] = [
  { id: 'vitest', label: 'vitest', color: '#6E9F18' },
  { id: 'jest', label: 'jest', color: '#C21325' },
  { id: 'playwright', label: 'playwright', color: '#2EAD33' },
  {
    id: 'pytest',
    label: 'pytest',
    color: '#0A9EDC',
    disabled: true,
    comingSoon: true,
  },
  { id: 'phpunit', label: 'phpunit', color: '#8892BF' },
];

const current = computed(
  () =>
    extensions.find((e) => e.id === selectedExtension.value) ?? extensions[0],
);

function select(ext: ExtensionItem) {
  if (ext.disabled) return;
  selectedExtension.value = ext.id as Extension;
  isOpen.value = false;
}

function toggle() {
  isOpen.value = !isOpen.value;
}

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('click', handleTabClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('click', handleTabClick);
});
</script>

<template>
  <div ref="containerRef" class="ext-switcher">
    <span class="ext-switcher__label">Extension</span>
    <button
      class="ext-switcher__trigger"
      :style="{ '--ext-color': current.color }"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <span class="ext-switcher__dot" />
      <span class="ext-switcher__name">{{ current.label }}</span>
      <svg class="ext-switcher__arrow" :class="{ 'is-open': isOpen }" width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <Transition name="ext-dropdown">
      <ul v-if="isOpen" class="ext-switcher__menu" role="listbox" aria-label="Select extension">
        <li
          v-for="ext in extensions"
          :key="ext.id"
          role="option"
          :aria-selected="selectedExtension === ext.id"
          :aria-disabled="ext.disabled"
          :class="[
            'ext-switcher__item',
            { 'is-active': selectedExtension === ext.id },
            { 'is-disabled': ext.disabled },
          ]"
          :style="{ '--ext-color': ext.color }"
          :title="ext.comingSoon ? 'Coming soon' : undefined"
          @click="select(ext)"
        >
          <span class="ext-switcher__dot" />
          <span class="ext-switcher__item-name">{{ ext.label }}</span>
          <span v-if="ext.comingSoon" class="ext-switcher__badge">soon</span>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.ext-switcher {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px 0 8px;
}

.ext-switcher__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  white-space: nowrap;
  display: none;
}

@media (min-width: 768px) {
  .ext-switcher__label {
    display: block;
  }
}

.ext-switcher__trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 8px;
  font-size: 12px;
  font-weight: 500;
  font-family: var(--vp-font-family-mono);
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  cursor: pointer;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  transition: border-color 0.15s, background 0.15s;
  line-height: 1.5;
  white-space: nowrap;
}

.ext-switcher__trigger:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-mute);
}

.ext-switcher__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ext-color, var(--vp-c-brand-1));
  flex-shrink: 0;
}

.ext-switcher__name {
  flex: 1;
}

.ext-switcher__arrow {
  color: var(--vp-c-text-3);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.ext-switcher__arrow.is-open {
  transform: rotate(180deg);
}

.ext-switcher__menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 16px;
  min-width: 150px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 4px;
  list-style: none;
  margin: 0;
  z-index: 100;
}

.ext-switcher__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  font-family: var(--vp-font-family-mono);
  border-radius: 5px;
  cursor: pointer;
  color: var(--vp-c-text-2);
  transition: background 0.12s, color 0.12s;
  user-select: none;
}

.ext-switcher__item:hover:not(.is-disabled) {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}

.ext-switcher__item.is-active {
  color: var(--ext-color, var(--vp-c-brand-1));
  background: color-mix(in srgb, var(--ext-color, var(--vp-c-brand-1)) 10%, transparent);
}

.ext-switcher__item.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ext-switcher__item-name {
  flex: 1;
}

.ext-switcher__badge {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-3);
  border: 1px solid var(--vp-c-divider);
}

/* Dropdown transition */
.ext-dropdown-enter-active,
.ext-dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.ext-dropdown-enter-from,
.ext-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
