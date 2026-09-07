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

// 4. Submit pengajuan baru (pegawai) — multipart, file hanya disimpan path di DB
export async function submitPengajuan(formData: FormData): Promise<{ message: string; data: PengajuanPendidikanItem }> {
  const response = await api.post('/pengajuan-pendidikan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export interface KampusItem { id: number; name: string; country: string | null }
export async function getKampusList(search: string, limit = 10): Promise<KampusItem[]> {
  const res = await api.get('/kampus', { params: { search, limit } })
  return res.data.data as KampusItem[]
}
export interface ProdiItem { id: number; nm_prodi: string; kel_jenj: string; kode_prodi: string; nm_jenj_didik: string }
export async function getProdiList(search: string, jenjang?: string, limit = 10): Promise<ProdiItem[]> {
  const res = await api.get('/prodi', { params: { search, jenjang, limit } })
  return res.data.data as ProdiItem[]
}

// Helper untuk URL berkas fisik (storage Laravel)
// Di dev, Vite proxy /storage -> http://localhost:8000, jadi cukup return /storage/...
// Jika file diakses langsung di browser tanpa proxy (atau di build production terpisah),
// fallback ke APP_URL backend bisa ditambahkan via VITE_BACKEND_URL.
export function getStorageFileUrl(filePath: string): string {
  if (!filePath) return '#'
  if (filePath.startsWith('http')) return filePath
  const clean = filePath.replace(/^\/?storage\//, '')
  // Gunakan URL relatif agar Vite proxy bekerja (jangan hardcode host)
  return `/storage/${clean}`
}
