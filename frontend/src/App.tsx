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

// Import Modul Dedicated UI Pegawai
import PegawaiLayout from './pegawai/components/PegawaiLayout'
import PegawaiDashboard from './pegawai/pages/PegawaiDashboard'
import InisialisasiSaldoAwal from './pegawai/pages/InisialisasiSaldoAwal'
import PenilaianTriwulan from './pegawai/pages/PenilaianTriwulan'
import RekapitulasiPAK from './pegawai/pages/RekapitulasiPAK'
import KalkulatorBKN from './pegawai/pages/KalkulatorBKN'
import PengajuanPendidikan from './pegawai/pages/PengajuanPendidikan'

import Login from './pages/Login'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Rute Modul Pegawai */}

        {/* Route Utama */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <PegawaiLayout>
                <PegawaiDashboard />
              </PegawaiLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inisialisasi-saldo"
          element={
            <ProtectedRoute>
              <PegawaiLayout>
                <InisialisasiSaldoAwal />
              </PegawaiLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/penilaian-triwulan"
          element={
            <ProtectedRoute>
              <PegawaiLayout>
                <PenilaianTriwulan />
              </PegawaiLayout>
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
            <ProtectedRoute>
              <PegawaiLayout>
                <RekapitulasiPAK />
              </PegawaiLayout>
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
              <PegawaiLayout>
                <KalkulatorBKN />
              </PegawaiLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pengajuan-pendidikan"
          element={
            <ProtectedRoute>
              <PegawaiLayout>
                <PengajuanPendidikan />
              </PegawaiLayout>
              <InLayout>
                <Kalkulator />
              </InLayout>
            </ProtectedRoute>
          }
        />
        {/* Alias rute lama ke pengajuan-pendidikan */}
        <Route
          path="/pengajuan"
          element={
            <ProtectedRoute>
              <PegawaiLayout>
                <PengajuanPendidikan />
              </PegawaiLayout>
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
