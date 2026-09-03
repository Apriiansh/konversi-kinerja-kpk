import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

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
        <Route
          path="/rekapitulasi"
          element={
            <ProtectedRoute>
              <InLayout>
                <ComingSoon title="Rekapitulasi & PAK" />
              </InLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kalkulator"
          element={
            <ProtectedRoute>
              <InLayout>
                <ComingSoon title="Kalkulator BKN" />
              </InLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pengajuan"
          element={
            <ProtectedRoute>
              <InLayout>
                <ComingSoon title="Pengajuan Pendidikan" />
              </InLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}