import { useEffect, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useAuth } from '../../context/useAuth'
import { getDetailPak, getPengajuanPendidikan } from '../../api/rekapitulasi'
import type { DetailPakResponse, PengajuanPendidikanItem } from '../../api/rekapitulasi'
import { getAktivitasTerbaru, type AktivitasItem } from '../../api/aktivitas'

export default function PegawaiDashboard() {
  const { user } = useAuth()

  const [pakData, setPakData] = useState<DetailPakResponse['data'] | null>(null)
  const [loadingPak, setLoadingPak] = useState<boolean>(true)

  // Data pengajuan pendidikan dari database
  const [pengajuanList, setPengajuanList] = useState<PengajuanPendidikanItem[]>([])
  const [loadingPengajuan, setLoadingPengajuan] = useState<boolean>(true)

  // Data aktivitas terbaru dari database
  const [aktivitasList, setAktivitasList] = useState<AktivitasItem[]>([])
  const [loadingAktivitas, setLoadingAktivitas] = useState<boolean>(true)

  // Fetch data AK dari backend
  useEffect(() => {
    let isMounted = true
    const pegawaiId = user?.pegawai?.id
    const currentYear = new Date().getFullYear()

    if (pegawaiId) {
      getDetailPak(pegawaiId, currentYear)
        .then((data) => {
          if (isMounted) setPakData(data)
        })
        .catch(() => { })
        .finally(() => {
          if (isMounted) setLoadingPak(false)
        })
    } else {
      setLoadingPak(false)
    }

    return () => {
      isMounted = false
    }
  }, [user?.pegawai?.id])

  // Fetch data pengajuan pendidikan dari database
  useEffect(() => {
    let isMounted = true

    getPengajuanPendidikan()
      .then((data) => {
        if (isMounted) setPengajuanList(data)
      })
      .catch(() => { })
      .finally(() => {
        if (isMounted) setLoadingPengajuan(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Fetch aktivitas terbaru dari backend
  useEffect(() => {
    let isMounted = true
    getAktivitasTerbaru(5)
      .then((data) => { if (isMounted) setAktivitasList(data) })
      .catch(() => {})
      .finally(() => { if (isMounted) setLoadingAktivitas(false) })
    return () => { isMounted = false }
  }, [])

  // Data pegawai
  const name = user?.pegawai?.nama_lengkap ?? user?.name ?? 'Pegawai'
  const nip = user?.pegawai?.nip ?? '-'
  const email = user?.email ?? '-'
  const golongan = user?.pegawai?.pangkat_golongan?.golongan ?? '-'
  const jenjang = user?.pegawai?.pangkat_golongan?.jenjang_jabatan?.nama ?? '-'
  const pendidikan = user?.pegawai?.pendidikan_terakhir ?? '-'
  const formatTmt = (value?: string | null) => {
    if (!value) return '-'

    const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
    if (Number.isNaN(date.getTime())) return value

    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date)
  }
  const tmt = formatTmt(user?.pegawai?.tmt_jabatan ?? pakData?.pegawai?.tmt_jabatan)

  // Hitung AK
  const akLama = pakData?.ak_lama ?? 0
  const akBaru = pakData?.ak_baru ?? 0
  const akKumulatif = pakData?.ak_kumulatif ?? (akLama + akBaru)
  const targetKp = pakData?.kelayakan?.target_kp ?? 50.0
  const persentaseStatus = targetKp > 0
    ? Math.min(100, Math.round((akKumulatif / targetKp) * 1000) / 10)
    : 0
  const kurangAk = Math.max(0, Math.round((targetKp - akKumulatif) * 100) / 100)
  const kelayakanBadge = pakData?.kelayakan?.badge_label ?? (persentaseStatus >= 100 ? 'Layak KP' : 'Belum Memenuhi')

  // Ambil pengajuan terbaru (item pertama karena sudah sorted latest)
  const pengajuanTerbaru = pengajuanList.length > 0 ? pengajuanList[0] : null

  // Status badge color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISETUJUI': return 'text-green-700 bg-green-50 border-green-200'
      case 'DIAJUKAN': return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'DITOLAK_ADMIN':
      case 'DITOLAK_SYARAT': return 'text-red-700 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DISETUJUI': return 'Disetujui'
      case 'DIAJUKAN': return 'Menunggu Verifikasi'
      case 'DITOLAK_ADMIN': return 'Ditolak Admin'
      case 'DITOLAK_SYARAT': return 'Ditolak Syarat'
      default: return status
    }
  }

  // Helper salam berdasarkan waktu (human touch)
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 4 && hour < 11) return 'Selamat Pagi'
    if (hour >= 11 && hour < 15) return 'Selamat Siang'
    if (hour >= 15 && hour < 18) return 'Selamat Sore'
    return 'Selamat Malam'
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5 pb-10"
    >
      {/* Unified Hero Section: Exact Match to Reference Design */}
      <motion.section
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/40 p-6 sm:p-8 lg:p-9"
      >
        {/* Right-edge Red Wave Swoosh (Reference Design Accent) */}
        <div className="absolute top-0 right-0 bottom-0 w-36 sm:w-52 lg:w-72 pointer-events-none overflow-hidden select-none z-0">
          <svg className="w-full h-full" viewBox="0 0 240 400" preserveAspectRatio="none" fill="none">
            {/* Main deep red wave */}
            <path
              d="M130 400 C40 280 60 140 240 60 L240 400 Z"
              fill="url(#kpkRedWave)"
            />
            {/* Secondary inner contour wave */}
            <path
              d="M170 400 C90 290 100 170 240 110 L240 400 Z"
              fill="#a81c24"
            />
            {/* White accent contour wave line */}
            <path
              d="M130 400 C40 280 60 140 240 60"
              stroke="white"
              strokeWidth="2.5"
              strokeOpacity="0.4"
              fill="none"
            />
            <defs>
              <linearGradient id="kpkRedWave" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#d32f2f" />
                <stop offset="60%" stopColor="#b71c1c" />
                <stop offset="100%" stopColor="#821319" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Main Content: Greetings + Status/Email */}
        <div className="relative z-10 space-y-5">
          {/* Top Tagline */}
          <div className="flex items-center gap-2.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c62828] shrink-0" />
            <span className="font-bold text-slate-800 tracking-tight">Portal Kepegawaian KPK</span>
            <span className="h-3.5 w-px bg-slate-300 mx-1" />
            <span className="font-mono text-xs sm:text-sm text-slate-500 font-medium tracking-wide">
              NIP. {nip}
            </span>
          </div>

          {/* Greetings & Name */}
          <div className="pt-1">
            <p className="text-xl sm:text-2xl font-normal text-slate-800 tracking-tight">
              {getGreeting()},
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#c62828] tracking-tight leading-tight mt-1">
              {name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-3 leading-relaxed max-w-2xl">
              Selamat beraktivitas! Pantau perkembangan angka kredit, riwayat jabatan, dan persiapan kenaikan jenjang kepangkatan Anda secara transparan.
            </p>
          </div>

          {/* Status & Email Pill Box */}
          <div className="inline-flex flex-wrap sm:flex-nowrap items-center gap-5 sm:gap-7 rounded-2xl bg-slate-50/90 border border-slate-100 px-5 py-3">
            {/* Status */}
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#c62828] shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-medium">Status</p>
                <p className="text-xs sm:text-sm font-bold text-slate-800 whitespace-nowrap">Pegawai Aktif</p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-7 w-px bg-slate-200 hidden sm:block" />

            {/* Email */}
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Email</p>
              <p className="text-xs sm:text-sm text-slate-600 font-medium truncate max-w-[200px] sm:max-w-xs">{email}</p>
            </div>
          </div>
        </div>

        {/* Bottom Strip: Kepegawaian Data */}
        <div className="mt-7 relative z-20 rounded-2xl bg-white border border-slate-100 p-4 sm:p-5">
          {/* Label Header */}
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Informasi Pegawai</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {/* 1. Pangkat / Golongan */}
            <div className="px-3 sm:px-5">
              <p className="text-[11px] text-slate-400 font-medium">Pangkat / Golongan</p>
              <p className="text-lg sm:text-xl font-bold text-[#c62828] mt-1 tracking-tight">{golongan}</p>
            </div>

            {/* 2. Jenjang */}
            <div className="px-3 sm:px-5 pt-3 sm:pt-0">
              <p className="text-[11px] text-slate-400 font-medium">Jenjang</p>
              <p className="text-lg sm:text-xl font-bold text-[#c62828] mt-1 tracking-tight truncate" title={jenjang}>{jenjang}</p>
            </div>

            {/* 3. Pendidikan */}
            <div className="px-3 sm:px-5 pt-3 sm:pt-0">
              <p className="text-[11px] text-slate-400 font-medium">Pendidikan</p>
              <p className="text-lg sm:text-xl font-bold text-[#c62828] mt-1 tracking-tight truncate" title={pendidikan}>{pendidikan}</p>
            </div>

            {/* 4. TMT Jabatan */}
            <div className="px-3 sm:px-5 pt-3 sm:pt-0">
              <p className="text-[11px] text-slate-400 font-medium">TMT Jabatan</p>
              <p className="text-lg sm:text-xl font-bold text-[#c62828] mt-1 tracking-tight">{tmt}</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 4 Card Angka Kredit with Subtle Wave Accents */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Saldo AK */}
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4">
          <svg className="absolute bottom-0 right-0 w-28 h-10 text-gray-100/90 pointer-events-none" viewBox="0 0 120 40" preserveAspectRatio="none">
            <path d="M0,25 C30,40 60,10 90,20 C105,25 115,15 120,20 L120,40 L0,40 Z" fill="currentColor" />
          </svg>
          <div className="relative z-10 flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Saldo AK</p>
            <i className="fa-solid fa-wallet text-[10px] text-gray-300" />
          </div>
          <p className="relative z-10 text-xl font-bold text-gray-800 font-mono">
            {loadingPak ? '...' : akLama.toLocaleString('id-ID', { minimumFractionDigits: 3 })}
          </p>
          <p className="relative z-10 text-[10px] text-gray-400 mt-0.5">Akumulasi saldo awal</p>
        </div>

        {/* AK Tahun Berjalan */}
        <div className="relative overflow-hidden rounded-xl border border-green-200 bg-green-50/50 p-4">
          <svg className="absolute bottom-0 right-0 w-28 h-10 text-green-200/50 pointer-events-none" viewBox="0 0 120 40" preserveAspectRatio="none">
            <path d="M0,25 C30,40 60,10 90,20 C105,25 115,15 120,20 L120,40 L0,40 Z" fill="currentColor" />
          </svg>
          <div className="relative z-10 flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-green-700 uppercase">AK {new Date().getFullYear()}</p>
            <i className="fa-solid fa-arrow-trend-up text-[10px] text-green-400" />
          </div>
          <p className="relative z-10 text-xl font-bold text-green-700 font-mono">
            +{loadingPak ? '...' : akBaru.toLocaleString('id-ID', { minimumFractionDigits: 3 })}
          </p>
          <p className="relative z-10 text-[10px] text-green-600 mt-0.5">Tahun berjalan</p>
        </div>

        {/* Target */}
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4">
          <svg className="absolute bottom-0 right-0 w-28 h-10 text-blue-100/60 pointer-events-none" viewBox="0 0 120 40" preserveAspectRatio="none">
            <path d="M0,25 C30,40 60,10 90,20 C105,25 115,15 120,20 L120,40 L0,40 Z" fill="currentColor" />
          </svg>
          <div className="relative z-10 flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Target KP</p>
            <i className="fa-solid fa-bullseye text-[10px] text-blue-300" />
          </div>
          <p className="relative z-10 text-xl font-bold text-gray-800 font-mono">
            {targetKp.toLocaleString('id-ID', { minimumFractionDigits: 3 })}
          </p>
          <p className="relative z-10 text-[10px] text-gray-400 mt-0.5">Syarat kenaikan pangkat</p>
        </div>

        {/* Status */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#991b1b] to-[#b71c1c] p-4 text-white shadow-xs">
          <svg className="absolute bottom-0 right-0 w-32 h-12 text-white/10 pointer-events-none" viewBox="0 0 120 40" preserveAspectRatio="none">
            <path d="M0,20 C30,35 60,5 90,18 C105,22 115,12 120,18 L120,40 L0,40 Z" fill="currentColor" />
          </svg>
          <div className="relative z-10 flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-white/70 uppercase">Status</p>
            <i className="fa-solid fa-chart-line text-[10px] text-white/50" />
          </div>
          <p className="relative z-10 text-xl font-bold font-mono">
            {loadingPak ? '...' : `${persentaseStatus}%`}
          </p>
          <p className="relative z-10 text-[10px] text-white/70 mt-0.5">{kelayakanBadge}</p>
        </div>
      </motion.div>

      {/* Progres KP & Posisi Karier */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Progres Bar */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
              <i className="fa-solid fa-chart-simple text-[10px]" />
              Progres Kenaikan Pangkat
            </h3>
            <span className="text-[10px] font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100">
              {golongan} → III/b
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">
                {akKumulatif.toLocaleString('id-ID')} / {targetKp.toLocaleString('id-ID')} AK
              </span>
              <span className="font-bold text-red-700">{persentaseStatus}%</span>
            </div>

            <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, persentaseStatus)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-red-600"
              />
            </div>

            <div className="flex justify-between text-[10px] text-gray-400">
              <span>0 AK</span>
              <span className={`font-semibold ${kurangAk > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {kurangAk > 0 ? `Kurang ${kurangAk.toLocaleString('id-ID')} AK` : 'Syarat Terpenuhi'}
              </span>
              <span>{targetKp.toLocaleString('id-ID')} AK</span>
            </div>
          </div>
        </div>

        {/* Posisi Karier */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-3">
            <i className="fa-solid fa-user-tie text-[10px]" />
            Posisi Karier
          </h3>

          <div className="space-y-2.5">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-400">Jabatan Saat Ini</p>
              <p className="text-xs font-bold text-gray-700">{jenjang}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-red-400">Golongan</p>
                <p className="text-sm font-bold text-red-700">{golongan}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400">Target</p>
                <p className="text-sm font-bold text-gray-600">→ III/b</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Aktivitas & Pengajuan Pendidikan */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Aktivitas Terbaru — dari backend */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-3">
            <i className="fa-solid fa-clock-rotate-left text-[10px]" />
            Aktivitas Terbaru
          </h3>

          {loadingAktivitas ? (
            <div className="py-4 text-center">
              <p className="text-xs text-gray-400">Memuat data...</p>
            </div>
          ) : aktivitasList.length === 0 ? (
            <div className="py-4 text-center">
              <i className="fa-solid fa-clock-rotate-left text-2xl text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">Belum ada aktivitas tercatat</p>
            </div>
          ) : (
            <div className="space-y-2">
              {aktivitasList.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-700 truncate">{item.judul}</p>
                    <p className="text-[10px] text-gray-400 truncate">{item.keterangan}</p>
                  </div>
                  {item.angka_kredit ? (
                    <span className="ml-3 shrink-0 text-xs font-bold text-green-600 font-mono">
                      +{item.angka_kredit} AK
                    </span>
                  ) : item.badge ? (
                    <span className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      item.badge_color === 'green' ? 'bg-green-100 text-green-700' :
                      item.badge_color === 'amber' ? 'bg-amber-100 text-amber-700' :
                      item.badge_color === 'red'   ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{item.badge}</span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pengajuan Pendidikan - dari database */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-3">
            <i className="fa-solid fa-graduation-cap text-[10px]" />
            Pengajuan Pendidikan
          </h3>

          {loadingPengajuan ? (
            <div className="flex-1 flex items-center justify-center py-6">
              <p className="text-xs text-gray-400">Memuat data...</p>
            </div>
          ) : pengajuanTerbaru ? (
            <div className="flex-1 flex flex-col justify-between">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Jenjang</p>
                    <p className="text-sm font-bold text-gray-800">{pengajuanTerbaru.jenjang_pendidikan}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getStatusColor(pengajuanTerbaru.status)}`}>
                    {getStatusLabel(pengajuanTerbaru.status)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-gray-400">Jurusan</p>
                    <p className="font-semibold text-gray-700">{pengajuanTerbaru.jurusan}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Institusi</p>
                    <p className="font-semibold text-gray-700">{pengajuanTerbaru.nama_institusi}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Tahun Lulus</p>
                    <p className="font-semibold text-gray-700">{pengajuanTerbaru.tahun_lulus}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Bonus AK</p>
                    <p className="font-semibold text-green-700">
                      {pengajuanTerbaru.status === 'DISETUJUI'
                        ? `+${Number(pengajuanTerbaru.ak_bonus).toLocaleString('id-ID', { minimumFractionDigits: 3 })} AK`
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  {pengajuanList.length} pengajuan tercatat
                </span>
                <a
                  href="/pegawai/pengajuan-pendidikan"
                  className="font-semibold text-red-700 hover:text-red-800 flex items-center gap-1"
                >
                  Lihat Semua <i className="fa-solid fa-arrow-right text-[10px]" />
                </a>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <i className="fa-solid fa-graduation-cap text-2xl text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">Belum ada pengajuan pendidikan</p>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                <a
                  href="/pegawai/pengajuan-pendidikan"
                  className="text-xs font-semibold text-red-700 hover:text-red-800 flex items-center gap-1"
                >
                  Ajukan Baru <i className="fa-solid fa-arrow-right text-[10px]" />
                </a>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Footer info */}
      <motion.div variants={itemVariants} className="rounded-xl bg-gray-50 border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <p className="text-xs font-semibold text-gray-600">
              Sistem Evaluasi & Konversi Kinerja Digital
            </p>
            <p className="text-[10px] text-gray-400">
              Biro Kepegawaian & Organisasi KPK RI
            </p>
          </div>
          <span className="text-[10px] font-semibold text-gray-400 bg-white px-2.5 py-1 rounded border border-gray-200">
            Tahap Validasi {new Date().getFullYear()}
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
