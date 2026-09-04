import { useState } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './header'
import Sidebar from './sidebar'
import Footer from './footer'

export default function Main({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const toggleCollapsed = () => setCollapsed((c) => !c)

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#f8fafc] text-gray-800 font-sans antialiased">
      {/* Desktop Fixed Left Sidebar - tidak ikut scroll */}
      <div
        className={`hidden lg:flex shrink-0 h-screen sticky top-0 z-30 flex-col overflow-hidden transition-[width] duration-300 ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </div>

      {/* Mobile Drawer Navigation with Framer Motion */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-xs lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            {/* Sliding Drawer Sidebar from top-0 to bottom-0 (Zero Gap) */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 left-0 z-50 w-72 h-full bg-white shadow-2xl lg:hidden"
            >
              <Sidebar
                onNavigate={() => setMobileOpen(false)}
                onCloseMobile={() => setMobileOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area - header + footer sticky, content scroll sendiri */}
      <div className="flex flex-1 flex-col min-w-0 h-screen overflow-hidden">
        {/* Header - sticky top */}
        <div className="shrink-0 sticky top-0 z-20">
          <Header onOpenMobile={() => setMobileOpen(true)} />
        </div>

        {/* Scrollable Content Container */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8 relative min-h-full">
            {/* Subtle Decorative Background Shapes */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-red-50/40 to-transparent -z-10" />

            {children}
          </div>
        </main>

        {/* Page Footer - selalu di bawah */}
        <div className="shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  )
}
