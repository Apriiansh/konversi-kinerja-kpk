import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { ImportKonversi } from './pages/admin/ImportKonversi'
import { Rekapitulasi } from './pages/admin/Rekapitulasi'
import { VerifikasiPendidikan } from './pages/admin/VerifikasiPendidikan'
import { Kalkulator } from './pages/admin/Kalkulator'
import MasterData from './pages/admin/MasterData'

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
      <p className="text-base font-extrabold text-gray-900">{title}</p>
      <p className="mt-1 text-sm font-medium text-gray-400">Segera hadir</p>
    </div>
  )
}

function InLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Route Utama */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <InLayout>
                <Dashboard />
              </InLayout>
            </ProtectedRoute>
          }
        />

        {/* Route Khusus Admin */}
        <Route
          path="/admin"
          element={<Navigate to="/admin/import" replace />}
        />
        <Route
          path="/admin/import"
          element={
            <ProtectedRoute role="ADMIN">
              <InLayout>
                <ImportKonversi />
              </InLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pegawai"
          element={
            <ProtectedRoute role="ADMIN">
              <InLayout>
                <ComingSoon title="Kelola Data Pegawai" />
              </InLayout>
            </ProtectedRoute>
          }
        />

        {/* Modul Rekapitulasi & Kalkulator */}
        <Route
          path="/admin/master-data"
          element={
            <ProtectedRoute role="ADMIN">
              <InLayout>
                <MasterData />
              </InLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/rekapitulasi"
          element={
            <ProtectedRoute role='ADMIN'>
              <InLayout>
                <Rekapitulasi />
              </InLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pengajuan"
          element={
            <ProtectedRoute role="ADMIN">
              <InLayout>
                <VerifikasiPendidikan />
              </InLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kalkulator"
          element={
            <ProtectedRoute>
              <InLayout>
                <Kalkulator />
              </InLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pengajuan"
          element={
            <ProtectedRoute role="ADMIN">
              <InLayout>
                <VerifikasiPendidikan />
              </InLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
