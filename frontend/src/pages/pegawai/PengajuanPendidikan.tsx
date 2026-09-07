import { useEffect, useRef, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useAuth } from '../../context/useAuth'
import { getPengajuanList, submitPengajuan, getStorageFileUrl, getKampusList, getProdiList, type KampusItem, type ProdiItem } from '../../api/pengajuan'
import type { PengajuanPendidikanItem } from '../../types'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

function statusBadge(status: string) {
  switch (status) {
    case 'DISETUJUI':
      return { label: 'Disetujui (+25% AK)', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    case 'DITOLAK_ADMIN':
      return { label: 'Ditolak Verifikator', cls: 'bg-red-50 text-red-700 border-red-200' }
    case 'DITOLAK_SYARAT':
      return { label: 'Gagal Syarat Sistem', cls: 'bg-orange-50 text-orange-700 border-orange-200' }
    case 'DIAJUKAN':
    default:
      return { label: 'Menunggu Verifikasi', cls: 'bg-red-50 text-red-700 border-red-200' }
  }
}

export default function PengajuanPendidikan() {
  const { user } = useAuth()

  // form state
  const [jenjang, setJenjang] = useState<'D3' | 'S1' | 'S2' | 'S3'>('S2')
  const [programStudi, setProgramStudi] = useState('')
  const [jurusan, setJurusan] = useState('')
  const [institusi, setInstitusi] = useState('')
  const [tahunLulus, setTahunLulus] = useState(String(new Date().getFullYear()))
  // kampus searchable dari mytable.name
  const [kampusOptions, setKampusOptions] = useState<KampusItem[]>([])
  const [showKampusDrop, setShowKampusDrop] = useState(false)
  const [loadingKampus, setLoadingKampus] = useState(false)
  const kampusRef = useRef<HTMLDivElement>(null)
  const kampusDebounce = useRef<number | null>(null)
  // prodi searchable dari myprodi.nm_prodi
  const [prodiOptions, setProdiOptions] = useState<ProdiItem[]>([])
  const [showProdiDrop, setShowProdiDrop] = useState(false)
  const [loadingProdi, setLoadingProdi] = useState(false)
  const prodiRef = useRef<HTMLDivElement>(null)
  const prodiDebounce = useRef<number | null>(null)
  const [fileIjazah, setFileIjazah] = useState<File | null>(null)
  const [fileBkn, setFileBkn] = useState<File | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // list riwayat
  const [items, setItems] = useState<PengajuanPendidikanItem[]>([])
  const [loadingList, setLoadingList] = useState(true)

  const fetchList = async () => {
    setLoadingList(true)
    try {
      const res = await getPengajuanList({ per_page: 20 })
      setItems(res.data)
    } catch (e: any) {
      // diamkan, tampilkan kosong
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  // click outside dropdowns
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (kampusRef.current && !kampusRef.current.contains(e.target as Node)) setShowKampusDrop(false)
      if (prodiRef.current && !prodiRef.current.contains(e.target as Node)) setShowProdiDrop(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const fetchKampus = (q: string) => {
    if (kampusDebounce.current) window.clearTimeout(kampusDebounce.current)
    kampusDebounce.current = window.setTimeout(async () => {
      setLoadingKampus(true)
      try {
        const data = await getKampusList(q, 10)
        setKampusOptions(data)
      } catch {}
      finally { setLoadingKampus(false) }
    }, 300)
  }
  const fetchProdi = (q: string) => {
    if (prodiDebounce.current) window.clearTimeout(prodiDebounce.current)
    prodiDebounce.current = window.setTimeout(async () => {
      setLoadingProdi(true)
      try {
        const data = await getProdiList(q, jenjang, 10)
        setProdiOptions(data)
      } catch {}
      finally { setLoadingProdi(false) }
    }, 300)
  }

  const validateFiles = (): string | null => {
    const max = 5 * 1024 * 1024
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!fileIjazah) return 'File ijazah wajib diunggah.'
    if (!fileBkn) return 'File bukti BKN wajib diunggah.'
    for (const f of [fileIjazah, fileBkn]) {
      if (f.size > max) return `File ${f.name} melebihi 5MB.`
      if (!allowed.includes(f.type) && !f.name.toLowerCase().endsWith('.pdf')) {
        return `File ${f.name} harus PDF/JPG/PNG.`
      }
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Guard klien — server tetap jadi sumber kebenaran (422 jika bypass inspect)
    if (hasPending) {
      setErrorMsg('Pengajuan Anda masih dalam proses verifikasi. Tidak dapat mengajukan baru sebelum status selesai.')
      return
    }
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!programStudi.trim() || !jurusan.trim() || !institusi.trim()) {
      setErrorMsg('Program studi, jurusan, dan institusi wajib diisi.')
      return
    }
    const v = validateFiles()
    if (v) {
      setErrorMsg(v)
      return
    }
    const th = Number(tahunLulus)
    if (Number.isNaN(th) || th < 1980 || th > new Date().getFullYear() + 1) {
      setErrorMsg('Tahun lulus tidak valid.')
      return
    }

    const fd = new FormData()
    fd.append('jenjang_pendidikan', jenjang)
    fd.append('program_studi', programStudi.trim())
    fd.append('jurusan', jurusan.trim())
    fd.append('nama_institusi', institusi.trim())
    fd.append('tahun_lulus', String(th))
    if (fileIjazah) fd.append('file_ijazah', fileIjazah)
    if (fileBkn) fd.append('file_bukti_bkn', fileBkn)

    setSubmitting(true)
    try {
      const res = await submitPengajuan(fd)
      setSuccessMsg(res.message || 'Pengajuan berhasil dikirim. Menunggu verifikasi admin.')
      // reset file inputs
      setFileIjazah(null)
      setFileBkn(null)
      // reset text fields optional: keep jenjang
      fetchList()
      // clear file input DOM
      const ij = document.getElementById('file_ijazah') as HTMLInputElement | null
      const bk = document.getElementById('file_bukti_bkn') as HTMLInputElement | null
      if (ij) ij.value = ''
      if (bk) bk.value = ''
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.errors
      if (typeof msg === 'object') {
        const first = Object.values(msg).flat().join(' ')
        setErrorMsg(first || 'Gagal mengirim pengajuan.')
      } else {
        setErrorMsg(msg || 'Gagal mengirim pengajuan. Periksa kembali isian.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const hasPending = items.some((i) => i.status === 'DIAJUKAN')
  const pendingItem = items.find((i) => i.status === 'DIAJUKAN') ?? null

  const nama = user?.pegawai?.nama_lengkap ?? user?.name ?? 'Pegawai KPK'
  const nip = user?.pegawai?.nip ?? '-'
  const pendidikan = user?.pegawai?.pendidikan_terakhir ?? '-'

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 pb-12">
      {/* 1. Header Page */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-[#c62828]" />
            <span>Role Pegawai</span>
            <span>•</span>
            <span className="text-[#c62828]">Pengajuan Pendidikan</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Pengajuan Pendidikan Baru</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Ajukan ijazah jenjang lebih tinggi. Guna mendapatkan <strong>bonus +25% Angka Kredit</strong> untuk kenaikan pangkat. Pastikan berkas asli valid, karena admin akan memverifikasi keaslian dokumen.
          </p>
        </div>
      </motion.div>

      {/* 2. Identitas Strip */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-[#c62828] shrink-0 text-xl font-black">
              {nama.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">{nama}</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 font-mono">NIP. {nip}</span>
                <span className="rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">Pendidikan: {pendidikan}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Pastikan jenjang yang diajukan lebih tinggi dari pendidikan terakhir. Maks file 5MB (PDF/JPG/PNG).</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6 text-xs">
            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-center">
              <p className="text-[12px] text-emerald-700 font-medium">Bonus AK Yang Akan diterima</p>
              <p className="text-sm font-extrabold text-emerald-700">+25%</p>
            </div>
            <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl text-center">
              <p className="text-[12px] text-slate-500 font-medium">Format File Yang Diterima</p>
              <p className="text-[12px] font-bold text-slate-700">PDF/JPG/PNG</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Alerts */}
      {!user?.pegawai && (
        <motion.div variants={itemVariants} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 flex items-start gap-3">
          <i className="fa-solid fa-triangle-exclamation text-amber-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-900">Perhatian: Akun Tidak Terhubung ke Profil Pegawai</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Akun Anda saat ini (<strong>{user?.email}</strong> · Role: {user?.role}) belum terhubung dengan data pegawai. 
              Formulir pengajuan kenaikan pendidikan hanya dapat dikirim oleh akun Pegawai (misal: login sebagai <code className="font-mono bg-amber-100 px-1 py-0.5 rounded font-bold text-amber-900">gita.savitri@kpk.go.id</code> atau <code className="font-mono bg-amber-100 px-1 py-0.5 rounded font-bold text-amber-900">pegawai@kpk.go.id</code>).
            </p>
          </div>
        </motion.div>
      )}
      {successMsg && (
        <motion.div variants={itemVariants} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3">
          <i className="fa-solid fa-circle-check text-emerald-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-emerald-800">Berhasil!</p>
            <p className="text-xs text-emerald-700">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 text-xs font-bold underline">Tutup</button>
        </motion.div>
      )}
      {errorMsg && (
        <motion.div variants={itemVariants} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
          <i className="fa-solid fa-triangle-exclamation text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-red-800">Gagal mengirim</p>
            <p className="text-xs text-red-700">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-700 text-xs font-bold underline">Tutup</button>
        </motion.div>
      )}

      {/* 3. Form + Info Kartu */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          {/* Cool locked overlay — bukan sekadar disabled */}
          {hasPending && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center">
              {/* blur backdrop */}
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[6px]" />
              {/* decorative gradient */}
              <div className="absolute -top-24 left-1/2 h-48 w-[120%] -translate-x-1/2 bg-gradient-to-r from-red-300 via-red-100 to-red-700 opacity-90 blur-3xl" />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="relative w-full max-w-md rounded-2xl border border-red-200 bg-gradient-to-br from-white to-red-50/60 p-6 shadow-xl"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 border border-red-200 text-red-700 shadow-inner">
                  <i className="fa-solid fa-lock text-xl" />
                </div>
                <h3 className="mt-4 text-sm font-extrabold text-slate-900">Pengajuan Terkunci</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Anda telah mengajukan pengajuan pendidikan  dengan status <br/> <span className="font-bold text-red-700">Menunggu Verifikasi</span> <br /> Form dikunci sampai verifikator menyelesaikan proses.
                </p>
                {pendingItem && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-white p-3 text-left">
                    <div className="flex items-center justify-between">
                      
                      <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-black text-[#ba191d]">{pendingItem.jenjang_pendidikan}</span>
                      <span className="text-[11px] font-mono font-bold text-slate-500">{pendingItem.tahun_lulus}</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-800 truncate">{pendingItem.nama_institusi}</p>
                    <p className="text-[11px] text-slate-500 truncate">{(pendingItem as any).program_studi ?? '-'} • {pendingItem.jurusan}</p>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-red-700">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Dalam antrean verifikasi
                    </div>
                  </div>
                )}
                <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-bold">
                </div>
              </motion.div>
            </div>
          )}

          <div className={hasPending ? 'pointer-events-none select-none opacity-40 blur-[0.5px]' : ''}>
            <h2 className="text-sm font-bold text-slate-900">Form Pengajuan</h2>
          </div>

          <form onSubmit={handleSubmit} className={`mt-5 space-y-4 ${hasPending ? 'pointer-events-none opacity-40' : ''}`} aria-disabled={hasPending}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Jenjang Pendidikan <span className="text-red-600">*</span></label>
                <select
                  value={jenjang}
                  disabled={hasPending}
                  onChange={(e) => setJenjang(e.target.value as any)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c62828] disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="D3">Diploma 3 (D3)</option>
                  <option value="S1">Sarjana (S1 / D4)</option>
                  <option value="S2">Magister (S2)</option>
                  <option value="S3">Doktor (S3)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Tahun Lulus <span className="text-red-600">*</span></label>
                <input
                  type="number"
                  min={1980}
                  max={new Date().getFullYear() + 1}
                  value={tahunLulus}
                  disabled={hasPending}
                  onChange={(e) => setTahunLulus(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c62828] disabled:bg-slate-100"
                  required
                />
              </div>
            </div>

            <div ref={prodiRef} className="relative">
              <label className="block text-xs font-bold text-slate-700">Program Studi <span className="text-red-600">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  value={programStudi}
                  disabled={hasPending}
                  onChange={(e) => {
                    const v = e.target.value
                    setProgramStudi(v)
                    setShowProdiDrop(true)
                    fetchProdi(v)
                  }}
                  onFocus={() => {
                    setShowProdiDrop(true)
                    if (prodiOptions.length === 0) fetchProdi(programStudi)
                  }}
                  placeholder="Ketik untuk cari prodi — mis: Ilmu Hukum"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 pr-9 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c62828] disabled:bg-slate-100"
                  required
                  maxLength={150}
                  autoComplete="off"
                />
                <span className="absolute right-3 top-[58%] -translate-y-1/2 text-slate-400">
                  {loadingProdi ? <i className="fa-solid fa-spinner fa-spin text-xs" /> : <i className="fa-solid fa-magnifying-glass text-xs" />}
                </span>
              </div>
              {showProdiDrop && !hasPending && (
                <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  {prodiOptions.length > 0 ? (
                    prodiOptions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setProgramStudi(p.nm_prodi)
                          setJurusan(p.nm_prodi)
                          setShowProdiDrop(false)
                        }}
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-red-50 transition-colors"
                      >
                        <span className="text-xs font-semibold text-slate-800 truncate pr-2">{p.nm_prodi}</span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{p.kel_jenj} • {p.kode_prodi}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-xs text-slate-500">Loading.......</div>
                  )}
                  {programStudi.trim() && !prodiOptions.some((p) => p.nm_prodi.toLowerCase() === programStudi.trim().toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => setShowProdiDrop(false)}
                      className="flex w-full items-center gap-2 border-t border-slate-100 bg-amber-50 px-3 py-2.5 text-left hover:bg-amber-100 transition-colors"
                    >
                      <i className="fa-solid fa-pen text-[10px] text-amber-700" />
                      <div>
                        <p className="text-xs font-bold text-amber-800">Gunakan input manual: “{programStudi.trim()}”</p>
                      </div>
                    </button>
                  )}
                </div>
              )}
              <p className="mt-1 text-[10px] text-slate-400">Sumber: <code className="bg-white border px-1 rounded">myprodi.nm_prodi</code>. Pilih akan auto-isi Jurusan. Jika tidak ada, tulis manual.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Jurusan <span className="text-red-600">*</span></label>
              <input
                type="text"
                value={jurusan}
                disabled={hasPending}
                onChange={(e) => setJurusan(e.target.value)}
                placeholder="Contoh: Hukum Pidana / Manajemen"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c62828] disabled:bg-slate-100"
                required
                maxLength={150}
              />
            </div>

            <div ref={kampusRef} className="relative">
              <label className="block text-xs font-bold text-slate-700">Nama Perguruan Tinggi / Institusi <span className="text-red-600">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  value={institusi}
                  disabled={hasPending}
                  onChange={(e) => {
                    const v = e.target.value
                    setInstitusi(v)
                    setShowKampusDrop(true)
                    fetchKampus(v)
                  }}
                  onFocus={() => {
                    setShowKampusDrop(true)
                    if (kampusOptions.length === 0) fetchKampus(institusi)
                  }}
                  placeholder="Ketik untuk cari kampus — mis: Universitas Indonesia"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 pr-9 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c62828] disabled:bg-slate-100"
                  required
                  maxLength={150}
                  autoComplete="off"
                />
                <span className="absolute right-3 top-[58%] -translate-y-1/2 text-slate-400">
                  {loadingKampus ? <i className="fa-solid fa-spinner fa-spin text-xs" /> : <i className="fa-solid fa-magnifying-glass text-xs" />}
                </span>
              </div>

              {showKampusDrop && !hasPending && (
                <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  {kampusOptions.length > 0 ? (
                    kampusOptions.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => {
                          setInstitusi(k.name)
                          setShowKampusDrop(false)
                        }}
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-red-50 transition-colors"
                      >
                        <span className="text-xs font-semibold text-slate-800 truncate pr-2">{k.name}</span>
                        {k.country && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{k.country}</span>}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-xs text-slate-500">Loading</div>
                  )}
                  {/* Manual fallback — selalu tampilkan */}
                  {institusi.trim() && !kampusOptions.some((k) => k.name.toLowerCase() === institusi.trim().toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => setShowKampusDrop(false)}
                      className="flex w-full items-center gap-2 border-t border-slate-100 bg-amber-50 px-3 py-2.5 text-left hover:bg-amber-100 transition-colors"
                    >
                      <i className="fa-solid fa-pen text-[10px] text-amber-700" />
                      <div>
                        <p className="text-xs font-bold text-amber-800">Gunakan input manual: “{institusi.trim()}”</p>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">File Ijazah / SKL (PDF/JPG/PNG, max 5MB) <span className="text-red-600">*</span></label>
                <input
                  id="file_ijazah"
                  type="file"
                  disabled={hasPending}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFileIjazah(e.target.files?.[0] ?? null)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-red-50 file:px-3 file:py-1 file:text-xs file:font-bold file:text-[#ba191d] focus:outline-none focus:ring-2 focus:ring-[#c62828] disabled:opacity-50"
                  required
                />
                {fileIjazah && <p className="text-[11px] text-slate-500 mt-1">{fileIjazah.name} • {(fileIjazah.size / 1024).toFixed(0)} KB</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Bukti Pencantuman Gelar BKN (PDF/JPG/PNG, max 5MB) <span className="text-red-600">*</span></label>
                <input
                  id="file_bukti_bkn"
                  type="file"
                  disabled={hasPending}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFileBkn(e.target.files?.[0] ?? null)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-red-50 file:px-3 file:py-1 file:text-xs file:font-bold file:text-[#ba191d] focus:outline-none focus:ring-2 focus:ring-[#c62828] disabled:opacity-50"
                  required
                />
                {fileBkn && <p className="text-[11px] text-slate-500 mt-1">{fileBkn.name} • {(fileBkn.size / 1024).toFixed(0)} KB</p>}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting || hasPending || !user?.pegawai}
                className="inline-flex items-center gap-2 rounded-full bg-[#ba191d] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" /> Mengirim...
                  </>
                ) : (
                  'Kirim Pengajuan Pendidikan'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info booster */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Alur & Tahapan yang harus dilalui</h3>
          <div className="space-y-3 text-xs">
            <div className="flex gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
              <span className="w-7 h-7 rounded-lg bg-white border border-red-200 flex items-center justify-center font-bold text-red-700 shrink-0">1</span>
              <div>
                <p className="font-bold text-slate-800">Upload → DIAJUKAN</p>
                <p className="text-slate-600 leading-relaxed">Berkas masuk antrean verifikator SDM.</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="w-7 h-7 rounded-lg bg-white border flex items-center justify-center font-bold text-slate-700 shrink-0">2</span>
              <div>
                <p className="font-bold text-slate-800">Verifikasi Dokumen (Admin)</p>
                <p className="text-slate-600 leading-relaxed">Admin cek keaslian fisik ijazah & SK BKN.</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="w-7 h-7 rounded-lg bg-white border border-emerald-200 flex items-center justify-center font-bold text-emerald-700 shrink-0">3</span>
              <div>
                <p className="font-bold text-slate-800">Cek 3 Syarat Otomatis</p>
                <ul className="list-disc list-inside text-slate-600 leading-relaxed">
                  <li>Jenjang lebih tinggi</li>
                  <li>Predikat terakhir ≥ Baik</li>
                  <li>Belum pernah bonus jenjang sama</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-xs font-bold text-emerald-800 flex items-center gap-2"><i className="fa-solid fa-award" /> Jika lolos → +25% AK KP</p>
          </div>
        </div>
      </motion.div>

      {/* 4. Riwayat Pengajuan */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Riwayat Pengajuan Anda</h2>
          </div>
          <button
            onClick={fetchList}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <i className="fa-solid fa-rotate text-[11px] mr-1" /> Segarkan
          </button>
        </div>

        {loadingList ? (
          <div className="py-10 text-center text-xs text-slate-400">Memuat riwayat...</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400"><i className="fa-solid fa-graduation-cap" /></div>
            <p className="text-xs font-bold text-slate-600 mt-3">Belum ada pengajuan</p>
            <p className="text-xs text-slate-400">Ajukan pertama Anda melalui form di atas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-3 px-3">Jenjang</th>
                  <th className="py-3 px-3">Program Studi / Jurusan</th>
                  <th className="py-3 px-3">Institusi</th>
                  <th className="py-3 px-3">Th Lulus</th>
                  <th className="py-3 px-3">Berkas</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Catatan / Bonus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it) => {
                  const b = statusBadge(it.status)
                  return (
                    <tr key={it.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3">
                        <span className="rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-black text-[#ba191d]">{it.jenjang_pendidikan}</span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">{(it as any).program_studi ?? '-'}</p>
                        <p className="text-[11px] text-slate-500">{it.jurusan}</p>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">{it.nama_institusi}</td>
                      <td className="py-3 px-3 font-mono font-bold">{it.tahun_lulus}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          <a href={getStorageFileUrl(it.file_ijazah)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ba191d] hover:underline">
                            <i className="fa-solid fa-file-pdf text-[10px]" /> Ijazah
                          </a>
                          <a href={getStorageFileUrl(it.file_bukti_bkn)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline">
                            <i className="fa-solid fa-file-shield text-[10px]" /> BKN
                          </a>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${b.cls}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />{b.label}
                        </span>
                        {it.status === 'DISETUJUI' && it.ak_bonus ? (
                          <p className="text-[11px] font-mono font-bold text-emerald-700 mt-1">+{Number(it.ak_bonus).toFixed(2)} AK</p>
                        ) : null}
                      </td>
                      <td className="py-3 px-3 max-w-[220px]">
                        <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3" title={it.catatan_verifikasi ?? ''}>{it.catatan_verifikasi || '-'}</p>
                        {it.diverifikasi_pada && <p className="text-[10px] text-slate-400 mt-1">{new Date(it.diverifikasi_pada).toLocaleDateString('id-ID')}</p>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* 5. Info Efisiensi Storage */}
      {/* <motion.div variants={itemVariants} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-xs text-slate-600 flex gap-4">
        <div className="w-9 h-9 rounded-xl bg-red-100 text-[#c62828] flex items-center justify-center shrink-0"><i className="fa-solid fa-database text-sm" /></div>
        <div className="space-y-1">
          <h4 className="font-bold text-slate-800">Efisiensi Penyimpanan</h4>
          <p className="text-slate-500 leading-relaxed">
            Sesuai permintaan: file <strong>tidak disimpan sebagai BLOB di database</strong>, hanya <code className="bg-white px-1 py-0.5 rounded border">file_ijazah</code> & <code className="bg-white px-1 py-0.5 rounded border">file_bukti_bkn</code> berupa path string
            (<code className="bg-white px-1 py-0.5 rounded border">pengajuan_pendidikan/ijazah/xxx.pdf</code> & <code className="bg-white px-1 py-0.5 rounded border">pengajuan_pendidikan/bukti_bkn/xxx.pdf</code>)
            di disk <code>public</code> (<code>storage/app/public</code>) sehingga hemat resource DB dan dapat di-serve via <code>/storage</code> symlink. Migrasi: <code>2026_09_03_000006</code> & <code>2026_09_04_000001</code>.
          </p>
        </div>
      </motion.div> */}
    </motion.div>
  )
}
