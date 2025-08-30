<script lang="ts">
  import * as m from '../paraglide/messages'
  import Modal from './Modal.svelte'

  // Props
  let {
    title = '确认',
    message = '确定要执行此操作吗？',
    confirmText = '确定',
    cancelText = m.MODAL_CANCEL_BUTTON(),
    isOpen = $bindable(false),
    onConfirm = () => {},
    onClose = () => {},
  }: {
    title?: string
    message?: string
    confirmText?: string
    cancelText?: string
    isOpen: boolean
    onConfirm?: () => void
    onClose?: () => void
  } = $props()

  /**
   * Handle confirm action
   */
  async function handleConfirm() {
    await onConfirm()
    isOpen = false
  }

  /**
   * Handle close action
   */
  function handleClose() {
    onClose()
    isOpen = false
  }
</script>

<Modal
  {title}
  {isOpen}
  onClose={handleClose}
  onConfirm={handleConfirm}
  {confirmText}
  {cancelText}>
  <div class="py-4">
    <p class="text-gray-700 dark:text-gray-300">{message}</p>
  </div>
</Modal>
