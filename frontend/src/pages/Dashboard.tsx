import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './dashboard.css'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <button className="dashboard-logout" onClick={handleLogout}>
          Keluar
        </button>
      </header>

      <section className="dashboard-card">
        <p className="dashboard-label">Selamat datang,</p>
        <h2 className="dashboard-name">{user?.name}</h2>
        <ul className="dashboard-meta">
          <li>
            <span>Email</span> {user?.email}
          </li>
          <li>
            <span>Role</span> {user?.role}
          </li>
          <li>
            <span>NIP</span> {user?.pegawai?.nip ?? '-'}
          </li>
          <li>
            <span>Golongan</span> {user?.pegawai?.pangkat_golongan?.golongan ?? '-'}
          </li>
          <li>
            <span>Jenjang</span> {user?.pegawai?.pangkat_golongan?.jenjang_jabatan?.nama ?? '-'}
          </li>
        </ul>
      </section>
    </div>
  )
}
