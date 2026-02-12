'use client'

import { useState } from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'

interface ConfirmButtonProps extends Omit<ButtonProps, 'onClick'> {
  onConfirm: () => void
  confirmLabel?: string
  cancelLabel?: string
}

export function ConfirmButton({
  children,
  onConfirm,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  ...buttonProps
}: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <Button {...buttonProps} onClick={() => setConfirming(true)}>
        {children}
      </Button>
    )
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size={buttonProps.size ?? 'md'}
        className="flex-1"
        onClick={() => setConfirming(false)}
        disabled={buttonProps.disabled || buttonProps.loading}
      >
        {cancelLabel}
      </Button>
      <Button
        variant={buttonProps.variant ?? 'danger'}
        size={buttonProps.size ?? 'md'}
        className="flex-1"
        onClick={() => {
          onConfirm()
          setConfirming(false)
        }}
        loading={buttonProps.loading}
        disabled={buttonProps.disabled}
      >
        {confirmLabel}
      </Button>
    </div>
  )
}
