declare module 'nuxt/schema' {
  interface DesktopConfig {
    fs?: {
      defaultUserHome?: string
      recentFiles?: { relativePath?: string }
      mounts?: Record<string, string>
      folders?: {
        common?: string[]
        extra?: string[]
        override?: string[]
      }
      fileAssociations?: Record<string, string>
    }
  }
}

export {}
