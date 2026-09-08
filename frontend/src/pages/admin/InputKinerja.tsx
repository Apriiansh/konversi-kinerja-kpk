import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ClipboardList,
  UserPlus,
  UserRound,
  CheckCircle2,
  Lock,
  Trash2,
  Pencil,
  PencilLine,
  Calendar,
  Layers,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  Award,
  GraduationCap,
  Check,
  Sparkles,
  Clock,
  LockOpen,
  X,
} from 'lucide-react'
import {
  getEvaluasiContext,
  createEvaluasi,
  updateEvaluasi,
  deleteEvaluasi,
  lockEvaluasi,
  simulasiPeriodic,
  simulasiTahunan,
  type EvaluasiContextData,
  type SimulasiResult,
} from '../../api/evaluasi'
import { finalizePak } from '../../api/rekapitulasi'
import { getMasterData } from '../../api/masterData'
import { api } from '../../api/client'
import {
  Button,
  Card,
  CardHeader,
  Alert,
  SearchInput,
  Badge,
} from '../../components/ui'
import type { MasterDataResponse, PredikatKinerja, AkDasar } from '../../types'

// ─── Konstanta Metadata Triwulan ─────────────────────────────────────────
const TW_META = [
  { tw: 1, label: 'TW 1', range: 'Jan – Mar' },
  { tw: 2, label: 'TW 2', range: 'Apr – Jun' },
  { tw: 3, label: 'TW 3', range: 'Jul – Sep' },
  { tw: 4, label: 'TW 4', range: 'Okt – Des', anchor: true },
]

const ASAL_JABATAN_OPTIONS = [
  { value: 'JABATAN_FUNGSIONAL', label: 'Jabatan Fungsional' },
  { value: 'PELAKSANA', label: 'Pelaksana' },
  { value: 'PENGAWAS', label: 'Pengawas' },
  { value: 'ADMINISTRATOR', label: 'Administrator' },
  { value: 'PENGANGKATAN_PERTAMA', label: 'Pengangkatan Pertama' },
]

// Warna brand institusi — konsisten dipakai lewat token di bawah, bukan hex tersebar
const BRAND = '#0b484d'

// ─── Tipe Bantuan (interop dengan response /pegawai biasa) ───────────────
type PegawaiSearchItem = {
  id: string
  nip: string
  nama_lengkap: string
  pangkat_golongan?: { golongan: string; jenjang_jabatan?: { nama?: string } }
}

interface EvaluasiEntry {
  id: string
  triwulan: number
  jumlah_bulan: number
  predikat_id: string
  predikat: string
  angka_kredit: number
  is_locked: boolean
}

// Shape respons error dari backend (Laravel validation / exception)
type ApiErrorResponse = {
  response?: {
    data?: {
      message?: string
      errors?: Record<string, string[]>
    }
  }
}

// Ambil pesan error dari unknown throw, fallback ke pesan default
function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as ApiErrorResponse)?.response?.data
  if (data?.errors) {
    return Object.values(data.errors)
      .flat()
      .filter(Boolean)
      .join(', ')
  }
  return data?.message || fallback
}

// Konversi desimal persentase_konversi (mis. 1.5) ke format persen yang benar (150%)
function formatPersen(decimal: number | string): string {
  const n = Number(decimal)
  if (!Number.isFinite(n)) return '-'
  return `${(n * 100).toFixed(0)}%`
}

// Rumus mentah dari backend biasanya menyisipkan angka desimal predikat apa adanya
// (mis. "... x 1.5 x ..."), bukan bentuk persen. Fungsi ini mencari angka desimal
// milik predikat yang sedang dipilih dan menggantinya jadi "150%" agar mudah dibaca,
// tanpa menyentuh angka lain (bulan aktif, koefisien, hasil akhir) di rumus tersebut.
function formatRumusRill(rumus: string | undefined, predikat?: PredikatKinerja): string | undefined {
  if (!rumus || !predikat) return rumus
  const decimal = Number(predikat.persentase_konversi)
  if (!Number.isFinite(decimal)) return rumus
  const percentText = formatPersen(decimal)
  const candidates = [decimal.toFixed(3), decimal.toFixed(2), decimal.toFixed(1), decimal.toString()]
  for (const c of candidates) {
    const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(?<!\\d)${escaped}(?!\\d)`, 'g')
    const result: string = rumus.replace(regex, percentText)
    if (result !== rumus) return result
  }
  return rumus
}

export const InputKinerja: React.FC = () => {
  const currentYear = new Date().getFullYear()
  const [tahun, setTahun] = useState<number>(currentYear)

  // ── Mode Panel Atas ──
  const [addNew, setAddNew] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<PegawaiSearchItem[]>([])
  const [searching, setSearching] = useState<boolean>(false)

  // ── Pegawai Terpilih & Konteks ──
  const [pegawaiId, setPegawaiId] = useState<string | null>(null)
  const [context, setContext] = useState<EvaluasiContextData | null>(null)
  const [loadingCtx, setLoadingCtx] = useState<boolean>(false)
  const [activeTw, setActiveTw] = useState<number>(1)

  // ── Master Data (predikat, jenjang, ak dasar) ──
  const [master, setMaster] = useState<MasterDataResponse | null>(null)

  // ── Form Pegawai Baru / Edit ──
  const [showFormPegawai, setShowFormPegawai] = useState<boolean>(false)
  const [formPegawai, setFormPegawai] = useState<Record<string, string>>({})
  const [savingPegawai, setSavingPegawai] = useState<boolean>(false)

  // ── Draft Evaluasi Aktif per TW ──
  const [draft, setDraft] = useState<{
    formula: 'periodik' | 'tahunan'
    predikatId: string
    simResult: SimulasiResult | null
  }>({
    formula: 'periodik',
    predikatId: '',
    simResult: null,
  })

  const [savingEval, setSavingEval] = useState<boolean>(false)
  const [finalizing, setFinalizing] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // ── Reset draft evaluasi ──
  const resetDraft = useCallback(() => {
    setDraft({
      formula: 'periodik',
      predikatId: '',
      simResult: null,
    })
  }, [])

  // ── Memuat master data sekali di awal ──
  useEffect(() => {
    getMasterData()
      .then((res) => setMaster(res.data))
      .catch(() => {})
  }, [])

  const predikatList: PredikatKinerja[] = master?.predikat_kinerja ?? []

  // ── Memuat konteks pegawai per tahun ──
  const loadContext = useCallback(
    async (pid: string, yr: number, isInitial = false) => {
      setLoadingCtx(true)
      setErrorMessage(null)
      setContext(null)
      try {
        const data = await getEvaluasiContext(pid, yr)
        setContext(data)
        if (isInitial) {
          setActiveTw(data.tw_aktif >= 4 ? 4 : 1)
        }
        resetDraft()
      } catch (err) {
        setErrorMessage(getApiErrorMessage(err, 'Gagal memuat konteks pegawai.'))
      } finally {
        setLoadingCtx(false)
      }
    },
    [resetDraft],
  )

  const selectPegawai = (pid: string) => {
    setPegawaiId(pid)
    setSearchQuery('')
    setShowFormPegawai(false)
    loadContext(pid, tahun, true)
  }

  // ── Daftar pegawai (auto-load + cari as-you-type) ──
  const loadPegawaiList = useCallback(
    async (q = '') => {
      setSearching(true)
      setErrorMessage(null)
      try {
        const res = await api.get('/pegawai', { params: { search: q, per_page: 20 }, paramsSerializer: { indexes: null } })
        setSearchResults(res.data.data?.data ?? [])
      } catch (err) {
        setErrorMessage(getApiErrorMessage(err, 'Gagal memuat daftar pegawai.'))
      } finally {
        setSearching(false)
      }
    },
    [],
  )

  useEffect(() => {
    const q = searchQuery.trim()
    const t = setTimeout(() => loadPegawaiList(q), 400)
    return () => clearTimeout(t)
  }, [searchQuery, loadPegawaiList])

  const handleResetSelection = useCallback(() => {
    setPegawaiId(null)
    setContext(null)
    setActiveTw(1)
    resetDraft()
  }, [resetDraft])

  useEffect(() => {
    loadPegawaiList()
    handleResetSelection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Simpan pegawai baru ──
  const submitPegawaiBaru = async () => {
    setSavingPegawai(true)
    setErrorMessage(null)
    try {
      const res = await api.post('/pegawai', {
        nip: formPegawai.nip,
        nama_lengkap: formPegawai.nama_lengkap,
        email: formPegawai.email,
        password: formPegawai.password || formPegawai.nip,
        pangkat_golongan_id: formPegawai.pangkat_golongan_id,
        jenjang_jabatan_id: formPegawai.jenjang_jabatan_id || undefined,
        asal_jabatan: formPegawai.asal_jabatan || 'PELAKSANA',
        pendidikan_terakhir: formPegawai.pendidikan_terakhir || undefined,
        tmt_jabatan: formPegawai.tmt_jabatan || undefined,
      })
      const p = res.data.data
      setSuccessMessage(`Pegawai "${p.nama_lengkap}" berhasil dibuat.`)
      setAddNew(false)
      setShowFormPegawai(false)
      selectPegawai(p.id)
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, 'Gagal membuat pegawai baru.'))
    } finally {
      setSavingPegawai(false)
    }
  }

  // ── Update profil pegawai (inline) ──
  const submitUpdatePegawai = async () => {
    if (!pegawaiId) return
    setSavingPegawai(true)
    setErrorMessage(null)
    try {
      await api.put(`/pegawai/${pegawaiId}`, {
        nama_lengkap: formPegawai.nama_lengkap,
        pangkat_golongan_id: formPegawai.pangkat_golongan_id,
        jenjang_jabatan_id: formPegawai.jenjang_jabatan_id || undefined,
        asal_jabatan: formPegawai.asal_jabatan,
        pendidikan_terakhir: formPegawai.pendidikan_terakhir,
        tmt_jabatan: formPegawai.tmt_jabatan,
      })
      setSuccessMessage('Profil pegawai berhasil diperbarui.')
      setShowFormPegawai(false)
      loadContext(pegawaiId, tahun)
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, 'Gagal memperbarui profil.'))
    } finally {
      setSavingPegawai(false)
    }
  }

  const fillFormPegawai = (withEmail = false) => {
    setFormPegawai({
      nip: context?.pegawai.nip ?? '',
      nama_lengkap: context?.pegawai.nama_lengkap ?? '',
      email: withEmail ? (context?.pegawai.email ?? '') : '',
      pangkat_golongan_id: context?.pegawai.pangkat_golongan_id ?? '',
      jenjang_jabatan_id: context?.pegawai.jenjang_jabatan_id ?? '',
      asal_jabatan: context?.pegawai.asal_jabatan ?? 'PELAKSANA',
      pendidikan_terakhir: context?.pegawai.pendidikan_terakhir ?? '',
      tmt_jabatan: context?.pegawai.tmt_jabatan ?? '',
    })
  }

  // ── Evaluasi existing, indexed by triwulan ──
  const evalByTw: Record<number, EvaluasiEntry> = useMemo(() => {
    const map: Record<number, EvaluasiEntry> = {}
    if (context) {
      Object.values(context.evaluasi).forEach((e) => (map[e.triwulan] = e))
    }
    return map
  }, [context])

  const isTwUnlocked = (tw: number) =>
    tw === 1 || !!evalByTw[tw - 1] || (context?.bulan_per_tw?.[tw - 1] ?? 3) === 0

  const sumPeriodik = useMemo(
    () =>
      Object.values(evalByTw)
        .filter((e) => e.triwulan < 4)
        .reduce((s, e) => s + e.angka_kredit, 0),
    [evalByTw],
  )

  const akKumulatifSaatIni = (context?.saldo_awal ?? 0) + sumPeriodik

  // ── Navigasi tab ──
  const handleSelectTw = (tw: number) => {
    if (tw > 1 && !isTwUnlocked(tw)) {
      setErrorMessage(`TW${tw} belum bisa diisi. Selesaikan TW${tw - 1} terlebih dahulu.`)
      return
    }
    setActiveTw(tw)
    setErrorMessage(null)
    setDraft({
      formula: tw === 4 ? 'tahunan' : 'periodik',
      predikatId: '',
      simResult: null,
    })
  }

  const jumlahBulanTw = (tw: number) =>
    Math.min(3, Math.max(0, context?.bulan_per_tw?.[tw] ?? 3))

  const sudahLayakSebelumTw4 = context?.sudah_layak_sebelum_tw4 ?? false

  // ── Simulasi real-time saat predikat berubah ──
  useEffect(() => {
    if (!pegawaiId || !draft.predikatId) return
    const isTw4 = activeTw === 4
    const formulaTw4 =
      isTw4 && !sudahLayakSebelumTw4 ? ('tahunan' as const) : ('periodik' as const)
    const jumlahBulan = jumlahBulanTw(activeTw)
    if (formulaTw4 === 'periodik' && jumlahBulan === 0) return
    let active = true
    const run = async () => {
      try {
        const payload = { pegawai_id: pegawaiId, predikat_id: draft.predikatId }
        const res =
          formulaTw4 === 'tahunan'
            ? await simulasiTahunan({ ...payload, tahun })
            : await simulasiPeriodic({
                ...payload,
                jumlah_bulan: jumlahBulan,
              })
        if (active) setDraft((d) => ({ ...d, simResult: res }))
      } catch (err) {
        if (active) {
          setErrorMessage(getApiErrorMessage(err, 'Gagal menjalankan simulasi kalkulasi.'))
          setDraft((d) => ({ ...d, simResult: null }))
        }
      }
    }
    run()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pegawaiId, draft.predikatId, activeTw, tahun, sudahLayakSebelumTw4])

  // ── Auto-seed predikat dari evaluasi tersimpan saat tab TW dibuka ──
  useEffect(() => {
    const saved = evalByTw[activeTw]
    if (saved && !draft.predikatId) {
      setDraft((d) => ({ ...d, predikatId: saved.predikat_id }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTw, evalByTw])

  // ── Simpan / Update evaluasi TW ──
  const handleSaveTw = async () => {
    if (!pegawaiId || !context || !draft.predikatId) return
    const existing = evalByTw[activeTw]
    const isTw4 = activeTw === 4
    const formulaPeriodik = isTw4 ? sudahLayakSebelumTw4 : true
    const jumlahBulan = formulaPeriodik ? jumlahBulanTw(activeTw) : Math.max(1, jumlahBulanTw(activeTw))
    if (formulaPeriodik && jumlahBulan === 0) {
      setErrorMessage(`TW${activeTw} tidak memiliki bulan aktif berdasarkan TMT. Tidak dapat diisi.`)
      return
    }
    setSavingEval(true)
    setErrorMessage(null)
    try {

      if (existing && !existing.is_locked) {
        await updateEvaluasi(existing.id, { predikat_id: draft.predikatId, jumlah_bulan: jumlahBulan })
        setSuccessMessage(`Predikat TW${activeTw} berhasil diperbarui.`)
      } else {
        await createEvaluasi({
          pegawai_id: pegawaiId,
          tahun,
          triwulan: activeTw,
          jumlah_bulan: jumlahBulan,
          predikat_id: draft.predikatId,
        })
        setSuccessMessage(`Evaluasi TW${activeTw} berhasil disimpan.`)
      }
      resetDraft()
      const nextTw = activeTw < 4 ? activeTw + 1 : activeTw
      await loadContext(pegawaiId, tahun)
      setActiveTw(nextTw)
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, 'Gagal menyimpan evaluasi.'))
    } finally {
      setSavingEval(false)
    }
  }

  const handleEditTw = (e: EvaluasiEntry) => {
    setDraft({
      formula: e.triwulan === 4 ? 'tahunan' : 'periodik',
      predikatId: e.predikat_id,
      simResult: null,
    })
  }

  const handleDeleteTw = async (e: EvaluasiEntry) => {
    if (e.is_locked) return
    setErrorMessage(null)
    try {
      await deleteEvaluasi(e.id)
      setSuccessMessage(`Evaluasi TW${e.triwulan} berhasil dihapus.`)
      if (pegawaiId) await loadContext(pegawaiId, tahun)
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, 'Gagal menghapus evaluasi.'))
    }
  }

  const handleLockTw = async (e: EvaluasiEntry) => {
    setErrorMessage(null)
    try {
      await lockEvaluasi(e.id)
      setSuccessMessage(`Evaluasi TW${e.triwulan} berhasil dikunci.`)
      if (pegawaiId) await loadContext(pegawaiId, tahun)
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, 'Gagal mengunci evaluasi.'))
    }
  }

  // ── Finalisasi PAK ──
  const handleFinalize = async () => {
    if (!pegawaiId || !evalByTw[4]) return
    setFinalizing(true)
    setErrorMessage(null)
    try {
      const res = await finalizePak(pegawaiId, tahun, evalByTw[4].predikat_id)
      setSuccessMessage(res.message || `PAK tahun ${tahun} berhasil difinalisasi.`)
      await loadContext(pegawaiId, tahun)
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, 'Gagal memfinalisasi PAK.'))
    } finally {
      setFinalizing(false)
    }
  }

  const isFinal = context?.penetapan_is_final ?? false
  const tw1to3Complete = [1, 2, 3].every((t) => !!evalByTw[t] || (context?.bulan_per_tw?.[t] ?? 3) === 0)

  const fmtDate = (d?: string) => {
    if (!d) return '-'
    const dt = new Date(`${d}T00:00:00`)
    if (isNaN(dt.getTime())) return d
    return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-7">
      {/* 1. Header Banner */}
      <CardHeader
        tag="Input Manual"
        tagColor={BRAND}
        regulation="PerBKN No. 3/2023 · Penetapan Kinerja Tahunan"
        title="Input Konversi Kinerja Pegawai"
        subtitle="Input penetapan predikat kinerja per triwulan (TW1–TW4), hitung Angka Kredit secara real-time, dan finalisasi Penetapan Angka Kredit (PAK) tahunan."
        actions={
          <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              value={tahun}
              onChange={(e) => {
                const yr = Number(e.target.value)
                setTahun(yr)
                if (pegawaiId) loadContext(pegawaiId, yr, true)
              }}
              className="text-sm font-bold bg-transparent text-slate-800 focus:outline-none cursor-pointer"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
                <option key={yr} value={yr}>
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* 2. Alert Feedback */}
      {errorMessage && (
        <Alert variant="error" title="Terjadi Kendala" message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}
      {successMessage && (
        <Alert variant="success" title="Berhasil" message={successMessage} onDismiss={() => setSuccessMessage(null)} />
      )}

      {/* 3. Panel Atas: Pilih / Buat Pegawai */}
      <Card className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Pilih Pegawai</h2>
            <p className="text-xs text-slate-500 mt-0.5">Cari pegawai yang sudah terdaftar, atau buat profil baru.</p>
          </div>
          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={addNew}
              onChange={(e) => {
                setAddNew(e.target.checked)
                setSearchResults([])
                setErrorMessage(null)
                const p = e.target.checked ? undefined : context?.pegawai
                if (e.target.checked) {
                  setFormPegawai({})
                } else if (p) {
                  fillFormPegawai(false)
                }
              }}
              className="h-4 w-4 rounded border-slate-300 text-[--brand] focus:ring-[--brand] cursor-pointer"
              style={{ accentColor: BRAND }}
            />
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Buat pegawai baru</span>
          </label>
        </div>

        {!addNew ? (
          <div className="space-y-3">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari NIP atau nama pegawai…"
              className="w-full sm:w-80"
            />

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">
                {searchQuery.trim() ? `Hasil untuk "${searchQuery.trim()}"` : 'Semua pegawai'} · {searchResults.length} ditemukan
              </p>
              {searchResults.length > 0 ? (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectPegawai(p.id)}
                      className="w-full text-left px-4 py-3.5 hover:bg-secondary/60 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-[--brand]" style={{ ['--brand' as any]: BRAND }}>
                          <UserRound className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{p.nama_lengkap}</p>
                          <p className="font-mono text-xs font-medium text-slate-500">
                            {p.nip} · {p.pangkat_golongan?.golongan} · {p.pangkat_golongan?.jenjang_jabatan?.nama}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-slate-300 rounded-xl py-10 text-center bg-slate-50/50">
                  <UserRound className="h-7 w-7 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-400">
                    {searching ? 'Memuat daftar pegawai…' : 'Belum ada pegawai ditemukan.'}
                  </p>
                  {!searching && <p className="text-xs text-slate-400 mt-1">Coba kata kunci lain, atau buat pegawai baru.</p>}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="NIP" value={formPegawai.nip ?? ''} onChange={(v) => setFormPegawai({ ...formPegawai, nip: v })} required />
              <Field
                label="Nama Lengkap"
                value={formPegawai.nama_lengkap ?? ''}
                onChange={(v) => setFormPegawai({ ...formPegawai, nama_lengkap: v })}
                required
              />
              <Field label="Email (Akun Login)" value={formPegawai.email ?? ''} onChange={(v) => setFormPegawai({ ...formPegawai, email: v })} required />
              <Field
                label="Password"
                value={formPegawai.password ?? ''}
                onChange={(v) => setFormPegawai({ ...formPegawai, password: v })}
                type="password"
                placeholder="Kosongkan untuk pakai NIP"
              />

              <SelectField
                label="Jenjang Jabatan"
                value={formPegawai.jenjang_jabatan_id ?? ''}
                onChange={(v) => setFormPegawai({ ...formPegawai, jenjang_jabatan_id: v, pangkat_golongan_id: '' })}
                placeholder="Pilih jenjang"
                options={(master?.jenjang_jabatan ?? []).map((j) => ({
                  value: j.id,
                  label: `${j.nama} (Koef ${Number(j.koefisien_tahunan).toFixed(1)})`,
                }))}
              />

              <SelectField
                label="Golongan Ruang"
                value={formPegawai.pangkat_golongan_id ?? ''}
                onChange={(v) => setFormPegawai({ ...formPegawai, pangkat_golongan_id: v })}
                placeholder="Pilih golongan"
                options={golonganByJenjang(formPegawai.jenjang_jabatan_id, master).map((g) => ({
                  value: g.id,
                  label: `${g.golongan_ruang} · ${g.jenjang_jabatan} (AK ${Number(g.ak_dasar).toFixed(1)})`,
                }))}
              />

              <SelectField
                label="Asal Jabatan"
                value={formPegawai.asal_jabatan ?? 'PELAKSANA'}
                onChange={(v) => setFormPegawai({ ...formPegawai, asal_jabatan: v })}
                options={ASAL_JABATAN_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />

              <Field label="Pendidikan Terakhir" value={formPegawai.pendidikan_terakhir ?? ''} onChange={(v) => setFormPegawai({ ...formPegawai, pendidikan_terakhir: v })} />
              <Field
                label="TMT Jabatan"
                value={formPegawai.tmt_jabatan ?? ''}
                onChange={(v) => setFormPegawai({ ...formPegawai, tmt_jabatan: v })}
                type="date"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button variant="primary" onClick={submitPegawaiBaru} loading={savingPegawai} icon={<UserPlus className="h-4 w-4" />}>
                Simpan &amp; lanjut input kinerja
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 4. Konten Utama (setelah pegawai dipilih) */}
      {!pegawaiId ? (
        <Card className="p-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-4">
            <ClipboardList className="h-7 w-7 text-slate-400" />
          </div>
          <p className="font-bold text-slate-600 text-sm">Belum ada pegawai dipilih</p>
          <p className="text-xs text-slate-400 mt-1.5">Pilih pegawai di atas untuk mulai input kinerja triwulanan.</p>
        </Card>
      ) : loadingCtx ? (
        <Card className="p-14 text-center">
          <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-3" style={{ color: BRAND }} />
          <p className="text-sm font-semibold text-slate-500">Memuat konteks pegawai…</p>
        </Card>
      ) : context ? (
        <>
          {/* 4a. Card Profil Pegawai */}
          <Card className="p-6">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border" style={{ backgroundColor: '#eef5f5', color: BRAND, borderColor: '#cfe3e3' }}>
                  <UserRound className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900">{context.pegawai.nama_lengkap}</p>
                  <p className="font-mono text-xs font-semibold text-slate-500 mt-0.5">{context.pegawai.nip}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="default">{context.pegawai.golongan}</Badge>
                    <Badge variant="info">
                      <GraduationCap className="h-3 w-3" /> {context.pegawai.jenjang}
                    </Badge>
                    {context.pegawai.asal_jabatan && (
                      <Badge variant="default">{context.pegawai.asal_jabatan.replace(/_/g, ' ')}</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm w-full lg:w-auto justify-between lg:justify-end">
                <div>
                  <span className="text-slate-400 font-semibold block text-xs mb-0.5">TMT Jabatan</span>
                  <span className="font-mono font-bold text-slate-800">{fmtDate(context.pegawai.tmt_jabatan)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-xs mb-0.5">Saldo Awal</span>
                  <span className="font-mono font-extrabold" style={{ color: BRAND }}>{context.saldo_awal.toFixed(3)} AK</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (showFormPegawai) {
                      setShowFormPegawai(false)
                    } else {
                      fillFormPegawai(false)
                      setShowFormPegawai(true)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  {showFormPegawai ? <X className="h-3.5 w-3.5" /> : <PencilLine className="h-3.5 w-3.5" />}
                  {showFormPegawai ? 'Tutup' : 'Edit profil'}
                </button>
              </div>
            </div>

            {/* Inline form edit profil */}
            {showFormPegawai && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field
                    label="Nama Lengkap"
                    value={formPegawai.nama_lengkap ?? ''}
                    onChange={(v) => setFormPegawai({ ...formPegawai, nama_lengkap: v })}
                  />
                  <SelectField
                    label="Jenjang Jabatan"
                    value={formPegawai.jenjang_jabatan_id ?? ''}
                    onChange={(v) => setFormPegawai({ ...formPegawai, jenjang_jabatan_id: v, pangkat_golongan_id: '' })}
                    options={(master?.jenjang_jabatan ?? []).map((j) => ({ value: j.id, label: j.nama }))}
                  />
                  <SelectField
                    label="Golongan Ruang"
                    value={formPegawai.pangkat_golongan_id ?? ''}
                    onChange={(v) => setFormPegawai({ ...formPegawai, pangkat_golongan_id: v })}
                    options={golonganByJenjang(formPegawai.jenjang_jabatan_id, master).map((g) => ({
                      value: g.id,
                      label: g.golongan_ruang,
                    }))}
                  />
                  <SelectField
                    label="Asal Jabatan"
                    value={formPegawai.asal_jabatan ?? 'PELAKSANA'}
                    onChange={(v) => setFormPegawai({ ...formPegawai, asal_jabatan: v })}
                    options={ASAL_JABATAN_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  />
                  <Field
                    label="Pendidikan Terakhir"
                    value={formPegawai.pendidikan_terakhir ?? ''}
                    onChange={(v) => setFormPegawai({ ...formPegawai, pendidikan_terakhir: v })}
                  />
                  <Field
                    label="TMT Jabatan"
                    value={formPegawai.tmt_jabatan ?? ''}
                    onChange={(v) => setFormPegawai({ ...formPegawai, tmt_jabatan: v })}
                    type="date"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-5">
                  <Button variant="ghost" onClick={() => setShowFormPegawai(false)}>
                    Batal
                  </Button>
                  <Button variant="primary" onClick={submitUpdatePegawai} loading={savingPegawai} icon={<Check className="h-4 w-4" />}>
                    Simpan perubahan
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* 4b. Tab TW1–TW4 — sekaligus jadi ringkasan bulan aktif & AK per triwulan */}
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 px-6 pt-5 pb-1">
              <Layers className="h-4 w-4" style={{ color: BRAND }} />
              <h3 className="text-sm font-bold text-slate-800">Triwulan</h3>
              <span className="text-xs text-slate-400 font-medium ml-auto">Bulan aktif dihitung otomatis dari TMT</span>
            </div>

            {/* Tab Bar — merangkap ringkasan distribusi bulan aktif */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-6 pt-3 pb-5">
              {TW_META.map((m) => {
                const bulan = context?.bulan_per_tw?.[m.tw] ?? 3
                const existing = evalByTw[m.tw]
                const unlocked = isTwUnlocked(m.tw)
                const isActive = activeTw === m.tw
                return (
                  <button
                    key={m.tw}
                    onClick={() => handleSelectTw(m.tw)}
                    className="relative flex flex-col items-center gap-1 rounded-2xl border py-3.5 px-2 text-center transition-colors cursor-pointer"
                    style={{
                      borderColor: isActive ? BRAND : m.anchor ? '#a9cfcf' : '#e2e8f0',
                      backgroundColor: isActive ? '#eef5f5' : m.anchor ? '#f2f8f8' : '#f8fafc',
                    }}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: isActive ? BRAND : unlocked ? '#334155' : '#cbd5e1' }}>
                      {m.label}
                      {existing && (
                        <CheckCircle2 className="h-3.5 w-3.5" style={{ color: existing.is_locked ? '#10b981' : '#3b82f6' }} />
                      )}
                      {!unlocked && <Lock className="h-3 w-3 text-slate-300" />}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">{m.range}</span>
                    <span className="font-mono text-xs font-bold text-slate-700 whitespace-nowrap">
                      {bulan}&nbsp;bln aktif{existing && <> · <span style={{ color: BRAND }}>{existing.angka_kredit.toFixed(3)} AK</span></>}
                    </span>
                    {m.anchor && (
                      <span
                        className="mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: BRAND, backgroundColor: '#e3efef' }}
                      >
                        Acuan tahunan
                      </span>
                    )}
                    {isActive && <span className="absolute -bottom-px left-3 right-3 h-0.5 rounded-full" style={{ backgroundColor: BRAND }} />}
                  </button>
                )
              })}
            </div>

            <div className="border-t border-slate-200" />

            {/* Konten Tab */}
            <div className="p-6">{activeTw < 4 ? <TwInputPanel /> : <Tw4FinalisasiPanel />}</div>
          </Card>
        </>
      ) : null}
    </div>
  )

  // ─── Panel Input TW1–TW3 ───────────────────────────────────────────────
  function TwInputPanel() {
    const existing = evalByTw[activeTw]
    const sim = draft.simResult
    const bulanAktif = context?.bulan_per_tw?.[activeTw] ?? 3
    const selectedPredikat = predikatList.find((p) => p.id === draft.predikatId)

    return (
      <div className="space-y-6">
        {/* Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-bold text-slate-900">Triwulan {activeTw}</span>
          {context && context.tw_aktif === activeTw && <Badge variant="default">TW Aktif</Badge>}
          {existing ? (
            existing.is_locked ? (
              <Badge variant="success" icon={<Lock className="h-3 w-3" />}>
                Terkunci
              </Badge>
            ) : (
              <Badge variant="info" icon={<Pencil className="h-3 w-3" />}>
                Sudah diisi
              </Badge>
            )
          ) : (
            <Badge variant="warning" icon={<Clock className="h-3 w-3" />}>
              Belum diisi
            </Badge>
          )}
        </div>

        {existing?.is_locked ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 space-y-3.5">
            {[['Predikat', existing.predikat], ['Jumlah Bulan Aktif', `${existing.jumlah_bulan} bln`], ['AK Triwulan', `${existing.angka_kredit.toFixed(3)} AK`]].map(
              ([k, v], i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600 text-sm">{k}</span>
                  <span className={`font-mono ${k === 'AK Triwulan' ? 'font-extrabold text-emerald-700 text-base' : 'font-bold text-slate-900 text-sm'}`}>
                    {v}
                  </span>
                </div>
              ),
            )}
          </div>
        ) : bulanAktif === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
            <LockOpen className="h-6 w-6 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-bold text-slate-600">TW{activeTw} tidak memiliki bulan aktif</p>
            <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">
              Berdasarkan TMT jabatan pegawai, masa kerja belum dimulai pada triwulan ini. Nilai AK otomatis 0.
            </p>
          </div>
        ) : (
          <>
            {/* Form Input Predikat */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">Jumlah Bulan Aktif</label>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-extrabold text-slate-900 bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl text-sm">
                    {bulanAktif} Bulan
                  </span>
                  <span className="text-xs text-slate-400">Otomatis dari TMT</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">Predikat Kinerja</label>
                <select
                  value={draft.predikatId}
                  onChange={(e) => setDraft((d) => ({ ...d, predikatId: e.target.value }))}
                  className="w-full text-sm font-bold px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 transition-shadow"
                  style={{ ['--tw-ring-color' as any]: '#bcd9d9' }}
                >
                  <option value="">– Pilih predikat –</option>
                  {predikatList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({formatPersen(p.persentase_konversi)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview realtime — Formula A, selalu ditambahkan ke akumulasi */}
            {sim && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-sky-700 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" /> Preview kalkulasi realtime
                    <span className="ml-1 rounded-full bg-sky-100 text-sky-700 px-2 py-0.5 text-[10px] font-extrabold tracking-wide">
                      Formula A · Periodik
                    </span>
                  </span>
                  <span className="font-mono font-extrabold text-lg" style={{ color: BRAND }}>+{sim.angka_kredit.toFixed(3)} AK</span>
                </div>
                {selectedPredikat && (
                  <div className="flex items-center justify-between text-xs bg-white border border-sky-100 rounded-lg px-3 py-2">
                    <span className="text-slate-500">Predikat dipakai</span>
                    <span className="font-bold text-slate-800">
                      {selectedPredikat.nama} · <span style={{ color: BRAND }}>{formatPersen(selectedPredikat.persentase_konversi)}</span>
                    </span>
                  </div>
                )}
                <p className="text-xs font-mono text-slate-600 bg-white border border-sky-100 rounded-lg p-2.5">{formatRumusRill(sim.rumus, selectedPredikat)}</p>
                <p className="text-[11px] text-slate-500">
                  Nilai TW{activeTw} ini akan <strong className="text-slate-700">ditambahkan</strong> ke AK kumulatif — bukan menggantikan triwulan lain.
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-slate-600 pt-1">
                  <span>
                    AK kumulatif s.d. TW ini: <strong className="font-mono text-slate-900">{akKumulatifSaatIni.toFixed(3)} AK</strong>
                  </span>
                  <span>
                    Target KP: <strong className="font-mono text-slate-900">{Number(sim.kebutuhan_ak_kp).toFixed(0)} AK</strong>
                  </span>
                  <span>
                    Target jenjang: <strong className="font-mono text-slate-900">{Number(sim.kebutuhan_ak_naik_jenjang).toFixed(0)} AK</strong>
                  </span>
                  <span>
                    Sisa menuju KP:{' '}
                    <strong className="font-mono text-slate-900">
                      {Math.max(0, Number(sim.kebutuhan_ak_kp) - akKumulatifSaatIni).toFixed(3)} AK
                    </strong>
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="primary"
                onClick={handleSaveTw}
                loading={savingEval}
                disabled={!draft.predikatId}
                icon={<Check className="h-4 w-4" />}
              >
                {existing ? `Perbarui evaluasi TW${activeTw}` : `Simpan evaluasi TW${activeTw}`}
              </Button>
            </div>
          </>
        )}

        {/* Baris aksi untuk data tersimpan yang belum terkunci */}
        {existing && !existing.is_locked && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-sm">
              <span className="font-bold text-slate-600">Tersimpan: </span>
              <span className="font-bold text-slate-900">{existing.predikat}</span>
              <span className="text-slate-400"> · {existing.jumlah_bulan} bln · </span>
              <span className="font-mono font-extrabold" style={{ color: BRAND }}>{existing.angka_kredit.toFixed(3)} AK</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => handleEditTw(existing)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" icon={<Trash2 className="h-3.5 w-3.5 text-error" />} onClick={() => handleDeleteTw(existing)}>
                Hapus
              </Button>
              <Button variant="primary" size="sm" icon={<Lock className="h-3.5 w-3.5" />} onClick={() => handleLockTw(existing)}>
                Kunci
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Panel TW4: Ringkasan + Finalisasi ────────────────────────────────
  function Tw4FinalisasiPanel() {
    const tw4 = evalByTw[4]
    const sim = draft.simResult
    const sudahLayak = context?.sudah_layak_sebelum_tw4 ?? false
    const akAkhir = sudahLayak
      ? (sim?.angka_kredit ?? tw4?.angka_kredit ?? 0)
      : (sim?.angka_kredit ?? 0)
    const totalAkhir = context
      ? context.saldo_awal + (sudahLayak ? sumPeriodik + akAkhir : akAkhir)
      : 0
    const targetKp = Number(context?.pegawai.kebutuhan_ak_kp ?? 50)
    const selectedPredikat = predikatList.find((p) => p.id === draft.predikatId)

    return (
      <div className="space-y-6">
        {/* Header + status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-bold text-slate-900">Triwulan 4 · Penetapan Akhir Tahun</span>
          <Badge variant="danger" icon={<Award className="h-3 w-3" />}>
            Acuan Tahunan
          </Badge>
          {isFinal && (
            <Badge variant="success" icon={<ShieldCheck className="h-3 w-3" />}>
              PAK Final
            </Badge>
          )}
        </div>

        {/* Peringatan jika TW sebelumnya belum lengkap */}
        {!tw1to3Complete && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3.5 text-sm font-semibold text-amber-800">
            <LockOpen className="h-4 w-4 text-amber-500 shrink-0" />
            Lengkapi TW1–TW3 terlebih dahulu sebelum finalisasi TW4.
          </div>
        )}

        {/* Ringkasan TW1–TW3 */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-2.5">
          <span className="text-xs font-bold text-slate-500 block mb-1">Ringkasan TW1–TW3 (subtotal periodik)</span>
          {[1, 2, 3].map((t) => (
            <div key={t} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-500">TW{t}</span>
              <span className="font-semibold text-slate-800">
                {evalByTw[t] ? `${evalByTw[t].predikat} → ${evalByTw[t].angka_kredit.toFixed(3)} AK` : '-'}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm pt-3 border-t border-slate-200">
            <span className="font-bold text-slate-700">Subtotal periodik</span>
            <span className="font-mono font-extrabold text-slate-900">{sumPeriodik.toFixed(3)} AK</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-slate-700">Saldo awal + subtotal</span>
            <span className="font-mono font-extrabold" style={{ color: BRAND }}>{(Number(context?.saldo_awal) + sumPeriodik).toFixed(3)} AK</span>
          </div>
          {!sudahLayak && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
              Subtotal periodik di atas bukan total akhir. Karena belum layak, TW4 dihitung dengan
              penyetahunan (Formula B) yang menggantikan seluruh perolehan periodik tahun ini.
            </p>
          )}
        </div>

        {/* Badge metode kalkulasi — penanda formula yang eksplisit */}
        <div className={`rounded-2xl border p-5 space-y-2 ${sudahLayak ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <Award className={`h-4 w-4 ${sudahLayak ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span className={`text-sm font-bold ${sudahLayak ? 'text-emerald-800' : 'text-amber-800'}`}>
              {sudahLayak ? 'Konversi kinerja periodik' : 'Penetapan kinerja tahunan'}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wide ${
                sudahLayak ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {sudahLayak ? 'Formula A · Periodik' : 'Formula B · Disetahunkan (TW4 Anchor)'}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {sudahLayak
              ? 'AK kumulatif sudah melewati target pada TW3. TW4 dihitung periodik seperti biasa & ditambahkan ke subtotal TW1–TW3.'
              : 'AK kumulatif belum mencapai target sampai TW3. Predikat TW4 menjadi acuan retrospektif untuk satu tahun penuh — (Total bulan aktif / 12) × % TW4 × koefisien — dan hasilnya menggantikan subtotal periodik TW1–TW3, bukan menambahnya.'}
          </p>
        </div>

        {/* Form predikat TW4 */}
        {!tw4?.is_locked && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 block">Predikat TW4 (acuan tahunan)</label>
            <select
              value={draft.predikatId}
              onChange={(e) => setDraft((d) => ({ ...d, predikatId: e.target.value }))}
              className="w-full text-sm font-bold px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 transition-shadow"
              style={{ ['--tw-ring-color' as any]: '#bcd9d9' }}
            >
              <option value="">– Pilih predikat –</option>
              {predikatList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} ({formatPersen(p.persentase_konversi)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Preview total akhir — tampilan berbeda untuk Formula A vs Formula B */}
        {(sim || tw4) && (
          sudahLayak ? (
            // ── Formula A: TW4 periodik biasa, ditambahkan ke subtotal ──────
            <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-sky-700 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" /> Preview total akhir
                </span>
                <span className="font-mono font-extrabold text-lg" style={{ color: BRAND }}>{totalAkhir.toFixed(3)} AK</span>
              </div>
              {selectedPredikat && (
                <div className="flex items-center justify-between text-xs bg-white border border-sky-100 rounded-lg px-3 py-2">
                  <span className="text-slate-500">Predikat dipakai</span>
                  <span className="font-bold text-slate-800">
                    {selectedPredikat.nama} · <span style={{ color: BRAND }}>{formatPersen(selectedPredikat.persentase_konversi)}</span>
                  </span>
                </div>
              )}
              {sim && <p className="text-xs font-mono text-slate-600 bg-white border border-sky-100 rounded-lg p-2.5">{formatRumusRill(sim.rumus, selectedPredikat)}</p>}
              <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-slate-600 pt-1">
                <span>
                  Subtotal TW1–TW3: <strong className="font-mono text-slate-900">{sumPeriodik.toFixed(3)} AK</strong>
                </span>
                <span>
                  + AK TW4 (periodik): <strong className="font-mono text-slate-900">{akAkhir.toFixed(3)} AK</strong>
                </span>
                <ThresholdBadge total={totalAkhir} targetKp={targetKp} />
              </div>
            </div>
          ) : (
            // ── Formula B: TW4 anchor, menggantikan subtotal periodik ────────
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" /> Preview total akhir
                  <span className="ml-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-extrabold tracking-wide">
                    Formula B · Disetahunkan
                  </span>
                </span>
                <span className="font-mono font-extrabold text-lg" style={{ color: BRAND }}>{totalAkhir.toFixed(3)} AK</span>
              </div>
              {selectedPredikat && (
                <div className="flex items-center justify-between text-xs bg-white border border-amber-100 rounded-lg px-3 py-2">
                  <span className="text-slate-500">Predikat acuan (TW4)</span>
                  <span className="font-bold text-slate-800">
                    {selectedPredikat.nama} · <span style={{ color: BRAND }}>{formatPersen(selectedPredikat.persentase_konversi)}</span>
                  </span>
                </div>
              )}
              {sim && <p className="text-xs font-mono text-slate-600 bg-white border border-amber-100 rounded-lg p-2.5">{formatRumusRill(sim.rumus, selectedPredikat)}</p>}
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white border border-amber-100 px-3.5 py-2.5">
                <span className="text-xs font-semibold text-slate-400 line-through decoration-slate-300">
                  Subtotal periodik TW1–TW3: {sumPeriodik.toFixed(3)} AK <span className="not-italic">(diabaikan)</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white border border-amber-200 px-3.5 py-2.5">
                <span className="text-xs font-bold text-slate-700">AK tahunan (disetahunkan, dipakai)</span>
                <span className="font-mono font-extrabold text-slate-900">{akAkhir.toFixed(3)} AK</span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-slate-600 pt-1">
                {sim?.predikat_anchor && (
                  <span>
                    Predikat acuan TW4 (sistem): <strong className="font-mono text-slate-900">{sim.predikat_anchor}</strong>
                  </span>
                )}
                {sim?.total_bulan_aktif && (
                  <span>
                    Total bulan aktif: <strong className="font-mono text-slate-900">{sim.total_bulan_aktif} bln</strong>
                  </span>
                )}
                <ThresholdBadge total={totalAkhir} targetKp={targetKp} />
              </div>
            </div>
          )
        )}

        {/* Aksi */}
        <div className="flex flex-wrap gap-2.5 justify-end items-center pt-4 border-t border-slate-100">
          {(!tw4 || !tw4.is_locked) && (
            <Button
              variant="primary"
              onClick={handleSaveTw}
              loading={savingEval}
              disabled={!draft.predikatId}
              icon={<Check className="h-4 w-4" />}
            >
              {tw4 ? 'Perbarui TW4' : 'Simpan TW4'}
            </Button>
          )}
          {tw4 && !tw4.is_locked && (
            <>
              <Button variant="secondary" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => handleEditTw(tw4)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" icon={<Trash2 className="h-3.5 w-3.5 text-error" />} onClick={() => handleDeleteTw(tw4)}>
                Hapus
              </Button>
              <Button variant="primary" size="sm" icon={<Lock className="h-3.5 w-3.5" />} onClick={() => handleLockTw(tw4)}>
                Kunci TW4
              </Button>
            </>
          )}
          <Button
            variant="primary"
            onClick={handleFinalize}
            loading={finalizing}
            disabled={!tw4 || isFinal || !tw1to3Complete}
            icon={!finalizing ? <ShieldCheck className="h-4 w-4" /> : undefined}
          >
            {isFinal ? 'PAK sudah final' : !tw4 ? 'Isi TW4 untuk finalisasi' : 'Finalisasi & tetapkan PAK'}
          </Button>
        </div>
      </div>
    )
  }
}

// ─── Komponen Field (text/input) ─────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  type?: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-600 block">
        {label} {required && <span style={{ color: BRAND }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-shadow"
        style={{ ['--tw-ring-color' as any]: '#bcd9d9' }}
      />
    </div>
  )
}

// ─── Komponen SelectField ────────────────────────────────────────────────
function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-600 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 transition-shadow"
        style={{ ['--tw-ring-color' as any]: '#bcd9d9' }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ─── Badge threshold kelayakan kecil ─────────────────────────────────────
function ThresholdBadge({ total, targetKp }: { total: number; targetKp: number }) {
  const kurang = Math.max(0, Number(targetKp) - total)
  if (total >= Number(targetKp) * 2) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs border bg-blue-50 text-blue-700 border-blue-200">
        <GraduationCap className="h-3.5 w-3.5" /> Layak jenjang
      </span>
    )
  }
  if (total >= Number(targetKp)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs border bg-emerald-50 text-emerald-700 border-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" /> Layak pangkat
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs border bg-amber-50 text-amber-800 border-amber-200">
      <Clock className="h-3.5 w-3.5" /> Belum cukup (kurang {kurang.toFixed(3)} AK)
    </span>
  )
}

// ─── Filter golongan berdasarkan jenjang yang dipilih ────────────────────
function golonganByJenjang(jenjangId: string | undefined, master: MasterDataResponse | null): AkDasar[] {
  if (!master) return []
  if (!jenjangId) return master.ak_dasar
  const jenjang = master.jenjang_jabatan.find((j) => j.id === jenjangId)
  if (!jenjang) return master.ak_dasar
  return master.ak_dasar.filter((a) => a.jenjang_jabatan === jenjang.nama)
}
