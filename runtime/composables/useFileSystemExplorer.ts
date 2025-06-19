import { ref, watch } from 'vue'
import { fs } from '@zenfs/core'
import { getAppByFilename } from '@owdproject/module-fs/runtime/utils/utilFileSystem'
import { useDesktopManager } from '@owdproject/core/runtime/composables/useDesktopManager'
import { useClipboardFs } from '@owdproject/core/runtime/composables/useClipboardFs'
import { shellEscape } from '@owdproject/core/runtime/utils/utilTerminal'
import { useDirectoryNavigationFs } from './useFileSystemDirectoryNavigation'
import { useConfirm } from 'primevue/useconfirm'
import { useI18n } from 'vue-i18n'

export function useFileSystemExplorer(owdWindow) {
  const desktopManager = useDesktopManager()

  const basePath = ref(owdWindow.meta.path)
  const selectedFiles = ref<string[]>([])
  const layout = ref<string>('')

  const fsEntries = ref<string[]>([])
  const fsClipboard = useClipboardFs()
  const fsDirectoryNavigation = useDirectoryNavigationFs()

  const confirm = useConfirm()

  watch(
    () => basePath.value,
    () => {
      owdWindow.meta.path = basePath.value
    },
  )

  async function initialize() {
    await navigateToDirectory(basePath.value)
  }

  async function navigateToDirectory(path: string) {
    try {
      fsEntries.value = fs.readdirSync(path)
    } catch (e) {
      console.error(e)
      fsEntries.value = []
    }
  }

  async function refreshDirectory() {
    await navigateToDirectory(basePath.value)
  }

  async function openDirectory(fileName: string) {
    const fullPath =
      basePath.value === '/' ? `/${fileName}` : `${basePath.value}/${fileName}`

    try {
      const stats = fs.statSync(fullPath)
      if (!stats.isDirectory()) return

      basePath.value = fullPath
      await navigateToDirectory(fullPath)

      // fsDirectoryNavigation

      fsDirectoryNavigation.push(fullPath)
      basePath.value = fullPath
    } catch (err) {
      console.error(err)
    }
  }

  async function openFile(fileName: string) {
    const appRequired = getAppByFilename(fileName)

    if (appRequired) {
      const defaultApp = desktopManager.getDefaultApp(appRequired)

      if (defaultApp) {
        const path = shellEscape(`${basePath.value}/${fileName}`)
        defaultApp.application.execCommand(
          `${defaultApp.command} '${path}' --autoplay`,
        )
      }
    }
  }

  function selectFiles(fileNames: string[]) {
    selectedFiles.value = fileNames.map((name) =>
      basePath.value === '/' ? `/${name}` : `${basePath.value}/${name}`,
    )
  }

  function selectAllFiles() {
    if (Array.isArray(fsEntries.value)) {
      selectedFiles.value = fsEntries.value.map(
        (name) => `${basePath.value}/${name}`,
      )
    }
  }

  function invertSelection() {
    if (!Array.isArray(fsEntries.value)) return

    const currentSelection = new Set(selectedFiles.value)

    selectedFiles.value = fsEntries.value
      .filter((name) => {
        return !currentSelection.has(`${basePath.value}/${name}`)
      })
      .map((name) => `${basePath.value}/${name}`)
  }

  function cutFiles() {
    fsClipboard.setClipboard(selectedFiles.value, 'cut')
  }

  function copyFiles() {
    fsClipboard.setClipboard(selectedFiles.value, 'copy')
  }

  async function deleteSelectedFiles() {
    if (!selectedFiles.value.length) return

    const { t } = useI18n()

    return new Promise<void>((resolve) => {
      confirm.require({
        header: t('dialog.deleteFiles.confirm.title'),
        message: t('dialog.deleteFiles.confirm.message', { count: selectedFiles.value.length }),
        acceptProps: {
          label: t('apps.explorer.action.delete'),
        },
        rejectProps: {
          label: t('apps.explorer.action.cancel'),
        },
        accept: async () => {
          try {
            for (const fullPath of selectedFiles.value) {
              const stats = await fs.promises.stat(fullPath)

              if (stats.isFile()) {
                await fs.promises.unlink(fullPath)
              } else if (stats.isDirectory()) {
                await new Promise<void>((innerResolve) => {
                  confirm.require({
                    header: t('dialog.deleteFolder.confirm.title'),
                    message: t('dialog.deleteFolder.confirm.message', { name: fullPath }),
                    acceptProps: {
                      label: t('apps.explorer.action.delete'),
                    },
                    rejectProps: {
                      label: t('apps.explorer.action.cancel'),
                    },
                    accept: async () => {
                      await fs.promises.rm(fullPath, {
                        recursive: true,
                        force: true,
                      })
                      innerResolve()
                    },
                    reject: () => {
                      innerResolve()
                    },
                  })
                })
              }
            }

            fsEntries.value = await fs.promises.readdir(basePath.value)
            selectedFiles.value = []
          } catch (e) {
            console.error(e)
          }

          resolve()
        },
        reject: () => {
          resolve()
        },
      })
    })
  }

  async function pasteFiles() {
    const { t } = useI18n()

    const files = fsClipboard.clipboardFiles
    const type = fsClipboard.clipboardType.value

    if (!files?.length || !type) return

    const operations: Promise<void>[] = []

    for (const filePath of files) {
      const fileName = filePath.split('/').pop()
      if (!fileName) continue

      const targetPath = `${basePath.value}/${fileName}`

      const exists = await fs.promises
        .access(targetPath)
        .then(() => true)
        .catch(() => false)

      if (exists) {
        const shouldOverwrite = await new Promise<boolean>((resolve) => {
          confirm.require({
            header: t('dialog.fileOverride.confirm.title'),
            message: t('dialog.fileOverride.confirm.message', { name: fileName }),
            acceptProps: {
              label: t('apps.explorer.action.ok'),
            },
            rejectProps: {
              label: t('apps.explorer.action.cancel'),
            },
            accept: () => resolve(true),
            reject: () => resolve(false),
          })
        })

        if (!shouldOverwrite) continue
      }

      if (type === 'copy') {
        operations.push(fs.promises.copyFile(filePath, targetPath))
      } else if (type === 'cut') {
        operations.push(fs.promises.rename(filePath, targetPath))
      }
    }

    try {
      await Promise.all(operations)
      if (type === 'cut') {
        fsClipboard.clearClipboard()
      }
      await refreshDirectory()
    } catch (err) {
      console.error('Error while pasting', err)
    }
  }

  async function pasteShortcuts() {
    const files = fsClipboard.clipboardFiles
    if (!files?.length) return

    const { t } = useI18n()

    const operations: Promise<void>[] = []

    for (const filePath of files) {
      const fileName = filePath.split('/').pop()
      if (!fileName) continue

      const linkPath = `${basePath.value}/${fileName}`

      const exists = await fs.promises
        .access(linkPath)
        .then(() => true)
        .catch(() => false)

      if (exists) {
        const shouldOverwrite = await new Promise<boolean>((resolve) => {
          confirm.require({
            header: t('dialog.shortcutOverride.confirm.title'),
            message: t('dialog.shortcutOverride.confirm.message', { name: fileName }),
            acceptProps: {
              label: t('apps.explorer.action.ok'),
            },
            rejectProps: {
              label: t('apps.explorer.action.cancel'),
            },
            accept: () => resolve(true),
            reject: () => resolve(false),
          })
        })

        if (!shouldOverwrite) continue
      }

      operations.push(fs.promises.symlink(filePath, linkPath))
    }

    try {
      await Promise.all(operations)
      await refreshDirectory()
    } catch (err) {
      console.error(
        'Error while creating symbolic links',
        err,
      )
    }
  }

  async function directoryUp() {
    const parts = basePath.value.split('/').filter(Boolean)
    if (parts.length === 0) return
    parts.pop()
    basePath.value = '/' + parts.join('/')

    await refreshDirectory()
  }

  async function directoryBack() {
    const prev = fsDirectoryNavigation.back()
    if (prev) {
      basePath.value = prev
      await navigateToDirectory(prev)
    }
  }

  async function directoryForward() {
    const next = fsDirectoryNavigation.forward()
    if (next) {
      basePath.value = next
      await navigateToDirectory(next)
    }
  }

  function operationUndo() {
    window.alert('This should be implemented')
  }

  function fileProperties() {
    window.alert('This should be implemented')
  }

  async function createNewDirectory() {
    const folderName = window.prompt('Type a name for the new folder')
    if (!folderName) return

    const newFolderPath =
      basePath.value === '/'
        ? `/${folderName}`
        : `${basePath.value}/${folderName}`

    try {
      await fs.promises.mkdir(newFolderPath)
      await refreshDirectory()
    } catch (err) {
      console.error('Error while creating the folder', err)
    }
  }

  async function createSymbolicLink() {
    const targetPath = window.prompt(
      'Write a path for the symbolic link destination',
    )
    if (!targetPath) return

    const linkName = window.prompt('Write a name for the symbolic link')
    if (!linkName) return

    const linkPath =
      basePath.value === '/' ? `/${linkName}` : `${basePath.value}/${linkName}`

    try {
      await fs.promises.symlink(targetPath, linkPath)
      await refreshDirectory()
    } catch (err) {
      console.error('Error while creating the symbolic link:', err)
    }
  }

  function setLayout(value: string) {
    layout.value = value
  }

  return {
    initialize,
    basePath,
    selectedFiles,
    fsEntries,
    fsClipboard,
    refreshDirectory,
    openDirectory,
    directoryBack,
    directoryForward,
    directoryUp,
    openFile,
    selectFiles,
    selectAllFiles,
    invertSelection,
    cutFiles,
    copyFiles,
    deleteSelectedFiles,
    pasteFiles,
    pasteShortcuts,
    fileProperties,
    operationUndo,
    navigateToDirectory,
    createNewDirectory,
    createSymbolicLink,
    layout,
    setLayout,
  }
}
