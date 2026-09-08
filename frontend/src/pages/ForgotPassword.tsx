import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/auth'
import './login.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const res = await forgotPassword(email)
      setMessage(res.message)
    } catch (err: unknown) {
      const msg = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const errors = msg.response?.data?.errors
      setError(errors?.email?.[0] ?? msg.response?.data?.message ?? 'Gagal mengirim link reset password.')
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
        <h1 className="login-title">Lupa Password</h1>
        <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', margin: '6px 0 14px', fontWeight: 500 }}>
          Masukkan email terdaftar. Kami akan mengirimkan link reset password.
        </p>

        {error && <div className="login-error">{error}</div>}
        {message && (
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
            {message}
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

        <button type="submit" className="login-button" disabled={submitting}>
          {submitting ? 'Mengirim...' : 'Kirim Link Reset'}
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
