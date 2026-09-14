'use client'

import './globals.css'
import { AuthProvider } from './context/AuthContext.js'
import { ThemeProvider, useTheme } from './context/ThemeContext.js'
import { usePathname } from 'next/navigation'
import { useAuth } from './context/AuthContext.js'
import Sidebar from './components/Sidebar.js'

const metadata = {
  title: 'Marmosium Social Dashboard',
  description: 'Çoklu marka sosyal medya raporlama ve istatistik aracı',
}

function LayoutContent({ children }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { koyu, temaDegistir } = useTheme()
  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar koyu={koyu} temaDegistir={temaDegistir} user={user} logout={logout} />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
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
      <body className="min-h-screen selection:bg-indigo-500/30 selection:text-white">
        <ThemeProvider>
          <AuthProvider>
            <LayoutContent>{children}</LayoutContent>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
