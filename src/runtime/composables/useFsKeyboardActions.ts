import { watchEffect } from 'vue'
import { useMagicKeys } from '@vueuse/core'
import type { IWindowController } from '@owdproject/core'

export function useFsKeyboardActions(
  owdWindow: IWindowController,
  actions: {
    onDelete?: (toTrash: boolean) => void
    onCopy?: () => void
    onCut?: () => void
    onPaste?: () => void
  },
) {
  const keys = useMagicKeys()

  watchEffect(() => {
    if (owdWindow.state.focused) {
      if (keys.delete?.value) {
        actions.onDelete?.(!keys.shift?.value)
      }

      if (keys.c.value && keys.ctrl.value) {
        actions.onCopy?.()
      }

      if (keys.x.value && keys.ctrl.value) {
        actions.onCut?.()
      }

      if (keys.v.value && keys.ctrl.value) {
        actions.onPaste?.()
      }
    }
  })
}
