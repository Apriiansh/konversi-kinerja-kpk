import { useState } from 'react'

export default function PengajuanPendidikan() {
  const [jenjang, setJenjang] = useState<'D3' | 'S1' | 'S2' | 'S3'>('S2')
  const [jurusan, setJurusan] = useState('Magister Ilmu Komunikasi')
  const [institusi, setInstitusi] = useState('Universitas Indonesia')
  const [tahunLulus, setTahunLulus] = useState('2025')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
    }, 600)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">Pengajuan Pendidikan Baru (+25% AK Booster)</h1>
            <p className="mt-1 text-xs text-gray-500">
              Ajukan ijazah tingkat pendidikan lebih tinggi untuk memperoleh peningkatan Angka Kredit (AK Booster 25%).
            </p>
          </div>
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-[#ba191d]">
            Fitur Pegawai
          </span>
        </div>

        {submitted ? (
          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="mt-3 text-base font-bold text-gray-900">Pengajuan Pendidikan Berhasil Terkirim!</h3>
            <p className="mt-1 text-xs text-gray-600">
              Berkas Anda sedang berada dalam tahap verifikasi oleh Tim Kepegawaian KPK dan BKN.
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-4 rounded-full bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Buat Pengajuan Lain
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-gray-700">Jenjang Pendidikan</label>
                <select
                  value={jenjang}
                  onChange={(e) => setJenjang(e.target.value as 'D3' | 'S1' | 'S2' | 'S3')}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#ba191d]"
                >
                  <option value="D3">Diploma 3 (D3)</option>
                  <option value="S1">Sarjana (S1 / D4)</option>
                  <option value="S2">Magister / Master (S2)</option>
                  <option value="S3">Doktor (S3)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Tahun Lulus</label>
                <input
                  type="text"
                  value={tahunLulus}
                  onChange={(e) => setTahunLulus(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#ba191d]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700">Jurusan / Program Studi</label>
              <input
                type="text"
                value={jurusan}
                onChange={(e) => setJurusan(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#ba191d]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700">Nama Perguruan Tinggi / Institusi</label>
              <input
                type="text"
                value={institusi}
                onChange={(e) => setInstitusi(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#ba191d]"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-gray-700">File Transkrip & Ijazah (PDF)</label>
                <input
                  type="file"
                  accept=".pdf"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-red-50 file:px-3 file:py-1 file:text-xs file:font-bold file:text-[#ba191d]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Bukti Persetujuan BKN (PDF)</label>
                <input
                  type="file"
                  accept=".pdf"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-red-50 file:px-3 file:py-1 file:text-xs file:font-bold file:text-[#ba191d]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-[#ba191d] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Mengirim...' : 'Kirim Pengajuan Pendidikan'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
