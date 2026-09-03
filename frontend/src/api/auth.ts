import { api, clearToken, setToken } from './client'

export interface AuthResponse {
  token: string
  user: UserPayload
}

export interface UserPayload {
  id: string
  name: string
  email: string
  role: string
  pegawai?: {
    id: string
    nip: string
    nama_lengkap: string
    pangkat_golongan?: {
      golongan: string
      jenjang_jabatan?: { nama: string }
    }
  } | null
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/login', { email, password })
  setToken(data.token)
  return data
}

export async function getMe(): Promise<UserPayload> {
  const { data } = await api.get<{ user: UserPayload }>('/me')
  return data.user
}

export async function logout(): Promise<void> {
  try {
    await api.post('/logout')
  } finally {
    clearToken()
  }
}
