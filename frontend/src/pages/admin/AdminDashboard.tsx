import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  ChevronRight,
  RefreshCw,
  Layers,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { getRekapitulasiList, getRingkasan } from '../../api/rekapitulasi'
import { getPengajuanList } from '../../api/pengajuan'
import {
  Card,
  CardHeader,
  StatCard,
  Alert,
  StatusBadge,
} from '../../components/ui'
import type { PenetapanAKItem, PengajuanPendidikanItem } from '../../types'

interface RingkasanData {
  total_pegawai: number
  per_jenjang: Record<string, number>
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth()

  const [ringkasan, setRingkasan] = useState<RingkasanData | null>(null)
  const [rekapTerbaru, setRekapTerbaru] = useState<PenetapanAKItem[]>([])
  const [pengajuanPending, setPengajuanPending] = useState<PengajuanPendidikanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()

  const loadAll = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const [ring, rekap, pengajuan] = await Promise.allSettled([
        getRingkasan(),
        getRekapitulasiList({ tahun: currentYear, per_page: 5 }),
        getPengajuanList({ per_page: 50 }),
      ])

      if (ring.status === 'fulfilled') setRingkasan(ring.value)
      if (rekap.status === 'fulfilled') setRekapTerbaru(rekap.value.data)
      if (pengajuan.status === 'fulfilled')
        setPengajuanPending(pengajuan.value.data.filter((p) => p.status === 'DIAJUKAN'))
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Gagal memuat data dashboard admin.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const countStatus = (status: string) =>
    rekapTerbaru.filter((r) => r.status_kelayakan === status).length

  const totalJenjang = ringkasan?.per_jenjang
    ? Object.values(ringkasan.per_jenjang).reduce((a, b) => a + b, 0)
    : 0

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <CardHeader
        tag="Dashboard Admin"
        regulation="PerBKN No. 3/2023"
        title="Ringkasan Pengelolaan Konversi Kinerja"
        subtitle={`Halo, ${user?.name ?? 'Admin'} — pantau data pegawai, capaian Angka Kredit, kelayakan kenaikan pangkat, dan antrean verifikasi pendidikan di bawah ini.`}
        actions={
          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            Muat Ulang
          </button>
        }
      />

      {/* 2. Alert Error */}
      {errorMessage && (
        <Alert variant="error" message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}

      {/* 3. Statistik Utama */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Pegawai"
          value={ringkasan?.total_pegawai ?? '—'}
          icon={<Users className="h-4 w-4 text-gray-400" />}
          color="default"
        />
        <StatCard
          label="Jenjang Terisi"
          value={totalJenjang}
          suffix="Pegawai"
          icon={<Layers className="h-4 w-4 text-[#ba191d]" />}
          color="blue"
        />
        <StatCard
          label="Layak Naik Pangkat"
          value={countStatus('LAYAK_PANGKAT')}
          suffix="Tahun Ini"
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          color="emerald"
        />
        <StatCard
          label="Layak Naik Jenjang"
          value={countStatus('LAYAK_JENJANG')}
          suffix="Tahun Ini"
          icon={<Layers className="h-4 w-4 text-blue-600" />}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* 4. Sebaran Jenjang Jabatan */}
        <Card className="xl:col-span-1">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#ba191d]" />
              <h3 className="text-sm font-extrabold text-gray-900">Sebaran Jenjang Jabatan</h3>
            </div>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
              {ringkasan ? Object.keys(ringkasan.per_jenjang).length : 0} Jenjang
            </span>
          </div>
          <div className="space-y-3 p-5">
            {!ringkasan ? (
              <p className="py-6 text-center text-xs text-gray-400">Memuat sebaran jenjang...</p>
            ) : Object.keys(ringkasan.per_jenjang).length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">Belum ada data pegawai.</p>
            ) : (
              Object.entries(ringkasan.per_jenjang).map(([nama, jml]) => {
                const pct = totalJenjang > 0 ? Math.round((jml / totalJenjang) * 100) : 0
                return (
                  <div key={nama}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-700">{nama}</span>
                      <span className="font-mono font-extrabold text-gray-900">{jml}</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#ba191d] to-[#9c1317]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* 5. Capaian Kinerja & Kelayakan */}
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#ba191d]" />
              <h3 className="text-sm font-extrabold text-gray-900">Capaian Akumulasi AK Terbaru</h3>
            </div>
            <Link
              to="/admin/rekapitulasi"
              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#ba191d] hover:underline"
            >
              Lihat Semua <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/80 text-gray-500 font-extrabold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-5">Pegawai</th>
                  <th className="py-2.5 px-3.5">Golongan</th>
                  <th className="py-2.5 px-3.5 font-black text-gray-900">Total AK</th>
                  <th className="py-2.5 px-3.5 text-center">Status Kelayakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rekapTerbaru.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-gray-400">
                      <FileText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                      <p className="font-bold text-gray-500">Belum ada data rekapitulasi tahun {currentYear}.</p>
                    </td>
                  </tr>
                ) : (
                  rekapTerbaru.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-5">
                        <p className="font-extrabold text-gray-900">{item.pegawai?.nama_lengkap ?? '-'}</p>
                        <p className="font-mono text-[11px] font-bold text-gray-500">{item.pegawai?.nip ?? '-'}</p>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-mono font-extrabold text-gray-800">
                          {item.pegawai?.pangkat_golongan?.golongan ?? '-'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono font-black text-gray-900">
                        {Number(item.ak_kumulatif || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {item.status_kelayakan && <StatusBadge status={item.status_kelayakan} />}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* 6. Antrean Pengajuan Pendidikan */}
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-extrabold text-gray-900">Menunggu Verifikasi Pendidikan</h3>
            </div>
            <Link
              to="/admin/pengajuan"
              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#ba191d] hover:underline"
            >
              Verifikasi Sekarang <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {pengajuanPending.length === 0 ? (
              <p className="py-10 text-center text-xs text-gray-400">
                Tidak ada pengajuan yang sedang menunggu verifikasi.
              </p>
            ) : (
              pengajuanPending.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-gray-900">
                        {p.pegawai?.nama_lengkap ?? 'Pegawai'}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {p.jenjang_pendidikan} · {p.jurusan}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                    DIAJUKAN
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* 7. Quick Actions */}
        <Card className="xl:col-span-1">
          <div className="border-b border-gray-100 px-5 py-3.5">
            <h3 className="text-sm font-extrabold text-gray-900">Aksi Cepat</h3>
          </div>
          <div className="space-y-2.5 p-5">
            <Link
              to="/admin/import"
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 transition-colors hover:border-red-200 hover:bg-red-50/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#ba191d] ring-1 ring-red-100">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-gray-900">Import & Konversi Massal</p>
                <p className="text-[11px] text-gray-500">Unggah data pegawai baru</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </Link>
            <Link
              to="/admin/master-data"
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 transition-colors hover:border-red-200 hover:bg-red-50/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <Layers className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-gray-900">Kelola Master Data</p>
                <p className="text-[11px] text-gray-500">Jenjang, predikat & AK dasar</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </Link>
            <Link
              to="/admin/pegawai"
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 transition-colors hover:border-red-200 hover:bg-red-50/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-700 ring-1 ring-gray-200">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-gray-900">Kelola Data Pegawai</p>
                <p className="text-[11px] text-gray-500">Segera hadir</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
