import { api } from './client'
import type { PengajuanPendidikanItem } from '../types'

export interface PengajuanListResponse {
  data: PengajuanPendidikanItem[]
  current_page: number
  total: number
  last_page: number
}

// 1. Ambil antrean pengajuan pendidikan untuk diverifikasi Admin
export async function getPengajuanList(params?: {
  status?: string
  search?: string
  page?: number
  per_page?: number
}): Promise<PengajuanListResponse> {
  const response = await api.get('/pengajuan-pendidikan', { params })
  return response.data.data
}

// 2. Ambil detail satu pengajuan
export async function getPengajuanDetail(id: string): Promise<PengajuanPendidikanItem> {
  const response = await api.get(`/pengajuan-pendidikan/${id}`)
  return response.data.data
}

// 3. Verifikasi berkas (Admin Only: Setujui / Tolak)
export async function verifikasiPengajuan(
  id: string,
  isValid: boolean,
  catatan?: string
): Promise<{ message: string; data: PengajuanPendidikanItem }> {
  const response = await api.post(`/pengajuan-pendidikan/${id}/verifikasi`, {
    is_valid: isValid,
    catatan: catatan || undefined,
  })
  return response.data
}

// Helper untuk URL berkas fisik (storage Laravel)
export function getStorageFileUrl(filePath: string): string {
  if (!filePath) return '#'
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath
  // Sanitasi path lokal atau protocol file:///
  const cleaned = filePath.replace(/^(file:\/\/\/|[a-zA-Z]:[\\\/])/i, '').replace(/\\/g, '/')
  return `/storage/${cleaned.replace(/^\/?storage\//, '')}`
}
