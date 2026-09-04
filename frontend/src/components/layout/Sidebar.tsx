import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileSpreadsheet,
  FileText,
  Calculator,
  GraduationCap,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'

interface SidebarProps {
  onNavigate?: () => void
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full w-60 flex-col bg-white">
      {/* Header Sidebar: Logo KPK & Nama Sistem */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-4 sm:px-6">
        <img src="/logo-kpk.png" alt="KPK" className="h-8 w-8" />
        <span className="text-sm font-extrabold text-gray-900 leading-tight">
          Sistem Konversi<br />Kinerja
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 mt-2">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                isActive
                  ? 'bg-[#ba191d] text-white'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <svg
              className="h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={ICONS[item.label] ?? ''} />
            </svg>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  // Navigasi khusus ADMIN
  const ADMIN_NAV = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/admin/import',
      label: 'Import & Konversi',
      icon: FileSpreadsheet,
    },
    {
      to: '/admin/master-data',
      label: 'Master Data',
      icon: FileText,
    },
    {
      to: '/admin/rekapitulasi',
      label: 'Rekapitulasi & PAK',
      icon: FileText,
    },
    {
      to: '/admin/pengajuan',
      label: 'Verifikasi Pendidikan',
      icon: GraduationCap,
    },
    {
      to: '/kalkulator',
      label: 'Kalkulator',
      icon: Calculator,
    },
  ]

  // Navigasi khusus PEGAWAI
  const PEGAWAI_NAV = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/pengajuan',
      label: 'Pengajuan Pendidikan',
      icon: GraduationCap,
    },
    {
      to: '/kalkulator',
      label: 'Kalkulator',
      icon: Calculator,
    },
  ]

  const navItems = isAdmin ? ADMIN_NAV : PEGAWAI_NAV

  return (
    <div className="flex h-full w-60 flex-col border-r border-gray-200 bg-white shadow-xs">
      {/* Profile Card Mini */}
      <div className="flex items-center gap-3 border-b border-gray-100 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-50 text-sm font-extrabold text-[#ba191d] border border-red-100 shadow-xs">
          {(user?.name ?? 'U').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-gray-900">{user?.name ?? 'User'}</p>
          <span
            className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
              isAdmin
                ? 'text-[#ba191d] bg-red-50 border-red-200'
                : 'text-gray-700 bg-gray-100 border-gray-200'
            }`}
          >
            {user?.role ?? 'PEGAWAI'}
          </span>
        </div>
      </div>

      {/* Nav List */}
      <div className="p-3">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#ba191d] text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-gray-100 p-3.5">
        <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400">
          <ShieldAlert className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="truncate">PerBKN No. 3/2023 · KPK</span>
        </div>
      </div>
    </div>
  )
}
