import { X } from 'lucide-react'

type AlertVariant = 'error' | 'success' | 'info'

interface AlertProps {
  variant: AlertVariant
  title?: string
  message: string
  onDismiss?: () => void
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; text: string; icon: string }> = {
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'text-red-600',
  },
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    icon: 'text-emerald-600',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-600',
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
