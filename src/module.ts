import { addImportsDir, addPlugin, createResolver } from '@nuxt/kit'
import { defineDesktopModule } from '@owdproject/core'
import type { UserConfig } from 'vite'

const FS_OPTIMIZE_DEPS = [
  '@zenfs/core',
  '@zenfs/dom',
  '@zenfs/archives',
] as const

function mergeOptimizeDepsInclude(opt?: { include?: string[] }) {
  return {
    ...opt,
    include: [...new Set([...(opt?.include ?? []), ...FS_OPTIMIZE_DEPS])],
  }
}

export default defineDesktopModule({
  meta: {
    name: 'owd-module-fs',
    configKey: 'fs',
  },
  defaults: {
    defaultUserHome: '/home/Guest',
    recentFiles: {
      relativePath: '.local/share/recently-used.json',
    },
    mounts: {
      '/home': 'WebStorage',
      '/.cache': 'InMemory',
      '/.trash': 'InMemory',
    },
    folders: {
      common: [
        '/Desktop',
        '/Documents',
        '/Downloads',
        '/Music',
        '/Pictures',
        '/Videos',
      ],
      extra: [],
      override: [],
    },
    fileAssociations: {
      mp4: 'video-player',
      webm: 'video-player',
      mp3: 'audio-player',
      txt: 'text-editor',
      gif: 'image-viewer',
      webp: 'image-viewer',
      jpg: 'image-viewer',
      png: 'image-viewer',
    },
  },
  async setup(_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url)

    // ZenFS pulls CJS transitive deps (e.g. via utilium); viteEnvironmentApi
    // externalizes them separately and breaks default-export interop in dev.
    _nuxt.options.experimental = {
      ..._nuxt.options.experimental,
      viteEnvironmentApi: false,
    }

    const docsInstalled = (_nuxt.options.modules ?? []).some((m) => {
      const id = String(m)
      return id.includes('module-docs') || id.includes('@owdproject/docs')
    })

    if (docsInstalled) {
      try {
        const { registerOwdDocsSource } = await import(
          '@owdproject/module-docs/register'
        )
        registerOwdDocsSource(_nuxt, {
          id: 'module-fs',
          cwd: resolve('./content'),
          include: 'docs/**',
          prefix: '/docs/modules/filesystem',
        })
      } catch {
        /* module-docs optional — skip in-repo docs registration */
      }
    }

    addImportsDir(resolve('./runtime/composables'))
    addImportsDir(resolve('./runtime/stores'))

    addPlugin({
      src: resolve('./runtime/plugin'),
      mode: 'client',
    })

    _nuxt.hook('vite:extendConfig', (config: UserConfig) => {
      config.optimizeDeps = mergeOptimizeDepsInclude(config.optimizeDeps)
    })
  },
})
