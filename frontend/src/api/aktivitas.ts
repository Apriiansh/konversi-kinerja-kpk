import { api } from './client'

export interface AktivitasItem {
  id: string
  judul: string
  keterangan: string
  angka_kredit?: string | null
  badge?: string
  badge_color?: 'green' | 'amber' | 'red' | 'gray' | string
  created_at: string
}

export interface AktivitasResponse {
  message: string
  data: AktivitasItem[]
}

export async function getAktivitasTerbaru(limit = 5): Promise<AktivitasItem[]> {
  const { data } = await api.get<AktivitasResponse>('/aktivitas', {
    params: { limit },
  })

  return data.data
}
