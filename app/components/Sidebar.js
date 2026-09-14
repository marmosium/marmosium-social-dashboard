'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// B2B pano düzeni: kalıcı sol menü, "tıklama = gösterim". Masaüstünde her
// zaman görünen bir sidebar; mobilde üst şerit + hamburger ile açılan bir
// slide-over (fixed konumlandırma document.body'ye portallanıyor — aynı
// app/raporlar/page.js'deki önizleme modalının transform-containing-block
// düzeltmesinde kullanılan desen, burada da baştan aynı hataya düşmemek için).
const NAV_OGELERI = [
  {
    href: '/',
    etiket: 'Ana Sayfa',
    aktifMi: (yol) => yol === '/' || yol.startsWith('/brands/'),
    ikon: (sinif) => (
      <svg className={sinif} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 10.5L12 3l9 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/raporlar',
    etiket: 'Raporlar',
    aktifMi: (yol) => yol.startsWith('/raporlar'),
    ikon: (sinif) => (
      <svg className={sinif} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M14 3v5h5M9 13h6M9 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
]

function Logo({ koyu, kompakt }) {
  return (
    <div className={`flex items-center gap-2.5 ${kompakt ? '' : 'px-5 pt-5 pb-6'}`}>
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #d946ef)' }}
      >
        <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3.4" y="15" width="3.2" height="5" rx="1" fill="currentColor" />
          <rect x="10.4" y="10" width="3.2" height="10" rx="1" fill="currentColor" />
          <rect x="17.4" y="5" width="3.2" height="15" rx="1" fill="currentColor" />
          <path d="M3 14 L9.5 9 L14.5 12 L21 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {!kompakt && (
        <div className="min-w-0">
          <h1 className={`text-sm font-bold tracking-tight truncate ${koyu ? 'text-white' : 'text-zinc-900'}`}>
            Marsamedya
          </h1>
          <p className="text-[8.5px] text-zinc-500 tracking-wider uppercase font-semibold truncate">
            Sosyal Medya Performans İzleme
          </p>
        </div>
      )}
    </div>
  )
}

function SidebarIcerik({ koyu, temaDegistir, user, logout, pathname, ogeTiklandi }) {
  return (
    <>
      <Logo koyu={koyu} />

      {user && (
        <>
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {NAV_OGELERI.map((oge) => {
              const aktif = oge.aktifMi(pathname)
              return (
                <Link
                  key={oge.href}
                  href={oge.href}
                  onClick={ogeTiklandi}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-button ${
                    aktif
                      ? 'btn-gradient text-white'
                      : koyu
                        ? 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.04]'
                  }`}
                >
                  {oge.ikon('h-4 w-4 shrink-0')}
                  {oge.etiket}
                </Link>
              )
            })}
          </nav>

          <div className={`px-3 pb-4 pt-3 border-t space-y-3 ${koyu ? 'border-white/10' : 'border-zinc-200'}`}>
            <button
              type="button"
              onClick={temaDegistir}
              title="Temayı değiştir"
              aria-label="Temayı değiştir"
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-button ${
                koyu ? 'text-zinc-400 hover:text-white hover:bg-white/[0.06]' : 'text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.04]'
              }`}
            >
              <span className="text-sm">{koyu ? '☀️' : '🌙'}</span>
              {koyu ? 'Açık Tema' : 'Koyu Tema'}
            </button>

            <div className="flex items-center gap-2.5 px-3">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0"
                style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #d946ef)' }}
              >
                {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
              </div>
              <span className={`text-xs font-medium truncate ${koyu ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {user.name || user.email}
              </span>
            </div>

            <button
              onClick={logout}
              className={`w-full glass px-3 py-2 rounded-lg text-xs font-medium transition-button ${
                koyu ? 'text-zinc-300 hover:border-white/20' : 'text-zinc-700 hover:border-zinc-400'
              }`}
            >
              Çıkış Yap
            </button>
          </div>
        </>
      )}
    </>
  )
}

export default function Sidebar({ koyu, temaDegistir, user, logout }) {
  const pathname = usePathname()
  const [mobilAcik, setMobilAcik] = useState(false)

  return (
    <>
      {/* Masaüstü: kalıcı sol sidebar (lg ve üzeri) */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:h-screen lg:sticky lg:top-0 border-r transition-button ${
          koyu ? 'bg-white/[0.03] border-white/10' : 'bg-white/70 border-zinc-200'
        }`}
      >
        <SidebarIcerik
          koyu={koyu}
          temaDegistir={temaDegistir}
          user={user}
          logout={logout}
          pathname={pathname}
          ogeTiklandi={undefined}
        />
      </aside>

      {/* Mobil: üst şerit (lg altı) */}
      <div
        className={`lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b backdrop-blur-xl transition-button ${
          koyu ? 'bg-white/[0.04] border-white/10' : 'bg-white/70 border-zinc-200'
        }`}
      >
        <Logo koyu={koyu} kompakt={false} />
        {user && (
          <button
            type="button"
            onClick={() => setMobilAcik(true)}
            title="Menüyü aç"
            aria-label="Menüyü aç"
            className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-button ${
              koyu ? 'bg-white/[0.06] hover:bg-white/10 text-zinc-200' : 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700'
            }`}
          >
            <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Mobil: slide-over menü — document.body'ye portallanıyor (fixed konumlandırma
          hatasına düşmemek için; bkz. raporlar önizleme modalındaki aynı düzeltme) */}
      {mobilAcik &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="lg:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobilAcik(false)}
              aria-hidden="true"
            />
            <div
              className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] flex flex-col shadow-2xl ${
                koyu ? 'bg-zinc-950' : 'bg-white'
              }`}
            >
              <div className="flex justify-end px-3 pt-3">
                <button
                  type="button"
                  onClick={() => setMobilAcik(false)}
                  title="Menüyü kapat"
                  aria-label="Menüyü kapat"
                  className={`h-8 w-8 rounded-lg flex items-center justify-center transition-button ${
                    koyu ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-black/[0.06] text-zinc-600'
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <SidebarIcerik
                koyu={koyu}
                temaDegistir={temaDegistir}
                user={user}
                logout={logout}
                pathname={pathname}
                ogeTiklandi={() => setMobilAcik(false)}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
