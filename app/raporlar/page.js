'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext.js'

export default function RaporlarPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [aylar, setAylar] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (user) {
      fetchListe()
    }
  }, [user, authLoading, router])

  async function fetchListe() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/raporlar/list')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Rapor listesi alınamadı')
      setAylar(data.aylar || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <svg className="animate-spin h-5 w-5 text-zinc-400 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-xs text-zinc-500 tracking-wider">Raporlar yükleniyor...</p>
        </div>
      </div>
    )
  }

  const toplamDosya = aylar.reduce((t, a) => t + a.markalar.reduce((t2, m) => t2 + m.dosyalar.length, 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Raporlar</h2>
          <p className="text-zinc-500 text-xs mt-1">Ay ay üretilmiş marka raporlarını tek tek veya toplu indirin.</p>
        </div>
        {toplamDosya > 0 && (
          <a
            href="/api/raporlar/zip"
            className="btn-gradient text-xs font-semibold px-3 py-1.5 rounded-lg transition-button whitespace-nowrap"
          >
            Tüm Raporları İndir (ZIP)
          </a>
        )}
      </div>

      {error ? (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : aylar.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-white/15 rounded-xl bg-black/10">
          <p className="text-zinc-400 text-sm">Henüz burada listelenecek bir rapor yok.</p>
        </div>
      ) : (
        aylar.map(({ ay, markalar }) => (
          <div key={ay} className="glass rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
              <h3 className="text-sm font-semibold text-zinc-200">{ay}</h3>
              <a
                href={`/api/raporlar/zip?ay=${encodeURIComponent(ay)}`}
                className="glass hover:border-white/20 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-button whitespace-nowrap"
              >
                {ay} Raporlarını İndir (ZIP)
              </a>
            </div>

            <div className="space-y-3">
              {markalar.map(({ marka, dosyalar }) => (
                <div
                  key={marka}
                  className="premium-card rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <p className="text-sm font-semibold text-white sm:w-56 shrink-0 truncate">{marka}</p>
                  <div className="flex flex-wrap gap-2">
                    {dosyalar.map((d) => (
                      <a
                        key={d.url}
                        href={d.url}
                        download
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:text-indigo-300 hover:border-indigo-400/40 transition-button"
                      >
                        {d.format === 'pdf' ? 'PDF' : 'PNG'} · {d.ad.toUpperCase().includes('INSTAGRAM') ? 'Instagram' : 'Facebook'}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
