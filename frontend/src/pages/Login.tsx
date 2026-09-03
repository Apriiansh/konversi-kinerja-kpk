import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import './login.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const msg = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const errors = msg.response?.data?.errors
      const serverMsg = msg.response?.data?.message
      setError(errors?.email?.[0] ?? serverMsg ?? 'Login gagal. Periksa kembali email dan password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-bg" aria-hidden="true">
        <img src="/gedung-1.jpg" alt="" className="login-bg-img" />
        <div className="login-bg-overlay" />
        <span className="login-blob login-blob-1" />
        <span className="login-blob login-blob-2" />
        <span className="login-blob login-blob-3" />
        <div className="login-particles" />
      </div>

      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <img src="/logo-kpk.png" alt="KPK" className="login-logo" />
        <h1 className="login-title">Sistem Konversi Kinerja</h1>
        <span className="login-badge">PerBKN No. 3 Tahun 2023</span>

        {error && <div className="login-error">{error}</div>}

        <label className="login-label" htmlFor="email">
          Email Kedinasan
        </label>
        <input
          id="email"
          type="email"
          className="login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@kpk.go.id"
          required
          autoComplete="email"
        />

        <label className="login-label" htmlFor="password">
          Kata Sandi
        </label>
        <input
          id="password"
          type="password"
          className="login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />

        <button type="submit" className="login-button" disabled={submitting}>
          {submitting ? 'Memproses...' : 'Masuk'}
        </button>

        <p className="login-footer">Konversi Kinerja v2 · © 2026 KPK</p>
      </form>
    </main>
  )
}