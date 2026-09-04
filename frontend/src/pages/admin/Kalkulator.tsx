import React, { useState, useMemo } from 'react'
import {
  Calculator,
  TrendingUp,
  Clock,
  Layers,
  Wallet,
  Award,
  RefreshCw,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from 'lucide-react'
import {
  MASTER_JENJANG,
  MASTER_PREDIKAT,
  DEFAULT_INPUT,
  PREDIKAT_BADGE_STYLE,
  hitungKalkulator,
  type KalkulatorInput,
  type AsalJabatan,
} from '../../lib/kalkulator'
import {
  Button,
  Card,
  CardHeader,
  Badge,
  StatusBadge,
  Alert,
} from '../../components/ui'

const TW_LABELS = ['Triwulan 1', 'Triwulan 2', 'Triwulan 3', 'Triwulan 4']

const ASAL_JABATAN_OPTIONS: { value: AsalJabatan; label: string; desc: string }[] = [
  {
    value: 'PELAKSANA',
    label: 'Staf Pelaksana (Jabatan Pelaksana)',
    desc: 'Hanya boleh berpindah ke JF Ahli Pertama (PerBKN No. 3/2023)',
  },
  {
    value: 'PENGAWAS',
    label: 'Jabatan Pengawas (Eselon IV)',
    desc: 'Diperbolehkan langsung berpindah ke JF Ahli Muda',
  },
  {
    value: 'ADMINISTRATOR',
    label: 'Jabatan Administrator (Eselon III)',
    desc: 'Diperbolehkan langsung berpindah ke JF Ahli Madya',
  },
  {
    value: 'PENGANGKATAN_PERTAMA',
    label: 'Pengangkatan Pertama (CPNS)',
    desc: 'Formasi awal JF, AK Dasar = 0',
  },
]

export const Kalkulator: React.FC = () => {
  const [input, setInput] = useState<KalkulatorInput>(DEFAULT_INPUT)
  const [notif, setNotif] = useState<string | null>(null)
  const [notifType, setNotifType] = useState<'success' | 'info'>('info')
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(true)

  const jenjang = MASTER_JENJANG.find((j) => j.nama === input.jenjangNama)!
  const hasil = useMemo(() => hitungKalkulator(input), [input])
  const pctKp = Math.min(100, Math.round((hasil.akKumulatif / hasil.evaluasi.targetKp) * 100))

  const updateNumeric = (key: 'saldoAwal' | 'masaKerjaTahun' | 'masaKerjaBulan' | 'bulanAktif', raw: string) => {
    const value = Math.max(0, Number(raw) || 0)
    setInput((prev) => {
      const next: KalkulatorInput = { ...prev }
      if (key === 'masaKerjaBulan') {
        next.masaKerjaBulan = Math.min(11, value)
      } else if (key === 'bulanAktif') {
        next.bulanAktif = Math.min(12, value)
      } else {
        next[key] = value
      }
      return next
    })
  }

  const setPredikat = (idx: number, nama: string) => {
    setInput((prev) => {
      const predikat = [...prev.predikat] as KalkulatorInput['predikat']
      predikat[idx] = nama
      return { ...prev, predikat }
    })
  }

  const handleReset = () => {
    setInput(DEFAULT_INPUT)
    setNotif('Input dikembalikan ke skenario standar benchmark UAT KPK (Sdr. Budi Golongan III/a).')
    setNotifType('info')
  }

  const inputClass =
    'w-full px-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-colors'

  const labelClass = 'text-xs font-bold text-gray-700 mb-1.5 block'

  const predikatTw4Obj = MASTER_PREDIKAT.find((p) => p.nama === input.predikat[3]) || MASTER_PREDIKAT[1]
  const pctTw4 = predikatTw4Obj.persentase

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <CardHeader
        tag="Simulasi & Validasi Regulasi"
        tagColor="#ba191d"
        regulation="PerBKN No. 3 Tahun 2023 Bab II (Perpindahan Jabatan)"
        title="Kalkulator & Simulator Konversi Angka Kredit"
        subtitle="Simulasi terintegrasi dengan validasi jalur perpindahan jabatan, formula masa kerja pelaksana, penetapan tahunan retrospektif, dan penyesuaian khusus 100 AK Flat sesuai regulasi BKN."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon={<BookOpen className="h-4 w-4" />}
              onClick={() => setShowFormulaDetails(!showFormulaDetails)}
            >
              {showFormulaDetails ? 'Sembunyikan Bedah Rumus' : 'Bedah Rumus Matematis'}
            </Button>
            <Button
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={handleReset}
            >
              Reset Skenario
            </Button>
          </div>
        }
      />

      {/* Peringatan Pelanggaran Regulasi Jalur Jabatan */}
      {hasil.regulatoryWarning && (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl text-xs text-red-900 flex items-start gap-3 animate-in fade-in">
          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-black text-sm block text-red-900">
              Peringatan Pelanggaran Regulasi BKN!
            </strong>
            <p className="leading-relaxed">{hasil.regulatoryWarning}</p>
          </div>
        </div>
      )}

      {/* Notifikasi Penyesuaian Khusus 100 AK Flat */}
      {hasil.isMismatchFlat100 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-3 animate-in fade-in">
          <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-black text-xs block text-blue-900">
              Penyesuaian Khusus Mismatch Golongan (PerBKN No. 3/2023 Lampiran)
            </strong>
            <p className="leading-relaxed">{hasil.mismatchNote}</p>
          </div>
        </div>
      )}

      {notif && (
        <Alert
          variant={notifType}
          title={notifType === 'success' ? 'Skenario Terverifikasi' : 'Informasi Skenario'}
          message={notif}
          onDismiss={() => setNotif(null)}
        />
      )}

      {/* 2. Grid 2 Kolom: Form Input vs Panel Hasil Real-Time */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
        {/* KOLOM KIRI: Form Parameter Input (7 cols) */}
        <Card className="xl:col-span-7 p-5 space-y-5">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Calculator className="h-4 w-4 text-[#ba191d]" />
            <h2 className="text-sm font-extrabold text-gray-900">Parameter Skenario & Jalur Jabatan</h2>
          </div>

          <div className="space-y-5">
            {/* Asal Jabatan Sebelum Dilantik (Jalur Perpindahan) */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <label className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-[#ba191d]" />
                <span>Asal Kelompok Jabatan Sebelum Diangkat (Jalur Masuk)</span>
              </label>
              <select
                className={`${inputClass} bg-white font-bold text-gray-900`}
                value={input.asalJabatan}
                onChange={(e) => {
                  const asal = e.target.value as AsalJabatan
                  setInput((prev) => ({ ...prev, asalJabatan: asal }))
                }}
              >
                {ASAL_JABATAN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500">
                {ASAL_JABATAN_OPTIONS.find((o) => o.value === input.asalJabatan)?.desc}
              </p>
            </div>

            {/* Jenjang & Golongan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Jenjang JF yang Dituju</label>
                <select
                  className={inputClass}
                  value={input.jenjangNama}
                  onChange={(e) => {
                    const nama = e.target.value
                    const j = MASTER_JENJANG.find((x) => x.nama === nama)!
                    setInput((prev) => ({
                      ...prev,
                      jenjangNama: nama,
                      golongan: j.golongan[0].golongan,
                    }))
                  }}
                >
                  {MASTER_JENJANG.map((j) => (
                    <option key={j.nama} value={j.nama}>
                      {j.nama} (Koef: {j.koefisienTahunan} AK/thn)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Pangkat / Golongan Ruang Saat Ini</label>
                <select
                  className={inputClass}
                  value={input.golongan}
                  onChange={(e) => setInput((prev) => ({ ...prev, golongan: e.target.value }))}
                >
                  {jenjang.golongan.map((g) => (
                    <option key={g.golongan} value={g.golongan}>
                      Golongan {g.golongan} {g.isMismatch ? '⚠️ (Pangkat Di Atas Jenjang)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Saldo Awal */}
            <div>
              <label className={labelClass}>Saldo Awal / Tabungan AK Lama</label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  className={`${inputClass} pl-9 font-mono font-bold`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={input.saldoAwal}
                  onChange={(e) => updateNumeric('saldoAwal', e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">AK</span>
              </div>
            </div>

            {/* PAK Pelantikan (Konversi Masa Kerja vs 100 AK Flat) */}
            <div
              className={`rounded-xl border p-3.5 space-y-3 ${
                hasil.isMismatchFlat100
                  ? 'border-blue-200 bg-blue-50/30'
                  : 'border-gray-200 bg-[#fafbfc]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#ba191d]" />
                  <span className="text-xs font-extrabold text-gray-900">
                    {hasil.isMismatchFlat100
                      ? 'Angka Kredit Penyesuaian Khusus BKN (Mismatch Pangkat)'
                      : 'PAK Pelantikan (Konversi Masa Kerja Staf Pelaksana)'}
                  </span>
                </div>
                <Badge variant={hasil.isMismatchFlat100 ? 'info' : 'default'}>
                  {hasil.isMismatchFlat100 ? '100.00 AK Flat' : 'Formula C'}
                </Badge>
              </div>

              {hasil.isMismatchFlat100 ? (
                <div className="p-3 bg-white rounded-lg border border-blue-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900">Status Penetapan Awal:</span>
                    <span className="font-mono font-black text-sm text-blue-800">100.00 AK FLAT</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Karena Golongan ({input.golongan}) berada di atas batas normal jenjang Ahli Pertama, BKN menetapkan <strong>100.00 AK Flat</strong> tanpa menghitung masa kerja (Formula C tidak berlaku).
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Masa Kerja (Tahun)</label>
                      <input
                        className={`${inputClass} font-mono font-bold`}
                        type="number"
                        min={0}
                        value={input.masaKerjaTahun}
                        onChange={(e) => updateNumeric('masaKerjaTahun', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Masa Kerja (Bulan)</label>
                      <input
                        className={`${inputClass} font-mono font-bold`}
                        type="number"
                        min={0}
                        max={11}
                        value={input.masaKerjaBulan}
                        onChange={(e) => updateNumeric('masaKerjaBulan', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] bg-white border border-gray-200 rounded-lg p-2.5">
                    <span className="text-gray-500">
                      {input.masaKerjaTahun} thn {input.masaKerjaBulan} bln × 100% × {jenjang.koefisienTahunan} AK =
                    </span>
                    <strong className="font-mono text-[#ba191d] font-black text-xs">
                      {hasil.akPakPelantikan.toFixed(2)} AK
                    </strong>
                  </div>
                </>
              )}
            </div>

            {/* Evaluasi Triwulanan (TW1 – TW4) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-extrabold text-gray-900">
                  Predikat Kinerja Triwulan (TW1 – TW4)
                </span>
                <span className="text-[10px] font-extrabold text-[#ba191d] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  TW4 = Acuan Retrospektif Tahunan
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mb-3">
                TW1 s.d. TW3 sebagai pemantauan berkala. Sesuai regulasi BKN, predikat <strong>TW4 bertindak sebagai Evaluasi Tahunan</strong> yang menormalisasi perolehan angka kredit setahun penuh.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {input.predikat.map((nama, idx) => {
                  const isTw4 = idx === 3
                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border p-3 ${
                        isTw4 ? 'border-2 border-[#ba191d] bg-red-50/20' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-extrabold ${isTw4 ? 'text-[#ba191d]' : 'text-gray-800'}`}>
                          {TW_LABELS[idx]}
                        </span>
                        {isTw4 ? (
                          <span className="text-[9px] font-black uppercase text-white bg-[#ba191d] px-1.5 py-0.5 rounded">
                            Acuan Tahunan
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-gray-400">
                            Periodik
                          </span>
                        )}
                      </div>
                      <select
                        className={inputClass}
                        value={nama}
                        onChange={(e) => setPredikat(idx, e.target.value)}
                      >
                        {MASTER_PREDIKAT.map((p) => (
                          <option key={p.nama} value={p.nama}>
                            {p.nama} ({Math.round(p.persentase * 100)}%)
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Bulan Aktif */}
            <div>
              <label className={labelClass}>Total Bulan Aktif Jabatan Tahun Berjalan</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  className={`${inputClass} pl-9 font-mono font-bold`}
                  type="number"
                  min={1}
                  max={12}
                  value={input.bulanAktif}
                  onChange={(e) => updateNumeric('bulanAktif', e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">Bulan</span>
              </div>
            </div>
          </div>
        </Card>

        {/* KOLOM KANAN: Hasil Akumulasi Real-Time (5 cols) */}
        <div className="xl:col-span-5 space-y-5 sticky top-20">
          {/* Card Total AK Kumulatif */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#6b1118] to-[#ba191d] p-5 text-white shadow-md space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-red-100 uppercase tracking-wider">
              <span>Hasil Akumulasi AK</span>
              <Badge
                variant={hasil.evaluasi.badgeVariant}
                className="!bg-white/10 !text-white !border-white/20"
              >
                {hasil.evaluasi.badgeLabel}
              </Badge>
            </div>

            <div>
              <p className="font-mono text-4xl font-black tracking-tight">
                {hasil.akKumulatif.toFixed(2)}
                <span className="text-base font-normal text-red-200 ml-1.5 font-sans">AK</span>
              </p>
              <p className="text-xs text-red-100 mt-1">
                Total Angka Kredit Kumulatif Tahun Berjalan
              </p>
            </div>

            {/* Progress Bar Menuju Target KP */}
            <div className="space-y-1.5 pt-3 border-t border-white/20">
              <div className="flex items-center justify-between text-[11px] font-semibold text-red-100">
                <span>Progress Kenaikan Pangkat ({hasil.evaluasi.targetKp} AK)</span>
                <span className="font-mono font-black">{pctKp}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${pctKp}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-red-200">
                <span>{hasil.akKumulatif.toFixed(2)} / {hasil.evaluasi.targetKp.toFixed(2)} AK</span>
                <span>
                  {hasil.akKumulatif >= hasil.evaluasi.targetKp
                    ? 'Target Terpenuhi'
                    : `Kurang ${hasil.evaluasi.kurangAk.toFixed(2)} AK`}
                </span>
              </div>
            </div>

            <ChevronRight className="pointer-events-none absolute -right-4 -bottom-4 h-24 w-24 text-white/10" />
          </div>

          {/* Keputusan Kelayakan & Carry-Over */}
          <Card className="p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
                Keputusan Sistem
              </span>
              <StatusBadge status={hasil.evaluasi.status} size="md" />
            </div>

            <p className="text-xs text-gray-700 leading-relaxed font-medium bg-gray-50 p-3 rounded-xl border border-gray-200/70">
              {hasil.evaluasi.catatan}
            </p>

            {/* Rincian Komponen Pembentuk */}
            <div className="space-y-2 pt-2 text-xs border-t border-gray-100">
              <div className="flex justify-between text-gray-500">
                <span>Saldo Awal / Historis:</span>
                <span className="font-mono font-bold text-gray-900">{hasil.saldoAwal.toFixed(2)} AK</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>
                  {hasil.isMismatchFlat100
                    ? 'Penyesuaian Khusus BKN (100 AK Flat):'
                    : 'PAK Pelantikan Masa Kerja:'}
                </span>
                <span className="font-mono font-bold text-[#ba191d]">
                  +{hasil.akPakPelantikan.toFixed(2)} AK
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>AK Baru Kinerja (Evaluasi Tahunan):</span>
                <span className="font-mono font-bold text-blue-700">+{hasil.akBaru.toFixed(2)} AK</span>
              </div>
              <div className="flex justify-between font-extrabold text-gray-900 pt-2 border-t border-gray-100">
                <span>
                  {hasil.evaluasi.status === 'LAYAK_PANGKAT'
                    ? 'Deposit Carry-Over ke Tahun Depan:'
                    : hasil.evaluasi.status === 'LAYAK_JENJANG'
                    ? 'Status Saldo Tahun Depan:'
                    : 'Saldo yang Disimpan Utuh ke Tahun Depan:'}
                </span>
                <span className="font-mono text-[#ba191d]">
                  {hasil.evaluasi.carryOver.toFixed(2)} AK
                </span>
              </div>
            </div>
          </Card>

          {/* Estimasi Waktu */}
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#ba191d]" />
              <span className="text-xs font-extrabold text-gray-900">Estimasi Waktu Tercapai</span>
            </div>
            {hasil.evaluasi.status === 'BELUM_CUKUP' ? (
              <div>
                <p className="text-2xl font-black text-gray-900 font-mono">
                  {hasil.proyeksi.sisaTahun > 0 && `${hasil.proyeksi.sisaTahun} Thn `}
                  {`${hasil.proyeksi.sisaBulan} Bln`}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">{hasil.proyeksi.estimasiLabel}</p>
              </div>
            ) : (
              <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Target Kenaikan Pangkat Sudah Tercapai pada Periode Ini
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* 3. BEDAH RUMUS MATEMATIS & TRANSPARANSI PERHITUNGAN */}
      {showFormulaDetails && (
        <Card className="p-6 space-y-6 border-t-4 border-t-[#ba191d]">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <BookOpen className="h-5 w-5 text-[#ba191d]" />
              <div>
                <h2 className="text-sm font-black text-gray-900">
                  Transparansi Perhitungan Matematis (Mengapa Hasilnya Dapat {hasil.akKumulatif.toFixed(2)} AK?)
                </h2>
                <p className="text-xs text-gray-500">
                  Rincian substitusi angka dan landasan yuridis Peraturan BKN Nomor 3 Tahun 2023 Bab II
                </p>
              </div>
            </div>
            <Badge variant="default">Audit Trail Matematis</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Box 1: PAK Pelantikan atau 100 Flat */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-gray-900">
                  1. {hasil.isMismatchFlat100 ? 'Penyesuaian Khusus 100 AK Flat' : 'Konversi Masa Kerja (Formula C)'}
                </span>
                <Badge variant={hasil.isMismatchFlat100 ? 'info' : 'default'}>
                  {hasil.isMismatchFlat100 ? 'BKN Bab II Lampiran' : 'Formula C'}
                </Badge>
              </div>

              {hasil.isMismatchFlat100 ? (
                <div className="text-[11px] text-gray-700 space-y-1.5">
                  <p className="font-mono bg-white p-2 rounded border border-gray-200 font-bold text-blue-900">
                    Nilai Flat = 100.00 AK (Tanpa Perhitungan Masa Kerja)
                  </p>
                  <p>• Status Pegawai: <strong>Pelaksana Golongan {input.golongan}</strong></p>
                  <p>• Jenjang yang Diduduki: <strong>{jenjang.nama}</strong></p>
                  <p className="text-blue-900 font-medium leading-relaxed">
                    Sesuai Lampiran PerBKN No. 3/2023, PNS Pelaksana berkualifikasi S1 yang golongannya melampaui jenjang (III/c atau III/d) langsung ditetapkan <strong>100.00 AK Flat</strong> sebagai modal Uji Kompetensi Kenaikan Jenjang ke Ahli Muda.
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-gray-700 space-y-1.5">
                  <p className="font-mono bg-white p-2 rounded border border-gray-200">
                    (Tahun × 100% × Koef) + (Bulan / 12 × 100% × Koef)
                  </p>
                  <p>• Masa Kerja di Golongan: <strong>{input.masaKerjaTahun} Tahun {input.masaKerjaBulan} Bulan</strong></p>
                  <p>• Komponen Tahun: {input.masaKerjaTahun} × 1.0 × {jenjang.koefisienTahunan} = <strong>{hasil.akPakRincian.akTahun.toFixed(2)} AK</strong></p>
                  <p>• Komponen Bulan: ({input.masaKerjaBulan} / 12) × 1.0 × {jenjang.koefisienTahunan} = <strong>{hasil.akPakRincian.akBulan.toFixed(2)} AK</strong></p>
                  <p className="pt-1 text-[#ba191d] font-bold border-t border-gray-200">
                    Subtotal PAK Pelantikan = {hasil.akPakRincian.akTahun.toFixed(2)} + {hasil.akPakRincian.akBulan.toFixed(2)} = <strong>{hasil.akPakPelantikan.toFixed(2)} AK</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Box 2: AK Baru Tahunan (TW4 Retrospektif) */}
            <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-blue-900">2. AK Baru Kinerja (Evaluasi Tahunan)</span>
                <Badge variant="info">Formula B Retrospektif</Badge>
              </div>
              <p className="text-[11px] text-blue-900 leading-relaxed font-mono bg-white p-2 rounded border border-blue-200">
                (Bulan Aktif / 12) × % Predikat TW4 × Koefisien Tahunan
              </p>
              <div className="text-[11px] text-blue-900 space-y-1">
                <p>• Bulan Aktif Jabatan: <strong>{input.bulanAktif} Bulan</strong></p>
                <p>• Predikat Acuan (TW4): <strong>{input.predikat[3]} ({Math.round(pctTw4 * 100)}%)</strong></p>
                <p>• Koefisien Jenjang {jenjang.nama}: <strong>{jenjang.koefisienTahunan} AK/tahun</strong></p>
                <p className="pt-1 text-blue-800 font-bold border-t border-blue-200">
                  Subtotal AK Baru = ({input.bulanAktif} / 12) × {pctTw4} × {jenjang.koefisienTahunan} = <strong>{hasil.akBaru.toFixed(2)} AK</strong>
                </p>
              </div>
              <p className="text-[10px] text-blue-700 italic">
                *PerBKN No. 3/2023: Predikat akhir tahun (TW4) menormalisasi kinerja selama total bulan aktif dalam tahun berjalan.
              </p>
            </div>

            {/* Box 3: Akumulasi Total */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
              <span className="font-extrabold text-gray-900 block">3. Penjumlahan Saldo Kumulatif</span>
              <p className="text-[11px] text-gray-600 leading-relaxed font-mono bg-white p-2 rounded border border-gray-200">
                Saldo Awal + PAK Pelantikan + AK Baru (Tahunan)
              </p>
              <div className="text-[11px] text-gray-700 space-y-1">
                <p>• Saldo Awal / Historis: <strong>{hasil.saldoAwal.toFixed(2)} AK</strong></p>
                <p>• {hasil.isMismatchFlat100 ? 'Penyesuaian Khusus:' : 'PAK Pelantikan:'} <strong>{hasil.akPakPelantikan.toFixed(2)} AK</strong></p>
                <p>• AK Baru Tahun Berjalan: <strong>{hasil.akBaru.toFixed(2)} AK</strong></p>
                <p className="pt-1 text-[#ba191d] font-bold border-t border-gray-200 text-xs">
                  Total AK Kumulatif = {hasil.saldoAwal.toFixed(2)} + {hasil.akPakPelantikan.toFixed(2)} + {hasil.akBaru.toFixed(2)} = <strong>{hasil.akKumulatif.toFixed(2)} AK</strong>
                </p>
              </div>
            </div>

            {/* Box 4: Penentuan Kelayakan & Sisa Saldo */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
              <span className="font-extrabold text-gray-900 block">4. Evaluasi Kelayakan & Tabungan Saldo</span>
              <div className="text-[11px] text-gray-700 space-y-1.5">
                <p>• Target Kenaikan Pangkat: <strong>{hasil.evaluasi.targetKp.toFixed(2)} AK</strong></p>
                <p>
                  • Status Perbandingan:{' '}
                  {hasil.akKumulatif >= hasil.evaluasi.targetKp ? (
                    <strong className="text-emerald-700">
                      {hasil.akKumulatif.toFixed(2)} ≥ {hasil.evaluasi.targetKp.toFixed(2)} (TERPENUHI)
                    </strong>
                  ) : (
                    <strong className="text-amber-700">
                      {hasil.akKumulatif.toFixed(2)} &lt; {hasil.evaluasi.targetKp.toFixed(2)} (KURANG {hasil.evaluasi.kurangAk.toFixed(2)} AK)
                    </strong>
                  )}
                </p>
                <div className="p-2 bg-white rounded border border-gray-200 mt-2">
                  <p className="font-bold text-gray-800">Kebijakan Sisa Saldo (Carry-Over):</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                    {hasil.evaluasi.status === 'LAYAK_PANGKAT'
                      ? `Kelebihan Angka Kredit (${hasil.akKumulatif.toFixed(2)} - ${hasil.evaluasi.targetKp.toFixed(2)} = ${hasil.evaluasi.carryOver.toFixed(2)} AK) ditabung sebagai deposit awal untuk kenaikan pangkat berikutnya.`
                      : hasil.evaluasi.status === 'LAYAK_JENJANG'
                      ? 'Sesuai regulasi BKN, kelebihan AK pada promosi jenjang jabatan tidak dapat ditabung (sisa saldo di-reset ke 0).'
                      : `Karena belum mencukupi target, seluruh saldo saat ini (${hasil.evaluasi.carryOver.toFixed(2)} AK) dibawa utuh ke tahun berikutnya.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 4. Tabel Rincian Triwulanan */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#ba191d]" />
            <h2 className="text-sm font-extrabold text-gray-900">
              Tabel Komparasi: Pemantauan Periodik vs Penetapan Tahunan
            </h2>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">
            Perbandingan Formula A (Triwulan) dan Formula B (Retrospektif)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200/80 text-gray-500 font-extrabold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3.5">Periode</th>
                <th className="py-3 px-3.5">Predikat Kinerja</th>
                <th className="py-3 px-3.5 text-right">Formula A (Pemantauan Periodik)</th>
                <th className="py-3 px-3.5 text-right">Formula B (Penetapan Tahunan)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {hasil.triwulan.map((tw) => (
                <tr
                  key={tw.tw}
                  className={`hover:bg-gray-50/80 transition-colors ${
                    tw.isAnchor ? 'bg-red-50/20 font-semibold' : ''
                  }`}
                >
                  <td className="py-3 px-3.5">
                    <span className={`font-extrabold ${tw.isAnchor ? 'text-[#ba191d]' : 'text-gray-800'}`}>
                      Triwulan {tw.tw}
                    </span>
                    {tw.isAnchor && (
                      <span className="ml-2 text-[9px] font-black uppercase text-[#ba191d] bg-red-100 px-1.5 py-0.5 rounded">
                        Acuan Tahunan
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3.5">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${
                        PREDIKAT_BADGE_STYLE[tw.predikat] ?? 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {tw.predikat} ({Math.round(tw.persentase * 100)}%)
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono font-bold text-gray-700">
                    {tw.akPeriodik.toFixed(2)}{' '}
                    <span className="text-[9px] text-gray-400 font-normal">
                      (3/12 × {Math.round(tw.persentase * 100)}% × {jenjang.koefisienTahunan})
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono font-black text-gray-900">
                    {tw.isAnchor ? (
                      <span className="text-blue-700">{tw.akAnchor.toFixed(2)} AK</span>
                    ) : (
                      <span className="text-gray-300 font-normal">—</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50/60 border-t border-gray-200/80">
                <td className="py-3 px-3.5 font-extrabold text-gray-700" colSpan={3}>
                  Total Akumulasi AK Akhir (Saldo Awal {hasil.saldoAwal.toFixed(2)} + {hasil.isMismatchFlat100 ? 'Penyesuaian Khusus' : 'PAK Pelantikan'} {hasil.akPakPelantikan.toFixed(2)} + AK Baru {hasil.akBaru.toFixed(2)})
                </td>
                <td className="py-3 px-3.5 text-right font-mono text-sm font-black text-[#ba191d]">
                  {hasil.akKumulatif.toFixed(2)} AK
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="secondary" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={handleReset}>
            Reset Skenario
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default Kalkulator
