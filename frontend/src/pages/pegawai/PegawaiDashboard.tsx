import { useEffect, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useAuth } from '../../context/useAuth'

import {
  getDetailPakLive,
  getPengajuanPendidikan,
  type DetailPakResponse,
  type PengajuanPendidikanItem,
  type TriwulanData,
} from '../../api/rekapitulasi'

import {
  getAktivitasTerbaru,
  type AktivitasItem,
} from '../../api/aktivitas'

export default function PegawaiDashboard() {
  const { user } = useAuth()

  const currentYear = new Date().getFullYear()

  const [selectedTahun, setSelectedTahun] = useState<number>(currentYear)

  const [pakData, setPakData] =
    useState<DetailPakResponse['data'] | null>(null)

  const [loadingPak, setLoadingPak] = useState<boolean>(true)

  const [pengajuanList, setPengajuanList] =
    useState<PengajuanPendidikanItem[]>([])

  const [loadingPengajuan, setLoadingPengajuan] =
    useState<boolean>(true)

  const [aktivitasList, setAktivitasList] =
    useState<AktivitasItem[]>([])

  const [loadingAktivitas, setLoadingAktivitas] =
    useState<boolean>(true)

  const [refetchKey, setRefetchKey] = useState<number>(0)

  // ============================================================
  // FETCH DATA PAK
  // ============================================================

  useEffect(() => {
    let isMounted = true

    const pegawaiId = user?.pegawai?.id

    if (!pegawaiId) {
      setLoadingPak(false)
      return
    }

    const fetchPak = async () => {
      try {
        const data = await getDetailPakLive(
          pegawaiId,
          selectedTahun,
        )

        if (isMounted) {
          setPakData(data)
        }
      } catch (error) {
        console.error('Gagal mengambil data PAK:', error)
      } finally {
        if (isMounted) {
          setLoadingPak(false)
        }
      }
    }

    setLoadingPak(true)

    fetchPak()

    // Refresh otomatis setiap 15 detik
    const interval = setInterval(fetchPak, 15_000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [user?.pegawai?.id, selectedTahun, refetchKey])

  // ============================================================
  // FETCH PENGAJUAN PENDIDIKAN
  // ============================================================

  useEffect(() => {
    let isMounted = true

    const fetchPengajuan = async () => {
      try {
        const data = await getPengajuanPendidikan()

        if (isMounted) {
          setPengajuanList(data)
        }
      } catch (error) {
        console.error(
          'Gagal mengambil data pengajuan pendidikan:',
          error,
        )
      } finally {
        if (isMounted) {
          setLoadingPengajuan(false)
        }
      }
    }

    fetchPengajuan()

    return () => {
      isMounted = false
    }
  }, [])

  // ============================================================
  // FETCH AKTIVITAS TERBARU
  // ============================================================

  useEffect(() => {
    let isMounted = true

    const fetchAktivitas = async () => {
      try {
        const data = await getAktivitasTerbaru(5)

        if (isMounted) {
          setAktivitasList(data)
        }
      } catch (error) {
        console.error(
          'Gagal mengambil aktivitas terbaru:',
          error,
        )
      } finally {
        if (isMounted) {
          setLoadingAktivitas(false)
        }
      }
    }

    fetchAktivitas()

    // Refresh aktivitas setiap 15 detik
    const interval = setInterval(fetchAktivitas, 15_000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  // ============================================================
  // DATA PEGAWAI
  // ============================================================

  const name =
    user?.pegawai?.nama_lengkap ??
    user?.name ??
    'Pegawai'

  const nip =
    user?.pegawai?.nip ??
    '-'

  const email =
    user?.email ??
    '-'

  const golongan =
    pakData?.pangkat?.golongan ??
    user?.pegawai?.pangkat_golongan?.golongan ??
    '-'

  const jenjang =
    pakData?.pangkat?.jenjang ??
    user?.pegawai?.pangkat_golongan?.jenjang_jabatan?.nama ??
    '-'

  const pendidikan =
    user?.pegawai?.pendidikan_terakhir ??
    '-'

  const koefisien =
    pakData?.pangkat?.koefisien ??
    12.5

  // ============================================================
  // FORMAT TMT
  // ============================================================

  const formatTmt = (
    value?: string | null,
  ) => {
    if (!value) return '-'

    const date = new Date(
      value.includes('T')
        ? value
        : `${value}T00:00:00`,
    )

    if (Number.isNaN(date.getTime())) {
      return value
    }

    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date)
  }

  const tmt = formatTmt(
    user?.pegawai?.tmt_jabatan ??
    pakData?.pegawai?.tmt_jabatan,
  )

  // ============================================================
  // PERHITUNGAN ANGKA KREDIT
  // ============================================================

  const akDasar =
    pakData?.ak_dasar ??
    0

  const akPakPelantikan =
    pakData?.ak_pak_pelantikan ??
    0

  const akHistoris =
    pakData?.ak_historis ??
    0

  const akCarry =
    pakData?.ak_carry_over ??
    0

  const akLamaRaw =
    pakData?.ak_lama ??
    0

  const akLamaEffective =
    akLamaRaw > 0
      ? akLamaRaw
      : akDasar +
        akPakPelantikan +
        akHistoris +
        akCarry

  const totalAkBaru =
    pakData?.total_ak_baru ??
    pakData?.sum_ak_periodik ??
    pakData?.ak_baru ??
    0

  const akBooster =
    pakData?.ak_booster ??
    0

  const akKumulatif = Number(
    (
      akLamaEffective +
      totalAkBaru +
      akBooster
    ).toFixed(2),
  )

  // ============================================================
  // TARGET & STATUS
  // ============================================================

  const targetKp =
    pakData?.kelayakan?.target_kp ??
    50

  const persentaseStatus =
    targetKp > 0
      ? Math.min(
          100,
          Math.round(
            (akKumulatif / targetKp) * 1000,
          ) / 10,
        )
      : 0

  const kurangAk = Math.max(
    0,
    Math.round(
      (targetKp - akKumulatif) * 100,
    ) / 100,
  )

  const kelayakanBadge =
    persentaseStatus >= 100
      ? pakData?.is_final
        ? 'Layak KP'
        : 'Layak KP (Draft)'
      : pakData?.kelayakan?.badge_label ??
        'Belum Memenuhi'

  // ============================================================
  // NORMALISASI 4 TRIWULAN
  // ============================================================

  const triwulanMap =
    pakData?.triwulan ?? {}

  const quarters: Array<{
    qNumber: number
    name: string
    periodeLabel: string
    data?: TriwulanData
  }> = [
    {
      qNumber: 1,
      name: 'Triwulan I (TW1)',
      periodeLabel: 'Januari - Maret',
    },
    {
      qNumber: 2,
      name: 'Triwulan II (TW2)',
      periodeLabel: 'April - Juni',
    },
    {
      qNumber: 3,
      name: 'Triwulan III (TW3)',
      periodeLabel: 'Juli - September',
    },
    {
      qNumber: 4,
      name: 'Triwulan IV (TW4)',
      periodeLabel: 'Oktober - Desember',
    },
  ].map((item) => ({
    ...item,
    data:
      triwulanMap[String(item.qNumber)] ??
      triwulanMap[item.qNumber],
  }))

  // ============================================================
  // PREDIKAT
  // ============================================================

  const getPredikatBadge = (
    predikat?: string,
  ) => {
    if (!predikat) {
      return {
        label: 'Belum Dievaluasi',
        badgeClass:
          'bg-slate-100 text-slate-500 border-slate-200',
        persenText: '0%',
      }
    }

    const lower =
      predikat.toLowerCase()

    if (lower.includes('sangat baik')) {
      return {
        label: 'Sangat Baik',
        badgeClass:
          'bg-emerald-50 text-emerald-700 border-emerald-200',
        persenText: '150%',
      }
    }

    if (lower.includes('baik')) {
      return {
        label: 'Baik',
        badgeClass:
          'bg-blue-50 text-blue-700 border-blue-200',
        persenText: '100%',
      }
    }

    if (
      lower.includes('butuh perbaikan') ||
      lower.includes('perbaikan')
    ) {
      return {
        label: 'Butuh Perbaikan',
        badgeClass:
          'bg-amber-50 text-amber-700 border-amber-200',
        persenText: '75%',
      }
    }

    if (lower.includes('sangat kurang')) {
      return {
        label: 'Sangat Kurang',
        badgeClass:
          'bg-rose-50 text-rose-700 border-rose-200',
        persenText: '25%',
      }
    }

    if (lower.includes('kurang')) {
      return {
        label: 'Kurang',
        badgeClass:
          'bg-orange-50 text-orange-700 border-orange-200',
        persenText: '50%',
      }
    }

    return {
      label: predikat,
      badgeClass:
        'bg-slate-100 text-slate-700 border-slate-200',
      persenText: '100%',
    }
  }

  // ============================================================
  // JENJANG PROGRESSION
  // ============================================================

  const getJenjangInfo = (
    gol: string,
    jenjangName: string,
  ) => {
    const g = gol.trim()
    const j = jenjangName.toLowerCase()

    if (j.includes('utama')) {
      return {
        kategori: 'Ahli Utama',
        next: null,
        targetJenjang: null as number | null,
      }
    }

    if (j.includes('madya')) {
      return {
        kategori: 'Ahli Madya',
        next: 'Ahli Utama',
        targetJenjang: 450,
      }
    }

    if (j.includes('muda')) {
      return {
        kategori: 'Ahli Muda',
        next: 'Ahli Madya',
        targetJenjang: 200,
      }
    }

    if (j.includes('pertama')) {
      return {
        kategori: 'Ahli Pertama',
        next: 'Ahli Muda',
        targetJenjang:
          g === 'III/b' ? 50 : 100,
      }
    }

    if (
      ['III/a', 'III/b'].includes(g)
    ) {
      return {
        kategori: 'Ahli Pertama',
        next: 'Ahli Muda',
        targetJenjang:
          g === 'III/b' ? 50 : 100,
      }
    }

    if (
      ['III/c', 'III/d'].includes(g)
    ) {
      return {
        kategori: 'Ahli Muda',
        next: 'Ahli Madya',
        targetJenjang: 200,
      }
    }

    if (
      ['IV/a', 'IV/b', 'IV/c'].includes(g)
    ) {
      return {
        kategori: 'Ahli Madya',
        next: 'Ahli Utama',
        targetJenjang: 450,
      }
    }

    if (
      ['IV/d', 'IV/e'].includes(g)
    ) {
      return {
        kategori: 'Ahli Utama',
        next: null,
        targetJenjang: null,
      }
    }

    return {
      kategori:
        jenjang || 'Ahli Pertama',
      next: 'Ahli Muda',
      targetJenjang: 100,
    }
  }

  const jenjangInfo =
    getJenjangInfo(
      golongan,
      jenjang,
    )

  const targetJenjang =
    jenjangInfo.targetJenjang

  const isTopJenjang =
    targetJenjang === null

  const persentaseJenjang =
    isTopJenjang
      ? 100
      : Math.min(
          100,
          Math.round(
            (
              akKumulatif /
              targetJenjang
            ) * 1000,
          ) / 10,
        )

  const kurangAkJenjang =
    isTopJenjang
      ? 0
      : Math.max(
          0,
          Math.round(
            (
              targetJenjang -
              akKumulatif
            ) * 100,
          ) / 100,
        )

  // ============================================================
  // NEXT GOLONGAN
  // ============================================================

  const getNextGolongan = (
    g: string,
  ) => {
    const order = [
      'III/a',
      'III/b',
      'III/c',
      'III/d',
      'IV/a',
      'IV/b',
      'IV/c',
      'IV/d',
      'IV/e',
    ]

    const idx =
      order.indexOf(g)

    if (idx === -1) {
      return 'III/b'
    }

    if (
      idx === order.length - 1
    ) {
      return 'IV/e (Top)'
    }

    return order[idx + 1]
  }

  // ============================================================
  // DATA PENGAJUAN
  // ============================================================

  const pengajuanTerbaru =
    pengajuanList.length > 0
      ? pengajuanList[0]
      : null

  // ============================================================
  // STATUS BADGE
  // ============================================================

  const getStatusColor = (
    status: string,
  ) => {
    switch (status) {
      case 'DISETUJUI':
        return 'text-green-700 bg-green-50 border-green-200'

      case 'DIAJUKAN':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'

      case 'DITOLAK_ADMIN':
      case 'DITOLAK_SYARAT':
        return 'text-red-700 bg-red-50 border-red-200'

      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusLabel = (
    status: string,
  ) => {
    switch (status) {
      case 'DISETUJUI':
        return 'Disetujui'

      case 'DIAJUKAN':
        return 'Menunggu Verifikasi'

      case 'DITOLAK_ADMIN':
        return 'Ditolak Admin'

      case 'DITOLAK_SYARAT':
        return 'Ditolak Syarat'

      default:
        return status
    }
  }

  // ============================================================
  // GREETING
  // ============================================================

  const getGreeting = () => {
    const hour =
      new Date().getHours()

    if (
      hour >= 4 &&
      hour < 11
    ) {
      return 'Selamat Pagi'
    }

    if (
      hour >= 11 &&
      hour < 15
    ) {
      return 'Selamat Siang'
    }

    if (
      hour >= 15 &&
      hour < 18
    ) {
      return 'Selamat Sore'
    }

    return 'Selamat Malam'
  }

  // ============================================================
  // FRAMER MOTION
  // ============================================================

  const containerVariants: Variants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 12,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.35,
      },
    },
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5 pb-10"
    >
      {/* Unified Hero Section */}
      <motion.section
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/40 p-6 sm:p-8 lg:p-9"
      >
        <div className="absolute top-0 right-0 bottom-0 w-36 sm:w-52 lg:w-72 pointer-events-none overflow-hidden select-none z-0">
          <svg
            className="w-full h-full"
            viewBox="0 0 240 400"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M130 400 C40 280 60 140 240 60 L240 400 Z"
              fill="url(#kpkRedWave)"
            />

            <path
              d="M170 400 C90 290 100 170 240 110 L240 400 Z"
              fill="#0B484D"
            />

            <path
              d="M130 400 C40 280 60 140 240 60"
              stroke="white"
              strokeWidth="2.5"
              strokeOpacity="0.4"
              fill="none"
            />

            <defs>
              <linearGradient
                id="kpkRedWave"
                x1="100%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor="#103336"
                />

                <stop
                  offset="60%"
                  stopColor="#306b71"
                />

                <stop
                  offset="100%"
                  stopColor="#0B484D"
                />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-2.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0B484D] shrink-0" />

            <span className="font-bold text-slate-800 tracking-tight">
              Portal Kepegawaian KPK
            </span>

            <span className="h-3.5 w-px bg-slate-300 mx-1" />

            <span className="font-mono text-xs sm:text-sm text-slate-500 font-medium tracking-wide">
              NIP. {nip}
            </span>
          </div>

          <div className="pt-1">
            <p className="text-xl sm:text-2xl font-normal text-slate-800 tracking-tight">
              {getGreeting()},
            </p>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B484D] tracking-tight leading-tight mt-1">
              {name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 mt-3 leading-relaxed max-w-2xl">
              Selamat beraktivitas! Pantau perkembangan angka kredit,
              riwayat jabatan, dan persiapan kenaikan jenjang kepangkatan
              Anda secara transparan.
            </p>
          </div>

          <div className="inline-flex flex-wrap sm:flex-nowrap items-center gap-5 sm:gap-7 rounded-2xl bg-slate-50/90 border border-slate-100 px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0B484D] shrink-0" />

              <div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Status
                </p>

                <p className="text-xs sm:text-sm font-bold text-slate-800 whitespace-nowrap">
                  Pegawai Aktif
                </p>
              </div>
            </div>

            <div className="h-7 w-px bg-slate-200 hidden sm:block" />

            <div>
              <p className="text-[10px] text-slate-400 font-medium">
                Email
              </p>

              <p className="text-xs sm:text-sm text-slate-600 font-medium truncate max-w-50 sm:max-w-xs">
                {email}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setRefetchKey(
                    (current) =>
                      current + 1,
                  )
                }
                className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                title="Segarkan data PAK"
              >
                <i className="fa-solid fa-rotate text-[10px]" />
                Segarkan
              </button>
            </div>
          </div>
        </div>

        <div className="mt-7 relative z-20 rounded-2xl bg-white border border-slate-100 p-4 sm:p-5">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">
            Informasi Pegawai
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            <div className="px-3 sm:px-5">
              <p className="text-[11px] text-slate-400 font-medium">
                Pangkat / Golongan
              </p>

              <p className="text-lg sm:text-xl font-bold text-[#0B484D] mt-1 tracking-tight">
                {golongan}
              </p>
            </div>

            <div className="px-3 sm:px-5 pt-3 sm:pt-0">
              <p className="text-[11px] text-slate-400 font-medium">
                Jenjang
              </p>

              <p
                className="text-lg sm:text-xl font-bold text-[#0B484D] mt-1 tracking-tight truncate"
                title={jenjang}
              >
                {jenjang}
              </p>
            </div>

            <div className="px-3 sm:px-5 pt-3 sm:pt-0">
              <p className="text-[11px] text-slate-400 font-medium">
                Pendidikan
              </p>

              <p
                className="text-lg sm:text-xl font-bold text-[#0B484D] mt-1 tracking-tight truncate"
                title={pendidikan}
              >
                {pendidikan}
              </p>
            </div>

            <div className="px-3 sm:px-5 pt-3 sm:pt-0">
              <p className="text-[11px] text-slate-400 font-medium">
                TMT Jabatan
              </p>

              <p className="text-lg sm:text-xl font-bold text-[#0B484D] mt-1 tracking-tight">
                {tmt}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 5 Card Angka Kredit */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 gap-3 lg:grid-cols-5"
      >
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3.5">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-wallet text-xs text-gray-400" />

            <span className="text-xs font-medium text-gray-500">
              Saldo AK
            </span>
          </div>

          <div className="mt-2">
            <p className="font-mono text-lg font-semibold tracking-tight text-gray-800">
              {loadingPak
                ? '...'
                : akLamaEffective.toLocaleString(
                    'id-ID',
                    {
                      minimumFractionDigits: 3,
                    },
                  )}
            </p>

            <p className="mt-0.5 text-[11px] text-gray-400">
              Akumulasi saldo awal
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50/40 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-arrow-trend-up text-xs text-green-600" />

            <span className="text-xs font-medium text-green-700">
              AK {selectedTahun}
            </span>
          </div>

          <div className="mt-2">
            <p className="font-mono text-lg font-semibold tracking-tight text-green-700">
              +
              {loadingPak
                ? '...'
                : totalAkBaru.toLocaleString(
                    'id-ID',
                    {
                      minimumFractionDigits: 3,
                    },
                  )}
            </p>

            <p className="mt-0.5 text-[11px] text-green-600/70">
              Tahun berjalan
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-graduation-cap text-xs text-emerald-600" />

            <span className="text-xs font-medium text-emerald-700">
              Pendidikan
            </span>
          </div>

          <div className="mt-2">
            <p className="font-mono text-lg font-semibold tracking-tight text-emerald-700">
              {loadingPak
                ? '...'
                : `+${akBooster.toLocaleString(
                    'id-ID',
                    {
                      minimumFractionDigits: 3,
                    },
                  )}`}
            </p>

            <p className="mt-0.5 text-[11px] text-emerald-600/70">
              Booster ijazah disetujui
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3.5">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-bullseye text-xs text-blue-400" />

            <span className="text-xs font-medium text-gray-500">
              Target KP
            </span>
          </div>

          <div className="mt-2">
            <p className="font-mono text-lg font-semibold tracking-tight text-gray-800">
              {targetKp.toLocaleString(
                'id-ID',
                {
                  minimumFractionDigits: 3,
                },
              )}
            </p>

            <p className="mt-0.5 text-[11px] text-gray-400">
              Syarat kenaikan pangkat
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-[#0B484D] px-4 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-chart-line text-xs text-white/60" />

            <span className="text-xs font-medium text-white/75">
              Status
            </span>
          </div>

          <div className="mt-2">
            <p className="font-mono text-lg font-semibold tracking-tight">
              {loadingPak
                ? '...'
                : `${persentaseStatus}%`}
            </p>

            <p className="mt-0.5 text-[11px] text-white/60">
              {kelayakanBadge}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Progres Jenjang & Pangkat + Posisi Karier */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
      >
        <div className="space-y-4 lg:col-span-2">
          {/* Progres Jenjang */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-signal text-[11px] text-emerald-600" />

                <h3 className="text-xs font-semibold text-gray-700">
                  Progres Kenaikan Jenjang
                </h3>
              </div>

              <span
                className={`rounded border px-2 py-1 text-[10px] font-medium ${
                  isTopJenjang
                    ? 'border-gray-200 bg-gray-50 text-gray-500'
                    : 'border-emerald-100 bg-emerald-50 text-emerald-700'
                }`}
              >
                {isTopJenjang
                  ? `${jenjangInfo.kategori} · Jenjang Tertinggi`
                  : `${jenjangInfo.kategori} → ${jenjangInfo.next}`}
              </span>
            </div>

            <div className="mt-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-sm font-semibold text-gray-800">
                    {akKumulatif.toLocaleString(
                      'id-ID',
                    )}

                    <span className="font-normal text-gray-400">
                      {' '}
                      /{' '}
                      {isTopJenjang
                        ? '—'
                        : `${targetJenjang?.toLocaleString(
                            'id-ID',
                          )} AK`}
                    </span>
                  </p>

                  <p className="mt-1 text-[11px] text-gray-400">
                    Akumulasi angka kredit
                  </p>
                </div>

                <span className="font-mono text-sm font-semibold text-emerald-700">
                  {persentaseJenjang}%
                </span>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <motion.div
                  initial={{
                    width: 0,
                  }}
                  animate={{
                    width: `${Math.min(
                      100,
                      persentaseJenjang,
                    )}%`,
                  }}
                  transition={{
                    duration: 0.8,
                    ease: [
                      0.22,
                      1,
                      0.36,
                      1,
                    ],
                  }}
                  className="h-full rounded-full bg-emerald-600"
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px]">
                <span className="text-gray-400">
                  0 AK
                </span>

                <span
                  className={
                    isTopJenjang
                      ? 'font-medium text-emerald-600'
                      : kurangAkJenjang > 0
                        ? 'font-medium text-red-600'
                        : 'font-medium text-emerald-600'
                  }
                >
                  {isTopJenjang
                    ? 'Jenjang tertinggi tercapai'
                    : kurangAkJenjang > 0
                      ? `Kurang ${kurangAkJenjang.toLocaleString(
                          'id-ID',
                        )} AK`
                      : 'Syarat jenjang terpenuhi'}
                </span>

                <span className="text-gray-400">
                  {isTopJenjang
                    ? '—'
                    : `${targetJenjang?.toLocaleString(
                        'id-ID',
                      )} AK`}
                </span>
              </div>

              <div className="mt-4 border-t border-gray-100 pt-3">
                <p className="text-[10px] leading-relaxed text-gray-400">
                  {jenjangInfo.kategori ===
                  'Ahli Pertama'
                    ? 'Target jenjang 100 AK (50 AK jika mulai dari III/b)'
                    : jenjangInfo.kategori ===
                        'Ahli Muda'
                      ? 'Target 200 AK untuk naik ke Ahli Madya'
                      : jenjangInfo.kategori ===
                          'Ahli Madya'
                        ? 'Target 450 AK untuk naik ke Ahli Utama'
                        : 'Ahli Utama · jenjang tertinggi pemerintahan'}
                  {' · '}
                  Koefisien:{' '}
                  {Number(koefisien).toLocaleString(
                    'id-ID',
                    {
                      minimumFractionDigits: 1,
                    },
                  )}
                  /tahun
                </p>
              </div>
            </div>
          </div>

          {/* Progres Pangkat */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-chart-simple text-[11px] text-emerald-600" />

                <h3 className="text-xs font-semibold text-gray-700">
                  Progres Kenaikan Pangkat
                </h3>
              </div>

              <span className="rounded border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
                {golongan} →{' '}
                {getNextGolongan(golongan)}
              </span>
            </div>

            <div className="mt-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-sm font-semibold text-gray-800">
                    {akKumulatif.toLocaleString(
                      'id-ID',
                    )}

                    <span className="font-normal text-gray-400">
                      {' '}
                      /{' '}
                      {targetKp.toLocaleString(
                        'id-ID',
                      )}{' '}
                      AK
                    </span>
                  </p>

                  <p className="mt-1 text-[11px] text-gray-400">
                    Akumulasi angka kredit
                  </p>
                </div>

                <span className="font-mono text-sm font-semibold text-emerald-700">
                  {persentaseStatus}%
                </span>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <motion.div
                  initial={{
                    width: 0,
                  }}
                  animate={{
                    width: `${Math.min(
                      100,
                      persentaseStatus,
                    )}%`,
                  }}
                  transition={{
                    duration: 0.8,
                    ease: [
                      0.22,
                      1,
                      0.36,
                      1,
                    ],
                  }}
                  className="h-full rounded-full bg-[#0B484D]"
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px]">
                <span className="text-gray-400">
                  0 AK
                </span>

                <span
                  className={
                    kurangAk > 0
                      ? 'font-medium text-red-600'
                      : 'font-medium text-emerald-600'
                  }
                >
                  {kurangAk > 0
                    ? `Kurang ${kurangAk.toLocaleString(
                        'id-ID',
                      )} AK`
                    : 'Syarat terpenuhi'}
                </span>

                <span className="text-gray-400">
                  {targetKp.toLocaleString(
                    'id-ID',
                  )}{' '}
                  AK
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Posisi Karier */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-emerald-600" />

            <h3 className="text-xs font-semibold text-gray-700">
              Posisi Karier
            </h3>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3.5 py-3">
              <p className="text-[10px] text-gray-400">
                Jabatan saat ini
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-800">
                {jenjang}
              </p>
            </div>

            <div className="rounded-md border border-gray-200 px-3.5 py-3">
              <p className="text-[10px] text-gray-400">
                Golongan saat ini
              </p>

              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">
                  {golongan}
                </span>

                <i className="fa-solid fa-arrow-right text-[9px] text-gray-300" />

                <span className="text-sm font-semibold text-emerald-700">
                  {getNextGolongan(
                    golongan,
                  )}
                </span>
              </div>
            </div>

            <div className="rounded-md border border-emerald-100 bg-emerald-50/40 px-3.5 py-3">
              <p className="text-[10px] text-emerald-600">
                Target kenaikan
              </p>

              <p className="mt-1 text-sm font-semibold text-emerald-800">
                {getNextGolongan(
                  golongan,
                )}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Rincian Evaluasi Triwulan */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Rincian Evaluasi & Simulasi Perhitungan Triwulan (
              {selectedTahun}
              )
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Rumus BKN: (Jumlah Bulan / 12) × Persentase Predikat × Koefisien Jenjang (
              {koefisien} AK/Thn)
            </p>
          </div>

          <span className="text-xs font-bold text-[#c62828] bg-red-50 px-3 py-1 rounded-xl self-start sm:self-auto border border-red-100">
            Total AK TW: +
            {Number(totalAkBaru).toFixed(4)} AK
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
              <tr>
                <th className="py-3 px-4">
                  Periode Triwulan
                </th>

                <th className="py-3 px-4">
                  Durasi
                </th>

                <th className="py-3 px-4">
                  Predikat Kinerja
                </th>

                <th className="py-3 px-4">
                  Persentase (%)
                </th>

                <th className="py-3 px-4">
                  Koefisien Jenjang
                </th>

                <th className="py-3 px-4">
                  Perolehan Angka Kredit
                </th>

                <th className="py-3 px-4 text-center">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {quarters.map((q) => {
                const rincian =
                  q.data?.rincian?.[0]

                const predikat =
                  rincian?.predikat

                const badge =
                  getPredikatBadge(
                    predikat,
                  )

                const akVal =
                  q.data?.ak_total ??
                  rincian?.angka_kredit ??
                  0

                const hasEvaluasi =
                  Boolean(predikat)

                const isLocked =
                  rincian?.is_locked ??
                  false

                const durasi =
                  q.data?.jumlah_bulan ??
                  rincian?.jumlah_bulan ??
                  3

                return (
                  <tr
                    key={q.qNumber}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {q.name}
                      </div>

                      <div className="text-[10px] text-slate-400">
                        {q.periodeLabel}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {durasi} Bulan
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.badgeClass}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />

                        {badge.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {badge.persenText}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {koefisien} AK / Thn
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold">
                      {hasEvaluasi ? (
                        <span className="text-emerald-600">
                          +
                          {Number(
                            akVal,
                          ).toFixed(4)}{' '}
                          AK
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          0.0000 AK
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          <i className="fa-solid fa-lock text-[9px]" />
                          Terkunci
                        </span>
                      ) : hasEvaluasi ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                          <i className="fa-solid fa-clock text-[9px]" />
                          Draft
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">
                          Belum Dievaluasi
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>

            <tfoot className="border-t-2 border-slate-200 bg-slate-50/80 font-bold text-slate-900 text-xs">
              <tr>
                <td
                  colSpan={5}
                  className="py-3.5 px-4 text-right"
                >
                  Total Angka Kredit Kinerja Baru (
                  {selectedTahun}
                  ):
                </td>

                <td
                  colSpan={2}
                  className="py-3.5 px-4 font-mono text-base text-emerald-600"
                >
                  +
                  {Number(
                    totalAkBaru,
                  ).toFixed(4)}{' '}
                  AK
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>

      {/* Footer Info */}
      <motion.div
        variants={itemVariants}
        className="rounded-xl bg-gray-50 border border-gray-200 p-4"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <p className="text-xs font-semibold text-gray-600">
              Sistem Evaluasi & Konversi Kinerja Digital
            </p>

            <p className="text-[10px] text-gray-400">
              Biro SDM KPK RI
            </p>
          </div>

          <span className="text-[10px] font-semibold text-gray-400 bg-white px-2.5 py-1 rounded border border-gray-200">
            Tahap Validasi {currentYear}
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
