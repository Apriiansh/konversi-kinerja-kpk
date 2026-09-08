export type StatusKelayakan = 'LAYAK_PANGKAT' | 'LAYAK_JENJANG' | 'BELUM_CUKUP'

export type FilterStatus = 'ALL' | StatusKelayakan | 'ERROR'

// ─── Master Data Types ────────────────────────────────────────────────
export interface JenjangJabatan {
  id: string
  nama: string
  koefisien_tahunan: number
  kebutuhan_ak_kp: number
  kebutuhan_ak_jenjang: number
}

export interface PredikatKinerja {
  id: string
  nama: string
  persentase_konversi: number
  keterangan?: string
}

export interface AkDasar {
  id: string
  kunci_pencarian: string
  jenjang_jabatan: string
  golongan_ruang: string
  ak_dasar: number
}

export interface MasterDataResponse {
  jenjang_jabatan: JenjangJabatan[]
  predikat_kinerja: PredikatKinerja[]
  ak_dasar: AkDasar[]
}

export interface KelayakanInfo {
  status: StatusKelayakan
  badge_label: string
  badge_color: string
  jenis_target?: 'PANGKAT' | 'JENJANG'
  target_kp?: number
  target_jenjang?: number
  carry_over: number
  kurang_ak: number
  catatan: string
  next_jenjang?: string
}

export interface PangkatGolongan {
  golongan: string
  jenjang: string
  koefisien?: number
}

export interface Pegawai {
  id: string
  nip: string
  nama_lengkap: string
  email?: string
  golongan?: string          // dari pangkat_golongan.golongan (di-flatten oleh API context)
  jenjang?: string           // dari effectiveJenjang().nama (di-flatten)
  asal_jabatan?: string
  pendidikan_terakhir?: string
  tmt_jabatan?: string
  pangkat_golongan_id?: string
  jenjang_jabatan_id?: string
  koefisien_tahunan?: number
  kebutuhan_ak_kp?: number
  kebutuhan_ak_jenjang?: number
  // Relasi (untuk endpoint /pegawai biasa)
  pangkat_golongan?: {
    golongan: string
    jenjang_jabatan?: JenjangJabatan
  }
  user?: { id: string; name: string; email: string; role: string }
}

export interface PenetapanAKItem {
  id: string
  pegawai_id: string
  tahun: number
  ak_dasar: number | string
  ak_pak_pelantikan: number | string
  ak_historis: number | string
  ak_lama: number | string
  ak_baru: number | string
  ak_booster: number | string
  ak_carry_over: number | string
  ak_kumulatif: number | string
  status_kelayakan?: StatusKelayakan
  catatan_kelayakan?: string
  is_final: boolean
  is_locked?: boolean
  locked_by?: string
  locked_at?: string
  badge_label?: string
  badge_color?: string
  target_kp?: number
  target_jenjang?: number
  carry_over?: number
  pegawai?: {
    id: string
    nip: string
    nama_lengkap: string
    pendidikan_terakhir?: string
    tmt_jabatan?: string
    pangkat_golongan?: {
      golongan: string
      jenjang_jabatan?: {
        nama: string
        koefisien_tahunan: number
        kebutuhan_ak_kp: number
        kebutuhan_ak_jenjang: number
      }
    }
  }
}

export interface TriwulanRincianItem {
  id: string
  triwulan: number
  jumlah_bulan: number
  periode_bulan: number
  predikat: string
  angka_kredit: number
}

export interface TriwulanBlock {
  triwulan: number
  label: string
  jumlah_bulan: number
  ak_total: number
  rincian: TriwulanRincianItem[]
}

export interface RekapDetailData {
  pegawai: {
    id: string
    nama_lengkap: string
    nip: string
    pendidikan_terakhir?: string
    tmt_jabatan?: string
  }
  pangkat: PangkatGolongan
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
  is_locked?: boolean
  locked_by?: string
  locked_at?: string
  kelayakan: KelayakanInfo
  triwulan: Record<number, TriwulanBlock>
  sum_ak_periodik: number
  total_ak_baru: number
}

export interface PreviewPegawaiItem {
  baris: number
  is_valid: boolean
  errors?: string[]
  nip?: string
  nama_lengkap?: string
  golongan?: string
  jenjang?: string
  asal_jabatan?: string
  penyesuaian_khusus?: string | null
  tahun?: number
  ak_dasar?: number
  ak_pak_pelantikan?: number
  ak_historis?: number
  total_bulan_aktif?: number
  predikat_tw4?: string
  metode_kalkulasi?: string
  ak_baru_tahunan?: number
  ak_booster?: number
  ak_kumulatif?: number
  // Mode import per-triwulan (triwulan 1–3): satu kolom PKP
  triwulan_mode?: boolean
  triwulan_ke?: number
  pkp?: string
  jumlah_bulan?: number
  ak_triwulan?: number
  proyeksi_disetahunkan?: number
  ak_parsial?: number
  kelayakan?: KelayakanInfo
  triwulan?: {
    tw1: { predikat: string; jumlah_bulan: number; angka_kredit: number }
    tw2: { predikat: string; jumlah_bulan: number; angka_kredit: number }
    tw3: { predikat: string; jumlah_bulan: number; angka_kredit: number }
    tw4: { predikat: string; jumlah_bulan: number; angka_kredit: number }
  }
  raw_data?: Record<string, string>
}

export interface ImportPreviewResponse {
  total_baris: number
  total_valid: number
  total_error: number
  ringkasan_badge: {
    layak_pangkat: number
    layak_jenjang: number
    belum_cukup: number
  }
  data: PreviewPegawaiItem[]
}

export type StatusPengajuan = 'DIAJUKAN' | 'DISETUJUI' | 'DITOLAK_ADMIN' | 'DITOLAK_SYARAT'

export type FilterStatusPengajuan = 'ALL' | StatusPengajuan

export interface PengajuanPendidikanItem {
  id: string
  pegawai_id: string
  jenjang_pendidikan: 'D3' | 'S1' | 'S2' | 'S3' | string
  program_studi?: string
  jurusan: string
  nama_institusi: string
  tahun_lulus: number
  file_ijazah: string
  file_bukti_bkn: string
  status: StatusPengajuan
  ak_bonus?: number
  catatan_verifikasi?: string | null
  diverifikasi_oleh?: string | null
  diverifikasi_pada?: string | null
  created_at: string
  pegawai?: {
    id: string
    nip: string
    nama_lengkap: string
    pendidikan_terakhir?: string
    pangkat_golongan?: {
      golongan: string
      jenjang_jabatan?: {
        nama: string
        koefisien_tahunan: number
        kebutuhan_ak_kp: number
      }
    }
  }
  verifikator?: {
    id: string
    name: string
    email: string
  }
}
