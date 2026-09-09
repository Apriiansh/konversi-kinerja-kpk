import axios from 'axios'

const TOKEN_KEY = 'auth_token'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken()
      // Jangan redirect paksa saat user sedang di halaman auth publik
      // (mis. membuka link reset-password dengan token lama tersimpan).
      const publicAuthPaths = ['/login', '/forgot-password', '/reset-password']
      const onPublicAuthPage = publicAuthPaths.some((p) => window.location.pathname.startsWith(p))
      if (!onPublicAuthPage && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export interface ApiErrorShape {
  response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } }
  code?: string
  request?: unknown
}

/**
 * Ubah error axios menjadi pesan ramah untuk user.
 * Menangani khusus kasus backend mati / vite proxy ECONNREFUSED
 * (error.request ada tapi error.response tidak ada).
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as ApiErrorShape
  if (e && !e.response && e.request) {
    return 'Tidak dapat terhubung ke server backend (http://localhost:8000). Pastikan backend berjalan dengan `php artisan serve`, lalu coba lagi.'
  }
  if (e?.response?.status === 503 && !e?.response?.data?.message) {
    return 'Server backend tidak tersedia saat ini. Pastikan `php artisan serve` berjalan, lalu coba lagi.'
  }
  const errors = e?.response?.data?.errors
  const firstFieldError = errors ? Object.values(errors).flat()[0] : undefined
  return firstFieldError ?? e?.response?.data?.message ?? fallback
}
