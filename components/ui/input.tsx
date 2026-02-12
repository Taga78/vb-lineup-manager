import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-(--color-text-secondary) mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border px-3 py-2 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:border-(--color-primary) ${
            error ? 'border-(--color-danger)' : 'border-(--color-border)'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-(--color-danger)">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
