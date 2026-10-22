import { defineConfig, lazyPlugins } from 'vite-plus'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  fmt: {
    singleQuote: true,
    semi: false,
    printWidth: 120,
    ignorePatterns: ['src/routeTree.gen.ts', 'src/data/**', 'scripts/snapshots/**'],
  },
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: ['src/routeTree.gen.ts', 'src/components/ui/**'],
  },
  resolve: { tsconfigPaths: true },
  plugins: lazyPlugins(() => [
    devtools(),
    tailwindcss(),
    tanstackStart({
      // Fully static output (dist/client): both locales are prerendered and the
      // tariff data ships as a content-hashed JSON asset, so any static host works.
      prerender: { enabled: true, crawlLinks: false },
      pages: [{ path: '/' }, { path: '/el' }],
    }),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ]),
})

export default config
