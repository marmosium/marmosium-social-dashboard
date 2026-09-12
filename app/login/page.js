'use client'

import { useState } from 'react'
import { useAuth } from '../context/AuthContext.js'
import { useTheme } from '../context/ThemeContext.js'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

function StatChip({ className, style, icon, text, metinRengi }) {
  return (
    <div
      className={`stat-chip hidden sm:flex items-center gap-1.5 glass rounded-full px-3 py-1.5 text-[11px] font-medium ${metinRengi} ${className}`}
      style={style}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function IconBadge({ className, style, children }) {
  return (
    <div
      className={`stat-chip hidden sm:flex items-center justify-center glass rounded-full h-10 w-10 text-base ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

// Kart alanının dışında, arka planda gezinen neşeli emojiler (kartın arkasında kaldığı için formu kapatmaz)
const FLOATING_EMOJIS = [
  { emoji: '😄', top: '6%', left: '8%', size: 'text-3xl', duration: '14s', delay: '0s' },
  { emoji: '🎉', top: '13%', left: '86%', size: 'text-2xl', duration: '17s', delay: '1s' },
  { emoji: '✨', top: '4%', left: '46%', size: 'text-xl', duration: '12s', delay: '2s' },
  { emoji: '🥳', top: '30%', left: '4%', size: 'text-4xl', duration: '19s', delay: '0.5s' },
  { emoji: '😂', top: '38%', left: '93%', size: 'text-2xl', duration: '15s', delay: '3s' },
  { emoji: '🔥', top: '52%', left: '9%', size: 'text-2xl', duration: '13s', delay: '1.5s' },
  { emoji: '🚀', top: '62%', left: '90%', size: 'text-3xl', duration: '18s', delay: '2.5s' },
  { emoji: '💜', top: '73%', left: '5%', size: 'text-xl', duration: '11s', delay: '4s' },
  { emoji: '⭐', top: '9%', left: '66%', size: 'text-2xl', duration: '16s', delay: '0.8s' },
  { emoji: '🙌', top: '82%', left: '38%', size: 'text-3xl', duration: '20s', delay: '1.2s' },
  { emoji: '😎', top: '88%', left: '72%', size: 'text-2xl', duration: '14s', delay: '3.5s' },
  { emoji: '🎊', top: '46%', left: '50%', size: 'text-xl', duration: '12s', delay: '2s' },
  { emoji: '🤩', top: '21%', left: '26%', size: 'text-2xl', duration: '17s', delay: '0.3s' },
  { emoji: '💃', top: '92%', left: '14%', size: 'text-3xl', duration: '15s', delay: '2.8s' },
  { emoji: '🕺', top: '5%', left: '76%', size: 'text-2xl', duration: '13s', delay: '1.8s' },
  { emoji: '😆', top: '67%', left: '58%', size: 'text-xl', duration: '19s', delay: '3.2s' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [poppingIndex, setPoppingIndex] = useState(null)
  const { login, user, error: authError } = useAuth()
  const { koyu } = useTheme()
  const router = useRouter()

  useEffect(() => {
    // Her 3 saniyede bir rastgele bir emoji seçilip patlatılır (aynısı art arda seçilmesin diye kontrol var)
    const interval = setInterval(() => {
      setPoppingIndex((prev) => {
        if (FLOATING_EMOJIS.length <= 1) return 0
        let next
        do {
          next = Math.floor(Math.random() * FLOATING_EMOJIS.length)
        } while (next === prev)
        return next
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Eğer zaten giriş yapılıysa ana sayfaya yönlendir
    if (user) {
      router.push('/')
    }
  }, [user, router])

  async function handleSubmit(e) {
    e.preventDefault()
    setIsLoading(true)

    const success = await login(email, password)

    if (success) {
      router.push('/')
    }

    setIsLoading(false)
  }

  // --- tema tabanlı ortak sınıflar (bkz. app/raporlar/page.js — aynı desen) ---
  const chipMetin = koyu ? 'text-zinc-300' : 'text-zinc-700'
  const girdiSinifi = koyu
    ? 'bg-white/5 border-white/10 text-zinc-200 placeholder-zinc-600 focus:border-indigo-400/60'
    : 'bg-black/[0.03] border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500'
  const etiketRengi = koyu ? 'text-zinc-400' : 'text-zinc-600'
  const hataKutusu = koyu ? 'bg-red-950/20 border-red-900/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animasyonlu arka plan ışıkları */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="orb"
          style={{ width: 420, height: 420, top: '-12%', left: '-10%', background: 'radial-gradient(circle, rgba(99,102,241,0.35), transparent 70%)' }}
        />
        <div
          className="orb"
          style={{ width: 380, height: 380, top: '-8%', right: '-12%', background: 'radial-gradient(circle, rgba(217,70,239,0.3), transparent 70%)', animationDelay: '2s', animationDuration: '16s' }}
        />
        <div
          className="orb"
          style={{ width: 340, height: 340, bottom: '-14%', left: '22%', background: 'radial-gradient(circle, rgba(34,211,238,0.22), transparent 70%)', animationDelay: '4s', animationDuration: '18s' }}
        />

        {/* Sayfada gezinen neşeli emojiler — kartın arkasında kaldıkları için formu örtmezler.
            Her 3 saniyede bir rastgele seçilen tanesi balon gibi şişip patlar. */}
        {FLOATING_EMOJIS.map((e, i) => (
          <span
            key={i}
            className={`emoji-wander ${e.size}`}
            style={{ top: e.top, left: e.left, animationDuration: e.duration, animationDelay: e.delay }}
          >
            <span key={i === poppingIndex ? 'pop' : 'idle'} className={i === poppingIndex ? 'emoji-pop' : ''}>
              {e.emoji}
            </span>
          </span>
        ))}
      </div>

      {/* Dört köşede sabit, birbirinden ayrı dekoratif öğeler — üst üste binmiyor */}
      <IconBadge className="fixed top-6 left-6" style={{ animationDelay: '0.6s', '--chip-rotate': '-4deg' }}>📷</IconBadge>
      <IconBadge className="fixed top-6 right-6" style={{ animationDelay: '1.8s', '--chip-rotate': '4deg' }}>👍</IconBadge>
      <StatChip icon="⚡" text="Canlı Senkronizasyon" metinRengi={chipMetin} className="fixed bottom-6 left-6" style={{ animationDelay: '2.4s', '--chip-rotate': '-3deg' }} />
      <div className="fixed bottom-8 right-8 hidden sm:block w-16 h-24 pointer-events-none">
        <span className="heart-pop absolute bottom-0 left-1 text-lg" style={{ animationDelay: '0s' }}>❤️</span>
        <span className="heart-pop absolute bottom-0 left-7 text-sm" style={{ animationDelay: '1s' }}>❤️</span>
        <span className="heart-pop absolute bottom-0 left-4 text-base" style={{ animationDelay: '2s' }}>❤️</span>
      </div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        {/* Dekoratif istatistik rozetleri */}
        <StatChip icon="📈" text="↑ %24 Erişim" metinRengi={chipMetin} className="absolute -top-2 -left-4 lg:-left-16" style={{ animationDelay: '0s', '--chip-rotate': '-6deg' }} />
        <StatChip icon="💬" text="1.2K Etkileşim" metinRengi={chipMetin} className="absolute top-10 -right-4 lg:-right-20" style={{ animationDelay: '1.2s', '--chip-rotate': '5deg' }} />

        {/* Brand Header */}
        <div className="flex justify-center mb-4">
          <div
            className="glow-pulse flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg"
            style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #d946ef)' }}
          >
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect className="bar-grow" style={{ animationDelay: '0s' }} x="3.4" y="15" width="3.2" height="5" rx="1" fill="currentColor" />
              <rect className="bar-grow" style={{ animationDelay: '0.12s' }} x="10.4" y="10" width="3.2" height="10" rx="1" fill="currentColor" />
              <rect className="bar-grow" style={{ animationDelay: '0.24s' }} x="17.4" y="5" width="3.2" height="15" rx="1" fill="currentColor" />
              <path
                className="line-draw"
                style={{ animationDelay: '0.45s' }}
                d="M3 14 L9.5 9 L14.5 12 L21 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <h2 className="text-center text-2xl font-bold tracking-tight text-gradient-animated">
          Marsamedya
        </h2>
        <p className="mt-1 text-center text-xs text-zinc-500 uppercase tracking-widest font-semibold">
          Sosyal Medya Performans İzleme Programı
        </p>
      </div>

      <div className="relative mt-6 sm:mx-auto sm:w-full sm:max-w-[400px]">
        {/* Glass Card */}
        <div className="card-enter glass px-6 py-8 shadow-xl rounded-2xl sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className={`block text-xs font-medium ${etiketRengi}`}>
                E-posta Adresi
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-0 transition-button ${girdiSinifi}`}
                  placeholder="isim@ajans.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className={`block text-xs font-medium ${etiketRengi}`}>
                Şifre
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-0 transition-button ${girdiSinifi}`}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
            </div>

            {authError && (
              <div className={`rounded-lg border p-3 text-xs ${hataKutusu}`}>
                <div className="flex gap-2">
                  <span className="shrink-0">⚠️</span>
                  <p>{authError}</p>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-gradient btn-shimmer flex w-full justify-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-button"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Giriş Yapılıyor...</span>
                  </div>
                ) : (
                  'Giriş Yap'
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-600">
          &copy; 2026 Marsamedya. Tüm hakları saklıdır.
        </p>
      </div>
    </div>
  )
}
