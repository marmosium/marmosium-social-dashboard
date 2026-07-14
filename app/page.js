'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from './context/AuthContext.js'
import { useRouter } from 'next/navigation'
import { BrandLogo } from './components/BrandLogo.js'

function formatDateStr(dateStr) {
  if (!dateStr) return '–'
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}`
}

function formatDateTime(isoStr) {
  if (!isoStr) return '–'
  return format(new Date(isoStr), 'dd.MM.yyyy HH:mm')
}

export default function Home() {
  const [brands, setBrands] = useState([])
  const [metrics, setMetrics] = useState({})
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncModal, setSyncModal] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [mounted, setMounted] = useState(false)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (user) {
      fetchBrands()
      fetchConnectionStatus()
    }
  }, [user, authLoading, router])

  async function fetchConnectionStatus() {
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      setConnectionStatus(data)
    } catch {
      setConnectionStatus({ supabase: false, meta: false })
    }
  }

  async function fetchBrands() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setBrands(data || [])
      await fetchLatestMetrics((data || []).map((b) => b.id))
    } catch (err) {
      setError(err.message)
      console.error('Hata:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchLatestMetrics(brandIds) {
    if (!brandIds.length) {
      setMetrics({})
      setLastSyncedAt(null)
      return
    }

    const { data, error } = await supabase
      .from('daily_metrics')
      .select('*')
      .in('brand_id', brandIds)
      .order('metric_date', { ascending: false })

    if (error) {
      console.error('Metrik hatası:', error)
      return
    }

    const map = {}
    let latestUpdatedAt = null

    for (const row of data || []) {
      // "son senkronizasyon" için created_at değil updated_at kullanılıyor — created_at satır ilk
      // oluşturulduğunda sabitleniyor, updated_at ise her senkronizasyonda gerçekten güncelleniyor.
      if (row.updated_at && (!latestUpdatedAt || row.updated_at > latestUpdatedAt)) {
        latestUpdatedAt = row.updated_at
      }
      if (!map[row.brand_id]) map[row.brand_id] = {}
      if (!map[row.brand_id][row.platform]) {
        map[row.brand_id][row.platform] = row
      }
    }

    setMetrics(map)
    setLastSyncedAt(latestUpdatedAt)
  }

  async function handleSync() {
    try {
      setSyncing(true)
      setSyncModal(null)

      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Senkronizasyon başarısız')

      const okResults = data.results.filter((r) => r.status === 'ok')
      const errorResults = data.results.filter((r) => r.status === 'error')

      setSyncModal({
        type: errorResults.length > 0 ? (okResults.length > 0 ? 'warning' : 'error') : 'success',
        title:
          errorResults.length === 0
            ? 'Senkronizasyon Başarılı'
            : okResults.length > 0
            ? 'Senkronizasyon Kısmen Başarılı'
            : 'Senkronizasyon Başarısız',
        summary: `Meta'dan ${data.discovered} marka bulundu, ${okResults.length} markanın verisi güncellendi${errorResults.length > 0 ? `, ${errorResults.length} markada hata oluştu.` : '.'}`,
        results: data.results,
      })

      await fetchBrands()
    } catch (err) {
      setSyncModal({
        type: 'error',
        title: 'Senkronizasyon Başarısız',
        summary: err.message,
        results: [],
      })
    } finally {
      setSyncing(false)
    }
  }

  const failedConnections = connectionStatus
    ? [!connectionStatus.supabase && 'Supabase', !connectionStatus.meta && 'Meta'].filter(Boolean)
    : []
  const connectionOk = connectionStatus && failedConnections.length === 0
  const connectionLabel = !connectionStatus
    ? 'Bağlantılar Kontrol Ediliyor...'
    : connectionOk
    ? 'Bağlantı Aktif'
    : `Bağlantı Aktif Değil — ${failedConnections.join(' ve ')} bağlantısı kurulmadı`

  const syncModalPortal = mounted && syncModal
    ? createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSyncModal(null)}
        >
          <div
            className="glass rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                  syncModal.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : syncModal.type === 'warning'
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-red-500/15 text-red-400'
                }`}
              >
                {syncModal.type === 'success' ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : syncModal.type === 'warning' ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </div>
              <h3 className="text-base font-bold text-white">{syncModal.title}</h3>
            </div>

            <p className="text-sm text-zinc-300">{syncModal.summary}</p>

            {syncModal.results.length > 0 && (
              <div className="mt-4 space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {syncModal.results.map((r, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 rounded-lg border p-2 text-xs ${
                      r.status === 'ok'
                        ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-300'
                        : 'bg-red-500/5 border-red-500/15 text-red-300'
                    }`}
                  >
                    <span className="shrink-0 mt-0.5">{r.status === 'ok' ? '✓' : '✕'}</span>
                    <span className="min-w-0 break-words">
                      <span className="font-semibold">{r.brand}</span>
                      {r.status === 'ok' ? ' — verisi güncellendi' : ` — ${r.message}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setSyncModal(null)}
              className="btn-gradient w-full mt-5 rounded-lg px-4 py-2 text-sm font-semibold transition-button"
            >
              Tamam
            </button>
          </div>
        </div>,
        document.body
      )
    : null

  const loadingBarPortal =
    mounted && syncing
      ? createPortal(
          <div className="loading-bar-track">
            <div className="loading-bar-fill" />
          </div>,
          document.body
        )
      : null

  if (authLoading || loading) {
    return (
      <>
        {syncModalPortal}
        {loadingBarPortal}
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <svg className="animate-spin h-5 w-5 text-zinc-400 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-xs text-zinc-500 tracking-wider">Veriler yükleniyor...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="space-y-6">
      {syncModalPortal}
      {loadingBarPortal}

      {/* Welcome & System Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Hoş Geldiniz, {user?.name || user?.email}
          </h2>
          <p className="text-zinc-500 text-xs mt-1">Sosyal medya markalarınızı ve günlük metriklerinizi buradan takip edin.</p>
        </div>

        {/* Dynamic Status Indicator */}
        <div className={`inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-xs ${connectionOk ? 'text-zinc-400' : connectionStatus ? 'text-red-300' : 'text-zinc-400'}`}>
          <span className="relative flex h-1.5 w-1.5">
            {connectionOk && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
            <span
              className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                !connectionStatus ? 'bg-zinc-500' : connectionOk ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            ></span>
          </span>
          <span className="text-[10px] uppercase tracking-wider font-semibold">{connectionLabel}</span>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              Markalar
            </h3>
            <p className="text-[10px] text-zinc-500 mt-1">
              Son senkronizasyon: {lastSyncedAt ? formatDateTime(lastSyncedAt) : 'Henüz senkronize edilmedi'}
            </p>
          </div>

          {!error && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn-gradient text-xs font-semibold px-3 py-1.5 rounded-lg transition-button"
            >
              {syncing ? 'Senkronize Ediliyor...' : "Meta'dan Senkronize Et"}
            </button>
          )}
        </div>

        {/* Error State (e.g. brands table missing) */}
        {error ? (
          <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-xl p-5 text-zinc-300">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div className="space-y-3 flex-1">
                <div>
                  <p className="text-sm font-bold text-white">Veritabanı Tablosu Eksik</p>
                  <p className="text-xs text-zinc-500 mt-0.5">`brands` tablosu veritabanınızda bulunamadı. Lütfen SQL şemasını Supabase SQL Editor üzerinden çalıştırın.</p>
                </div>
                <div className="bg-black/30 border border-white/10 rounded-lg p-3.5 font-mono text-[10px] text-zinc-400 overflow-x-auto">
                  {`create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_name text,
  fb_page_id text unique,
  ig_account_id text unique,
  created_at timestamptz default now()
);`}
                </div>
              </div>
            </div>
          </div>
        ) : brands.length === 0 ? (
          /* Minimalist Empty State */
          <div className="text-center py-14 border border-dashed border-white/15 rounded-xl bg-black/10">
            <svg className="w-8 h-8 text-indigo-400/60 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <p className="text-zinc-400 text-xs mb-5">Kayıtlı herhangi bir marka bulunamadı.</p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn-gradient text-xs font-semibold px-4 py-2 rounded-lg transition-button"
            >
              {syncing ? 'Senkronize Ediliyor...' : "Meta'dan Senkronize Et"}
            </button>
          </div>
        ) : (
          /* Brands Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {brands.map((brand) => (
              <div key={brand.id} className="premium-card rounded-2xl p-6 transition-card relative">
                <div className="flex flex-col items-center text-center gap-3">
                  <BrandLogo name={brand.name} className="h-20 w-full max-w-[220px]" />
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-base truncate">{brand.name}</h4>
                    {brand.client_name && <p className="text-xs text-zinc-500 mt-0.5 truncate">{brand.client_name}</p>}
                  </div>
                </div>

                <div className="space-y-2 mt-5 pt-4 border-t border-white/10 text-xs text-zinc-400">
                  <div className="flex flex-col gap-1 text-[10px]">
                    <span className="text-zinc-500 flex items-center gap-1.5 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0"></span>
                      Facebook Page ID:
                    </span>
                    <span className="font-mono text-zinc-300 bg-blue-500/10 px-1.5 py-0.5 border border-blue-500/20 rounded break-all">
                      {brand.fb_page_id || 'Bağlı Değil'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-[10px]">
                    <span className="text-zinc-500 flex items-center gap-1.5 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundImage: 'linear-gradient(135deg, #d946ef, #f59e0b)' }}></span>
                      Instagram Account ID:
                    </span>
                    <span className="font-mono text-zinc-300 bg-fuchsia-500/10 px-1.5 py-0.5 border border-fuchsia-500/20 rounded break-all">
                      {brand.ig_account_id || 'Bağlı Değil'}
                    </span>
                  </div>
                </div>

                {(metrics[brand.id]?.facebook || metrics[brand.id]?.instagram) && (
                  <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
                    {metrics[brand.id]?.facebook && (
                      <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3 min-w-0">
                        <p className="text-[9px] text-blue-300/80 uppercase tracking-wide font-semibold">Facebook</p>
                        <p className="text-sm font-bold text-white mt-1 truncate">
                          {metrics[brand.id].facebook.followers ?? '–'} <span className="text-[10px] font-normal text-zinc-500">takipçi</span>
                        </p>
                        <p className="text-[9px] text-zinc-500 mt-1 truncate">
                          {metrics[brand.id].facebook.profile_views ?? '–'} gösterim · {formatDateStr(metrics[brand.id].facebook.metric_date)}
                        </p>
                      </div>
                    )}
                    {metrics[brand.id]?.instagram && (
                      <div className="rounded-lg bg-fuchsia-500/5 border border-fuchsia-500/10 p-3 min-w-0">
                        <p className="text-[9px] text-fuchsia-300/80 uppercase tracking-wide font-semibold">Instagram</p>
                        <p className="text-sm font-bold text-white mt-1 truncate">
                          {metrics[brand.id].instagram.followers ?? '–'} <span className="text-[10px] font-normal text-zinc-500">takipçi</span>
                        </p>
                        <p className="text-[9px] text-zinc-500 mt-1 truncate">
                          {metrics[brand.id].instagram.reach ?? '–'} erişim · {formatDateStr(metrics[brand.id].instagram.metric_date)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-5 pt-4 border-t border-white/10 flex justify-end">
                  <a href={`/brands/${brand.id}`} className="text-xs font-medium text-zinc-400 hover:text-indigo-300 flex items-center gap-1 transition-button">
                    İncele <span className="text-[10px]">→</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
