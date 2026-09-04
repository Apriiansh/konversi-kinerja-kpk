import { useState } from 'react'

interface HeaderProps {
  onOpenMobile?: () => void
}

export default function PegawaiHeader({ onOpenMobile }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-gray-200/80 bg-white/90 px-4 sm:px-6 backdrop-blur-md">
      {/* Brand Logo & Application Title */}
      <div className="flex items-center gap-3">
        {onOpenMobile && (
          <button
            type="button"
            onClick={onOpenMobile}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors lg:hidden"
            aria-label="Buka Menu Navigasi"
          >
            <i className="fa-solid fa-bars text-base" />
          </button>
        )}
        <img
          src="/logo-kpk.png"
          alt="Logo KPK"
          className="h-9 w-auto object-contain drop-shadow-xs"
        />
        <div className="flex flex-col">
          <span className="text-sm font-black tracking-tight text-gray-900 leading-tight">
            Konversi Kinerja
          </span>
          <span className="text-[10px] font-semibold text-gray-500 tracking-wide">
            Portal Pegawai KPK
          </span>
        </div>
      </div>

      {/* Right Side Header Controls */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none cursor-pointer"
            aria-label="Notifikasi"
          >
            <i className="fa-solid fa-bell text-base" />
            {/* Notification Indicator Dot */}
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ba191d] opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ba191d]"></span>
            </span>
          </button>

          {/* Dropdown Notifikasi Mockup */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl ring-1 ring-black/5 z-50">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h4 className="text-xs font-bold text-gray-900">Notifikasi Terbaru</h4>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-[#ba191d]">
                  2 Baru
                </span>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="rounded-xl bg-gray-50 p-2.5">
                  <p className="font-bold text-gray-800">SK PAK Triwulan III Disetujui</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">Hasil evaluasi kinerja telah dikonversi menjadi AK.</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-2.5">
                  <p className="font-bold text-gray-800">Verifikasi Berkas Pendidikan</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">Ijazah S2 telah diverifikasi oleh Tim Kepegawaian.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
