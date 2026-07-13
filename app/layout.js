'use client'

import './globals.css'
import { AuthProvider } from './context/AuthContext.js'
import { usePathname } from 'next/navigation'
import { useAuth } from './context/AuthContext.js'

const metadata = {
  title: 'Marmosium Social Dashboard',
  description: 'Çoklu marka sosyal medya raporlama ve istatistik aracı',
}

function LayoutContent({ children }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen text-zinc-100 flex flex-col">
      {/* Glass Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/[0.04] backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #d946ef)' }}>
              <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3.4" y="15" width="3.2" height="5" rx="1" fill="currentColor" />
                <rect x="10.4" y="10" width="3.2" height="10" rx="1" fill="currentColor" />
                <rect x="17.4" y="5" width="3.2" height="15" rx="1" fill="currentColor" />
                <path d="M3 14 L9.5 9 L14.5 12 L21 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">
                Marsamedya
              </h1>
              <p className="hidden sm:block text-[9px] text-zinc-500 tracking-wider uppercase font-semibold whitespace-nowrap">Sosyal Medya Performans İzleme Programı</p>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm" style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #d946ef)' }}>
                  {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                </div>
                <span className="hidden md:inline text-xs font-medium text-zinc-300">
                  {user.name || user.email}
                </span>
              </div>

              <button
                onClick={logout}
                className="glass hover:border-white/20 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-button whitespace-nowrap shrink-0"
              >
                Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
        {children}
      </main>
    </div>
  )
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="text-zinc-100 min-h-screen selection:bg-indigo-500/30 selection:text-white">
        <AuthProvider>
          <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
      </body>
    </html>
  )
}
