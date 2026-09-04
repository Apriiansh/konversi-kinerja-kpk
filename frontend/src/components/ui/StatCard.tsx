import { type ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  suffix?: string
  icon?: ReactNode
  color?: 'default' | 'emerald' | 'blue' | 'amber'
}

const colorStyles: Record<string, { border: string; label: string; value: string }> = {
  default: {
    border: 'border-gray-200/80',
    label: 'text-gray-400',
    value: 'text-gray-900',
  },
  emerald: {
    border: 'border-emerald-200 bg-emerald-50/40',
    label: 'text-emerald-800',
    value: 'text-emerald-700',
  },
  blue: {
    border: 'border-blue-200 bg-blue-50/40',
    label: 'text-blue-800',
    value: 'text-blue-700',
  },
  amber: {
    border: 'border-amber-200 bg-amber-50/40',
    label: 'text-amber-800',
    value: 'text-amber-700',
  },
}

export function StatCard({ label, value, suffix, icon, color = 'default' }: StatCardProps) {
  const styles = colorStyles[color] ?? colorStyles.default

  return (
    <div className={`bg-white p-4 rounded-xl border shadow-xs space-y-1 ${styles.border}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-extrabold uppercase tracking-wider ${styles.label}`}>
          {label}
        </span>
        {icon}
      </div>
      <p className={`text-2xl font-black font-mono tracking-tight ${styles.value}`}>
        {value}
        {suffix && (
          <span className="text-xs font-medium text-gray-400 font-sans ml-1">
            {suffix}
          </span>
        )}
      </p>
    </div>
  )
}
