import { CheckCircle2, GraduationCap, Clock } from 'lucide-react'
import type { StatusKelayakan } from '../../types'

interface StatusBadgeProps {
  status: StatusKelayakan
  size?: 'sm' | 'md'
}

const statusConfig: Record<StatusKelayakan, { label: string; styles: string; icon: typeof CheckCircle2 }> = {
  LAYAK_PANGKAT: {
    label: 'LAYAK NAIK PANGKAT',
    styles: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  LAYAK_JENJANG: {
    label: 'LAYAK NAIK JENJANG',
    styles: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: GraduationCap,
  },
  BELUM_CUKUP: {
    label: 'BELUM CUKUP AK',
    styles: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Clock,
  },
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.BELUM_CUKUP
  const Icon = config.icon
  const sizeClass = size === 'md' ? 'px-3 py-1 text-xs gap-1.5' : 'px-2.5 py-0.5 text-[10px] gap-1'

  return (
    <span
      className={`inline-flex items-center rounded-full font-extrabold border whitespace-nowrap ${config.styles} ${sizeClass}`}
    >
      <Icon className={size === 'md' ? 'h-4 w-4' : 'h-3 w-3'} />
      <span>{config.label}</span>
    </span>
  )
}

export function StatusKelayakanText({ status }: { status: StatusKelayakan | undefined }) {
  if (!status || status === 'BELUM_CUKUP') {
    return (
      <span className="text-[11px] font-medium text-amber-800">
        Disimpan utuh
      </span>
    )
  }
  if (status === 'LAYAK_PANGKAT') {
    return (
      <span className="font-mono font-bold text-emerald-800 text-xs">
        Carry-Over: +{0} AK
      </span>
    )
  }
  if (status === 'LAYAK_JENJANG') {
    return (
      <span className="text-[11px] font-medium text-gray-400 italic">
        Sisa Reset (0 AK)
      </span>
    )
  }
  return null
}
