import type { FilterStatus } from '../../types'

interface FilterPillsProps {
  options: { value: FilterStatus; label: string; count?: number; color?: string }[]
  active: FilterStatus
  onChange: (value: FilterStatus) => void
}

const colorMap: Record<string, { active: string; inactive: string }> = {
  gray: {
    active: 'bg-gray-900 text-white',
    inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  },
  emerald: {
    active: 'bg-emerald-700 text-white',
    inactive: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200',
  },
  blue: {
    active: 'bg-blue-700 text-white',
    inactive: 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200',
  },
  amber: {
    active: 'bg-amber-700 text-white',
    inactive: 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200',
  },
  red: {
    active: 'bg-red-700 text-white',
    inactive: 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200',
  },
}

export function FilterPills({ options, active, onChange }: FilterPillsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((opt) => {
        const colors = colorMap[opt.color ?? 'gray'] ?? colorMap.gray
        const isActive = active === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              isActive ? colors.active : colors.inactive
            }`}
          >
            {opt.label}
            {opt.count !== undefined && ` (${opt.count})`}
          </button>
        )
      })}
    </div>
  )
}
