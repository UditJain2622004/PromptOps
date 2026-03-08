import { Modal } from '@/components/Modal'

export function ConfirmDialog({
  open,
  title,
  message,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
}: {
  open: boolean
  title: string
  message: string
  onCancel: () => void
  onConfirm: () => void
  confirmLabel?: string
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
