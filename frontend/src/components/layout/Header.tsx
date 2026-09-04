import { useNavigate } from 'react-router-dom'
import { Bell, LogOut } from 'lucide-react'
import { useAuth } from '../../context/useAuth'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const isAdmin = user?.role === 'ADMIN'

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <img src="/logo-kpk.png" alt="KPK" className="h-8 w-8 object-contain" />
        <div className="flex flex-col">
          <span className="text-sm font-black tracking-tight text-gray-900 sm:text-base">
            Sistem Konversi Kinerja
          </span>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Komisi Pemberantasan Korupsi RI
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          className="relative rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="Notifikasi"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ba191d] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ba191d]" />
          </span>
        </button>

        <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-red-200 bg-red-50 text-[#ba191d]">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="max-w-[160px] truncate text-sm font-extrabold text-gray-900">
              {user?.name ?? 'Ahmad Fajar, S.Kom'}
            </p>
            <p className="text-[11px] font-medium text-gray-500">{user?.role ?? 'Pegawai PNS'}</p>
        <div className="flex items-center gap-2.5 border-l border-gray-200 pl-3 sm:pl-4">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-red-50 text-sm font-extrabold text-[#ba191d] border border-red-100 shadow-xs">
            {(user?.name ?? 'U').charAt(0).toUpperCase()}
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="max-w-[160px] truncate text-xs font-extrabold text-gray-900">
              {user?.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-extrabold border ${
                  isAdmin
                    ? 'text-[#ba191d] bg-red-50 border-red-200'
                    : 'text-gray-600 bg-gray-100 border-gray-200'
                }`}
              >
                {user?.role ?? 'PEGAWAI'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="ml-1 flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-100"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  )
}