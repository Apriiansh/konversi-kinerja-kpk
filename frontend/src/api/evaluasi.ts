import type { Pegawai } from "../types";
import { api } from "./client";

export interface EvaluasiContextData {
  pegawai: Pegawai;
  saldo_awal: number;
  ak_kumulatif_draft: number;
  sudah_layak_sebelum_tw4: boolean;
  tw_aktif: 1 | 2 | 3 | 4;
  tahun: number;
  bulan_per_tw: Record<number, number>;
  evaluasi: Record<
    number,
    {
      id: string;
      triwulan: number;
      jumlah_bulan: number;
      predikat_id: string;
      predikat: string;
      angka_kredit: number;
    }
  >;
  penetapan_is_final: boolean;
  penetapan_is_locked: boolean;
}

export interface SimulasiResult {
  pegawai: string;
  jenjang: string;
  golongan: string;
  koefisien_tahunan: number;
  jumlah_bulan?: number;
  total_bulan_aktif?: number;
  angka_kredit: number;
  rumus: string;
  predikat_tahunan?: string;
  kebutuhan_ak_kp: number;
  kebutuhan_ak_naik_jenjang: number;
}

// get full context one employee for specific year
export async function getEvaluasiContext(
  pegawaiId: string,
  tahun: number,
): Promise<EvaluasiContextData> {
  const { data } = await api.get(`/evaluasi/context/${pegawaiId}/${tahun}`);
  return data.data;
}

// detail eval
export async function getEvaluasiDetail(id: string) {
  const { data } = await api.get(`/evaluasi/${id}`);
  return data.data;
}

// add new eval
export async function createEvaluasi(payload: {
  pegawai_id: string;
  tahun: number;
  triwulan: number;
  jumlah_bulan: number;
  predikat_id: string;
}) {
  const { data } = await api.post("evaluasi", payload);
  return data.data;
}

export async function updateEvaluasi(
  id: string,
  payload: {
    predikat_id: string;
    jumlah_bulan?: number;
  },
) {
  const { data } = await api.put(`/evaluasi/${id}`, payload);
  return data.data;
}

export async function deleteEvaluasi(id: string) {
  await api.delete(`/evaluasi/${id}`);
}

// periodic simulation (no save)
export async function simulasiPeriodic(payload: {
  pegawai_id: string;
  predikat_id: string;
  jumlah_bulan: number;
}): Promise<SimulasiResult> {
  const { data } = await api.post("/evaluasi/simulasi", {
    ...payload,
    tipe: "periodik",
  });
  return data.data;
}

// Simulasi tahunan (predikat TW4 sebagai acuan)
export async function simulasiTahunan(payload: {
  pegawai_id: string;
  predikat_id: string;
  tahun: number;
}): Promise<SimulasiResult> {
  const { data } = await api.post("/evaluasi/simulasi", {
    ...payload,
    tipe: "tahunan",
  });
  return data.data;
}
