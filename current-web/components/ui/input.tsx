import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  error?: string
  hint?: string
  startAdornment?: React.ReactNode
  endAdornment?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, startAdornment, endAdornment, className = '', id, ...props },
  ref
) {
  const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-muted mb-0.5">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {startAdornment && (
          <span className="absolute left-2.5 text-muted">{startAdornment}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-2.5 py-1.5 text-sm rounded-[var(--radius-md)]
            bg-input-bg border border-border
            placeholder:text-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-[var(--transition-fast)]
            ${startAdornment ? 'pl-8' : ''}
            ${endAdornment ? 'pr-8' : ''}
            ${error ? 'border-danger focus:ring-danger/30 focus:border-danger' : ''}
          `}
          {...props}
        />
        {endAdornment && (
          <span className="absolute right-2.5 text-muted">{endAdornment}</span>
        )}
      </div>
      {error && <p className="text-[10px] text-danger">{error}</p>}
      {hint && !error && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  )
})
