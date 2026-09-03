import { useState } from 'react'
import type { ReactNode } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

export default function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#fbfbfb]">
      <Header />

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-xl bg-white p-2 text-gray-600 shadow-sm lg:hidden"
        aria-label="Buka menu"
      >
        <svg
          className="h-5 w-5"
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

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={
          'fixed bottom-0 left-0 z-40 top-16 transition-transform duration-200 ease-out lg:translate-x-0' +
          (open ? ' translate-x-0' : ' -translate-x-full')
        }
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </aside>

      <main className="pt-[64px] lg:pl-60">
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  )
}