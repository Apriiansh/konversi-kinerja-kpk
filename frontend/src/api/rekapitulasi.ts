import { api } from './client'

export interface TriwulanData {
  triwulan: number
  label: string
  jumlah_bulan: number
  ak_total: number
  rincian: Array<{
    id: string
    triwulan: number
    jumlah_bulan: number
    periode_bulan: number
    predikat?: string
    angka_kredit: number
    is_locked: boolean
  }>
}

export interface DetailPakResponse {
  message: string
  data: {
    pegawai: {
      id: string
      nama_lengkap: string
      nip: string
      pendidikan_terakhir?: string
      tmt_jabatan?: string
    }
    pangkat: {
      golongan?: string
      jenjang?: string
      koefisien?: number
    }
    tahun: number
    ak_dasar: number
    ak_pak_pelantikan: number
    ak_historis: number
    ak_lama: number
    ak_baru: number
    ak_booster: number
    ak_carry_over: number
    ak_kumulatif: number
    is_final: boolean
    kelayakan: {
      status: string
      badge_label: string
      badge_color: string
      target_kp: number
      target_jenjang: number
      carry_over: number
      kurang_ak: number
      catatan?: string
    }
    triwulan: Record<string, TriwulanData>
    sum_ak_periodik: number
    total_ak_baru: number
  }
}

export async function getRekapitulasiList(tahun?: number) {
  const { data } = await api.get('/rekapitulasi', {
    params: tahun ? { tahun } : {},
  })
  return data
}

export async function getDetailPak(pegawaiId: string, tahun: number): Promise<DetailPakResponse['data']> {
  const { data } = await api.get<DetailPakResponse>(`/rekapitulasi/${pegawaiId}/${tahun}`)
  return data.data
}

// Pengajuan Pendidikan
export interface PengajuanPendidikanItem {
  id: string
  pegawai_id: string
  jenjang_pendidikan: string
  jurusan: string
  nama_institusi: string
  tahun_lulus: number
  status: 'DIAJUKAN' | 'DITOLAK_ADMIN' | 'DITOLAK_SYARAT' | 'DISETUJUI'
  ak_bonus: number
  catatan_verifikasi?: string
  created_at: string
}

export interface PengajuanPendidikanResponse {
  message: string
  data: {
    data: PengajuanPendidikanItem[]
    current_page: number
    last_page: number
    total: number
  }
}

export async function getPengajuanPendidikan(): Promise<PengajuanPendidikanItem[]> {
  const { data } = await api.get<PengajuanPendidikanResponse>('/pengajuan-pendidikan', {
    params: { per_page: 5 },
  })
  return data.data.data
=======
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
