export default function PenilaianTriwulan() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
        <h1 className="text-xl font-black text-gray-900">Penilaian Triwulan</h1>
        <p className="mt-1 text-xs text-gray-500">
          Hasil evaluasi predikat kinerja triwulanan dan perhitungan konversi Angka Kredit berjalan.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          {['Triwulan I', 'Triwulan II', 'Triwulan III', 'Triwulan IV'].map((t, idx) => (
            <div key={t} className="rounded-xl border border-gray-100 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-bold text-gray-400">{t} · 2026</span>
              <h4 className="mt-1 text-base font-extrabold text-gray-800">
                {idx < 3 ? 'Sangat Baik (150%)' : 'Belum Dievaluasi'}
              </h4>
              <p className="mt-2 text-xs font-mono font-bold text-emerald-600">
                {idx < 3 ? '+4.6875 AK' : '0.000 AK'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
