/**
 * Maps VFS paths to a Win95-style display path for the explorer title bar.
 * e.g. `/mnt/foo/bar` → `C:\mnt\foo\bar`
 */
export function formatExplorerDisplayPath(path: string): string {
  const trimmed = String(path ?? '').trim()
  if (!trimmed || trimmed === '/') {
    return 'C:\\'
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  const normalized = trimmed.replace(/\\/g, '/').replace(/\/+/g, '/')
  const withoutLeading = normalized.startsWith('/')
    ? normalized.slice(1)
    : normalized

  return `C:\\${withoutLeading.replace(/\//g, '\\')}`
}

/** Inverse of {@link formatExplorerDisplayPath} for address-bar navigation. */
export function parseExplorerVfsPath(display: string): string {
  const trimmed = String(display ?? '').trim()
  if (!trimmed || /^C:\\?$/i.test(trimmed)) {
    return '/'
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  const winPath = trimmed.match(/^C:\\(.*)$/i)
  if (winPath) {
    const segments = winPath[1].replace(/\\/g, '/').replace(/\/+/g, '/')
    return segments ? `/${segments}` : '/'
  }

  const normalized = trimmed.replace(/\\/g, '/').replace(/\/+/g, '/')
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}
