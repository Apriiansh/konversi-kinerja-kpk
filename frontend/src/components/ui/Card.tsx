import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200/80 shadow-xs ${className}`}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  tag?: string
  tagColor?: string
  regulation?: string
  actions?: ReactNode
}

export function CardHeader({ title, subtitle, tag, tagColor = '#ba191d', regulation, actions }: CardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 bg-white p-5 sm:p-6 rounded-xl border border-gray-200/80 shadow-xs md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        {(tag || regulation) && (
          <div className="flex items-center gap-2">
            {tag && (
              <span
                className="text-[11px] font-extrabold uppercase tracking-wider bg-red-50 px-2.5 py-0.5 rounded border border-red-200"
                style={{ color: tagColor }}
              >
                {tag}
              </span>
            )}
            {regulation && (
              <>
                <span className="text-[11px] font-bold text-gray-400">·</span>
                <span className="text-[11px] font-bold text-gray-500">{regulation}</span>
              </>
            )}
          </div>
        )}
        <h1 className="text-xl font-black text-gray-900 tracking-tight sm:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm font-medium text-gray-500 max-w-3xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  )
}
