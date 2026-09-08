import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/auth'
import './login.css'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const tokenFromUrl = searchParams.get('token') ?? ''
  const emailFromUrl = searchParams.get('email') ?? ''

  const [token] = useState(tokenFromUrl)
  const [email, setEmail] = useState(emailFromUrl)
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== passwordConfirmation) {
      setError('Konfirmasi password tidak cocok.')
      return
    }

    if (!token) {
      setError('Token reset tidak valid. Silakan minta link baru dari halaman lupa password.')
      return
    }

    setSubmitting(true)
    try {
      const res = await resetPassword({ token, email, password, password_confirmation: passwordConfirmation })
      setSuccess(res.message)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err: unknown) {
      const msg = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const errors = msg.response?.data?.errors
      const firstError =
        errors?.email?.[0] ?? errors?.token?.[0] ?? errors?.password?.[0] ?? msg.response?.data?.message
      setError(firstError ?? 'Gagal mereset password. Token mungkin kadaluarsa.')
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
        <h1 className="login-title">Reset Password</h1>
        <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', margin: '6px 0 14px', fontWeight: 500 }}>
          Masukkan password baru Anda.
        </p>

        {error && <div className="login-error">{error}</div>}
        {success && (
          <div
            style={{
              width: '100%',
              background: '#dcfce7',
              color: '#166534',
              padding: '10px 12px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            {success} Mengalihkan ke login...
          </div>
        )}

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
        />

        <label className="login-label" htmlFor="password">
          Password Baru
        </label>
        <input
          id="password"
          type="password"
          className="login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="new-password"
        />

        <label className="login-label" htmlFor="password_confirmation">
          Konfirmasi Password
        </label>
        <input
          id="password_confirmation"
          type="password"
          className="login-input"
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="new-password"
        />

        <button type="submit" className="login-button" disabled={submitting}>
          {submitting ? 'Memproses...' : 'Reset Password'}
        </button>

        <Link
          to="/login"
          style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: '#ba191d', textDecoration: 'none' }}
        >
          ← Kembali ke Login
        </Link>

        <p className="login-footer">Konversi Kinerja · ©2026 KPK</p>
      </form>
    </main>
  )
}
