<script lang="ts">
  import * as m from '../paraglide/messages'
  import Modal from './Modal.svelte'

  // Props
  let {
    title = 'Confirm',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
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
    <div class="confirm-message text-gray-700 dark:text-gray-300">
      {@html message}
    </div>
  </div>
</Modal>

<style>
  /* Container styling can remain locally scoped */
  .confirm-message {
    white-space: normal;
  }

  /* Use :global for {@html} content to ensure styles apply */
  :global(.confirm-message p) {
    margin: 0.5rem 0;
  }
  :global(.confirm-message ul) {
    margin: 0.25rem 0 0.9rem 0;
    padding-left: 1.5rem;
    list-style: disc;
  }
  :global(.confirm-message li) {
    margin: 0.18rem 0;
  }
  :global(.confirm-message strong) {
    font-weight: 600;
  }
  :global(.confirm-message code) {
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
      'Courier New', monospace;
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    padding: 0 4px;
    font-size: 0.95em;
  }

  /* Severity label styles are global for inserted HTML message */
  :global(.severity) {
    display: inline-block;
    font-weight: 600;
    border-radius: 6px;
    padding: 2px 8px;
    line-height: 1.3;
    margin-bottom: 0.4rem;
  }
  /* Error severity style */
  :global(.severity-error) {
    color: #7f1d1d;
    background-color: #fee2e2;
    border: 1px solid #fecaca;
  }
  /* Warning severity style */
  :global(.severity-warn) {
    color: #7c2d12;
    background-color: #ffedd5;
    border: 1px solid #fed7aa;
  }
</style>
