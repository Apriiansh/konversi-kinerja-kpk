import { useState } from 'react'
import { useAuth } from '../context/useAuth'

export default function Dashboard() {
  const { user } = useAuth()
  const [blur, setBlur] = useState(true)

  const name = user?.name ?? '-'
  const email = user?.email ?? '-'
  const role = user?.role ?? '-'
  const nip = user?.pegawai?.nip ?? '-'
  const golongan = user?.pegawai?.pangkat_golongan?.golongan ?? '-'
  const jenjang = user?.pegawai?.pangkat_golongan?.jenjang_jabatan?.nama ?? '-'

  const isAdmin = role.toUpperCase() === 'ADMIN'

  const fields: Array<[string, string, boolean]> = [
    ['NIP', nip, true],
    ['Status Kepegawaian', isAdmin ? 'PNS' : 'PNS', false],
    ['Jabatan', jenjang, false],
    ['Unit Kerja', 'KPK', false],
    ['Email', email, false],
    ['Telepon', '—', true],
    ['Alamat', '—', true],
  ]

  const mask = (v: string) => (blur && v && v !== '-' ? '••••••••' : v)

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <img
          src="/gambar-3.jpg"
          alt=""
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[280px] object-cover opacity-40 mix-blend-multiply sm:block"
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-white/80 to-transparent" />
        <div className="relative">
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-extrabold text-[#ba191d] ring-1 ring-red-200">
            {isAdmin ? 'Admin' : 'Pegawai'}
          </span>
          <h1 className="mt-2 text-xl font-extrabold text-gray-900">Selamat datang, {name}</h1>
          <p className="mt-1 font-mono text-sm font-bold tracking-tight text-gray-500">
            NIP {mask(nip)}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-bold text-gray-500">AK Lama</p>
          <p className="mt-1 font-mono text-2xl font-extrabold tracking-tight text-gray-900">
            100.00
          </p>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-bold text-gray-500">AK Baru</p>
          <p className="mt-1 font-mono text-2xl font-extrabold tracking-tight text-gray-900">
            18.75
          </p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-[#6b1118] to-[#ba191d] p-4 text-white shadow-md">
          <p className="text-xs font-bold text-white/80">Total AK Kumulatif</p>
          <p className="mt-1 font-mono text-2xl font-extrabold tracking-tight">
            {blur ? '•••.••' : '118.75'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="relative overflow-hidden rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs xl:col-span-2">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-2xl font-extrabold text-[#ba191d] ring-2 ring-red-100">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-base font-extrabold text-gray-900">{name}</p>
              <p className="font-mono text-xs font-bold tracking-tight text-gray-500">
                {golongan} · {jenjang}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBlur((v) => !v)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-100"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {blur ? (
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
            {blur ? 'Tampilkan data sensitif' : 'Sembunyikan data sensitif'}
          </button>
        </div>

        <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs xl:col-span-3">
          <h2 className="text-base font-extrabold text-gray-900">Profil</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fields.map(([label, value, sensitive]) => (
              <div
                key={label}
                className="rounded-lg border border-gray-200/70 bg-[#fafbfc] p-3"
              >
                <p className="text-[11px] font-bold text-gray-500">{label}</p>
                <p className="mt-0.5 font-mono text-sm font-bold tracking-tight text-gray-800">
                  {sensitive ? mask(value) : value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}