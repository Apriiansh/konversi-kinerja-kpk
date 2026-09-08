import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import './login.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const u = await login(email, password)
      navigate(u.role === 'ADMIN' ? '/admin' : '/', { replace: true })
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
        <div className="login-brand">
          <span className="login-logo-tile">
            <img src="/logo-kpk.png" alt="Logo KPK" className="login-logo" />
          </span>
          <p className="login-org">Komisi Pemberantasan Korupsi</p>
          <h1 className="login-title">Sistem Konversi Kinerja</h1>
          <p className="login-subtitle">Masuk untuk mengelola konversi kinerja &amp; angka kredit</p>
        </div>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <div className="login-field">
          <label className="login-label" htmlFor="email">
            Email
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
            aria-invalid={error ? true : undefined}
          />
        </div>

        <div className="login-field">
          <label className="login-label" htmlFor="password">
            Kata Sandi
          </label>
          <div className="login-password-wrap">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="login-input login-input-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              aria-invalid={error ? true : undefined}
            />
            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              aria-pressed={showPassword}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button type="submit" className="login-button" disabled={submitting}>
          {submitting ? 'Memproses...' : 'Masuk'}
        </button>

        <p className="login-footer">©2026 Konversi Kinerja KPK</p>
      </form>
    </main>
  )
}
