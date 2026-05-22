import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover active:bg-accent-hover shadow-xs',
  secondary: 'bg-gray-100 text-foreground hover:bg-gray-200 active:bg-gray-300 border border-border',
  ghost: 'text-muted hover:bg-gray-100 hover:text-foreground active:bg-gray-200',
  danger: 'bg-danger text-white hover:bg-red-600 active:bg-red-700 shadow-xs',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs gap-1.5',
  md: 'px-3.5 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, children, className = '', disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-[var(--radius-md)]
        transition-all duration-[var(--transition-fast)]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 12 : 14} className="spinner" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  )
})
