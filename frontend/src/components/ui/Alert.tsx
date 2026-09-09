import { X } from 'lucide-react'

type AlertVariant = 'error' | 'success' | 'info' | 'warning'

interface AlertProps {
  variant: AlertVariant
  title?: string
  message: string
  onDismiss?: () => void
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; text: string; icon: string }> = {
  error: {
    bg: 'bg-error/10',
    border: 'border-error/20',
    text: 'text-error',
    icon: 'text-error',
  },
  success: {
    bg: 'bg-success/10',
    border: 'border-success/20',
    text: 'text-success',
    icon: 'text-success',
  },
  info: {
    bg: 'bg-info/10',
    border: 'border-info/20',
    text: 'text-info',
    icon: 'text-info',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: 'text-amber-600',
  },
}

export function Alert({ variant, title, message, onDismiss }: AlertProps) {
  const styles = variantStyles[variant]

  return (
    <div
      className={`flex items-start gap-3 p-4 border rounded-xl text-xs font-medium animate-in fade-in duration-200 ${styles.bg} ${styles.border} ${styles.text}`}
    >
      <div className="flex-1 leading-relaxed">
        {title && (
          <strong className="font-extrabold block mb-0.5">{title}</strong>
        )}
        {message}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={`p-1 ${styles.icon} hover:opacity-70`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
