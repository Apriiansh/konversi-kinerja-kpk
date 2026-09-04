import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/useAuth'

export default function ProtectedRoute({
  children,
  role,
}: {
  children: ReactNode
  role?: 'ADMIN' | 'PEGAWAI'
}) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="page-loading">Memuat...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
