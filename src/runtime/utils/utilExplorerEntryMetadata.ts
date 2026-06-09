import { fs } from '@zenfs/core'

export type ExplorerEntryMetadata = {
  stats: unknown | null
  isFile: boolean
  isDirectory: boolean
  fileContent: string | null
}

const emptyMetadata = (): ExplorerEntryMetadata => ({
  stats: null,
  isFile: false,
  isDirectory: false,
  fileContent: null,
})

/** Load stat + optional utf-8 preview for an explorer file row (ZenFS only in module-fs). */
export function fetchExplorerEntryMetadata(
  absolutePath: string,
  onResult: (meta: ExplorerEntryMetadata) => void,
): void {
  fs.stat(absolutePath, (err, stats) => {
    if (err || !stats) {
      if (err) console.error(err)
      onResult(emptyMetadata())
      return
    }

    const isFile = stats.isFile()
    const isDirectory = stats.isDirectory()
    let fileContent: string | null = null

    if (isFile) {
      try {
        fileContent = fs.readFileSync(absolutePath, 'utf-8') as string
      } catch (error) {
        console.error('Error while reading the file', error)
      }
    }

    onResult({
      stats,
      isFile,
      isDirectory,
      fileContent,
    })
  })
}
