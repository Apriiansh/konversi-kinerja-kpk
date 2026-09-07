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
  { tw: 1, label: 'TW 1', range: 'Jan - Mar' },
  { tw: 2, label: 'TW 2', range: 'Apr - Jun' },
  { tw: 3, label: 'TW 3', range: 'Jul - Sep' },
  { tw: 4, label: 'TW 4', range: 'Okt - Des', anchor: true },
]

const ASAL_JABATAN_OPTIONS = [
  { value: 'JABATAN_FUNGSIONAL', label: 'Jabatan Fungsional' },
  { value: 'PELAKSANA', label: 'Pelaksana' },
  { value: 'PENGAWAS', label: 'Pengawas' },
  { value: 'ADMINISTRATOR', label: 'Administrator' },
  { value: 'PENGANGKATAN_PERTAMA', label: 'Pengangkatan Pertama' },
]

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
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <CardHeader
        tag="Input Manual"
        tagColor="#ba191d"
        regulation="PerBKN No. 3/2023 · Penetapan Kinerja Tahunan"
        title="Input Konversi Kinerja Pegawai"
        subtitle="Input penetapan predikat kinerja per triwulan (TW1–TW4), hitung Angka Kredit secara real-time, dan finalisasi Penetapan Angka Kredit (PAK) tahunan."
        actions={
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={tahun}
              onChange={(e) => {
                const yr = Number(e.target.value)
                setTahun(yr)
                if (pegawaiId) loadContext(pegawaiId, yr, true)
              }}
              className="text-xs font-extrabold bg-transparent text-gray-800 focus:outline-none cursor-pointer"
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
        <Alert variant="error" title="Terjadi Kendala:" message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}
      {successMessage && (
        <Alert variant="success" title="Berhasil!" message={successMessage} onDismiss={() => setSuccessMessage(null)} />
      )}

      {/* 3. Panel Atas: Pilih / Buat Pegawai */}
      <Card className="p-5 space-y-4">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
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
            className="h-4 w-4 rounded border-gray-300 text-[#ba191d] focus:ring-[#ba191d] cursor-pointer"
          />
          <span className="text-xs font-extrabold text-gray-900">Buat Pegawai Baru</span>
          <span className="text-[11px] font-medium text-gray-500">Tandai untuk membuat akun & profil pegawai baru</span>
        </label>

        {!addNew ? (
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari NIP atau nama pegawai... (ketik langsung, otomatis terfilter)"
              className="w-full sm:w-72"
            />

            <div className="w-full">
              <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wide mb-1.5">
                Daftar Pegawai {searchQuery.trim() ? `· Hasil untuk "${searchQuery.trim()}"` : ''} ({searchResults.length})
              </p>
              {searchResults.length > 0 ? (
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-60 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectPegawai(p.id)}
                      className="w-full text-left px-4 py-3 hover:bg-red-50/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-gray-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-extrabold text-gray-900 text-xs truncate">{p.nama_lengkap}</p>
                          <p className="font-mono text-[11px] font-bold text-gray-500">
                            {p.nip} · {p.pangkat_golongan?.golongan} · {p.pangkat_golongan?.jenjang_jabatan?.nama}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-gray-300 rounded-xl py-6 text-center text-xs font-semibold text-gray-400">
                  {searching ? 'Memuat daftar pegawai...' : 'Belum ada pegawai ditemukan. Impor data atau buat pegawai baru.'}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <Field label="NIP" value={formPegawai.nip ?? ''} onChange={(v) => setFormPegawai({ ...formPegawai, nip: v })} required />
            <Field
              label="Nama Lengkap"
              value={formPegawai.nama_lengkap ?? ''}
              onChange={(v) => setFormPegawai({ ...formPegawai, nama_lengkap: v })}
              required
            />
            <Field label="Email (Akun Login)" value={formPegawai.email ?? ''} onChange={(v) => setFormPegawai({ ...formPegawai, email: v })} required />
            <Field
              label="Password (Default = NIP)"
              value={formPegawai.password ?? ''}
              onChange={(v) => setFormPegawai({ ...formPegawai, password: v })}
              type="password"
              placeholder="Minimal 8 karakter"
            />

            <SelectField
              label="Jenjang Jabatan"
              value={formPegawai.jenjang_jabatan_id ?? ''}
              onChange={(v) => setFormPegawai({ ...formPegawai, jenjang_jabatan_id: v, pangkat_golongan_id: '' })}
              placeholder="– Pilih Jenjang –"
              options={(master?.jenjang_jabatan ?? []).map((j) => ({
                value: j.id,
                label: `${j.nama} (Koef: ${Number(j.koefisien_tahunan).toFixed(1)})`,
              }))}
            />

            <SelectField
              label="Golongan Ruang"
              value={formPegawai.pangkat_golongan_id ?? ''}
              onChange={(v) => setFormPegawai({ ...formPegawai, pangkat_golongan_id: v })}
              placeholder="– Pilih Golongan –"
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
        )}

        {addNew && (
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <Button variant="primary" onClick={submitPegawaiBaru} loading={savingPegawai} icon={<UserPlus className="h-4 w-4" />}>
              Simpan & Lanjut Input Kinerja
            </Button>
          </div>
        )}
      </Card>

      {/* 4. Konten Utama (setelah pegawai dipilih) */}
      {!pegawaiId ? (
        <Card className="p-10 text-center text-gray-400">
          <ClipboardList className="h-10 w-10 mx-auto text-gray-300 mb-2" />
          <p className="font-extrabold text-gray-500">Belum ada pegawai dipilih.</p>
          <p className="text-[11px] mt-0.5">Pilih pegawai di atas untuk mulai input kinerja triwulanan.</p>
        </Card>
      ) : loadingCtx ? (
        <Card className="p-10 text-center text-gray-400">
          <RefreshCw className="h-6 w-6 mx-auto animate-spin text-[#ba191d] mb-2" />
          <p className="font-bold text-gray-600">Memuat konteks pegawai...</p>
        </Card>
      ) : context ? (
        <>
          {/* 4a. Card Profil Pegawai */}
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#ba191d] border border-red-100">
                  <UserRound className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-gray-900">{context.pegawai.nama_lengkap}</p>
                  <p className="font-mono text-[11px] font-bold text-gray-500">{context.pegawai.nip}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
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

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="text-gray-400 font-medium block text-[10px] uppercase">TMT Jabatan</span>
                  <span className="font-mono font-bold text-gray-900">{fmtDate(context.pegawai.tmt_jabatan)}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block text-[10px] uppercase">Saldo Awal (Modal)</span>
                  <span className="font-mono font-black text-[#ba191d]">{context.saldo_awal.toFixed(2)} AK</span>
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  <PencilLine className="h-3.5 w-3.5" /> {showFormPegawai ? 'Tutup Edit' : 'Edit Profil'}
                </button>
              </div>
            </div>

            {/* Inline form edit profil */}
            {showFormPegawai && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
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
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="ghost" onClick={() => setShowFormPegawai(false)}>
                    Batal
                  </Button>
                  <Button variant="primary" onClick={submitUpdatePegawai} loading={savingPegawai} icon={<Check className="h-4 w-4" />}>
                    Simpan Perubahan
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* 4b. Ringkasan Distribusi Bulan Aktif */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Layers className="h-4 w-4 text-[#ba191d]" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                Distribusi Bulan Aktif per Triwulan
              </h3>
              <span className="text-[10px] text-gray-400 font-medium ml-auto">
                Dihitung otomatis dari TMT
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TW_META.map((m) => {
                const bulan = context?.bulan_per_tw?.[m.tw] ?? 3
                const existing = evalByTw[m.tw]
                return (
                  <div
                    key={m.tw}
                    className={`p-3 rounded-xl border text-center ${
                      m.anchor ? 'border-[#ba191d]/60 bg-red-50/30' : 'border-gray-200 bg-gray-50/60'
                    }`}
                  >
                    <span className={`text-[10px] font-extrabold uppercase block ${m.anchor ? 'text-[#ba191d]' : 'text-gray-400'}`}>
                      {m.label}
                    </span>
                    <span className="font-mono font-black text-gray-900 text-lg block">{bulan}</span>
                    <span className="text-[9px] text-gray-400 block">
                      bulan aktif {existing && `· ${existing.angka_kredit.toFixed(2)} AK`}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* 4c. Tab TW1–TW4 */}
          <Card className="overflow-hidden">
            {/* Tab Bar */}
            <div className="grid grid-cols-4 border-b border-gray-200">
              {TW_META.map((m) => {
                const existing = evalByTw[m.tw]
                const unlocked = isTwUnlocked(m.tw)
                const isActive = activeTw === m.tw
                return (
                  <button
                    key={m.tw}
                    onClick={() => handleSelectTw(m.tw)}
                    className={`relative flex flex-col items-center gap-1 py-3.5 text-xs font-extrabold transition-colors cursor-pointer ${
                      isActive ? 'text-[#ba191d] bg-red-50/40' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {m.label}
                      {existing && (
                        <CheckCircle2 className={`h-3.5 w-3.5 ${existing.is_locked ? 'text-emerald-500' : 'text-blue-500'}`} />
                      )}
                      {!unlocked && <Lock className="h-3 w-3 text-gray-300" />}
                    </span>
                    <span className="text-[9px] font-medium text-gray-400">{m.range}</span>
                    {m.anchor && (
                      <span className="mt-0.5 text-[8px] font-black text-[#ba191d] bg-red-100 px-1.5 py-px rounded">
                        ACUAN TAHUNAN
                      </span>
                    )}
                    {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ba191d]" />}
                  </button>
                )
              })}
            </div>

            {/* Konten Tab */}
            <div className="p-5">{activeTw < 4 ? <TwInputPanel /> : <Tw4FinalisasiPanel />}</div>
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

    return (
      <div className="space-y-5">
        {/* Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-extrabold text-gray-900">Triwulan {activeTw}</span>
          {context && context.tw_aktif === activeTw && <Badge variant="default">TW Aktif</Badge>}
          {existing ? (
            existing.is_locked ? (
              <Badge variant="success" icon={<Lock className="h-3 w-3" />}>
                Terkunci
              </Badge>
            ) : (
              <Badge variant="info" icon={<Pencil className="h-3 w-3" />}>
                Sudah Diisi
              </Badge>
            )
          ) : (
            <Badge variant="warning" icon={<Clock className="h-3 w-3" />}>
              Belum Diisi
            </Badge>
          )}
        </div>

        {existing?.is_locked ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
            {(Object.keys(existing) as Array<keyof EvaluasiEntry>).length > 0 &&
              [['Predikat', existing.predikat], ['Jumlah Bulan Aktif', `${existing.jumlah_bulan} bln`], ['AK Triwulan', `${existing.angka_kredit.toFixed(2)} AK`]].map(
                ([k, v], i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="font-extrabold text-gray-800 text-xs">{k}</span>
                    <span className={`${k === 'AK Triwulan' ? 'font-mono font-black text-[#ba191d] text-sm' : 'font-bold text-gray-900'} font-mono`}>
                      {v}
                    </span>
                  </div>
                ),
              )}
          </div>
        ) : bulanAktif === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-5 text-center">
            <LockOpen className="h-5 w-5 mx-auto text-gray-400 mb-1.5" />
            <p className="text-xs font-extrabold text-gray-600">TW{activeTw} tidak memiliki bulan aktif</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Berdasarkan TMT {fmtDate(context?.pegawai.tmt_jabatan)}, jabatan belum berlaku di triwulan ini.
              Lewati dan lanjut ke TW berikutnya.
            </p>
          </div>
        ) : (
          <>
            {/* Form input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-600 block">Predikat Kinerja</label>
              <select
                value={draft.predikatId}
                onChange={(e) => setDraft((d) => ({ ...d, predikatId: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-[#ba191d]"
              >
                <option value="">– Pilih Predikat –</option>
                {predikatList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} ({(Number(p.persentase_konversi) * 100).toFixed(0)}%)
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400">
                Bulan aktif TW{activeTw} = <strong className="font-mono">{bulanAktif} bulan</strong> (otomatis dari TMT)
              </p>
            </div>

            {/* Preview kalkulasi real-time */}
            {sim && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Preview Kalkulasi Realtime
                  </span>
                  <span className="font-mono font-black text-[#ba191d] text-base">{sim.angka_kredit.toFixed(2)} AK</span>
                </div>
                <p className="text-[11px] font-mono text-gray-600 bg-white border border-blue-100 rounded-lg p-2">{sim.rumus}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-gray-600">
                  <span>
                    AK Kumulatif s.d. TW ini: <strong className="font-mono text-gray-900">{akKumulatifSaatIni.toFixed(2)} AK</strong>
                  </span>
                  <span>
                    Target KP: <strong className="font-mono text-gray-900">{Number(sim.kebutuhan_ak_kp).toFixed(0)} AK</strong>
                  </span>
                  <span>
                    Target Jenjang: <strong className="font-mono text-gray-900">{Number(sim.kebutuhan_ak_naik_jenjang).toFixed(0)} AK</strong>
                  </span>
                  <span>
                    Sisa menuju KP:{' '}
                    <strong className="font-mono text-gray-900">
                      {Math.max(0, Number(sim.kebutuhan_ak_kp) - akKumulatifSaatIni).toFixed(2)} AK
                    </strong>
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="primary"
                onClick={handleSaveTw}
                loading={savingEval}
                disabled={!draft.predikatId}
                icon={<Check className="h-4 w-4" />}
              >
                {existing ? `Perbarui Evaluasi TW${activeTw}` : `Simpan Evaluasi TW${activeTw}`}
              </Button>
            </div>
          </>
        )}

        {/* Baris aksi untuk data tersimpan yang belum terkunci */}
        {existing && !existing.is_locked && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
            <div className="text-xs">
              <span className="font-extrabold text-gray-700">Tersimpan: </span>
              <span className="font-bold text-gray-900">{existing.predikat}</span>
              <span className="text-gray-400"> · {existing.jumlah_bulan} bln · </span>
              <span className="font-mono font-black text-[#ba191d]">{existing.angka_kredit.toFixed(2)} AK</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" icon={<Pencil className="h-3 w-3" />} onClick={() => handleEditTw(existing)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" icon={<Trash2 className="h-3 w-3 text-red-500" />} onClick={() => handleDeleteTw(existing)}>
                Hapus
              </Button>
              <Button variant="primary" size="sm" icon={<Lock className="h-3 w-3" />} onClick={() => handleLockTw(existing)}>
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

    return (
      <div className="space-y-5">
        {/* Header + status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-extrabold text-gray-900">Triwulan 4 · Penetapan Akhir Tahun</span>
          <Badge variant="danger" icon={<Award className="h-3 w-3" />}>
            Acuan Tahunan
          </Badge>
          {isFinal && (
            <Badge variant="success" icon={<ShieldCheck className="h-3 w-3" />}>
              PAK FINAL
            </Badge>
          )}
        </div>

        {/* Peringatan jika TW sebelumnya belum lengkap */}
        {!tw1to3Complete && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3 text-xs font-bold text-amber-800">
            <LockOpen className="h-4 w-4 text-amber-500 shrink-0" />
            Lengkapi TW1 – TW3 terlebih dahulu sebelum finalisasi TW4.
          </div>
        )}

        {/* Ringkasan TW1–TW3 */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 block">
            Ringkasan TW1 – TW3 (Subtotal Periodik)
          </span>
          {[1, 2, 3].map((t) => (
            <div key={t} className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-600">TW{t}</span>
              <span className="font-semibold text-gray-800">
                {evalByTw[t] ? `${evalByTw[t].predikat} → ${evalByTw[t].angka_kredit.toFixed(2)} AK` : '-'}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200">
            <span className="font-extrabold text-gray-700">Subtotal Periodik</span>
            <span className="font-mono font-black text-gray-900">{sumPeriodik.toFixed(2)} AK</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-gray-700">Saldo Awal + Subtotal</span>
            <span className="font-mono font-black text-[#ba191d]">{(Number(context?.saldo_awal) + sumPeriodik).toFixed(2)} AK</span>
          </div>
          {!sudahLayak && (
            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Subtotal periodik di atas BUKAN total akhir. Karena belum layak, TW4 dihitung dengan
              penyetahunan (Formula B) yang menggantikan seluruh perolehan periodik tahun ini.
            </p>
          )}
        </div>

        {/* Badge metode kalkulasi */}
        <div className={`rounded-xl border p-4 space-y-2 ${sudahLayak ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
          <div className="flex items-center gap-2">
            <Award className={`h-4 w-4 ${sudahLayak ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span className={`text-xs font-extrabold ${sudahLayak ? 'text-emerald-800' : 'text-amber-800'}`}>
              {sudahLayak ? 'Konversi Kinerja Periodik' : 'Penetapan Kinerja Tahunan / Disetahunkan dalam TW4)'}
            </span>
          </div>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            {sudahLayak
              ? 'AK Kumulatif sudah melewati target pada TW3. TW4 dihitung periodik & diakumulasi langsung tanpa normalisasi ulang.'
              : 'AK Kumulatif belum mencapai target. Predikat TW4 menjadi acuan retrospektif: (Total Bulan Aktif / 12) × % TW4 × Koefisien.'}
          </p>
        </div>

        {/* Form predikat TW4 */}
        {!tw4?.is_locked && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-600 block">Predikat TW4 (Acuan Tahunan)</label>
            <select
              value={draft.predikatId}
              onChange={(e) => setDraft((d) => ({ ...d, predikatId: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-[#ba191d]"
            >
              <option value="">– Pilih Predikat –</option>
              {predikatList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} ({(Number(p.persentase_konversi) * 100).toFixed(0)}%)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Preview total akhir */}
        {(sim || tw4) && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Preview Total Akhir
              </span>
              <span className="font-mono font-black text-[#ba191d] text-base">{totalAkhir.toFixed(2)} AK</span>
            </div>
            {sim && <p className="text-[11px] font-mono text-gray-600 bg-white border border-blue-100 rounded-lg p-2">{sim.rumus}</p>}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-gray-600">
              <span>
                {sudahLayak ? 'AK TW4 (Periodik)' : 'AK Tahunan (Disetahunkan)'}:{' '}
                <strong className="font-mono text-gray-900">{akAkhir.toFixed(2)} AK</strong>
              </span>
              {sim?.predikat_anchor && (
                <span>
                  Predikat Acuan TW4: <strong className="font-mono text-gray-900">{sim.predikat_anchor}</strong>
                </span>
              )}
              {sim?.total_bulan_aktif && (
                <span>
                  Total Bulan Aktif: <strong className="font-mono text-gray-900">{sim.total_bulan_aktif} bln</strong>
                </span>
              )}
              <ThresholdBadge total={totalAkhir} targetKp={targetKp} />
            </div>
          </div>
        )}

        {/* Aksi */}
        <div className="flex flex-wrap gap-2 justify-end items-center pt-2 border-t border-gray-100">
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
              <Button variant="secondary" size="sm" icon={<Pencil className="h-3 w-3" />} onClick={() => handleEditTw(tw4)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" icon={<Trash2 className="h-3 w-3 text-red-500" />} onClick={() => handleDeleteTw(tw4)}>
                Hapus
              </Button>
              <Button variant="primary" size="sm" icon={<Lock className="h-3 w-3" />} onClick={() => handleLockTw(tw4)}>
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
            {isFinal ? 'PAK Sudah Final' : !tw4 ? 'Isi TW4 untuk Finalisasi' : 'Finalisasi & Tetapkan PAK'}
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
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-gray-600 block">
        {label} {required && <span className="text-[#ba191d]">*</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-[#ba191d] focus:ring-1 focus:ring-[#ba191d]"
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
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-gray-600 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-[#ba191d]"
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
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-extrabold text-[10px] border bg-blue-50 text-blue-700 border-blue-200">
        <GraduationCap className="h-3 w-3" /> LAYAK JENJANG
      </span>
    )
  }
  if (total >= Number(targetKp)) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-extrabold text-[10px] border bg-emerald-50 text-emerald-700 border-emerald-200">
        <CheckCircle2 className="h-3 w-3" /> LAYAK PANGKAT
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-extrabold text-[10px] border bg-amber-50 text-amber-800 border-amber-200">
      <Clock className="h-3 w-3" /> BELUM CUKUP (kurang {kurang.toFixed(2)} AK)
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
