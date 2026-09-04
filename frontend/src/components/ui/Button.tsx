import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  children: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#ba191d] text-white hover:bg-[#a31519] shadow-sm',
  secondary:
    'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 shadow-xs',
  ghost:
    'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900',
  danger:
    'bg-red-600 text-white hover:bg-red-700 shadow-sm',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-xs',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  )
}
