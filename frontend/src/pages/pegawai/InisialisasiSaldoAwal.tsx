import { useEffect, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useAuth } from '../../context/useAuth'
import { getDetailPak, getRekapitulasiList } from '../../api/rekapitulasi'
import type { DetailPakResponse, PenetapanAKItem } from '../../api/rekapitulasi'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
}

export default function InisialisasiSaldoAwal() {
  const { user } = useAuth()
  const currentYear = new Date().getFullYear()

  const [selectedTahun, setSelectedTahun] = useState<number>(currentYear)
  const [pakData, setPakData] = useState<DetailPakResponse['data'] | null>(null)
  const [rekapList, setRekapList] = useState<PenetapanAKItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Fetch detail saldo & penetapan untuk tahun terpilih
  useEffect(() => {
    let isMounted = true
    const pegawaiId = user?.pegawai?.id

    if (!pegawaiId) {
      setLoading(false)
      return
    }

    setLoading(true)
    Promise.all([
      getDetailPak(pegawaiId, selectedTahun),
      getRekapitulasiList().catch(() => ({ data: [] as PenetapanAKItem[], current_page: 1, total: 0, last_page: 1 })),
    ])
      .then(([detailRes, listRes]) => {
        if (isMounted) {
          setPakData(detailRes)
          if (listRes?.data) {
            setRekapList(listRes.data)
          }
        }
      })
      .catch((err) => {
        console.error('Gagal mengambil data saldo awal:', err)
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [user?.pegawai?.id, selectedTahun])

  // Data Pegawai
  const nama = user?.pegawai?.nama_lengkap ?? user?.name ?? 'Pegawai KPK'
  const nip = user?.pegawai?.nip ?? '-'
  const golongan = pakData?.pangkat?.golongan ?? user?.pegawai?.pangkat_golongan?.golongan ?? '-'
  const jenjang = pakData?.pangkat?.jenjang ?? user?.pegawai?.pangkat_golongan?.jenjang_jabatan?.nama ?? '-'
  const koefisien = pakData?.pangkat?.koefisien ?? 12.5

  const formatTmt = (val?: string | null) => {
    if (!val) return '-'
    const d = new Date(val.includes('T') ? val : `${val}T00:00:00`)
    if (Number.isNaN(d.getTime())) return val
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(d)
  }
  const tmt = formatTmt(user?.pegawai?.tmt_jabatan ?? pakData?.pegawai?.tmt_jabatan)

  // Nilai-nilai Angka Kredit Saldo Awal
  const akDasar = pakData?.ak_dasar ?? 0
  const akPakPelantikan = pakData?.ak_pak_pelantikan ?? 0
  const akHistoris = pakData?.ak_historis ?? 0
  const akLama = pakData?.ak_lama ?? 0
  const akCarryOver = pakData?.ak_carry_over ?? 0
  const akBaru = pakData?.ak_baru ?? 0
  const akKumulatif = pakData?.ak_kumulatif ?? (akLama + akBaru)

  // Total Komposisi Saldo Awal Efektif (Sebelum AK Baru tahun berjalan)
  const totalSaldoAwal = akLama > 0 ? akLama : (akDasar + akPakPelantikan + akHistoris + akCarryOver)

  // Kelayakan & Target
  const targetKp = pakData?.kelayakan?.target_kp ?? 50.0
  const targetJenjang = pakData?.kelayakan?.target_jenjang ?? 100.0
  const badgeLabel = pakData?.kelayakan?.badge_label ?? (akKumulatif >= targetKp ? 'SIAP NAIK PANGKAT' : 'BELUM CUKUP AK')
  const badgeColor = pakData?.kelayakan?.badge_color ?? (akKumulatif >= targetKp ? 'green' : 'amber')
  const catatanKelayakan = pakData?.kelayakan?.catatan ?? 'Pantau perolehan angka kredit Anda secara berkala untuk persiapan kenaikan pangkat/jenjang.'

  // Progress Saldo Awal terhadap Target KP
  const progressPercent = Math.min(100, Math.max(0, targetKp > 0 ? Math.round((totalSaldoAwal / targetKp) * 100) : 0))

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-12"
    >
      {/* 1. Header Page */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-[#c62828]" />
            <span>Role Pegawai</span>
            <span>•</span>
            <span className="text-[#c62828]">Informasi Saldo Awal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Informasi Saldo Awal Angka Kredit
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Rincian modal awal Angka Kredit (AK Dasar, PAK Pelantikan, Saldo Historis, dan Carry-Over) sebelum penambahan konversi kinerja tahun berjalan.
          </p>
        </div>

        {/* Filter Tahun */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
          <label htmlFor="pilih-tahun" className="text-xs font-bold text-slate-500 pl-2">
            Tahun:
          </label>
          <select
            id="pilih-tahun"
            value={selectedTahun}
            onChange={(e) => setSelectedTahun(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c62828] cursor-pointer"
          >
            {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((yr) => (
              <option key={yr} value={yr}>
                {yr} {yr === currentYear ? '(Tahun Aktif)' : ''}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* 2. Informasi Identitas Pegawai Strip */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-[#c62828] shrink-0 text-xl font-black">
              {nama.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">{nama}</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 font-mono">
                  NIP. {nip}
                </span>
                {pakData?.is_final ? (
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    <i className="fa-solid fa-lock text-[9px] mr-1" />
                    Penetapan Final
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                    <i className="fa-solid fa-clock text-[9px] mr-1" />
                    Tahun Berjalan (Draft)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {jenjang} • Pangkat/Golongan: <span className="font-semibold text-slate-700">{golongan}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6 text-xs">
            <div>
              <p className="text-slate-400 font-medium">Koefisien Tahunan</p>
              <p className="font-bold text-slate-800 mt-0.5">{koefisien} AK / Tahun</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">TMT Jabatan</p>
              <p className="font-bold text-slate-800 mt-0.5">{tmt}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Target KP</p>
              <p className="font-bold text-[#c62828] mt-0.5">{targetKp.toFixed(2)} AK</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. Kartu Saldo Awal Utama (4 Grid Cards) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Saldo Awal (AK Lama) */}
        <div className="relative rounded-2xl border-2 border-red-100 bg-gradient-to-br from-red-50/70 via-white to-white p-5 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#c62828]">Total Saldo Awal</span>
            <div className="w-8 h-8 rounded-xl bg-red-100/80 flex items-center justify-center text-[#c62828]">
              <i className="fa-solid fa-vault text-xs" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-[#c62828] tracking-tight font-mono">
              {loading ? '...' : totalSaldoAwal.toFixed(3)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Modal Angka Kredit awal sebelum konversi {selectedTahun}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-red-100/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Status Saldo:</span>
            <span className="font-bold text-slate-800">Tercatat Aktif</span>
          </div>
        </div>

        {/* Card 2: AK Dasar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">AK Dasar</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <i className="fa-solid fa-layer-group text-xs" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-slate-800 tracking-tight font-mono">
              {loading ? '...' : akDasar.toFixed(3)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Sesuai golongan awal ({golongan}) pada jenjang {jenjang}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Regulasi:</span>
            <span className="font-semibold text-slate-700">PermenPANRB 1/2023</span>
          </div>
        </div>

        {/* Card 3: PAK Pelantikan / Penyesuaian */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">PAK Pelantikan</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <i className="fa-solid fa-award text-xs" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-slate-800 tracking-tight font-mono">
              {loading ? '...' : akPakPelantikan.toFixed(3)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Penyesuaian masa kerja jabatan lama / inpassing
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Formula:</span>
            <span className="font-semibold text-slate-700">PerBKN No. 3/2023</span>
          </div>
        </div>

        {/* Card 4: AK Saldo Historis */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Saldo Historis</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <i className="fa-solid fa-clock-rotate-left text-xs" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-slate-800 tracking-tight font-mono">
              {loading ? '...' : akHistoris.toFixed(3)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Sisa angka kredit konvensional bawaan kepegawaian
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Verifikasi:</span>
            <span className="font-semibold text-slate-700">Tim Kepegawaian KPK</span>
          </div>
        </div>
      </motion.div>

      {/* 4. Rincian Komposisi Saldo & Rumus Regulasi */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 span): Diagram Komposisi & Penjelasan */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Komposisi & Formula Pembentukan Saldo Awal</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Struktur kalkulasi modal angka kredit pegawai berdasarkan regulasi BKN KPK
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#c62828] bg-red-50 px-2.5 py-1 rounded-xl">
              <i className="fa-solid fa-calculator text-[10px]" /> Formula Resmi
            </span>
          </div>

          {/* Formula Visual Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Formula Total Saldo Awal (AK Lama):
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold text-slate-800 font-mono">
              <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-2xs">
                <span className="text-[10px] block text-slate-400 font-sans font-medium">AK Dasar</span>
                {akDasar.toFixed(2)}
              </div>
              <span className="text-slate-400 text-base font-sans">+</span>
              <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-2xs">
                <span className="text-[10px] block text-slate-400 font-sans font-medium">PAK Pelantikan</span>
                {akPakPelantikan.toFixed(2)}
              </div>
              <span className="text-slate-400 text-base font-sans">+</span>
              <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-2xs">
                <span className="text-[10px] block text-slate-400 font-sans font-medium">Saldo Historis</span>
                {akHistoris.toFixed(2)}
              </div>
              {akCarryOver > 0 && (
                <>
                  <span className="text-slate-400 text-base font-sans">+</span>
                  <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-2xs">
                    <span className="text-[10px] block text-slate-400 font-sans font-medium">Carry Over</span>
                    {akCarryOver.toFixed(2)}
                  </div>
                </>
              )}
              <span className="text-[#c62828] text-base font-sans">=</span>
              <div className="bg-red-50 border border-red-200 text-[#c62828] px-3.5 py-2 rounded-xl shadow-2xs font-extrabold">
                <span className="text-[10px] block text-[#c62828]/70 font-sans font-semibold">Total Saldo Awal</span>
                {totalSaldoAwal.toFixed(2)} AK
              </div>
            </div>
          </div>

          {/* Breakdown Items List */}
          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 text-[11px]">
                1
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">Angka Kredit Dasar ({akDasar.toFixed(3)} AK)</h3>
                  <span className="text-[10px] font-bold text-slate-500 font-mono">Pangkat Awal</span>
                </div>
                <p className="text-slate-500 mt-1 leading-relaxed">
                  Modal angka kredit dasar yang diberikan pada saat pegawai menduduki pangkat golongan awal di jenjang jabatannya (misal Gol. III/a pada Ahli Pertama).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0 text-[11px]">
                2
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">PAK Pelantikan & Penyesuaian ({akPakPelantikan.toFixed(3)} AK)</h3>
                  <span className="text-[10px] font-bold text-slate-500 font-mono">Masa Kerja Lama</span>
                </div>
                <p className="text-slate-500 mt-1 leading-relaxed">
                  Perolehan angka kredit penyesuaian dari masa kerja jabatan lama pegawai sebelum dilantik/diangkat ke dalam Jabatan Fungsional KPK.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0 text-[11px]">
                3
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">Saldo Historis Konvensional ({akHistoris.toFixed(3)} AK)</h3>
                  <span className="text-[10px] font-bold text-slate-500 font-mono">SK PAK Lama</span>
                </div>
                <p className="text-slate-500 mt-1 leading-relaxed">
                  Akumulasi angka kredit konvensional dari penetapan SK PAK terdahulu yang telah diverifikasi oleh Tim Pengelola Kepegawaian KPK.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 span): Target & Kelayakan Kenaikan Pangkat */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Progres Kebutuhan Kenaikan Pangkat</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Target Angka Kredit untuk usulan kenaikan pangkat/jenjang berikutnya
            </p>

            {/* Target Numbers */}
            <div className="mt-5 space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 font-medium">Target Kenaikan Pangkat (KP)</span>
                  <span className="font-bold text-slate-800 font-mono">{targetKp.toFixed(2)} AK</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-[#c62828] h-2.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
                  <span>Saldo Awal: {totalSaldoAwal.toFixed(2)} AK</span>
                  <span className="font-bold text-[#c62828]">{progressPercent}% Tercapai</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Target Kenaikan Jenjang</span>
                  <span className="font-bold text-slate-800 font-mono">{targetJenjang.toFixed(2)} AK</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Kebutuhan AK kumulatif untuk promosi ke jenjang berikutnya.
                </p>
              </div>
            </div>

            {/* Kelayakan Status Card */}
            <div className="mt-5 p-4 rounded-xl border border-slate-200 bg-white">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Evaluasi BKN</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                    badgeColor === 'green'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : badgeColor === 'blue'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {badgeLabel}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {catatanKelayakan}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
            <i className="fa-solid fa-circle-info text-[#c62828]" />
            <span>Data diverifikasi otomatis oleh Sistem Konversi KPK.</span>
          </div>
        </div>
      </motion.div>

      {/* 5. Tabel Riwayat Saldo & Penetapan Tahunan Pegawai */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Riwayat Penetapan Saldo & Angka Kredit Pegawai</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar rekam jejak saldo awal dan akumulasi penetapan AK tahunan Anda yang terdaftar di database
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 self-start sm:self-auto">
            Total {rekapList.length > 0 ? rekapList.length : 1} Periode Tercatat
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
              <tr>
                <th className="py-3 px-4">Tahun</th>
                <th className="py-3 px-4">AK Dasar</th>
                <th className="py-3 px-4">PAK Pelantikan</th>
                <th className="py-3 px-4">Saldo Historis</th>
                <th className="py-3 px-4">Saldo Awal (AK Lama)</th>
                <th className="py-3 px-4">AK Baru Berjalan</th>
                <th className="py-3 px-4">AK Kumulatif</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {rekapList.length > 0 ? (
                rekapList.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      item.tahun === selectedTahun ? 'bg-red-50/40 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-sans font-bold text-slate-900">
                      {item.tahun}
                      {item.tahun === currentYear && (
                        <span className="ml-2 text-[10px] font-bold text-[#c62828] bg-red-100 px-2 py-0.5 rounded-full font-sans">
                          Aktif
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{Number(item.ak_dasar ?? 0).toFixed(3)}</td>
                    <td className="py-3.5 px-4 text-slate-700">{Number(item.ak_pak_pelantikan ?? 0).toFixed(3)}</td>
                    <td className="py-3.5 px-4 text-slate-700">{Number(item.ak_historis ?? 0).toFixed(3)}</td>
                    <td className="py-3.5 px-4 font-bold text-[#c62828]">{Number(item.ak_lama ?? 0).toFixed(3)}</td>
                    <td className="py-3.5 px-4 text-emerald-600 font-bold">
                      +{Number(item.ak_baru ?? 0).toFixed(3)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{Number(item.ak_kumulatif ?? 0).toFixed(3)}</td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      {item.is_final ? (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          Final
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                          Draft
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="bg-red-50/30">
                  <td className="py-3.5 px-4 font-sans font-bold text-slate-900">
                    {selectedTahun}
                    <span className="ml-2 text-[10px] font-bold text-[#c62828] bg-red-100 px-2 py-0.5 rounded-full font-sans">
                      Tahun Berjalan
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">{akDasar.toFixed(3)}</td>
                  <td className="py-3.5 px-4 text-slate-700">{akPakPelantikan.toFixed(3)}</td>
                  <td className="py-3.5 px-4 text-slate-700">{akHistoris.toFixed(3)}</td>
                  <td className="py-3.5 px-4 font-bold text-[#c62828]">{totalSaldoAwal.toFixed(3)}</td>
                  <td className="py-3.5 px-4 text-emerald-600 font-bold">+{akBaru.toFixed(3)}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{akKumulatif.toFixed(3)}</td>
                  <td className="py-3.5 px-4 text-center font-sans">
                    {pakData?.is_final ? (
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        Final
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                        Draft
                      </span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* 6. Kotak Bantuan & Panduan Kepegawaian */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-xs text-slate-600 flex flex-col sm:flex-row items-start gap-4"
      >
        <div className="w-9 h-9 rounded-xl bg-red-100 text-[#c62828] flex items-center justify-center shrink-0">
          <i className="fa-solid fa-shield-halved text-sm" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-slate-800">Catatan Kepegawaian & Validasi Saldo Awal</h4>
          <p className="text-slate-500 leading-relaxed">
            Saldo awal angka kredit di atas merupakan data resmi yang telah diintegrasikan dengan penetapan PAK dan riwayat kepangkatan Anda di Biro Sumber Daya Manusia KPK. Jika terdapat ketidaksesuaian nilai pada AK Dasar, PAK Pelantikan, atau Saldo Historis, silakan hubungi Administrator Pengelola Jabatan Fungsional Biro SDM KPK.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
