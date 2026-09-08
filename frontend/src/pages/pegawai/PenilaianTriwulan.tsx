import { useEffect, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useAuth } from '../../context/useAuth'
import { getDetailPak, getRekapitulasiList } from '../../api/rekapitulasi'
import type { DetailPakResponse, PenetapanAKItem, TriwulanData } from '../../api/rekapitulasi'

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

export default function PenilaianTriwulan() {
  const { user } = useAuth()
  const currentYear = new Date().getFullYear()

  const [selectedTahun, setSelectedTahun] = useState<number>(currentYear)
  const [pakData, setPakData] = useState<DetailPakResponse['data'] | null>(null)
  const [rekapList, setRekapList] = useState<PenetapanAKItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Fetch data detail triwulan dan rekapitulasi riwayat tahunan
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
        console.error('Gagal mengambil data penilaian triwulan:', err)
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

  // Identitas Pegawai
  const nama = user?.pegawai?.nama_lengkap ?? user?.name ?? 'Pegawai KPK'
  const nip = user?.pegawai?.nip ?? '-'
  const golongan = pakData?.pangkat?.golongan ?? user?.pegawai?.pangkat_golongan?.golongan ?? '-'
  const jenjang = pakData?.pangkat?.jenjang ?? user?.pegawai?.pangkat_golongan?.jenjang_jabatan?.nama ?? '-'
  const koefisien = pakData?.pangkat?.koefisien ?? 12.5

  // Saldo Awal & Akumulasi
  const akLama = pakData?.ak_lama ?? 0
  const akDasar = pakData?.ak_dasar ?? 0
  const akPakPelantikan = pakData?.ak_pak_pelantikan ?? 0
  const akHistoris = pakData?.ak_historis ?? 0
  const akCarryOver = pakData?.ak_carry_over ?? 0
  const totalSaldoAwal = akLama > 0 ? akLama : (akDasar + akPakPelantikan + akHistoris + akCarryOver)

  // Gunakan total_ak_baru/sum_ak_periodik (live sum dari evaluasi_kinerja)
  const totalAkBaru = pakData?.total_ak_baru ?? pakData?.sum_ak_periodik ?? pakData?.ak_baru ?? 0
  const akBooster = pakData?.ak_booster ?? 0
  const akKumulatif = Number((totalSaldoAwal + totalAkBaru + akBooster).toFixed(2))

  // Target & Kelayakan
  const targetKp = pakData?.kelayakan?.target_kp ?? 50.0
  const badgeLabel = pakData?.kelayakan?.badge_label ?? (akKumulatif >= targetKp ? 'SIAP NAIK PANGKAT' : 'BELUM CUKUP AK')
  const badgeColor = pakData?.kelayakan?.badge_color ?? (akKumulatif >= targetKp ? 'green' : 'amber')

  // Normalisasi data 4 Triwulan
  const triwulanMap = pakData?.triwulan ?? {}
  const quarters: Array<{
    qNumber: number
    name: string
    periodeLabel: string
    data?: TriwulanData
  }> = [
    { qNumber: 1, name: 'Triwulan I (TW1)', periodeLabel: 'Januari - Maret' },
    { qNumber: 2, name: 'Triwulan II (TW2)', periodeLabel: 'April - Juni' },
    { qNumber: 3, name: 'Triwulan III (TW3)', periodeLabel: 'Juli - September' },
    { qNumber: 4, name: 'Triwulan IV (TW4)', periodeLabel: 'Oktober - Desember' },
  ].map((item) => ({
    ...item,
    data: triwulanMap[String(item.qNumber)] || triwulanMap[item.qNumber],
  }))

  const getPredikatBadge = (predikat?: string) => {
    if (!predikat) {
      return {
        label: 'Belum Dievaluasi',
        badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
        persenText: '0%',
      }
    }
    const lower = predikat.toLowerCase()
    if (lower.includes('sangat baik')) {
      return {
        label: 'Sangat Baik',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        persenText: '150%',
      }
    }
    if (lower.includes('baik')) {
      return {
        label: 'Baik',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        persenText: '100%',
      }
    }
    if (lower.includes('butuh perbaikan') || lower.includes('perbaikan')) {
      return {
        label: 'Butuh Perbaikan',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        persenText: '75%',
      }
    }
    if (lower.includes('sangat kurang')) {
      return {
        label: 'Sangat Kurang',
        badgeClass: 'bg-error/10 text-error border-error/20',
        persenText: '25%',
      }
    }
    if (lower.includes('kurang')) {
      return {
        label: 'Kurang',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
        persenText: '50%',
      }
    }
    return {
      label: predikat,
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      persenText: '100%',
    }
  }

  // Riwayat Tahun Sebelumnya yang tersedia
  const historicalYears = rekapList.filter((item) => item.tahun !== selectedTahun)

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
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Role Pegawai</span>
            <span>•</span>
            <span className="text-primary">Penilaian Kinerja</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Penilaian Triwulan & Konversi Angka Kredit
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Pantau hasil evaluasi predikat kinerja per triwulan dan konversi Angka Kredit berjalan berdasarkan regulasi PermenPANRB No. 1/2023.
          </p>
        </div>

        {/* Filter Tahun */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
          <label htmlFor="select-tahun-tw" className="text-xs font-bold text-slate-500 pl-2">
            Tahun:
          </label>
          <select
            id="select-tahun-tw"
            value={selectedTahun}
            onChange={(e) => setSelectedTahun(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((yr) => (
              <option key={yr} value={yr}>
                {yr} {yr === currentYear ? '(Tahun Aktif)' : ''}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* 2. Informasi Pegawai & Ringkasan Saldo Awal */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary border border-primary/15 flex items-center justify-center text-primary shrink-0 text-xl font-black">
              {nama.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">{nama}</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 font-mono">
                  NIP. {nip}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                    badgeColor === 'green'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {badgeLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {jenjang} • Pangkat/Golongan: <span className="font-semibold text-slate-700">{golongan}</span> • Koefisien:{' '}
                <span className="font-semibold text-slate-700">{koefisien} AK/Tahun</span>
              </p>
            </div>
          </div>

          {/* Saldo Awal Context Metric */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6 text-xs">
            <div className="bg-secondary/50 p-3 rounded-xl border border-primary/15">
              <p className="text-[11px] text-slate-500 font-medium">Saldo Awal (AK Lama)</p>
              <p className="text-base font-extrabold text-primary font-mono mt-0.5">
                {loading ? '...' : totalSaldoAwal.toFixed(3)}
              </p>
            </div>
            <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
              <p className="text-[11px] text-slate-500 font-medium">AK Baru ({selectedTahun})</p>
              <p className="text-base font-extrabold text-emerald-600 font-mono mt-0.5">
                {loading ? '...' : `+${totalAkBaru.toFixed(3)}`}
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
              <p className="text-[11px] text-slate-500 font-medium">AK Kumulatif Total</p>
              <p className="text-base font-extrabold text-slate-900 font-mono mt-0.5">
                {loading ? '...' : akKumulatif.toFixed(3)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. Kartu 4 Triwulan (Grid Cards) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quarters.map((q) => {
          const rincian = q.data?.rincian?.[0]
          const predikat = rincian?.predikat
          const badge = getPredikatBadge(predikat)
          const akVal = q.data?.ak_total ?? rincian?.angka_kredit ?? 0
          const hasEvaluasi = Boolean(predikat)
          const isLocked = pakData?.is_locked ?? false

          return (
            <div
              key={q.qNumber}
              className={`rounded-2xl border p-5 shadow-xs transition-all relative overflow-hidden ${
                hasEvaluasi
                  ? 'border-slate-200 bg-white hover:border-slate-300'
                  : 'border-dashed border-slate-200 bg-slate-50/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">{q.name}</span>
                  <p className="text-[10px] text-slate-400 font-medium">{q.periodeLabel}</p>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  {selectedTahun}
                </span>
              </div>

              {/* Predikat & Status */}
              <div className="mt-4">
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.badgeClass}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {badge.label} {hasEvaluasi ? `(${badge.persenText})` : ''}
                </span>

                <div className="mt-3">
                  <p className="text-[10px] text-slate-400 font-medium">Perolehan Angka Kredit:</p>
                  <p
                    className={`text-2xl font-extrabold font-mono tracking-tight mt-0.5 ${
                      hasEvaluasi ? 'text-emerald-900' : 'text-slate-400'
                    }`}
                  >
                    {loading ? '...' : hasEvaluasi ? `+${akVal.toFixed(4)}` : '0.0000'} AK
                  </p>
                </div>
              </div>

              {/* Footer info card */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Status Kunci:</span>
                {isLocked ? (
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <i className="fa-solid fa-lock text-[10px]" /> Terkunci
                  </span>
                ) : hasEvaluasi ? (
                  <span className="font-bold text-amber-600 flex items-center gap-1">
                    <i className="fa-solid fa-clock text-[10px]" /> Draft Penilaian
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Belum Ada Nilai</span>
                )}
              </div>
            </div>
          )
        })}
      </motion.div>

      {/* 4. Tabel Rincian & Formula Perhitungan Triwulan Tahun Terpilih */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Rincian Evaluasi & Simulasi Perhitungan Triwulan ({selectedTahun})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rumus BKN: (Jumlah Bulan / 12) × Persentase Predikat × Koefisien Jenjang ({koefisien} AK/Thn)
            </p>
          </div>
          <span className="text-xs font-bold text-primary bg-secondary px-3 py-1 rounded-xl self-start sm:self-auto border border-primary/15">
            Total AK TW: +{totalAkBaru.toFixed(4)} AK
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
              <tr>
                <th className="py-3 px-4">Periode Triwulan</th>
                <th className="py-3 px-4">Durasi</th>
                <th className="py-3 px-4">Predikat Kinerja</th>
                <th className="py-3 px-4">Persentase (%)</th>
                <th className="py-3 px-4">Koefisien Jenjang</th>
                <th className="py-3 px-4">Perolehan Angka Kredit</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quarters.map((q) => {
                const rincian = q.data?.rincian?.[0]
                const predikat = rincian?.predikat
                const badge = getPredikatBadge(predikat)
                const akVal = q.data?.ak_total ?? rincian?.angka_kredit ?? 0
                const hasEvaluasi = Boolean(predikat)
                const isLocked = pakData?.is_locked ?? false
                const durasi = q.data?.jumlah_bulan ?? rincian?.jumlah_bulan ?? 3

                return (
                  <tr key={q.qNumber} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{q.name}</div>
                      <div className="text-[10px] text-slate-400">{q.periodeLabel}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">{durasi} Bulan</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.badgeClass}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{badge.persenText}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{koefisien} AK / Thn</td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {hasEvaluasi ? (
                        <span className="text-emerald-600">+{akVal.toFixed(4)} AK</span>
                      ) : (
                        <span className="text-slate-400">0.0000 AK</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          <i className="fa-solid fa-lock text-[9px]" /> Terkunci
                        </span>
                      ) : hasEvaluasi ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                          <i className="fa-solid fa-clock text-[9px]" /> Draft
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Belum Dievaluasi</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50/80 font-bold text-slate-900 text-xs">
              <tr>
                <td colSpan={5} className="py-3.5 px-4 text-right">
                  Total Angka Kredit Kinerja Baru ({selectedTahun}):
                </td>
                <td colSpan={2} className="py-3.5 px-4 font-mono text-base text-emerald-600">
                  +{totalAkBaru.toFixed(4)} AK
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>

      {/* 5. Riwayat Tahun Sebelumnya (Jika Tersedia) */}
      {historicalYears.length > 0 && (
        <motion.div variants={itemVariants} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Arsip & Rekapitulasi Tahun Sebelumnya</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Riwayat total perolehan Angka Kredit kinerja dan penetapan pada periode tahun-tahun sebelumnya
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {historicalYears.length} Tahun Riwayat Tercatat
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-3 px-4">Tahun Buku</th>
                  <th className="py-3 px-4">Saldo Awal (AK Lama)</th>
                  <th className="py-3 px-4">AK Baru Tahun Tersebut</th>
                  <th className="py-3 px-4">AK Booster</th>
                  <th className="py-3 px-4">AK Kumulatif Akhir</th>
                  <th className="py-3 px-4 text-center">Status Penetapan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {historicalYears.map((hist) => (
                  <tr key={hist.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-bold text-slate-900">
                      Tahun {hist.tahun}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{Number(hist.ak_lama ?? 0).toFixed(3)}</td>
                    <td className="py-3.5 px-4 text-emerald-600 font-bold">
                      +{Number(hist.ak_baru ?? 0).toFixed(3)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{Number(hist.ak_booster ?? 0).toFixed(3)}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{Number(hist.ak_kumulatif ?? 0).toFixed(3)}</td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      {hist.is_final ? (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          Final
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      <button
                        type="button"
                        onClick={() => setSelectedTahun(hist.tahun)}
                        className="rounded-lg bg-slate-100 hover:bg-secondary hover:text-primary text-slate-700 px-3 py-1 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Lihat Triwulan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* 6. Kotak Edukasi Regulasi & Panduan Penilaian */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-xs text-slate-600 flex flex-col sm:flex-row items-start gap-4"
      >
        <div className="w-9 h-9 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
          <i className="fa-solid fa-circle-info text-sm" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-slate-800">Panduan Konversi Predikat Kinerja ke Angka Kredit</h4>
          <p className="text-slate-500 leading-relaxed">
            Sesuai PermenPANRB No. 1/2023, evaluasi kinerja triwulan ditetapkan oleh Atasan Langsung / Pejabat Penilai Kinerja KPK. Predikat kinerja akan otomatis dikonversikan menjadi Angka Kredit dengan persentase: <strong>Sangat Baik (150%)</strong>, <strong>Baik (100%)</strong>, <strong>Butuh Perbaikan (75%)</strong>, <strong>Kurang (50%)</strong>, dan <strong>Sangat Kurang (25%)</strong> dari koefisien tahunan jenjang jabatan Anda.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
