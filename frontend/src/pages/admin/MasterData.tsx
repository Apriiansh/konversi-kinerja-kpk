import { useEffect, useState } from 'react'
import { Card, CardHeader } from '../../components/ui/Card'
import { getMasterData } from '../../api/masterData'

export const MasterData: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getMasterData()
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.response?.data?.message || err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <CardHeader title="Master Data Acuan Peraturan BKN 3/2023" subtitle="Referensi jenjang jabatan, predikat kinerja, dan AK dasar yang digunakan di sistem." tag="PerBKN 3/2023" />

      <Card className="p-4">
        {loading && <p className="text-sm text-gray-500">Memuat master data …</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && data && (
          <div className="space-y-6">
            <section>
              <h2 className="text-sm font-extrabold text-gray-800 mb-2">I. Jenjang Jabatan & Koefisien</h2>
              <div className="overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500">
                      <th className="pr-4">Nama</th>
                      <th className="pr-4">Koefisien AK / Tahun</th>
                      <th className="pr-4">Target AK Naik Pangkat</th>
                      <th className="pr-4">Target AK Naik Jenjang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.jenjang_jabatan.map((j: any) => (
                      <tr key={j.id} className="border-t">
                        <td className="py-2">{j.nama}</td>
                        <td className="py-2">{j.koefisien_tahunan}</td>
                        <td className="py-2">{j.kebutuhan_ak_kp}</td>
                        <td className="py-2">{j.kebutuhan_ak_jenjang}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-extrabold text-gray-800 mb-2">II. Predikat Kinerja</h2>
              <div className="overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500">
                      <th className="pr-4">Nama</th>
                      <th className="pr-4">Persentase Konversi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.predikat_kinerja.map((p: any) => (
                      <tr key={p.id} className="border-t">
                        <td className="py-2">{p.nama}</td>
                        <td className="py-2">{p.persentase_konversi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-extrabold text-gray-800 mb-2">III. AK Dasar (Pangkat / Golongan)</h2>
              <div className="overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500">
                      <th className="pr-4">Kunci Pencarian</th>
                      <th className="pr-4">Jenjang Jabatan</th>
                      <th className="pr-4">Golongan Ruang</th>
                      <th className="pr-4">AK Dasar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ak_dasar.map((a: any) => (
                      <tr key={a.id} className="border-t">
                        <td className="py-2">{a.kunci_pencarian}</td>
                        <td className="py-2">{a.jenjang_jabatan}</td>
                        <td className="py-2">{a.golongan_ruang}</td>
                        <td className="py-2">{a.ak_dasar}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </Card>
    </div>
  )
}

export default MasterData
