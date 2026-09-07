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

    </footer>
  )
}
