'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext.js'
import {
  filtreleAylar,
  duzDosyaListesi,
  raporlaraGrupla,
  tercihEdilenFormat,
  sonrakiIndeks,
  odaktaGirdiVarMi,
} from './raporlarUtils.mjs'

const TEMA_ANAHTARI = 'raporlar-tema'

const KISAYOLLAR = [
  { tus: '/', aciklama: 'Aramaya odaklan' },
  { tus: 'Esc', aciklama: 'Önizlemeyi/paneli kapat' },
  { tus: '← →', aciklama: 'Önizlemede önceki / sonraki rapor' },
  { tus: 'D', aciklama: 'Önizlenen raporu indir' },
  { tus: 'T', aciklama: 'Açık / koyu tema' },
  { tus: '?', aciklama: 'Bu paneli aç/kapat' },
]

export default function RaporlarPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [aylar, setAylar] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [tema, setTema] = useState('dark')
  const [sorgu, setSorgu] = useState('')
  const [platform, setPlatform] = useState('all')
  const [onizlemeIndeksi, setOnizlemeIndeksi] = useState(null)
  const [onizlemeFormati, setOnizlemeFormati] = useState(null)
  const [kisayolPaneliAcik, setKisayolPaneliAcik] = useState(false)
  const aramaRef = useRef(null)

  // --- tema tercihini yükle (localStorage -> yoksa sistem tercihi -> yoksa koyu) ---
  useEffect(() => {
    try {
      const kayitli = window.localStorage.getItem(TEMA_ANAHTARI)
      if (kayitli === 'light' || kayitli === 'dark') {
        setTema(kayitli)
        return
      }
    } catch (e) {
      // localStorage erişilemez olabilir (gizli sekme vb.) - sorun değil, devam
    }
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        setTema('light')
      }
    } catch (e) {
      // matchMedia yoksa varsayılan koyu temada kal
    }
  }, [])

  function temaDegistir() {
    setTema((onceki) => {
      const yeni = onceki === 'dark' ? 'light' : 'dark'
      try {
        window.localStorage.setItem(TEMA_ANAHTARI, yeni)
      } catch (e) {
        // yazılamazsa da tema bu oturumda değişmeye devam eder
      }
      return yeni
    })
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (user) {
      fetchListe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const suzulmusAylar = useMemo(() => filtreleAylar(aylar, sorgu, platform), [aylar, sorgu, platform])
  const duzListe = useMemo(() => duzDosyaListesi(suzulmusAylar), [suzulmusAylar])
  const toplamRaporSayisi = useMemo(
    () => aylar.reduce((t, a) => t + a.markalar.reduce((t2, m) => t2 + raporlaraGrupla(m.dosyalar).length, 0), 0),
    [aylar]
  )

  const onizlenenGirdi = onizlemeIndeksi !== null ? duzListe[onizlemeIndeksi] : null

  function onizlemeAc(indeks) {
    const girdi = duzListe[indeks]
    if (!girdi) return
    setOnizlemeIndeksi(indeks)
    setOnizlemeFormati(tercihEdilenFormat(girdi.rapor))
  }

  function onizlemeKapat() {
    setOnizlemeIndeksi(null)
    setOnizlemeFormati(null)
  }

  function onizlemeGezin(yon) {
    setOnizlemeIndeksi((onceki) => {
      if (onceki === null) return onceki
      const yeniIndeks = sonrakiIndeks(onceki, duzListe.length, yon)
      if (yeniIndeks === -1) return null
      const girdi = duzListe[yeniIndeks]
      setOnizlemeFormati(tercihEdilenFormat(girdi.rapor))
      return yeniIndeks
    })
  }

  function dosyaIndir(url) {
    const a = document.createElement('a')
    a.href = url
    a.download = ''
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  // --- klavye kısayolları ---
  useEffect(() => {
    function tusaBasildi(e) {
      if (e.key === 'Escape') {
        if (onizlemeIndeksi !== null) {
          onizlemeKapat()
          return
        }
        if (kisayolPaneliAcik) {
          setKisayolPaneliAcik(false)
          return
        }
        if (document.activeElement === aramaRef.current) aramaRef.current.blur()
        return
      }
      if (e.key === '/' && document.activeElement !== aramaRef.current) {
        e.preventDefault()
        aramaRef.current?.focus()
        return
      }
      // Arama kutusuna (veya başka bir girdiye) yazarken tek-tuş kısayolları
      // (d, t, ?) devre dışı kalsın — sadece Escape ve "/" yukarıda muaf.
      if (odaktaGirdiVarMi(document.activeElement)) return

      if (onizlemeIndeksi !== null) {
        if (e.key === 'ArrowRight') {
          onizlemeGezin(1)
          return
        }
        if (e.key === 'ArrowLeft') {
          onizlemeGezin(-1)
          return
        }
        if (e.key === 'd' || e.key === 'D') {
          const gecerliDosya = onizlenenGirdi?.rapor.formatlar[onizlemeFormati]
          if (gecerliDosya) dosyaIndir(gecerliDosya.url)
          return
        }
      }
      if (e.key === 't' || e.key === 'T') {
        temaDegistir()
        return
      }
      if (e.key === '?') {
        setKisayolPaneliAcik((v) => !v)
        return
      }
    }
    window.addEventListener('keydown', tusaBasildi)
    return () => window.removeEventListener('keydown', tusaBasildi)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onizlemeIndeksi, onizlemeFormati, duzListe, kisayolPaneliAcik, onizlenenGirdi])

  const koyu = tema === 'dark'

  // --- tema tabanlı ortak sınıflar ---
  const s = koyu
    ? {
        panel: 'bg-white/[0.03] border-white/10',
        panelHover: 'hover:border-indigo-400/40 hover:bg-white/[0.05]',
        baslik: 'text-white',
        altBaslik: 'text-zinc-500',
        metin: 'text-zinc-300',
        metinSoluk: 'text-zinc-500',
        girdi: 'bg-white/[0.04] border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-400/50',
        chip: 'bg-white/[0.04] border-white/10 text-zinc-400 hover:text-zinc-200',
        chipAktif: 'bg-indigo-500/20 border-indigo-400/50 text-indigo-200',
        ikincilBtn: 'bg-white/[0.04] border-white/10 text-zinc-300 hover:border-white/20',
        modalArkaplan: 'bg-black/80',
        modalYuzey: 'bg-zinc-950 border-white/10',
        kbd: 'bg-white/10 border-white/20 text-zinc-200',
      }
    : {
        panel: 'bg-white border-zinc-200 shadow-sm',
        panelHover: 'hover:border-indigo-400 hover:shadow-md',
        baslik: 'text-zinc-900',
        altBaslik: 'text-zinc-500',
        metin: 'text-zinc-700',
        metinSoluk: 'text-zinc-500',
        girdi: 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500',
        chip: 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900',
        chipAktif: 'bg-indigo-100 border-indigo-300 text-indigo-700',
        ikincilBtn: 'bg-white border-zinc-300 text-zinc-700 hover:border-zinc-400 shadow-sm',
        modalArkaplan: 'bg-zinc-900/70',
        modalYuzey: 'bg-white border-zinc-200',
        kbd: 'bg-zinc-100 border-zinc-300 text-zinc-700',
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

  return (
    <div
      className={`space-y-6 rounded-2xl p-4 sm:p-6 -mx-4 sm:-mx-6 lg:-mx-8 ${koyu ? '' : 'bg-zinc-50'}`}
      style={!koyu ? { minHeight: 'calc(100vh - 6rem)' } : undefined}
    >
      {/* Başlık + genel eylemler */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-current/10">
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${s.baslik}`}>Raporlar</h2>
          <p className={`text-xs mt-1 ${s.altBaslik}`}>
            {toplamRaporSayisi} rapor · ay ay görüntüleyin, tek tek veya toplu indirin.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setKisayolPaneliAcik((v) => !v)}
            title="Klavye kısayolları (?)"
            aria-label="Klavye kısayolları"
            className={`h-8 w-8 rounded-lg border flex items-center justify-center text-xs font-semibold transition-button ${s.ikincilBtn}`}
          >
            ⌨
          </button>
          <button
            type="button"
            onClick={temaDegistir}
            title="Temayı değiştir (T)"
            aria-label="Temayı değiştir"
            className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-button ${s.ikincilBtn}`}
          >
            {koyu ? '☀️' : '🌙'}
          </button>
          {toplamRaporSayisi > 0 && (
            <a
              href="/api/raporlar/zip"
              className="btn-gradient text-xs font-semibold px-3 py-1.5 rounded-lg transition-button whitespace-nowrap"
            >
              Tüm Raporları İndir (ZIP)
            </a>
          )}
        </div>
      </div>

      {/* Arama + platform filtresi */}
      {toplamRaporSayisi > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              ref={aramaRef}
              type="text"
              value={sorgu}
              onChange={(e) => setSorgu(e.target.value)}
              placeholder="Marka veya ay ara…  (kısayol: /)"
              className={`w-full text-sm rounded-lg border px-3.5 py-2 outline-none transition-button ${s.girdi}`}
            />
            {sorgu && (
              <button
                type="button"
                onClick={() => setSorgu('')}
                aria-label="Aramayı temizle"
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs ${s.metinSoluk} hover:opacity-80`}
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            {[
              { deger: 'all', etiket: 'Tümü' },
              { deger: 'instagram', etiket: 'Instagram' },
              { deger: 'facebook', etiket: 'Facebook' },
            ].map((secenek) => (
              <button
                key={secenek.deger}
                type="button"
                onClick={() => setPlatform(secenek.deger)}
                className={`text-xs font-medium px-3 py-2 rounded-lg border transition-button whitespace-nowrap ${
                  platform === secenek.deger ? s.chipAktif : s.chip
                }`}
              >
                {secenek.etiket}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Klavye kısayolları paneli */}
      {kisayolPaneliAcik && (
        <div className={`rounded-xl border p-4 ${s.panel}`}>
          <p className={`text-xs font-semibold mb-3 ${s.baslik}`}>Klavye kısayolları</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {KISAYOLLAR.map((k) => (
              <div key={k.tus} className="flex items-center gap-2.5">
                <kbd className={`text-[11px] font-mono px-1.5 py-0.5 rounded border ${s.kbd}`}>{k.tus}</kbd>
                <span className={`text-xs ${s.metin}`}>{k.aciklama}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error ? (
        <div className={`rounded-2xl p-6 text-center border ${s.panel}`}>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : toplamRaporSayisi === 0 ? (
        <div className={`text-center py-14 border border-dashed rounded-xl ${koyu ? 'border-white/15 bg-black/10' : 'border-zinc-300 bg-white'}`}>
          <p className={`text-sm ${s.metinSoluk}`}>Henüz burada listelenecek bir rapor yok.</p>
        </div>
      ) : suzulmusAylar.length === 0 ? (
        <div className={`text-center py-14 border border-dashed rounded-xl ${koyu ? 'border-white/15 bg-black/10' : 'border-zinc-300 bg-white'}`}>
          <p className={`text-sm ${s.metinSoluk}`}>"{sorgu}" ile eşleşen bir rapor bulunamadı.</p>
        </div>
      ) : (
        suzulmusAylar.map(({ ay, markalar }) => (
          <div key={ay} className={`rounded-2xl p-5 sm:p-6 border ${s.panel}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
              <h3 className={`text-sm font-semibold ${s.baslik}`}>{ay}</h3>
              <a
                href={`/api/raporlar/zip?ay=${encodeURIComponent(ay)}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-button whitespace-nowrap border ${s.ikincilBtn}`}
              >
                {ay} Raporlarını İndir (ZIP)
              </a>
            </div>

            <div className="space-y-4">
              {markalar.map(({ marka, dosyalar }) => (
                <div key={marka}>
                  <p className={`text-xs font-semibold mb-2 ${s.metin}`}>{marka}</p>
                  <div className="flex flex-wrap gap-2.5">
                    {raporlaraGrupla(dosyalar).map((rapor) => {
                      const globalIndeks = duzListe.findIndex(
                        (g) => g.ay === ay && g.marka === marka && g.rapor.temelAd === rapor.temelAd
                      )
                      const formatEtiketi = Object.keys(rapor.formatlar)
                        .map((f) => f.toUpperCase())
                        .join(' + ')
                      return (
                        <button
                          key={rapor.temelAd}
                          type="button"
                          onClick={() => onizlemeAc(globalIndeks)}
                          className={`w-28 rounded-xl border overflow-hidden text-left transition-card ${s.panel} ${s.panelHover}`}
                      >
                        <div className={`h-16 flex items-center justify-center text-[10px] font-semibold tracking-wide ${koyu ? 'bg-black/20 text-zinc-500' : 'bg-zinc-50 text-zinc-400'}`}>
                          {rapor.platform === 'instagram' ? 'IG' : 'FB'}
                        </div>
                        <div className="px-2 py-1.5">
                          <p className={`text-[10px] font-medium truncate ${s.metin}`}>
                            {rapor.platform === 'instagram' ? 'Instagram' : 'Facebook'}
                          </p>
                          <p className={`text-[9px] ${s.metinSoluk}`}>{formatEtiketi}</p>
                        </div>
                      </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Önizleme modalı */}
      {onizlenenGirdi && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 ${s.modalArkaplan}`}
          onClick={onizlemeKapat}
        >
          <div
            className={`relative w-full max-w-3xl max-h-full rounded-2xl border overflow-hidden flex flex-col ${s.modalYuzey}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b ${koyu ? 'border-white/10' : 'border-zinc-200'}`}>
              <div className="min-w-0">
                <p className={`text-sm font-semibold truncate ${s.baslik}`}>{onizlenenGirdi.marka}</p>
                <p className={`text-xs ${s.metinSoluk}`}>
                  {onizlenenGirdi.ay} · {onizlenenGirdi.rapor.platform === 'instagram' ? 'Instagram' : 'Facebook'}
                  {' · '}
                  {onizlemeIndeksi + 1}/{duzListe.length}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {Object.keys(onizlenenGirdi.rapor.formatlar).length > 1 &&
                  Object.keys(onizlenenGirdi.rapor.formatlar).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setOnizlemeFormati(f)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-md border transition-button ${
                        onizlemeFormati === f ? s.chipAktif : s.chip
                      }`}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => dosyaIndir(onizlenenGirdi.rapor.formatlar[onizlemeFormati]?.url)}
                  title="İndir (D)"
                  className={`text-xs font-medium px-2.5 py-1.5 rounded-md border transition-button ${s.ikincilBtn}`}
                >
                  İndir
                </button>
                <button
                  type="button"
                  onClick={onizlemeKapat}
                  aria-label="Kapat"
                  title="Kapat (Esc)"
                  className={`h-7 w-7 rounded-md border flex items-center justify-center transition-button ${s.ikincilBtn}`}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className={`flex-1 min-h-0 flex items-center justify-center relative ${koyu ? 'bg-black/30' : 'bg-zinc-100'}`}>
              <button
                type="button"
                onClick={() => onizlemeGezin(-1)}
                aria-label="Önceki rapor"
                title="Önceki (←)"
                className={`absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full border flex items-center justify-center transition-button ${s.ikincilBtn}`}
              >
                ‹
              </button>

              {onizlemeFormati === 'pdf' ? (
                <iframe
                  key={onizlenenGirdi.rapor.formatlar.pdf.url}
                  src={onizlenenGirdi.rapor.formatlar.pdf.url}
                  title={`${onizlenenGirdi.marka} ${onizlenenGirdi.ay} PDF önizleme`}
                  className="w-full h-[70vh] bg-white"
                />
              ) : onizlenenGirdi.rapor.formatlar.png ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={onizlenenGirdi.rapor.formatlar.png.url}
                  src={onizlenenGirdi.rapor.formatlar.png.url}
                  alt={`${onizlenenGirdi.marka} — ${onizlenenGirdi.ay} — ${onizlenenGirdi.rapor.platform}`}
                  className="max-h-[70vh] max-w-full object-contain"
                />
              ) : (
                <p className={`text-sm ${s.metinSoluk}`}>Bu rapor için önizlenebilir bir dosya yok.</p>
              )}

              <button
                type="button"
                onClick={() => onizlemeGezin(1)}
                aria-label="Sonraki rapor"
                title="Sonraki (→)"
                className={`absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full border flex items-center justify-center transition-button ${s.ikincilBtn}`}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
