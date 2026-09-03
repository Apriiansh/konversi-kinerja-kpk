import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <img src="/logo-kpk.png" alt="KPK" className="h-8 w-8" />
        <span className="text-sm font-extrabold text-gray-900 sm:text-base">
          Sistem Konversi Kinerja
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          className="relative rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="Notifikasi"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ba191d] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ba191d]" />
          </span>
        </button>

        <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-red-50 text-sm font-extrabold text-[#ba191d]">
            {(user?.name ?? 'U').charAt(0).toUpperCase()}
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="max-w-[160px] truncate text-sm font-extrabold text-gray-900">
              {user?.name}
            </p>
            <p className="text-[11px] font-medium text-gray-500">{user?.role}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="ml-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-100"
          >
            Keluar
          </button>
        </div>
      </div>
    </header>
  )
}