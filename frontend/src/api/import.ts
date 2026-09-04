import { api } from "./client";
import type { ImportPreviewResponse, PreviewPegawaiItem } from "../types"

export type { ImportPreviewResponse, PreviewPegawaiItem }

// 1. Template download
export async function downloadImportTemplate(): Promise<void> {
  const response = await api.get('/import/template', {
    responseType: 'blob'
  })

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'template_import_konversi_kinerja_kpk.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

// 2. Dry-Run / Preview (Instantly count without saving to database)
export async function previewImportFile(file: File, buatAkun: boolean = true): Promise<ImportPreviewResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('buat_akun', buatAkun ? '1' : '0')

  const response = await api.post('/import/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data.data
}

// 3. Execute mass import (saved to databae)
export async function processImportFile(file: File, buatAkun: boolean = true): Promise<{ message: string; total_diproses: number }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('buat_akun', buatAkun ? '1' : '0')

  const response = await api.post('/import/proses', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data.data
}
