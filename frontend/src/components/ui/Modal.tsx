import { type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: ReactNode
  maxWidth?: 'max-w-2xl' | 'max-w-4xl' | 'max-w-6xl'
  footer?: ReactNode
  children: ReactNode
}

export function Modal({ open, onClose, title, subtitle, icon, maxWidth = 'max-w-4xl', footer, children }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`flex max-h-[90vh] w-full ${maxWidth} flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-200`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#ba191d] border border-red-100">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-base font-black text-gray-900">{title}</h3>
              {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
