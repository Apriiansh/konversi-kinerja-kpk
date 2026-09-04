import { useState } from 'react'
import type { ReactNode } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

export default function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#fbfbfb]">
      <Header />

      {/* Mobile Hamburger Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-3.5 z-50 rounded-xl bg-white p-2 text-gray-700 shadow-md border border-gray-200 lg:hidden"
        aria-label="Buka menu"
      >
        <svg
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Fixed Sidebar container - Menempel presisi dari atas ke bawah */}
      <aside
        className={
          'fixed inset-y-0 left-0 z-40 w-60 transform bg-white transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-gray-200 shadow-sm' +
          (open ? ' translate-x-0' : ' -translate-x-full')
        }
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </aside>


      {/* Main Content Area */}
      <main className="pt-[64px] lg:pl-60 min-h-screen transition-all">
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )

}