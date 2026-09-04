export default function PegawaiFooter() {
  return (
    <footer className="relative z-10 flex flex-col items-center justify-between gap-4 border-t border-gray-100/60 bg-transparent py-4 px-6 text-xs text-gray-500 sm:flex-row">
      <div className="flex items-center gap-2">
        <img
          src="/logo-kpk.png"
          alt="KPK Emblem"
          className="h-4 w-auto object-contain"
        />
        <span className="font-semibold text-gray-700">
          © 2026 Komisi Pemberantasan Korupsi Republik Indonesia.
        </span>
      </div>

      <div className="flex items-center gap-4 text-[11px] font-medium text-gray-500">
        <a href="#privacy" className="hover:text-gray-900 transition-colors">
          Privacy Policy
        </a>
        <span>·</span>
        <a href="#terms" className="hover:text-gray-900 transition-colors">
          Terms of Service
        </a>
        <span>·</span>
        <a href="#help" className="hover:text-gray-900 transition-colors">
          Bantuan
        </a>
      </div>

      {/* Floating Helper Avatar Badge 'N' */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105 focus:outline-none cursor-pointer"
          title="Bantuan / Asisten"
        >
          N
        </button>
      </div>
    </footer>
  )
}
