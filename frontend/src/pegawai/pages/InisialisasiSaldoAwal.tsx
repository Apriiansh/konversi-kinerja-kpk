export default function InisialisasiSaldoAwal() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
        <h1 className="text-xl font-black text-gray-900">Inisialisasi Saldo Awal (AK Lama)</h1>
        <p className="mt-1 text-xs text-gray-500">
          Input dan kelola akumulasi saldo Angka Kredit lama Pegawai sebelum konversi tahun 2023.
        </p>

        <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-[#ba191d]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <h3 className="mt-4 text-sm font-bold text-gray-900">Unggah Dokumen Penetapan AK Lama</h3>
          <p className="mt-1 text-xs text-gray-500">Format PDF / SK PAK Konvensional Terakhir (Maksimal 5MB)</p>
          <button
            type="button"
            className="mt-4 inline-flex items-center rounded-full bg-[#ba191d] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-colors cursor-pointer"
          >
            Pilih File SK PAK
          </button>
        </div>
      </div>
    </div>
  )
}
