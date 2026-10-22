import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineConfig, lazyPlugins } from 'vite-plus'
import type { Plugin } from 'vite-plus'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

/**
 * Renders each page to <client out>/<path>/index.html by calling the built server's fetch
 * handler directly. Start's own prerender goes through a preview server on a local port,
 * which proved flaky (ETIMEDOUT on Windows, ECONNREFUSED in Docker).
 */
function prerender(paths: string[]): Plugin {
  return {
    name: 'energycomp:prerender',
    apply: 'build',
    buildApp: {
      order: 'post',
      async handler(builder) {
        const { client, ssr } = builder.environments
        const clientOut = resolve(builder.config.root, client.config.build.outDir)
        const serverEntry = resolve(builder.config.root, ssr.config.build.outDir, 'server.js')
        process.env.TSS_PRERENDERING = 'true'
        process.env.TSS_CLIENT_OUTPUT_DIR = clientOut
        const { default: server } = (await import(pathToFileURL(serverEntry).href)) as {
          default: { fetch: (req: Request) => Promise<Response> }
        }
        const base = builder.config.base.replace(/\/$/, '')
        for (const path of paths) {
          const res = await server.fetch(new Request(new URL(base + path, 'http://localhost')))
          if (!res.ok) throw new Error(`Prerender ${path} failed: ${res.status} ${res.statusText}`)
          const file = join(clientOut, path, 'index.html')
          await mkdir(join(file, '..'), { recursive: true })
          await writeFile(file, await res.text())
          builder.config.logger.info(`prerendered ${path}`)
        }
      },
    },
  }
}

const config = defineConfig({
  // Public path the site is served under, e.g. BASE_PATH=/energycomp/ behind a reverse proxy
  base: process.env.BASE_PATH || '/',
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
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
    // Fully static output (dist/client): both locales are prerendered and the
    // tariff data ships as a content-hashed JSON asset, so any static host works.
    prerender(['/', '/el']),
  ]),
})

export default config
