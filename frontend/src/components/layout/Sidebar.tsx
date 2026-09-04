import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/useAuth'
import { getAktivitasTerbaru, type AktivitasItem } from '../../api/aktivitas'

interface SidebarProps {
  onNavigate?: () => void
  onCloseMobile?: () => void
  collapsed?: boolean
  onToggleCollapsed?: () => void
}

const BADGE_COLOR: Record<string, string> = {
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-600',
}

interface MenuItem {
  to: string
  label: string
  icon: ReactElement
}

const PEGAWAI_MENU: MenuItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: <i className="fa-solid fa-gauge-high text-xs w-4 text-center" />,
  },
  {
    to: '/informasi-saldo',
    label: 'Informasi Saldo Awal',
    icon: <i className="fa-solid fa-file-invoice-dollar text-xs w-4 text-center" />,
  },
  {
    to: '/penilaian-triwulan',
    label: 'Penilaian Triwulan',
    icon: <i className="fa-solid fa-clipboard-check text-xs w-4 text-center" />,
  },
  {
    to: '/rekapitulasi',
    label: 'Rekapitulasi & PAK',
    icon: <i className="fa-solid fa-file-contract text-xs w-4 text-center" />,
  },
  {
    to: '/pengajuan-pendidikan',
    label: 'Pengajuan Pendidikan',
    icon: <i className="fa-solid fa-graduation-cap text-xs w-4 text-center" />,
  },
  {
    to: '/kalkulator',
    label: 'Kalkulator BKN',
    icon: <i className="fa-solid fa-calculator text-xs w-4 text-center" />,
  },
]

const ADMIN_MENU: MenuItem[] = [
  {
    to: '/admin',
    label: 'Dashboard',
    icon: <i className="fa-solid fa-gauge-high text-xs w-4 text-center" />,
  },
  {
    to: '/admin/import',
    label: 'Import & Konversi',
    icon: <i className="fa-solid fa-file-import text-xs w-4 text-center" />,
  },
  {
    to: '/admin/master-data',
    label: 'Master Data',
    icon: <i className="fa-solid fa-database text-xs w-4 text-center" />,
  },
  {
    to: '/admin/rekapitulasi',
    label: 'Rekapitulasi & PAK',
    icon: <i className="fa-solid fa-file-contract text-xs w-4 text-center" />,
  },
  {
    to: '/admin/pengajuan',
    label: 'Verifikasi Pendidikan',
    icon: <i className="fa-solid fa-user-check text-xs w-4 text-center" />,
  },
  {
    to: '/admin/kalkulator',
    label: 'Kalkulator',
    icon: <i className="fa-solid fa-calculator text-xs w-4 text-center" />,
  },
]

export default function Sidebar({
  onNavigate,
  onCloseMobile,
  collapsed = false,
  onToggleCollapsed,
}: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [aktivitas, setAktivitas] = useState<AktivitasItem[]>([])

  const isAdmin = user?.role === 'ADMIN'
  const menuItems = isAdmin ? ADMIN_MENU : PEGAWAI_MENU

  const handleToggle = () => {
    if (onToggleCollapsed) onToggleCollapsed()
  }

  const displayName = user?.name ?? 'Ahmad Fajar, S.Kom'
  const displayJabatan = user?.pegawai?.pangkat_golongan?.jenjang_jabatan?.nama
    ? `Analis SDM Aparatur - ${user.pegawai.pangkat_golongan.jenjang_jabatan.nama}`
    : 'Analis SDM Aparatur - Ahli Pertama'
  const displayUnit = 'Biro Kepegawaian dan Organisasi'

  useEffect(() => {
    let mounted = true
    getAktivitasTerbaru(4)
      .then((data) => { if (mounted) setAktivitas(data) })
      .catch(() => { })
    return () => { mounted = false }
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="flex h-full w-full flex-col bg-white select-none border-r border-gray-200/80 shadow-xs overflow-hidden">
      {/* Top Banner Header with Red KPK Gradient & Wave Ornament */}
      <div className="relative bg-gradient-to-br from-[#800f13] via-[#ba191d] to-[#9c1317] pt-5 pb-8 px-5 text-white overflow-hidden shrink-0">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />

        {/* Close Button for Mobile View */}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors lg:hidden cursor-pointer"
            aria-label="Tutup Menu"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        )}

        {/* KPK Branding */}
        <div className={`relative z-10 flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-md">
            <img src="/logo-kpk.png" alt="Logo KPK" className="h-full w-full object-contain" />
          </div>
          <div className={collapsed ? 'hidden' : ''}>
            <h1 className="text-sm font-black tracking-tight leading-tight text-white drop-shadow-xs">
              Konversi Kinerja
            </h1>
            <p className="text-[10px] font-semibold text-red-100/90 tracking-wide uppercase">
              Komisi Pemberantasan Korupsi
            </p>
          </div>
        </div>

        {/* SVG Wave Ornament attached to the bottom edge of the banner */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none translate-y-[1px]">
          <svg
            className="w-full h-5 text-white fill-current"
            viewBox="0 0 500 150"
            preserveAspectRatio="none"
          >
            <path d="M0,0 C150,90 350,-40 500,40 L500,150 L0,150 Z" />
          </svg>
        </div>
      </div>

      {/* User Profile Card Summary Section - avatar hilang saat minimize */}
      <div className={`relative flex flex-col items-center text-center border-b border-gray-100 shrink-0 ${collapsed ? 'hidden' : 'px-5 pt-1 pb-4'}`}>
        {/* User Avatar with Red Glowing Accent & Status Dot */}
        <div className="relative -mt-7 mb-2 z-10">
          <div className="relative h-16 w-16 rounded-full p-1 bg-white shadow-md ring-2 ring-[#ba191d]/20">
            <div className="flex h-full w-full overflow-hidden rounded-full">
              <img
                src="/avatar-pegawai.jpg"
                alt="Avatar Pegawai"
                className="h-full w-full object-cover"
              />
            </div>
            {/* Active Online Indicator */}
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-xs" />
          </div>
        </div>

        {/* User Profile Details */}
        <div className="flex flex-col items-center">
          <h3 className="text-xs font-black text-gray-900 leading-snug line-clamp-1">
            {displayName}
          </h3>
          <p className="mt-0.5 text-[11px] font-semibold text-red-700 leading-tight">
            {displayJabatan}
          </p>
          <span className="mt-1 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-500">
            {displayUnit}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className={`flex-1 space-y-1 p-3 overflow-y-auto custom-scrollbar ${collapsed ? 'px-2' : ''}`}>
        <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 ${collapsed ? 'hidden' : ''}`}>
          {isAdmin ? 'Menu Admin' : 'Menu Utama'}
        </div>
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={true}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl py-2.5 text-xs font-bold transition-all duration-200 ${collapsed ? 'justify-center px-2' : 'px-3.5'} ${isActive
                ? 'bg-gradient-to-r from-[#ba191d] to-[#9c1317] text-white shadow-md shadow-red-900/15'
                : 'text-gray-600 hover:bg-red-50/60 hover:text-[#ba191d]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <motion.span
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  className={`shrink-0 transition-colors ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-[#ba191d]'}`}
                >
                  {item.icon}
                </motion.span>
                <span className={`truncate flex-1 ${collapsed ? 'hidden' : ''}`}>{item.label}</span>
                {isActive && !collapsed && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="h-1.5 w-1.5 rounded-full bg-white shadow-xs"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Aktivitas Terbaru dari Backend - hidden when collapsed */}
        {!collapsed && aktivitas.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Aktivitas Terbaru
            </div>
            <div className="mt-1 space-y-1.5">
              {aktivitas.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-gray-50/80 border border-gray-100 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-semibold text-gray-700 leading-snug line-clamp-1 flex-1">
                      {item.judul}
                    </p>
                    {item.badge && (
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${BADGE_COLOR[item.badge_color ?? 'gray'] ?? BADGE_COLOR.gray}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-gray-400 line-clamp-1">{item.keterangan}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Sidebar Footer Controls */}
      <div className="border-t border-gray-100 p-3 bg-gray-50/50 shrink-0">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2">
              {/* Minimize Toggle */}
              <button
                type="button"
                onClick={handleToggle}
                disabled={!onToggleCollapsed}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2 px-3 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors cursor-pointer"
                title="Perkecil sidebar"
                aria-label="Perkecil sidebar"
              >
                <i className="fa-solid fa-angles-left text-xs" />
              </button>

              {/* Logout */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleLogout}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200/80 bg-red-50/70 py-2 px-3 text-xs font-bold text-[#ba191d] transition-all hover:bg-red-100/80 hover:text-red-800 cursor-pointer shadow-xs"
                title="Keluar Sistem"
              >
                <i className="fa-solid fa-right-from-bracket text-xs" />
                <span>Keluar</span>
              </motion.button>
            </div>

            {/* Version */}
            <div className="text-center text-[10px] font-semibold text-gray-400 mt-2">
              Konversi Kinerja v2.0 • KPK RI
            </div>
          </>
        ) : (
          <>
            {/* Minimize Toggle - icon only */}
            <button
              type="button"
              onClick={handleToggle}
              disabled={!onToggleCollapsed}
              className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors cursor-pointer"
              title="Perbesar sidebar"
              aria-label="Perbesar sidebar"
            >
              <i className="fa-solid fa-angles-right text-xs" />
            </button>

            {/* Logout - icon only */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handleLogout}
              className="mt-2 flex w-full items-center justify-center rounded-xl border border-red-200/80 bg-red-50/70 py-2.5 px-3 text-xs font-bold text-[#ba191d] transition-all hover:bg-red-100/80 hover:text-red-800 cursor-pointer shadow-xs"
              title="Keluar Sistem"
            >
              <i className="fa-solid fa-right-from-bracket text-xs" />
            </motion.button>
          </>
        )}
      </div>
    </aside>
  )
}
