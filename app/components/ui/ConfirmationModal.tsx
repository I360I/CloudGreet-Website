'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmationModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  loading?: boolean
}

export function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false
}: ConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          {variant === 'destructive' && (
            <div className="flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
          )}
          <p className="text-slate-300 text-sm">{message}</p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

