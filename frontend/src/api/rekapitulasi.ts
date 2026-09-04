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
}
