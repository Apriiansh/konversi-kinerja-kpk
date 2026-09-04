import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/rekapitulasi', label: 'Rekapitulasi & PAK' },
  { to: '/kalkulator', label: 'Kalkulator BKN' },
  { to: '/pengajuan', label: 'Pengajuan Pendidikan' },
]

const ICONS: Record<string, string> = {
  Dashboard: 'M3 12l9-9 9 9M4 10v10h5v-6h6v6h5V10',
  'Rekapitulasi & PAK': 'M9 17H5a1 1 0 01-1-1V5a1 1 0 011-1h6l2 2h7a1 1 0 011 1v9a1 1 0 01-1 1h-4M9 17v6m4-9v9',
  'Kalkulator BKN': 'M9 7h6m-6 5h6m-6 5h6M4 3h13l3 3v15H4z',
  'Pengajuan Pendidikan': 'M12 14l9-5-9-5-9 5 9 5zM12 14l6.16-3.42a12 12 0 01.84 6.42M12 14v7',
}

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

      <div className="border-t border-gray-100 p-3 text-[11px] font-medium text-gray-400">
        Konversi Kinerja v2 · KPK
      </div>
    </div>
  )
}