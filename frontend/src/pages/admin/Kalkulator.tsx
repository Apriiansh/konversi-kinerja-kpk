import React, { useState, useMemo } from 'react'
import {
  GraduationCap,
  Clock,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Briefcase,
  Layers,
} from 'lucide-react'
import {
  Button,
  Card,
  CardHeader,
} from '../../components/ui'

// Master Jenjang Jabatan & Koefisien BKN
interface JenjangConfig {
  nama: string
  koefisien: number
  targetKp: number
  targetJenjang: number
  golonganList: string[]
}

const MASTER_JENJANG: Record<string, JenjangConfig> = {
  PERTAMA: {
    nama: 'Ahli Pertama',
    koefisien: 12.5,
    targetKp: 50,
    targetJenjang: 100,
    golonganList: ['III/a', 'III/b'],
  },
  MUDA: {
    nama: 'Ahli Muda',
    koefisien: 25.0,
    targetKp: 100,
    targetJenjang: 200,
    golonganList: ['III/c', 'III/d'],
  },
  MADYA: {
    nama: 'Ahli Madya',
    koefisien: 37.5,
    targetKp: 150,
    targetJenjang: 450,
    golonganList: ['IV/a', 'IV/b', 'IV/c'],
  },
  UTAMA: {
    nama: 'Ahli Utama',
    koefisien: 50.0,
    targetKp: 200,
    targetJenjang: 9999,
    golonganList: ['IV/d', 'IV/e'],
  },
}

// Master Predikat & Persentase Konversi
const PREDIKAT_OPTIONS = [
  { value: 1.5, label: 'Sangat Baik (150%)', color: 'emerald' },
  { value: 1.0, label: 'Baik (100%)', color: 'blue' },
  { value: 0.75, label: 'Butuh Perbaikan (75%)', color: 'amber' },
  { value: 0.5, label: 'Kurang (50%)', color: 'orange' },
  { value: 0.25, label: 'Sangat Kurang (25%)', color: 'red' },
]

export const Kalkulator: React.FC = () => {
  // State Form Input
  const [selectedJenjangKey, setSelectedJenjangKey] = useState<string>('PERTAMA')
  const [selectedGolongan, setSelectedGolongan] = useState<string>('III/a')
  const [saldoAwal, setSaldoAwal] = useState<number>(0)
  const [bulanAktif, setBulanAktif] = useState<number>(12)

  // Predikat Triwulanan (Multipliers)
  const [predikatTw1, setPredikatTw1] = useState<number>(1.0)
  const [predikatTw2, setPredikatTw2] = useState<number>(1.0)
  const [predikatTw3, setPredikatTw3] = useState<number>(1.0)
  const [predikatTw4, setPredikatTw4] = useState<number>(1.0) // Anchor Retrospektif

  // Booster Ijazah (+25%)
  const [hasBooster, setHasBooster] = useState<boolean>(false)

  // Calculator Masa Kerja Pelaksana (PAK Pelantikan)
  const [pakTahun, setPakTahun] = useState<number>(0)
  const [pakBulan, setPakBulan] = useState<number>(0)
  const [enablePakPelantikan, setEnablePakPelantikan] = useState<boolean>(false)

  const config = MASTER_JENJANG[selectedJenjangKey]

  // Reset Simulasi
  const handleReset = () => {
    setSelectedJenjangKey('PERTAMA')
    setSelectedGolongan('III/a')
    setSaldoAwal(0)
    setBulanAktif(12)
    setPredikatTw1(1.0)
    setPredikatTw2(1.0)
    setPredikatTw3(1.0)
    setPredikatTw4(1.0)
    setHasBooster(false)
    setEnablePakPelantikan(false)
    setPakTahun(0)
    setPakBulan(0)
  }

  // Ganti Jenjang -> sinkronkan golongan
  const handleJenjangChange = (key: string) => {
    setSelectedJenjangKey(key)
    setSelectedGolongan(MASTER_JENJANG[key].golonganList[0])
  }

  // 1. Hitung PAK Pelantikan: (Tahun * % * Koef) + (Bulan/12 * % * Koef)
  const akPakPelantikan = useMemo(() => {
    if (!enablePakPelantikan) return 0
    const akTahun = pakTahun * 1.0 * config.koefisien
    const akBulan = (pakBulan / 12) * 1.0 * config.koefisien
    return Number((akTahun + akBulan).toFixed(2))
  }, [enablePakPelantikan, pakTahun, pakBulan, config.koefisien])

  // 2. Hitung Periodik TW1-TW3 (Formula A): (Bulan/12) * % * Koef
  const periodikTw1 = useMemo(() => Number(((3 / 12) * predikatTw1 * config.koefisien).toFixed(2)), [predikatTw1, config.koefisien])
  const periodikTw2 = useMemo(() => Number(((3 / 12) * predikatTw2 * config.koefisien).toFixed(2)), [predikatTw2, config.koefisien])
  const periodikTw3 = useMemo(() => Number(((3 / 12) * predikatTw3 * config.koefisien).toFixed(2)), [predikatTw3, config.koefisien])

  // 3. Hitung AK Baru Tahunan (Formula B - TW4 Anchor Retrospektif)
  const akBaruTahunan = useMemo(() => {
    const hasil = (bulanAktif / 12) * predikatTw4 * config.koefisien
    return Number(hasil.toFixed(2))
  }, [bulanAktif, predikatTw4, config.koefisien])

  // 4. Hitung Booster Ijazah (+25% dari Kebutuhan AK KP)
  const akBooster = useMemo(() => {
    if (!hasBooster) return 0
    return Number((0.25 * config.targetKp).toFixed(2))
  }, [hasBooster, config.targetKp])

  // 5. Total Akumulasi AK Akhir
  const totalAkKumulatif = useMemo(() => {
    const total = Number(saldoAwal || 0) + akPakPelantikan + akBaruTahunan + akBooster
    return Number(total.toFixed(2))
  }, [saldoAwal, akPakPelantikan, akBaruTahunan, akBooster])

  // 6. Evaluasi Status Kelayakan & Carry-Over
  const kelayakan = useMemo(() => {
    if (totalAkKumulatif >= config.targetJenjang) {
      return {
        status: 'LAYAK_JENJANG',
        label: 'LAYAK NAIK JENJANG',
        desc: 'Total AK melampaui target jenjang jabatan. Saldo AK berikutnya di-reset ke 0 (Aturan BKN).',
        carryOver: 0,
        kurangAk: 0,
      }
    }
    if (totalAkKumulatif >= config.targetKp) {
      const sisa = Number((totalAkKumulatif - config.targetKp).toFixed(2))
      return {
        status: 'LAYAK_PANGKAT',
        label: 'LAYAK NAIK PANGKAT',
        desc: `Target kenaikan pangkat terpenuhi! Sisa ${sisa.toFixed(2)} AK ditabung sebagai deposit carry-over ke tahun depan.`,
        carryOver: sisa,
        kurangAk: 0,
      }
    }
    const kurang = Number((config.targetKp - totalAkKumulatif).toFixed(2))
    return {
      status: 'BELUM_CUKUP',
      label: 'BELUM CUKUP AK',
      desc: `Masih membutuhkan ${kurang.toFixed(2)} AK lagi untuk kenaikan pangkat berikutnya. Seluruh saldo saat ini disimpan utuh.`,
      carryOver: totalAkKumulatif,
      kurangAk: kurang,
    }
  }, [totalAkKumulatif, config.targetKp, config.targetJenjang])

  // Persentase Progress Menuju Target KP
  const progressPercent = Math.min(100, Math.round((totalAkKumulatif / config.targetKp) * 100))

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <CardHeader
        tag="Simulasi Regulasi"
        tagColor="#ba191d"
        regulation="PerBKN No. 3/2023 · Formula B (TW4 Anchor)"
        title="Kalkulator Simulasi Angka Kredit BKN"
        subtitle="Simulasikan perolehan Angka Kredit berkala, dampak predikat kinerja triwulanan, booster ijazah, dan estimasi kelayakan kenaikan pangkat secara seketika."
        actions={
          <Button
            variant="secondary"
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={handleReset}
          >
            Reset Nilai
          </Button>
        }
      />

      {/* 2. Grid 2 Kolom (Input vs Hasil Real-time) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Form Parameter (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Data Jabatan & Saldo */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Briefcase className="h-4 w-4 text-[#ba191d]" />
              <h3 className="text-sm font-extrabold text-gray-900">1. Profil Jabatan & Saldo Awal</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Jenjang Jabatan */}
              <div>
                <label className="font-bold text-gray-700 block mb-1.5">Jenjang Jabatan Fungsional</label>
                <select
                  value={selectedJenjangKey}
                  onChange={(e) => handleJenjangChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-[#ba191d]"
                >
                  {Object.entries(MASTER_JENJANG).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.nama} (Koef: {v.koefisien} AK/thn)
                    </option>
                  ))}
                </select>
              </div>

              {/* Golongan Ruang */}
              <div>
                <label className="font-bold text-gray-700 block mb-1.5">Pangkat / Golongan</label>
                <select
                  value={selectedGolongan}
                  onChange={(e) => setSelectedGolongan(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-[#ba191d]"
                >
                  {config.golonganList.map((gol) => (
                    <option key={gol} value={gol}>
                      Golongan {gol}
                    </option>
                  ))}
                </select>
              </div>

              {/* Saldo Awal / Carry-over */}
              <div>
                <label className="font-bold text-gray-700 block mb-1.5">Saldo Awal / Tabungan AK Lama</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={saldoAwal}
                    onChange={(e) => setSaldoAwal(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-[#ba191d]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">AK</span>
                </div>
              </div>

              {/* Bulan Aktif */}
              <div>
                <label className="font-bold text-gray-700 block mb-1.5">Jumlah Bulan Aktif Tahun Berjalan</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={bulanAktif}
                    onChange={(e) => setBulanAktif(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-[#ba191d]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Bulan</span>
                </div>
              </div>
            </div>

            {/* Toggle Tambah Masa Kerja Pelaksana */}
            <div className="pt-2 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enablePakPelantikan}
                  onChange={(e) => setEnablePakPelantikan(e.target.checked)}
                  className="rounded border-gray-300 text-[#ba191d] focus:ring-[#ba191d] h-4 w-4"
                />
                <span className="text-xs font-bold text-gray-800">
                  Hitung PAK Pelantikan (Konversi Masa Kerja Pelaksana)
                </span>
              </label>

              {enablePakPelantikan && (
                <div className="mt-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Masa Kerja (Tahun)</label>
                    <input
                      type="number"
                      min="0"
                      value={pakTahun}
                      onChange={(e) => setPakTahun(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Masa Kerja (Bulan)</label>
                    <input
                      type="number"
                      min="0"
                      max="11"
                      value={pakBulan}
                      onChange={(e) => setPakBulan(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div className="col-span-2 text-[11px] text-gray-500 font-medium">
                    Hasil PAK Pelantikan: <strong className="font-mono text-[#ba191d]">{akPakPelantikan.toFixed(2)} AK</strong>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Card 2: Predikat Kinerja Triwulanan (Q1–Q4) */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#ba191d]" />
                <h3 className="text-sm font-extrabold text-gray-900">2. Predikat Evaluasi Kinerja (TW1 – TW4)</h3>
              </div>
              <span className="text-[10px] font-bold text-[#ba191d] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                Formula B Retrospektif
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* TW1 */}
              <div className="p-3 rounded-xl border border-gray-200 bg-white space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span>Triwulan 1</span>
                  <span className="font-mono text-gray-500">{periodikTw1.toFixed(2)} AK</span>
                </div>
                <select
                  value={predikatTw1}
                  onChange={(e) => setPredikatTw1(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-800"
                >
                  {PREDIKAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* TW2 */}
              <div className="p-3 rounded-xl border border-gray-200 bg-white space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span>Triwulan 2</span>
                  <span className="font-mono text-gray-500">{periodikTw2.toFixed(2)} AK</span>
                </div>
                <select
                  value={predikatTw2}
                  onChange={(e) => setPredikatTw2(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-800"
                >
                  {PREDIKAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* TW3 */}
              <div className="p-3 rounded-xl border border-gray-200 bg-white space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span>Triwulan 3</span>
                  <span className="font-mono text-gray-500">{periodikTw3.toFixed(2)} AK</span>
                </div>
                <select
                  value={predikatTw3}
                  onChange={(e) => setPredikatTw3(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-800"
                >
                  {PREDIKAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* TW4 (JANGKAR) */}
              <div className="p-3 rounded-xl border-2 border-[#ba191d] bg-red-50/20 space-y-1.5">
                <div className="flex items-center justify-between font-extrabold text-[#ba191d]">
                  <div className="flex items-center gap-1.5">
                    <span>Triwulan 4</span>
                    <span className="text-[9px] bg-[#ba191d] text-white px-1.5 py-0.2 rounded">JANGKAR</span>
                  </div>
                  <span className="font-mono">{akBaruTahunan.toFixed(2)} AK</span>
                </div>
                <select
                  value={predikatTw4}
                  onChange={(e) => setPredikatTw4(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-red-200 rounded-lg font-extrabold text-gray-900"
                >
                  {PREDIKAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed italic">
              *Catatan: Sesuai Formula B PerBKN No. 3/2023, predikat <strong>TW4 mengunci nilai setahun penuh</strong> secara retrospektif (Bulan Aktif / 12 × Predikat TW4 × Koefisien).
            </p>
          </Card>

          {/* Card 3: Booster Ijazah Baru (+25%) */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-extrabold text-gray-900">3. Booster Ijazah Baru (+25%)</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasBooster}
                  onChange={(e) => setHasBooster(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ba191d]"></div>
              </label>
            </div>

            {hasBooster ? (
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <div>
                  <p className="font-extrabold text-emerald-900">Klaim Pengakuan Ijazah Baru</p>
                  <p className="text-[11px] text-emerald-700">
                    25% × Target Kenaikan Pangkat ({config.targetKp} AK)
                  </p>
                </div>
                <span className="font-mono font-black text-emerald-800 text-base">
                  +{akBooster.toFixed(2)} AK
                </span>
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                Aktifkan jika pegawai memperoleh ijazah baru yang telah diakui oleh BKN pada tahun berjalan.
              </p>
            )}
          </Card>
        </div>

        {/* Kolom Kanan: Hasil Simulasi Real-Time (5 cols) */}
        <div className="lg:col-span-5 space-y-5 sticky top-20">
          {/* Card Highlight Utama: Total AK Kumulatif */}
          <div className="bg-gradient-to-br from-red-900 to-[#ba191d] text-white p-6 rounded-2xl shadow-md space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-red-100 uppercase tracking-wider">
              <span>Hasil Simulasi AK Akhir</span>
              <Sparkles className="h-4 w-4" />
            </div>

            <div>
              <p className="text-4xl font-black font-mono tracking-tight">{totalAkKumulatif.toFixed(2)}</p>
              <p className="text-xs text-red-200 mt-1 font-medium">Total Angka Kredit Kumulatif Tahun Berjalan</p>
            </div>

            {/* Progress Menuju Target */}
            <div className="space-y-1.5 pt-3 border-t border-white/20">
              <div className="flex justify-between text-xs font-bold">
                <span>Progress Kenaikan Pangkat ({config.targetKp} AK)</span>
                <span className="font-mono">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card Badge Keputusan Kelayakan */}
          <Card className="p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
                Estimasi Status Sistem
              </span>
              {kelayakan.status === 'LAYAK_PANGKAT' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>LAYAK NAIK PANGKAT</span>
                </span>
              )}
              {kelayakan.status === 'LAYAK_JENJANG' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>LAYAK NAIK JENJANG</span>
                </span>
              )}
              {kelayakan.status === 'BELUM_CUKUP' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="h-3.5 w-3.5" />
                  <span>BELUM CUKUP AK</span>
                </span>
              )}
            </div>

            <p className="text-xs text-gray-600 leading-relaxed font-medium bg-gray-50 p-3 rounded-xl border border-gray-200/70">
              {kelayakan.desc}
            </p>

            {/* Rincian Komponen Deposit Carry-over */}
            <div className="space-y-2 pt-2 text-xs border-t border-gray-100">
              <div className="flex justify-between text-gray-500">
                <span>Saldo Awal:</span>
                <span className="font-mono font-bold text-gray-900">{saldoAwal.toFixed(2)} AK</span>
              </div>
              {enablePakPelantikan && (
                <div className="flex justify-between text-gray-500">
                  <span>PAK Pelantikan:</span>
                  <span className="font-mono font-bold text-gray-900">+{akPakPelantikan.toFixed(2)} AK</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>AK Baru Tahunan (Formula B):</span>
                <span className="font-mono font-bold text-blue-700">+{akBaruTahunan.toFixed(2)} AK</span>
              </div>
              {hasBooster && (
                <div className="flex justify-between text-gray-500">
                  <span>Booster Ijazah (+25%):</span>
                  <span className="font-mono font-bold text-emerald-700">+{akBooster.toFixed(2)} AK</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-gray-900 pt-2 border-t border-gray-100">
                <span>Estimasi Tabungan Tahun Depan:</span>
                <span className="font-mono text-[#ba191d]">{kelayakan.carryOver.toFixed(2)} AK</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
