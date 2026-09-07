import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function FloatingKalkulator() {
  const [open, setOpen] = useState(false)
  const [jabatan, setJabatan] = useState('Ahli Pertama')
  const [predikat, setPredikat] = useState('Sangat Baik')
  const [bulan, setBulan] = useState(12)

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
    <>
      {/* Floating circular N button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#800f13] via-[#ba191d] to-[#9c1317] text-white shadow-lg shadow-red-900/30 ring-4 ring-white cursor-pointer select-none"
        aria-label="Buka Kalkulator BKN"
        title="Kalkulator BKN"
      >
        <i className="fa-solid fa-calculator text-lg" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[59] bg-slate-900/20 backdrop-blur-[1px]"
              onClick={() => setOpen(false)}
            />
            {/* expandable panel */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              className="fixed bottom-24 right-6 z-[60] w-[92vw] max-w-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
              {/* header */}
              <div className="flex items-center justify-between bg-gradient-to-r from-[#800f13] to-[#ba191d] px-5 py-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                    <i className="fa-solid fa-calculator text-sm" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black leading-none">Kalkulator BKN</h3>
                    <p className="text-[11px] font-medium text-white/80">Perban No. 3/2023</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors cursor-pointer"
                  aria-label="Tutup"
                >
                  <i className="fa-solid fa-xmark text-xs" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                  

                <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Jenjang Jabatan Fungsional</label>
                    <select
                      value={jabatan}
                      onChange={(e) => setJabatan(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ba191d]"
                    >
                      <option value="Ahli Pertama">Ahli Pertama (Koefisien: 12.5)</option>
                      <option value="Ahli Muda">Ahli Muda (Koefisien: 25.0)</option>
                      <option value="Ahli Madya">Ahli Madya (Koefisien: 37.5)</option>
                      <option value="Ahli Utama">Ahli Utama (Koefisien: 50.0)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Predikat Evaluasi Kinerja</label>
                    <select
                      value={predikat}
                      onChange={(e) => setPredikat(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ba191d]"
                    >
                      <option value="Sangat Baik">Sangat Baik (150%)</option>
                      <option value="Baik">Baik (100%)</option>
                      <option value="Cukup">Cukup (75%)</option>
                      <option value="Kurang">Kurang (50%)</option>
                      <option value="Sangat Kurang">Sangat Kurang (25%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Jumlah Bulan Evaluasi</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={bulan}
                      onChange={(e) => setBulan(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ba191d]"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-gradient-to-br from-[#8b1518] to-[#ba191d] p-5 text-white shadow-md">
                  <span className="text-xs font-bold text-white/80">Hasil Konversi Angka Kredit</span>
                  <h4 className="mt-2 text-3xl font-black font-mono tracking-tight">{hasilAK}</h4>
                  <p className="mt-2 text-xs text-white/90 font-medium">Kalkulasi: {koefisien} × {(persentase * 100)}% × ({bulan}/12)</p>
                  <p className="mt-3 border-t border-white/20 pt-3 text-[11px] text-white/75 leading-relaxed">
                    *Peraturan BKN No. 3/2023 tentang Angka Kredit, Kenaikan Pangkat dan Jenjang Jabatan Fungsional.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
