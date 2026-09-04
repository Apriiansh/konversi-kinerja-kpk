import type { StatusKelayakan } from '../types'

export type AsalJabatan = 'PELAKSANA' | 'PENGAWAS' | 'ADMINISTRATOR' | 'PENGANGKATAN_PERTAMA'

export interface GolonganOption {
  golongan: string
  akDasar: number
  isNormal?: boolean
  isMismatch?: boolean
  catatanMismatch?: string
}

export interface JenjangOption {
  nama: string
  koefisienTahunan: number
  kebutuhanAkKp: number
  kebutuhanAkJenjang: number
  golongan: GolonganOption[]
}

export interface PredikatOption {
  nama: string
  persentase: number
}

export interface KalkulatorInput {
  asalJabatan: AsalJabatan
  jenjangNama: string
  golongan: string
  saldoAwal: number
  masaKerjaTahun: number
  masaKerjaBulan: number
  bulanAktif: number
  predikat: [string, string, string, string] // TW1..TW4
}

export interface TriwulanRincian {
  tw: number
  predikat: string
  persentase: number
  akPeriodik: number
  isAnchor: boolean
  akAnchor: number
}

export interface HasilKalkulasi {
  jenjang: JenjangOption
  golongan: GolonganOption
  akDasar: number
  akPakPelantikan: number
  akPakRincian: { akTahun: number; akBulan: number }
  isMismatchFlat100: boolean
  mismatchNote: string | null
  regulatoryWarning: string | null
  saldoAwal: number
  akBaru: number
  akKumulatif: number
  triwulan: TriwulanRincian[]
  totalBulanAktif: number
  evaluasi: {
    status: StatusKelayakan
    badgeLabel: string
    badgeVariant: 'success' | 'info' | 'warning'
    targetKp: number
    targetJenjang: number
    carryOver: number
    kurangAk: number
    catatan: string
  }
  proyeksi: {
    sisaBulan: number
    sisaTahun: number
    estimasiLabel: string
    proyeksiKumulatif: number | null
  }
}

export const MASTER_JENJANG: JenjangOption[] = [
  {
    nama: 'Ahli Pertama',
    koefisienTahunan: 12.5,
    kebutuhanAkKp: 50,
    kebutuhanAkJenjang: 100,
    golongan: [
      { golongan: 'III/a', akDasar: 0, isNormal: true },
      { golongan: 'III/b', akDasar: 50, isNormal: true },
      {
        golongan: 'III/c',
        akDasar: 0,
        isNormal: false,
        isMismatch: true,
        catatanMismatch: 'Penyesuaian Perpindahan: Pelaksana Golongan III/c diangkat ke Ahli Pertama diberikan 100.00 AK sesuai PerBKN No. 3/2023 Lampiran II',
      },
      {
        golongan: 'III/d',
        akDasar: 0,
        isNormal: false,
        isMismatch: true,
        catatanMismatch: 'Penyesuaian Perpindahan: Pelaksana Golongan III/d diangkat ke Ahli Pertama diberikan 100.00 AK sesuai PerBKN No. 3/2023 Lampiran II',
      },
    ],
  },
  {
    nama: 'Ahli Muda',
    koefisienTahunan: 25,
    kebutuhanAkKp: 100,
    kebutuhanAkJenjang: 200,
    golongan: [
      { golongan: 'III/c', akDasar: 0, isNormal: true },
      { golongan: 'III/d', akDasar: 100, isNormal: true },
    ],
  },
  {
    nama: 'Ahli Madya',
    koefisienTahunan: 37.5,
    kebutuhanAkKp: 150,
    kebutuhanAkJenjang: 450,
    golongan: [
      { golongan: 'IV/a', akDasar: 0, isNormal: true },
      { golongan: 'IV/b', akDasar: 150, isNormal: true },
      { golongan: 'IV/c', akDasar: 300, isNormal: true },
    ],
  },
  {
    nama: 'Ahli Utama',
    koefisienTahunan: 50,
    kebutuhanAkKp: 200,
    kebutuhanAkJenjang: 9999,
    golongan: [
      { golongan: 'IV/d', akDasar: 0, isNormal: true },
      { golongan: 'IV/e', akDasar: 0, isNormal: true },
    ],
  },
]

export const MASTER_PREDIKAT: PredikatOption[] = [
  { nama: 'Sangat Baik', persentase: 1.5 },
  { nama: 'Baik', persentase: 1.0 },
  { nama: 'Butuh Perbaikan', persentase: 0.75 },
  { nama: 'Kurang', persentase: 0.5 },
  { nama: 'Sangat Kurang', persentase: 0.25 },
]

export const PREDIKAT_BADGE_STYLE: Record<string, string> = {
  'Sangat Baik': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Baik: 'bg-blue-50 text-blue-700 border-blue-200',
  'Butuh Perbaikan': 'bg-amber-50 text-amber-700 border-amber-200',
  Kurang: 'bg-orange-50 text-orange-700 border-orange-200',
  'Sangat Kurang': 'bg-red-50 text-red-700 border-red-200',
}

export const DEFAULT_INPUT: KalkulatorInput = {
  asalJabatan: 'PELAKSANA',
  jenjangNama: 'Ahli Pertama',
  golongan: 'III/a',
  saldoAwal: 10,
  masaKerjaTahun: 3,
  masaKerjaBulan: 5,
  bulanAktif: 10,
  predikat: ['Sangat Baik', 'Sangat Baik', 'Sangat Baik', 'Baik'],
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function findJenjang(nama: string): JenjangOption {
  return MASTER_JENJANG.find((j) => j.nama === nama) as JenjangOption
}

export function findGolongan(jenjang: JenjangOption, golongan: string): GolonganOption {
  return jenjang.golongan.find((g) => g.golongan === golongan) ?? jenjang.golongan[0]
}

function predikatPersentase(nama: string): number {
  return MASTER_PREDIKAT.find((p) => p.nama === nama)?.persentase ?? 1.0
}

export function hitungPakPelantikan(masaKerjaTahun: number, masaKerjaBulan: number, koefisien: number) {
  const akTahun = round2(masaKerjaTahun * 1.0 * koefisien)
  const akBulan = round2((masaKerjaBulan / 12) * 1.0 * koefisien)
  return { akTahun, akBulan, total: round2(akTahun + akBulan) }
}

export function hitungKalkulator(input: KalkulatorInput): HasilKalkulasi {
  const jenjang = findJenjang(input.jenjangNama)
  const golongan = findGolongan(jenjang, input.golongan)
  const koefisien = jenjang.koefisienTahunan

  // =========================================================================
  // PROTEKSI REGULASI PERBKN NO. 3 TAHUN 2023 BAB II:
  // 1. Pelaksana TIDAK BOLEH langsung melompat ke Ahli Muda (harus via Pengawas/Eselon IV)
  // 2. Pelaksana III/c atau III/d yang masuk Ahli Pertama TIDAK memakai Formula C masa kerja,
  //    melainkan diberikan 100.00 AK Penyesuaian Perpindahan (Tabel Perpindahan Khusus BKN)
  // =========================================================================
  let regulatoryWarning: string | null = null
  let isMismatchFlat100 = false
  let mismatchNote: string | null = null

  if (input.asalJabatan === 'PELAKSANA' && input.jenjangNama === 'Ahli Muda') {
    regulatoryWarning =
      'Pelanggaran Regulasi: Berdasarkan PerBKN No. 3/2023 Bab II, Staf Pelaksana DILARANG melompat langsung ke Ahli Muda. Perpindahan langsung ke Ahli Muda hanya diizinkan untuk pemegang Jabatan Pengawas (Eselon IV).'
  }

  // Cek apakah kondisi Golongan Melampaui Jenjang (III/c atau III/d di Ahli Pertama)
  if (
    input.asalJabatan === 'PELAKSANA' &&
    input.jenjangNama === 'Ahli Pertama' &&
    (input.golongan === 'III/c' || input.golongan === 'III/d')
  ) {
    isMismatchFlat100 = true
    mismatchNote =
      'Berdasarkan Tabel Angka Kredit Penyesuaian Perpindahan PerBKN No. 3/2023 Lampiran II: Pelaksana Golongan III/c atau III/d yang diangkat ke JF Ahli Pertama tidak menggunakan konversi masa kerja (Formula C), melainkan langsung ditetapkan 100.00 AK Penyesuaian Perpindahan (batas maksimal jenjang Ahli Pertama) sebagai syarat Uji Kompetensi Kenaikan Jenjang ke Ahli Muda.'
  }

  // Hitung PAK Pelantikan: Jika Penyesuaian Perpindahan -> 100.00 AK, jika normal -> Formula C
  let pak = { akTahun: 0, akBulan: 0, total: 0 }
  if (isMismatchFlat100) {
    pak = { akTahun: 100, akBulan: 0, total: 100 }
  } else {
    pak = hitungPakPelantikan(input.masaKerjaTahun, input.masaKerjaBulan, koefisien)
  }

  const totalBulanAktif = Math.min(12, Math.max(0, input.bulanAktif))
  const predikatAnch = predikatPersentase(input.predikat[3])
  const akBaru = round2((totalBulanAktif / 12) * predikatAnch * koefisien)

  const triwulan: TriwulanRincian[] = input.predikat.map((p, idx) => {
    const tw = idx + 1
    const persentase = predikatPersentase(p)
    const akPeriodik = round2((3 / 12) * persentase * koefisien)
    return {
      tw,
      predikat: p,
      persentase,
      akPeriodik,
      isAnchor: tw === 4,
      akAnchor: tw === 4 ? akBaru : 0,
    }
  })

  const akDasar = golongan.akDasar
  const akKumulatif = round2(
    akDasar + pak.total + round2(input.saldoAwal) + akBaru
  )

  const targetKp = jenjang.kebutuhanAkKp
  const targetJenjang = jenjang.kebutuhanAkJenjang

  let status: StatusKelayakan = 'BELUM_CUKUP'
  let badgeLabel = 'BELUM CUKUP AK'
  let badgeVariant: HasilKalkulasi['evaluasi']['badgeVariant'] = 'warning'
  let carryOver = 0
  let kurangAk = 0
  let catatan = ''

  if (targetJenjang < 9999 && akKumulatif >= targetJenjang) {
    status = 'LAYAK_JENJANG'
    badgeLabel = 'LAYAK NAIK JENJANG'
    badgeVariant = 'info'
    carryOver = 0
    catatan = `Selamat! Pegawai telah memenuhi syarat AK untuk Kenaikan Jenjang Jabatan (Target: ${targetJenjang} AK). Sisa kelebihan AK direset ke 0 (hangus) sesuai regulasi BKN.`
  } else if (akKumulatif >= targetKp) {
    status = 'LAYAK_PANGKAT'
    badgeLabel = 'LAYAK NAIK PANGKAT'
    badgeVariant = 'success'
    carryOver = round2(akKumulatif - targetKp)
    catatan = `Selamat! Pegawai telah memenuhi syarat AK untuk Kenaikan Pangkat (Target: ${targetKp} AK). Sisa tabungan AK sebesar ${carryOver.toFixed(2)} AK dibawa ke periode berikutnya sebagai carry-over.`
  } else {
    status = 'BELUM_CUKUP'
    badgeLabel = 'BELUM CUKUP AK'
    badgeVariant = 'warning'
    kurangAk = round2(targetKp - akKumulatif)
    carryOver = round2(akKumulatif)
    catatan = `Angka Kredit belum mencukupi untuk Kenaikan Pangkat. Kurang ${kurangAk.toFixed(2)} AK dari target ${targetKp} AK. Seluruh saldo ${carryOver.toFixed(2)} AK disimpan untuk tahun depan.`
  }

  // Proyeksi: estimasi waktu mencapai target kenaikan pangkat
  let sisaBulan = 0
  let sisaTahun = 0
  let estimasiLabel = 'Target sudah terpenuhi'
  const proyeksiKumulatif: number | null = null

  if (status === 'BELUM_CUKUP') {
    const akPerTahun = round2((12 / 12) * predikatAnch * koefisien)
    const kekurangan = targetKp - akKumulatif
    if (akPerTahun > 0) {
      const pecahan = kekurangan / akPerTahun
      sisaTahun = Math.floor(pecahan)
      sisaBulan = Math.ceil((pecahan - sisaTahun) * 12)
      if (sisaBulan >= 12) {
        sisaTahun += Math.floor(sisaBulan / 12)
        sisaBulan = sisaBulan % 12
      }
      estimasiLabel =
        sisaTahun === 0 && sisaBulan === 0
          ? 'Kurang dari 1 tahun lagi'
          : `± ${sisaTahun} tahun ${sisaBulan} bulan (asumsi predikat tetap)`
    } else {
      estimasiLabel = 'Tidak terhitung (predikat 0%)'
    }
  }

  return {
    jenjang,
    golongan,
    akDasar,
    akPakPelantikan: pak.total,
    akPakRincian: { akTahun: pak.akTahun, akBulan: pak.akBulan },
    isMismatchFlat100,
    mismatchNote,
    regulatoryWarning,
    saldoAwal: round2(input.saldoAwal),
    akBaru,
    akKumulatif,
    triwulan,
    totalBulanAktif,
    evaluasi: {
      status,
      badgeLabel,
      badgeVariant,
      targetKp,
      targetJenjang,
      carryOver,
      kurangAk,
      catatan,
    },
    proyeksi: {
      sisaBulan,
      sisaTahun,
      estimasiLabel,
      proyeksiKumulatif,
    },
  }
}
