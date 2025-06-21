import { defineNuxtModule, addPlugin, createResolver, addComponentsDir } from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: 'owd-module-fs',
    configKey: 'fs',
  },
  defaults: {
    mounts: {
      '/home': 'WebStorage',
      '/tmp': 'InMemory',
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
    }
  },
  setup(_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url)

    _nuxt.options.runtimeConfig.public.fs = _options

    addComponentsDir({
      path: resolve('./runtime/components'),
    })

    addPlugin({
      src: resolve('./runtime/plugin'),
      mode: 'client',
    })
  },
})
