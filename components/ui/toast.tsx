'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
  removing: boolean
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

const typeStyles: Record<ToastType, string> = {
  success: 'bg-[var(--color-success)]',
  error: 'bg-[var(--color-danger)]',
  info: 'bg-[var(--color-primary)]',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type, removing: false }])

    // Commence la transition de sortie apres 2.7s, supprime apres 3s
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, removing: true } : t)))
    }, 2700)

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none safe-area-top" style={{ top: 'max(1rem, env(safe-area-inset-top))' }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              pointer-events-auto max-w-sm w-auto rounded-lg px-4 py-3 shadow-lg
              text-white text-sm font-medium
              transition-all duration-300 ease-out
              ${t.removing ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'}
              ${typeStyles[t.type]}
            `}
            style={{ animation: t.removing ? undefined : 'toast-slide-in 0.3s ease-out' }}
            role="status"
            aria-live="polite"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast doit etre utilise dans un <ToastProvider>')
  }
  return ctx
}
