'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason?: string) => void
  entityType: string
  entityName: string
  loading?: boolean
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  entityType,
  entityName,
  loading,
}: DeleteConfirmModalProps) {
  const [reason, setReason] = useState('')
  const [showReason, setShowReason] = useState(false)

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(reason || undefined)
    setReason('')
    setShowReason(false)
  }

  const handleClose = () => {
    setReason('')
    setShowReason(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div
        className="relative w-full max-w-md mx-4 rounded-xl border shadow-xl"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          <X className="w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
        </button>

        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-red-50">
              <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Delete {entityType.toLowerCase()}?
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                <strong>{entityName}</strong> will be moved to the trash.
                You can restore it within the retention period.
              </p>
            </div>
          </div>

          {!showReason ? (
            <button
              onClick={() => setShowReason(true)}
              className="text-sm mb-4 hover:underline"
              style={{ color: 'var(--color-brand-primary)' }}
            >
              + Add a reason (optional)
            </button>
          ) : (
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for deletion..."
              className="w-full border rounded-lg p-2.5 mb-4 text-sm resize-none"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              rows={2}
              autoFocus
            />
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm rounded-lg border transition-colors hover:bg-[var(--color-bg-tertiary)]"
              style={{
                color: 'var(--color-text-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-error)' }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
