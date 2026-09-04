import { api } from "./client"
import type {
  PangkatGolongan,
  KelayakanInfo,
  PenetapanAKItem,
  RekapDetailData,
  TriwulanBlock,
  TriwulanRincianItem,
} from "../types"

export type {
  PangkatGolongan,
  KelayakanInfo,
  PenetapanAKItem,
  RekapDetailData,
  TriwulanBlock,
  TriwulanRincianItem,
}

// 1. Get list PAK Recap (paginated)
export async function getRekapitulasiList(params?: {
  tahun?: number
  page?: number
  per_page?: number
}): Promise<{ data: PenetapanAKItem[]; current_page: number; total: number; last_page: number }> {
  const response = await api.get('/rekapitulasi', { params })
  return response.data.data
}

// 2. Get detail recapitulation PAK & target (triwulan) 1 staff
export async function getRekapitulasiDetail(pegawaiId: string, tahun: number): Promise<RekapDetailData> {
  const response = await api.get(`/rekapitulasi/${pegawaiId}/${tahun}`)
  return response.data.data
}

// 3. Finalization end of the year
export async function finalizePak(
  pegawaiId: string,
  tahun: number,
  predikatTw4Id?: string
): Promise<{ message: string; data: { penetapan: PenetapanAKItem; kelayakan: KelayakanInfo } }> {
  const response = await api.post(`/rekapitulasi/${pegawaiId}/${tahun}/finalisasi`, {
    predikat_tw4_id: predikatTw4Id
  })
  return response.data
}

// 4. Download rekapitulasi XLSX export
export async function downloadRekapitulasiXlsx(tahun?: number): Promise<void> {
  const params = tahun ? { tahun } : {}
  const response = await api.get('/rekapitulasi/export', {
    params,
    responseType: 'blob',
  })
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = tahun ? `rekap_konversi_pak_kpk_${tahun}.xlsx` : 'rekap_konversi_pak_kpk_semua_tahun.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}
