import { useEffect, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useAuth } from '../../context/useAuth'
import {
  getDetailPak,
  getRekapitulasiList,
  downloadRekapitulasiXlsx,
} from '../../api/rekapitulasi'
import type { DetailPakResponse, PenetapanAKItem } from '../../api/rekapitulasi'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

export default function RekapitulasiPAK() {
  const { user } = useAuth()
  const currentYear = new Date().getFullYear()
  const [selectedTahun, setSelectedTahun] = useState<number>(currentYear)
  const [pakData, setPakData] = useState<DetailPakResponse['data'] | null>(null)
  const [rekapList, setRekapList] = useState<PenetapanAKItem[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const pegawaiId = user?.pegawai?.id
    if (!pegawaiId) {
      setLoading(false)
      setError('Profil pegawai tidak ditemukan.')
      return
    }
    setLoading(true)
    setError(null)
    Promise.all([
      getDetailPak(pegawaiId, selectedTahun),
      getRekapitulasiList({ per_page: 20 }).catch(() => ({ data: [] as PenetapanAKItem[], current_page: 1, total: 0, last_page: 1 })),
    ])
      .then(([detail, list]) => {
        if (!isMounted) return
        setPakData(detail)
        if (list?.data) setRekapList(list.data)
      })
      .catch((err) => {
        if (isMounted) setError(err?.response?.data?.message || 'Gagal memuat data rekapitulasi PAK.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => { isMounted = false }
  }, [user?.pegawai?.id, selectedTahun])

  const nama = user?.pegawai?.nama_lengkap ?? user?.name ?? 'Pegawai KPK'
  const nip = user?.pegawai?.nip ?? '-'
  const golongan = pakData?.pangkat?.golongan ?? user?.pegawai?.pangkat_golongan?.golongan ?? '-'
  const jenjang = pakData?.pangkat?.jenjang ?? user?.pegawai?.pangkat_golongan?.jenjang_jabatan?.nama ?? '-'
  const koefisien = pakData?.pangkat?.koefisien ?? 12.5

  const akDasar = pakData?.ak_dasar ?? 0
  const akPakPelantikan = pakData?.ak_pak_pelantikan ?? 0
  const akHistoris = pakData?.ak_historis ?? 0
  const akLama = pakData?.ak_lama ?? 0
  const akCarry = pakData?.ak_carry_over ?? 0
  const totalSaldoAwal = akLama > 0 ? akLama : akDasar + akPakPelantikan + akHistoris + akCarry
  const akBaru = pakData?.total_ak_baru ?? pakData?.sum_ak_periodik ?? pakData?.ak_baru ?? 0
  const akBooster = pakData?.ak_booster ?? 0
  const akKumulatif = Number((totalSaldoAwal + akBaru + akBooster).toFixed(2))

  const targetKp = pakData?.kelayakan?.target_kp ?? 50
  const targetJenjang = pakData?.kelayakan?.target_jenjang ?? 100
  const badgeLabel = pakData?.kelayakan?.badge_label ?? (akKumulatif >= targetKp ? 'LAYAK KP' : 'BELUM CUKUP AK')
  const badgeColor = pakData?.kelayakan?.badge_color ?? (akKumulatif >= targetKp ? 'success' : 'warning')
  const kurangAk = pakData?.kelayakan?.kurang_ak ?? Math.max(0, targetKp - akKumulatif)
  const catatan = pakData?.kelayakan?.catatan ?? ''
  const isFinal = pakData?.is_final ?? false

  const pct = targetKp > 0 ? Math.min(100, Math.round((akKumulatif / targetKp) * 1000) / 10) : 0
  const saldoPct = targetKp > 0 ? Math.min(100, Math.round((totalSaldoAwal / targetKp) * 100)) : 0

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadRekapitulasiXlsx(selectedTahun)
    } catch {
      setError('Gagal mengunduh Draft SK PAK.')
    } finally {
      setDownloading(false)
    }
  }

  const triwulan = pakData?.triwulan ?? {}

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 pb-12">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Role Pegawai</span>
            <span>•</span>
            <span className="text-primary">Rekapitulasi PAK</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Rekapitulasi & Penetapan AK (PAK)</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Rincian akumulasi Angka Kredit kumulatif, komponen saldo awal, capaian triwulan, dan kelayakan kenaikan pangkat/jenjang Anda.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
            <label htmlFor="tahun-pak" className="text-xs font-bold text-slate-500 pl-2">Tahun:</label>
            <select
              id="tahun-pak"
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((yr) => (
                <option key={yr} value={yr}>{yr} {yr === currentYear ? '(Aktif)' : ''}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{downloading ? 'Mengunduh...' : 'Unduh Draft SK PAK'}</span>
          </button>
        </div>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-xs font-medium text-error flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-error font-bold underline">Tutup</button>
        </motion.div>
      )}

      {/* Identitas Strip */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary border border-primary/15 flex items-center justify-center text-primary shrink-0 text-xl font-black">
              {nama.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">{nama}</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 font-mono">NIP. {nip}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${badgeColor === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : badgeColor === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {badgeLabel}
                </span>
                {isFinal ? (
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700"><i className="fa-solid fa-lock text-[9px] mr-1" />Final</span>
                ) : (
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700"><i className="fa-solid fa-clock text-[9px] mr-1" />Draft {selectedTahun}</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">{jenjang} • Gol {golongan} • Koefisien {koefisien} AK/Tahun</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-[11px] text-slate-400 font-medium">AK Kumulatif</p>
              <p className="text-lg font-extrabold text-slate-900 font-mono mt-0.5">{loading ? '...' : akKumulatif.toFixed(3)}</p>
            </div>
            <div className="bg-secondary/50 p-3 rounded-xl border border-primary/15">
              <p className="text-[11px] text-slate-500 font-medium">Target KP</p>
              <p className="text-lg font-extrabold text-primary font-mono mt-0.5">{targetKp.toFixed(2)}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-[11px] text-slate-400 font-medium">Target Jenjang</p>
              <p className="text-lg font-bold text-slate-700 font-mono mt-0.5">{targetJenjang.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Cards Komposisi */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative overflow-hidden rounded-xl border-2 border-primary/15 bg-gradient-to-br from-secondary via-white to-white p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">AK Kumulatif</p>
            <i className="fa-solid fa-trophy text-[10px] text-primary/40" />
          </div>
          <p className="text-xl font-extrabold text-primary font-mono">{loading ? '...' : akKumulatif.toFixed(3)}</p>
          <p className="text-[10px] text-slate-500 mt-1">{pct}% dari target KP • {kurangAk > 0 ? `Kurang ${kurangAk.toFixed(2)} AK` : 'Target terpenuhi'}</p>
          <div className="mt-3 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Saldo Awal (Lama)</p>
            <i className="fa-solid fa-vault text-[10px] text-slate-300" />
          </div>
          <p className="text-xl font-bold text-slate-800 font-mono">{loading ? '...' : totalSaldoAwal.toFixed(3)}</p>
          <p className="text-[10px] text-slate-400 mt-1">AK Dasar {akDasar.toFixed(2)} + PAK {akPakPelantikan.toFixed(2)} + Hist {akHistoris.toFixed(2)}</p>
          <div className="mt-2 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-slate-400 rounded-full" style={{ width: `${saldoPct}%` }} />
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-blue-50/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-blue-700 uppercase">AK Baru ({selectedTahun})</p>
            <i className="fa-solid fa-arrow-trend-up text-[10px] text-blue-400" />
          </div>
          <p className="text-xl font-bold text-blue-700 font-mono">{loading ? '...' : `+${akBaru.toFixed(3)}`}</p>
          <p className="text-[10px] text-blue-600/70 mt-1">Konversi kinerja TW1–TW4</p>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-emerald-700 uppercase">Booster Pendidikan</p>
            <i className="fa-solid fa-graduation-cap text-[10px] text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-700 font-mono">{loading ? '...' : akBooster > 0 ? `+${akBooster.toFixed(3)}` : '0.000'}</p>
          <p className="text-[10px] text-emerald-600/70 mt-1">+25% AK jika ijazah disetujui</p>
        </div>
      </motion.div>

      {/* Formula + Kelayakan */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Formula Penetapan Kumulatif PAK</h2>
            <p className="text-xs text-slate-500">Perhitungan resmi sesuai PerBKN No. 3/2023</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">AK Kumulatif = Saldo Awal + AK Baru + Booster</p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold text-slate-800">
              <span className="bg-white border border-slate-200 px-3 py-2 rounded-xl">{totalSaldoAwal.toFixed(2)}<span className="block text-[10px] font-sans font-medium text-slate-400">Saldo Awal</span></span>
              <span className="text-slate-400">+</span>
              <span className="bg-white border border-blue-200 text-blue-700 px-3 py-2 rounded-xl">{akBaru.toFixed(2)}<span className="block text-[10px] font-sans font-medium text-blue-400">AK Baru</span></span>
              <span className="text-slate-400">+</span>
              <span className="bg-white border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl">{akBooster.toFixed(2)}<span className="block text-[10px] font-sans font-medium text-emerald-400">Booster</span></span>
              <span className="text-primary">=</span>
              <span className="bg-secondary border border-primary/20 text-primary px-4 py-2 rounded-xl font-extrabold text-sm">{akKumulatif.toFixed(2)} AK</span>
            </div>
          </div>
          {/* 4 TW summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4].map((q) => {
              const d = triwulan[String(q)] ?? triwulan[q]
              const ak = d?.ak_total ?? 0
              const pred = d?.rincian?.[0]?.predikat ?? '-'
              return (
                <div key={q} className={`p-3 rounded-xl border text-center ${q===4 ? 'border-primary/20 bg-secondary/40' : 'border-slate-200 bg-slate-50/50'}`}>
                  <p className={`text-[10px] font-bold uppercase ${q===4 ? 'text-primary' : 'text-slate-500'}`}>TW{q} {q===4 ? '• Jangkar' : ''}</p>
                  <p className="font-mono font-bold text-slate-900 mt-1">{ak.toFixed(2)} AK</p>
                  <p className="text-[10px] text-slate-500 truncate" title={pred}>{pred}</p>
                </div>
              )
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Kelayakan & Progres</h2>
            <p className="text-xs text-slate-500">Evaluasi otomatis sistem</p>
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-500">Progress KP</span>
                <span className="font-mono font-bold text-slate-800">{akKumulatif.toFixed(2)} / {targetKp.toFixed(2)} AK</span>
              </div>
              <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100,pct)}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 mt-2">
                <span>{pct}% tercapai</span>
                <span className={kurangAk>0 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>{kurangAk>0 ? `Kurang ${kurangAk.toFixed(2)}` : 'Siap KP'}</span>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl border border-slate-200 bg-white">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Sistem</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${badgeColor==='success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : badgeColor==='warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />{badgeLabel}
                </span>
              </div>
              {catatan && <p className="text-xs text-slate-600 mt-2.5 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">{catatan}</p>}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100"><i className="fa-solid fa-circle-info text-primary" />Sesuai PermenPANRB 1/2023 & PerBKN 3/2023</p>
        </div>
      </motion.div>

      {/* Tabel Rekap Tahunan */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Rekapitulasi Penetapan per Tahun</h2>
            <p className="text-xs text-slate-500">Riwayat AK kumulatif pegawai dari database (sumber: penetapan_ak)</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{rekapList.length} periode tercatat</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
              <tr>
                <th className="py-3 px-4">Tahun</th>
                <th className="py-3 px-4">AK Dasar</th>
                <th className="py-3 px-4">AK Lama</th>
                <th className="py-3 px-4">AK Baru</th>
                <th className="py-3 px-4">AK Booster</th>
                <th className="py-3 px-4">AK Kumulatif</th>
                <th className="py-3 px-4 text-center">Status Kelayakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">Memuat data...</td></tr>
              ) : rekapList.length === 0 ? (
                <tr className={selectedTahun===currentYear ? 'bg-secondary/30' : ''}>
                  <td className="py-3 px-4 font-bold text-slate-900">{selectedTahun} <span className="ml-2 text-[10px] bg-secondary text-primary px-2 py-0.5 rounded-full">Berjalan</span></td>
                  <td className="py-3 px-4 font-mono">{akDasar.toFixed(3)}</td>
                  <td className="py-3 px-4 font-mono">{totalSaldoAwal.toFixed(3)}</td>
                  <td className="py-3 px-4 font-mono text-emerald-600 font-bold">+{akBaru.toFixed(3)}</td>
                  <td className="py-3 px-4 font-mono">{akBooster.toFixed(3)}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{akKumulatif.toFixed(3)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${badgeColor==='success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{badgeLabel} {pct}%</span>
                  </td>
                </tr>
              ) : (
                rekapList
                  .slice()
                  .sort((a,b)=> b.tahun - a.tahun)
                  .map((item) => {
                    const isActive = item.tahun === selectedTahun
                    const kumulatif = Number(item.ak_kumulatif ?? 0)
                    const target = Number(item.target_kp ?? targetKp)
                    const p = target>0 ? Math.min(100, Math.round((kumulatif/target)*100)) : 0
                    const color = item.badge_color ?? 'warning'
                    return (
                      <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors font-mono ${isActive ? 'bg-secondary/40' : ''}`}>
                        <td className="py-3 px-4 font-sans font-bold text-slate-900">
                          {item.tahun} {isActive && <span className="ml-2 text-[10px] bg-secondary text-primary px-2 py-0.5 rounded-full">Aktif</span>}
                          {item.is_final && <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Final</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{Number(item.ak_dasar ?? 0).toFixed(3)}</td>
                        <td className="py-3 px-4 text-slate-700">{Number(item.ak_lama ?? 0).toFixed(3)}</td>
                        <td className="py-3 px-4 text-emerald-600 font-bold">+{Number(item.ak_baru ?? 0).toFixed(3)}</td>
                        <td className="py-3 px-4 text-slate-700">{Number(item.ak_booster ?? 0).toFixed(3)}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{kumulatif.toFixed(3)}</td>
                        <td className="py-3 px-4 text-center font-sans">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${color==='success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : color==='warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {item.badge_label ?? badgeLabel} {item.tahun===selectedTahun ? `(${pct}%)` : `(${p}%)`}
                          </span>
                        </td>
                      </tr>
                    )
                  })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Info Box */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-xs text-slate-600 flex gap-4">
        <div className="w-9 h-9 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0"><i className="fa-solid fa-circle-info text-sm" /></div>
        <div className="space-y-1">
          <h4 className="font-bold text-slate-800">Catatan Penetapan Angka Kredit</h4>
          <p className="text-slate-500 leading-relaxed">
            Rekapitulasi di atas diambil langsung dari backend (<code className="bg-white px-1 py-0.5 rounded border">GET /api/rekapitulasi</code> &amp; <code className="bg-white px-1 py-0.5 rounded border">GET /api/rekapitulasi/{'{pegawaiId}/{tahun}'}</code>). Tombol Unduh Draft SK PAK mengekspor XLSX resmi via <code className="bg-white px-1 py-0.5 rounded border">GET /api/rekapitulasi/export</code>. Jika terdapat selisih AK, hubungi Admin Kepegawaian KPK.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
