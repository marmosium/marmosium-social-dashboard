'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { startOfMonth, endOfMonth, subMonths, format, isSameMonth } from 'date-fns'
import { supabase } from '../../../lib/supabaseClient.js'
import { useAuth } from '../../context/AuthContext.js'
import { useTheme } from '../../context/ThemeContext.js'
import { PlatformReport } from './PlatformReport.js'
import { BrandLogo } from '../../components/BrandLogo.js'

function toISODate(date) {
  return format(date, 'yyyy-MM-dd')
}

function formatDateStr(isoDate) {
  const [y, m, d] = isoDate.split('-')
  return `${d}.${m}.${y}`
}

export default function BrandReportPage() {
  const { id } = useParams()
  const { user, loading: authLoading } = useAuth()
  const { koyu } = useTheme()
  const router = useRouter()

  const [brand, setBrand] = useState(null)
  const [monthValue, setMonthValue] = useState(format(new Date(), 'yyyy-MM'))
  const [activeTab, setActiveTab] = useState(null)
  const [rowsByPlatform, setRowsByPlatform] = useState({})
  const [prevRowsByPlatform, setPrevRowsByPlatform] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && id) {
      fetchReportData()
    }
  }, [user, id, monthValue])

  async function fetchReportData() {
    try {
      setLoading(true)
      setError(null)

      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .eq('id', id)
        .single()

      if (brandError) throw brandError
      setBrand(brandData)
      if (!activeTab) {
        setActiveTab(brandData.ig_account_id ? 'instagram' : 'facebook')
      }

      const [year, month] = monthValue.split('-').map(Number)
      const selectedMonthDate = new Date(year, month - 1, 1)
      const monthStart = startOfMonth(selectedMonthDate)
      const isCurrentMonth = isSameMonth(selectedMonthDate, new Date())
      const monthEnd = isCurrentMonth ? new Date() : endOfMonth(selectedMonthDate)

      // Karsilastirma HER ZAMAN bir onceki TAKVIM AYININ TAMAMIYLA yapilir
      // (or. Eylul -> 1-30 Eylul vs 1-31 Agustos). Onceki donem asla "ayni
      // uzunlukta trailing pencere" olarak hesaplanmaz -- ay uzunluklari
      // farkli olsa bile (28-31 gun) karsilastirma hep tam ay ile tam aydir.
      const previousMonthDate = subMonths(monthStart, 1)
      const prevStart = startOfMonth(previousMonthDate)
      const prevEnd = endOfMonth(previousMonthDate)

      const since = toISODate(monthStart)
      const until = toISODate(monthEnd)
      const prevSince = toISODate(prevStart)
      const prevUntil = toISODate(prevEnd)

      const [{ data: currentRows, error: currentError }, { data: previousRows, error: previousError }] = await Promise.all([
        supabase.from('daily_metrics').select('*').eq('brand_id', id).gte('metric_date', since).lte('metric_date', until),
        supabase.from('daily_metrics').select('*').eq('brand_id', id).gte('metric_date', prevSince).lte('metric_date', prevUntil),
      ])

      if (currentError) throw currentError
      if (previousError) throw previousError

      const byPlatform = { facebook: [], instagram: [] }
      for (const row of currentRows || []) byPlatform[row.platform]?.push(row)
      setRowsByPlatform({
        ...byPlatform,
        _meta: { since, until, prevSince, prevUntil },
      })

      const prevByPlatform = { facebook: [], instagram: [] }
      for (const row of previousRows || []) prevByPlatform[row.platform]?.push(row)
      setPrevRowsByPlatform(prevByPlatform)
    } catch (err) {
      setError(err.message)
      console.error('Rapor hatası:', err)
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
          <p className="text-xs text-zinc-500 tracking-wider">Rapor yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <p className={`text-sm ${koyu ? 'text-red-400' : 'text-red-600'}`}>Marka bulunamadı ya da bir hata oluştu: {error}</p>
        <a href="/" className="text-xs text-indigo-400 hover:text-indigo-300 mt-3 inline-block">← Dashboard'a dön</a>
      </div>
    )
  }

  const meta = rowsByPlatform._meta || {}
  const availableTabs = [
    brand?.ig_account_id && 'instagram',
    brand?.fb_page_id && 'facebook',
  ].filter(Boolean)

  const baslikRengi = koyu ? 'text-white' : 'text-zinc-900'
  const kenarlikKalin = koyu ? 'border-zinc-800' : 'border-zinc-200'
  const girdiSinifi = koyu
    ? 'bg-white/5 border-white/10 text-zinc-200 focus:border-indigo-400/60'
    : 'bg-black/[0.03] border-zinc-300 text-zinc-900 focus:border-indigo-500'
  const bosDurum = koyu ? 'border-white/15 bg-black/10' : 'border-zinc-300 bg-zinc-50'

  return (
    <div className="space-y-6">
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b ${kenarlikKalin}`}>
        <div className="flex items-center gap-3">
          <BrandLogo name={brand?.name} className="h-16 w-36" />
          <div>
            <a href="/" className="text-xs text-zinc-500 hover:text-indigo-400 transition-button">← Dashboard'a dön</a>
            <h2 className={`text-xl font-bold tracking-tight mt-1 ${baslikRengi}`}>{brand?.name} — Performans Raporu</h2>
            {brand?.client_name && <p className="text-zinc-500 text-xs mt-0.5">{brand.client_name}</p>}
          </div>
        </div>

        <input
          type="month"
          value={monthValue}
          onChange={(e) => setMonthValue(e.target.value)}
          className={`rounded-lg px-3 py-2 text-sm outline-none transition-button border ${girdiSinifi}`}
        />
      </div>

      {availableTabs.length > 1 && (
        <div className="flex gap-2">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-button ${
                activeTab === tab ? 'btn-gradient' : `glass text-zinc-400 ${koyu ? 'hover:text-zinc-200' : 'hover:text-zinc-900'}`
              }`}
            >
              {tab === 'instagram' ? 'Instagram' : 'Facebook'}
            </button>
          ))}
        </div>
      )}

      {availableTabs.length === 0 ? (
        <div className={`text-center py-14 border border-dashed rounded-xl ${bosDurum}`}>
          <p className="text-zinc-400 text-sm">Bu markaya bağlı bir Facebook Sayfası veya Instagram hesabı yok.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl p-5 sm:p-6">
          <PlatformReport
            platform={activeTab}
            rows={rowsByPlatform[activeTab] || []}
            previousRows={prevRowsByPlatform[activeTab] || []}
            sinceLabel={meta.since ? formatDateStr(meta.since) : ''}
            untilLabel={meta.until ? formatDateStr(meta.until) : ''}
            prevSinceLabel={meta.prevSince ? formatDateStr(meta.prevSince) : ''}
            prevUntilLabel={meta.prevUntil ? formatDateStr(meta.prevUntil) : ''}
          />
        </div>
      )}
    </div>
  )
}
