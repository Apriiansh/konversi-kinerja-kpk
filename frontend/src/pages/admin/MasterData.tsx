import { useEffect, useState } from 'react'
import {
  Award,
  BarChart3,
  Hash,
  GraduationCap,
  RefreshCw,
  Info,
  FileText,
} from 'lucide-react'
import { Card, CardHeader, Alert, StatCard } from '../../components/ui'
import { getMasterData } from '../../api/masterData'
import type { MasterDataResponse, JenjangJabatan, PredikatKinerja, AkDasar } from '../../types'

type TabKey = 'jenjang' | 'predikat' | 'ak_dasar'

export const MasterData: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MasterDataResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('jenjang')

  useEffect(() => {
    setLoading(true)
    getMasterData()
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.response?.data?.message || err.message))
      .finally(() => setLoading(false))
  }, [])

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count: number }[] = !data
    ? []
    : [
        { key: 'jenjang', label: 'Jenjang Jabatan', icon: <GraduationCap className="h-3.5 w-3.5" />, count: data.jenjang_jabatan.length },
        { key: 'predikat', label: 'Predikat Kinerja', icon: <Award className="h-3.5 w-3.5" />, count: data.predikat_kinerja.length },
        { key: 'ak_dasar', label: 'AK Dasar (Pangkat)', icon: <BarChart3 className="h-3.5 w-3.5" />, count: data.ak_dasar.length },
      ]

  const jenjangData: JenjangJabatan[] = data?.jenjang_jabatan ?? []
  const predikatData: PredikatKinerja[] = data?.predikat_kinerja ?? []
  const akDasarData: AkDasar[] = data?.ak_dasar ?? []

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <CardHeader
        tag="Master Data"
        regulation="PerBKN No. 3/2023"
        title="Referensi Acuan Konversi Kinerja"
        subtitle="Jenjang jabatan, koefisien, predikat kinerja, dan AK dasar yang menjadi acuan perhitungan di seluruh modul."
        actions={
          <button
            onClick={() => {
              setLoading(true)
              setError(null)
              getMasterData()
                .then((res) => setData(res.data))
                .catch((err) => setError(err?.response?.data?.message || err.message))
                .finally(() => setLoading(false))
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-xs hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Muat Ulang
          </button>
        }
      />

      {/* 2. Alert Feedback */}
      {error && (
        <Alert variant="error" title="Gagal Memuat Data:" message={error} onDismiss={() => setError(null)} />
      )}

      {/* 3. Loading State */}
      {loading && (
        <div className="flex items-center justify-center gap-2.5 rounded-xl bg-blue-50 border border-blue-200 p-5 text-xs font-bold text-blue-800">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
          <span>Sedang memuat data referensi dari server...</span>
        </div>
      )}

      {/* 4. Stat Cards */}
      {!loading && data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
          <StatCard
            label="Jenjang Jabatan"
            value={data.jenjang_jabatan.length}
            suffix="Level"
            icon={<GraduationCap className="h-4 w-4 text-blue-600" />}
            color="blue"
          />
          <StatCard
            label="Predikat Kinerja"
            value={data.predikat_kinerja.length}
            suffix="Kategori"
            icon={<Award className="h-4 w-4 text-emerald-600" />}
            color="emerald"
          />
          <StatCard
            label="AK Dasar"
            value={data.ak_dasar.length}
            suffix="Kombinasi"
            icon={<BarChart3 className="h-4 w-4 text-amber-600" />}
            color="amber"
          />
        </div>
      )}

      {/* 5. Tab Navigation */}
      {!loading && data && (
        <>
          <Card className="p-3.5 flex items-center gap-1.5 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-[#ba191d] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.icon}
                {tab.label}
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                    activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </Card>

          {/* 6. Content Panels */}
          {/* ── Jenjang Jabatan ── */}
          {activeTab === 'jenjang' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-gray-900">
                        Jenjang Jabatan & Koefisien
                      </h2>
                      <p className="text-[11px] font-medium text-gray-400">
                        Koefisien AK/tahun & target kenaikan pangkat/jenjang per level jabatan
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                    <Info className="h-3.5 w-3.5 text-[#ba191d]" />
                    <span>{jenjangData.length} data</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-200/80 text-gray-500 font-extrabold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-3.5">Nama Jenjang</th>
                        <th className="py-3 px-3.5 text-right">Koefisien / Tahun</th>
                        <th className="py-3 px-3.5 text-right">Target AK Naik Pangkat</th>
                        <th className="py-3 px-3.5 text-right">Target AK Naik Jenjang</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {jenjangData.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-gray-400">
                            <p className="font-bold text-gray-500">Tidak ada data jenjang.</p>
                            <p className="text-[11px] mt-0.5">Data belum tersedia pada sistem.</p>
                          </td>
                        </tr>
                      ) : (
                        jenjangData.map((j: JenjangJabatan) => (
                          <tr key={j.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3 px-3.5">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-gray-900 text-xs">{j.nama}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3.5 text-right">
                              <span className="font-mono font-bold text-blue-700">
                                {Number(j.koefisien_tahunan).toFixed(2)}
                              </span>
                              <span className="text-[10px] font-medium text-gray-400 ml-1">AK/thn</span>
                            </td>
                            <td className="py-3 px-3.5 text-right">
                              <span className="font-mono font-bold text-emerald-700">
                                {Number(j.kebutuhan_ak_kp).toFixed(2)}
                              </span>
                              <span className="text-[10px] font-medium text-gray-400 ml-1">AK</span>
                            </td>
                            <td className="py-3 px-3.5 text-right">
                              <span className="font-mono font-bold text-amber-700">
                                {Number(j.kebutuhan_ak_jenjang).toFixed(2)}
                              </span>
                              <span className="text-[10px] font-medium text-gray-400 ml-1">AK</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Info Box */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-blue-900">Catatan Regulasi</p>
                  <p className="font-medium mt-0.5">
                    Koefisien tahunan menentukan besar AK dasar yang diperoleh pegawai per tahun.
                    Target AK naik pangkat dan naik jenjang berbeda untuk setiap level jabatan fungsional
                    sesuai PerBKN No. 3/2023.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Predikat Kinerja ── */}
          {activeTab === 'predikat' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-gray-900">
                        Predikat Kinerja
                      </h2>
                      <p className="text-[11px] font-medium text-gray-400">
                        Kategori penilaian kinerja pegawai & persentase konversi ke Angka Kredit
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                    <Info className="h-3.5 w-3.5 text-[#ba191d]" />
                    <span>{predikatData.length} data</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-200/80 text-gray-500 font-extrabold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-3.5">Nama Predikat</th>
                        <th className="py-3 px-3.5 text-right">Persentase Konversi</th>
                        <th className="py-3 px-3.5">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {predikatData.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-gray-400">
                            <FileText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                            <p className="font-bold text-gray-500">Belum ada data predikat kinerja.</p>
                          </td>
                        </tr>
                      ) : (
                        predikatData.map((p: PredikatKinerja) => {
                          const pct = Number(p.persentase_konversi) * 100
                          const badgeColor =
                            pct >= 100
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : pct >= 80
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          return (
                            <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="py-3 px-3.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-gray-900 text-xs">{p.nama}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3.5 text-right">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${badgeColor}`}
                                >
                                  {pct}%
                                </span>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Info Box */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-emerald-900">Cara Baca</p>
                  <p className="font-medium mt-0.5">
                    Persentase konversi dikalikan dengan AK dasar jabatan untuk menghasilkan AK baru per triwulan.
                    Misal: Predikat "Sangat Baik" (100%) dijabatan Ahli Pertama (koefisien 0.68)
                    menghasilkan 0.68 × 100% = 0.68 AK per 3 bulan.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── AK Dasar ── */}
          {activeTab === 'ak_dasar' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-gray-900">
                        III. AK Dasar (Pangkat / Golongan)
                      </h2>
                      <p className="text-[11px] font-medium text-gray-400">
                        Mapping golongan ruang ke jenjang jabatan & AK dasar per kombinasi
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                    <Info className="h-3.5 w-3.5 text-[#ba191d]" />
                    <span>{akDasarData.length} data</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-200/80 text-gray-500 font-extrabold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-3.5">Golongan Ruang</th>
                        <th className="py-3 px-3.5">Jenjang Jabatan</th>
                        <th className="py-3 px-3.5">Kunci Pencarian</th>
                        <th className="py-3 px-3.5 text-right">AK Dasar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {akDasarData.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-gray-400">
                            <FileText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                            <p className="font-bold text-gray-500">Belum ada data AK dasar.</p>
                          </td>
                        </tr>
                      ) : (
                        akDasarData.map((a: AkDasar) => (
                          <tr key={a.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3 px-3.5">
                              <span className="font-mono font-extrabold text-gray-900 text-xs">
                                {a.golongan_ruang}
                              </span>
                            </td>
                            <td className="py-3 px-3.5">
                              <span className="font-bold text-gray-700 text-xs">
                                {a.jenjang_jabatan}
                              </span>
                            </td>
                            <td className="py-3 px-3.5">
                              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 border border-gray-200">
                                <Hash className="h-3 w-3 mr-1 text-gray-400" />
                                {a.kunci_pencarian}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-right">
                              <span className="font-mono font-black text-amber-700 text-sm">
                                {Number(a.ak_dasar).toFixed(2)}
                              </span>
                              <span className="text-[10px] font-medium text-gray-400 ml-1">AK</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Info Box */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-amber-900">Tentang AK Dasar</p>
                  <p className="font-medium mt-0.5">
                    AK dasar ditentukan oleh golongan ruang pegawai dan jenjang jabatan fungsional yang diembannya.
                    Nilai ini menjadi basis perkalian predikat kinerja untuk menghitung AK baru per periode.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default MasterData
