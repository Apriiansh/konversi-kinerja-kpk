import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

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
        <Route
          path="/rekapitulasi"
          element={
            <ProtectedRoute>
              <PegawaiLayout>
                <RekapitulasiPAK />
              </PegawaiLayout>
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
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}