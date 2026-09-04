import { useState } from 'react'

export default function KalkulatorBKN() {
  const [jabatan, setJabatan] = useState('Ahli Pertama')
  const [predikat, setPredikat] = useState('Sangat Baik')
  const [bulan, setBulan] = useState(12)

  // Koefisien berdasarkan Perban BKN No. 3/2023
  const koefisienMap: Record<string, number> = {
    'Ahli Pertama': 12.5,
    'Ahli Muda': 25.0,
    'Ahli Madya': 37.5,
    'Ahli Utama': 50.0,
  }

  const predikatMap: Record<string, number> = {
    'Sangat Baik': 1.5,
    'Baik': 1.0,
    'Cukup': 0.75,
    'Kurang': 0.5,
    'Sangat Kurang': 0.25,
  }

  const koefisien = koefisienMap[jabatan] ?? 12.5
  const persentase = predikatMap[predikat] ?? 1.0
  const hasilAK = (koefisien * persentase * (bulan / 12)).toFixed(3)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
        <h1 className="text-xl font-black text-gray-900">Kalkulator BKN (Perban No. 3/2023)</h1>
        <p className="mt-1 text-xs text-gray-500">
          Simulasi konversi predikat kinerja tahunan / periodik menjadi Angka Kredit Jabatan Fungsional.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Form Simulasi */}
          <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-5">
            <div>
              <label className="block text-xs font-bold text-gray-700">Jenjang Jabatan Fungsional</label>
              <select
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#ba191d]"
              >
                <option value="Ahli Pertama">Ahli Pertama (Koefisien: 12.5)</option>
                <option value="Ahli Muda">Ahli Muda (Koefisien: 25.0)</option>
                <option value="Ahli Madya">Ahli Madya (Koefisien: 37.5)</option>
                <option value="Ahli Utama">Ahli Utama (Koefisien: 50.0)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700">Predikat Evaluasi Kinerja</label>
              <select
                value={predikat}
                onChange={(e) => setPredikat(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#ba191d]"
              >
                <option value="Sangat Baik">Sangat Baik (150%)</option>
                <option value="Baik">Baik (100%)</option>
                <option value="Cukup">Cukup (75%)</option>
                <option value="Kurang">Kurang (50%)</option>
                <option value="Sangat Kurang">Sangat Kurang (25%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700">Jumlah Bulan Evaluasi</label>
              <input
                type="number"
                min="1"
                max="12"
                value={bulan}
                onChange={(e) => setBulan(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#ba191d]"
              />
            </div>
          </div>

          {/* Hasil Kalkulasi */}
          <div className="flex flex-col justify-between rounded-xl bg-gradient-to-br from-[#8b1518] to-[#ba191d] p-6 text-white shadow-md">
            <div>
              <span className="text-xs font-bold text-white/80">Hasil Konversi Angka Kredit</span>
              <h2 className="mt-4 text-4xl font-black font-mono tracking-tight">{hasilAK}</h2>
              <p className="mt-2 text-xs text-white/90 font-medium">
                Kalkulasi: {koefisien} × {(persentase * 100)}% × ({bulan}/12)
              </p>
            </div>

            <div className="mt-6 border-t border-white/20 pt-4 text-[11px] text-white/80">
              *Perhitungan mengikuti ketentuan Peraturan BKN Nomor 3 Tahun 2023 tentang Angka Kredit, Kenaikan Pangkat dan Jenjang Jabatan Fungsional.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
