export default function RekapitulasiPAK() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900">Rekapitulasi & Penetapan AK (PAK)</h1>
            <p className="mt-1 text-xs text-gray-500">
              Rincian akumulasi Angka Kredit kumulatif dan kelayakan kenaikan pangkat/jenjang.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-[#ba191d] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Unduh Draff SK PAK</span>
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="border-b border-gray-100 bg-gray-50/50 text-[11px] uppercase font-bold text-gray-500">
              <tr>
                <th className="py-3 px-4">Tahun</th>
                <th className="py-3 px-4">AK Dasar</th>
                <th className="py-3 px-4">AK Lama</th>
                <th className="py-3 px-4">AK Baru</th>
                <th className="py-3 px-4">AK Booster</th>
                <th className="py-3 px-4">AK Kumulatif</th>
                <th className="py-3 px-4">Status Kelayakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-3 px-4 font-bold text-gray-900">2026 (Berjalan)</td>
                <td className="py-3 px-4 font-mono">0.000</td>
                <td className="py-3 px-4 font-mono">0.000</td>
                <td className="py-3 px-4 font-mono text-emerald-600 font-bold">+18.750</td>
                <td className="py-3 px-4 font-mono">0.000</td>
                <td className="py-3 px-4 font-mono font-bold text-gray-900">18.750</td>
                <td className="py-3 px-4">
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                    Belum Cukup KP (38%)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
