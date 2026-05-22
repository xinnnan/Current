type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  danger: 'bg-danger-light text-danger',
  info: 'bg-blue-50 text-blue-600',
  accent: 'bg-accent-light text-accent',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium
        rounded-[var(--radius-full)] leading-tight
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
