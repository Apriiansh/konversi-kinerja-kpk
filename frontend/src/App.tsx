import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Main from './components/layout/main'
import Login from './pages/Login'
import { ImportKonversi } from './pages/admin/ImportKonversi'
import { Rekapitulasi } from './pages/admin/Rekapitulasi'
import { VerifikasiPendidikan } from './pages/admin/VerifikasiPendidikan'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { Kalkulator as KalkulatorAdmin } from './pages/admin/Kalkulator'
import MasterData from './pages/admin/MasterData'

// Modul Peer / Pegawai
import PegawaiDashboard from './pages/pegawai/PegawaiDashboard'
import InisialisasiSaldoAwal from './pages/pegawai/InisialisasiSaldoAwal'
import PenilaianTriwulan from './pages/pegawai/PenilaianTriwulan'
import RekapitulasiPAK from './pages/pegawai/RekapitulasiPAK'
import KalkulatorBKN from './pages/pegawai/KalkulatorBKN'
import PengajuanPendidikan from './pages/pegawai/PengajuanPendidikan'

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
      <p className="text-base font-extrabold text-gray-900">{title}</p>
      <p className="mt-1 text-sm font-medium text-gray-400">Segera hadir</p>
    </div>
  )
}

function InLayout({ children }: { children: ReactNode }) {
  return <Main>{children}</Main>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Rute Modul Pegawai / Peer */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <InLayout>
                <PegawaiDashboard />
              </InLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/informasi-saldo"
          element={
            <ProtectedRoute>
              <InLayout>
                <InisialisasiSaldoAwal />
              </InLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/penilaian-triwulan"
          element={
            <ProtectedRoute>
              <InLayout>
                <PenilaianTriwulan />
              </InLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rekapitulasi"
          element={
            <ProtectedRoute>
              <InLayout>
                <RekapitulasiPAK />
              </InLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pengajuan-pendidikan"
          element={
            <ProtectedRoute>
              <InLayout>
                <PengajuanPendidikan />
              </InLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kalkulator"
          element={
            <ProtectedRoute>
              <InLayout>
                <KalkulatorBKN />
              </InLayout>
            </ProtectedRoute>
          }
        />

        {/* Alias rute lama */}
        <Route path="/pengajuan" element={<Navigate to="/pengajuan-pendidikan" replace />} />
        <Route path="/inisialisasi-saldo" element={<Navigate to="/informasi-saldo" replace />} />

        {/* Route Khusus Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="ADMIN">
              <InLayout>
                <AdminDashboard />
              </InLayout>
            </ProtectedRoute>
          }
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
            <ProtectedRoute role="ADMIN">
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
          path="/admin/pegawai"
          element={
            <ProtectedRoute role="ADMIN">
              <InLayout>
                <ComingSoon title="Kelola Data Pegawai" />
              </InLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/kalkulator"
          element={
            <ProtectedRoute role="ADMIN">
              <InLayout>
                <KalkulatorAdmin />
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
