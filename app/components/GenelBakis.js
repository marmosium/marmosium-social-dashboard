'use client'

import { useEffect, useState } from 'react'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { supabase } from '../../lib/supabaseClient.js'
import { useTheme } from '../context/ThemeContext.js'
import { sumMetrics, computeChange } from '../../lib/reportUtils.js'
import { aggregateCrossBrand } from '../../lib/dashboardUtils.js'

function formatDateStr(isoDate) {
  if (!isoDate) return '–'
  const [y, m, d] = isoDate.split('-')
  return `${d}.${m}.${y}`
}

function formatSayi(n) {
  if (n === null || n === undefined) return 'ölçülemiyor'
  return n.toLocaleString('tr-TR')
}

function formatYuzde(percent) {
  if (percent === null || percent === undefined) return null
  const yuvarlak = Math.abs(percent).toFixed(1).replace('.', ',')
  return `${percent >= 0 ? '+' : '−'}%${yuvarlak}`
}

// Her platform için 3 özet alan (takipçi + iki akış metriği) gösterir.
// Facebook'ta "reach" Meta Graph API'de desteklenmediği için (bkz. reportUtils.js)
// burada da null gelir ve "ölçülemiyor" olarak gösterilir — 0 ile karıştırılmaz.
function PlatformOzeti({ baslik, renkSinifi, agg, koyu }) {
  if (!agg) return null
  const alanlar = [
    { key: 'followers', label: 'Toplam Takipçi' },
    { key: 'engagement', label: 'İçerik Etkileşimleri' },
    { key: 'reach', label: 'Erişim' },
  ]

  return (
    <div className={`rounded-xl border p-4 ${koyu ? 'bg-white/[0.03] border-white/10' : 'bg-black/[0.02] border-zinc-200'}`}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className={`text-xs font-semibold uppercase tracking-wide ${renkSinifi}`}>{baslik}</p>
        <p className="text-[9px] text-zinc-500 shrink-0">{agg.dahilMarkaSayisi}/{agg.toplamMarkaSayisi} marka verisiyle</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {alanlar.map(({ key, label }) => {
          const degisim = computeChange(agg.current[key], agg.previous[key])
          const yuzdeMetin = formatYuzde(degisim.percent)
          return (
            <div key={key} className="min-w-0">
              <p className="text-[9px] text-zinc-500 truncate">{label}</p>
              <p className={`text-sm font-bold mt-0.5 truncate ${koyu ? 'text-white' : 'text-zinc-900'}`}>
                {formatSayi(agg.current[key])}
              </p>
              <p
                className={`text-[10px] mt-0.5 ${
                  yuzdeMetin === null
                    ? 'text-zinc-500'
                    : degisim.percent > 0
                    ? koyu
                      ? 'text-emerald-400'
                      : 'text-emerald-600'
                    : degisim.percent < 0
                    ? koyu
                      ? 'text-red-400'
                      : 'text-red-600'
                    : 'text-zinc-500'
                }`}
              >
                {yuzdeMetin ?? 'ölçülemiyor'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Bir markanın tek platformdaki senkron durumunu (bağlı değil / hiç veri yok /
// son güncelleme ne zaman) gösterir. 30 saat eşiği, otomatik senkronun her gün
// 03:00'te (UTC) çalışmasına dayanan yumuşak bir sezgisel eşiktir — kesin bir
// hata garantisi değildir, sadece "bir koşum kaçmış olabilir" uyarısıdır.
function SenkronHucresi({ baglantiVarMi, satir, koyu }) {
  if (!baglantiVarMi) {
    return <span className="text-zinc-500">Bağlı Değil</span>
  }
  if (!satir) {
    return <span className={koyu ? 'text-amber-400' : 'text-amber-600'}>Hiç veri yok</span>
  }
  if (!satir.updated_at) {
    return <span className="text-zinc-500">Güncelleme zamanı bilinmiyor</span>
  }

  const saat = (Date.now() - new Date(satir.updated_at).getTime()) / 36e5
  const gecikmisMi = saat > 30
  const metin = saat < 1 ? 'az önce' : saat < 24 ? `${Math.round(saat)} saat önce` : `${Math.round(saat / 24)} gün önce`

  return (
    <div>
      <span className={gecikmisMi ? (koyu ? 'text-amber-400' : 'text-amber-600') : koyu ? 'text-zinc-300' : 'text-zinc-700'}>
        {metin}
      </span>
      <span className="block text-[9px] text-zinc-500 mt-0.5">{satir.followers ?? '–'} takipçi</span>
    </div>
  )
}

// Ana sayfanın en üstünde, marka kartlarından ÖNCE gösterilen "genel bakış"
// paneli. Üç bölüm: (1) tüm markaların toplam performansı (bu ay vs geçen ay,
// her zaman tam takvim ayı karşılaştırması — sistemin genel kuralıyla aynı),
// (2) her marka/platform için senkronizasyon tazeliği, (3) /raporlar
// klasöründeki hazır rapor kapsamı. `brands` ve `metrics` üst bileşenden
// (app/page.js) prop olarak gelir — `metrics` zaten her marka/platform için en
// güncel satırı içeriyor, o yüzden burada ayrıca sorgulanmıyor.
export default function GenelBakis({ brands, metrics }) {
  const { koyu } = useTheme()
  const [toplamlar, setToplamlar] = useState(null)
  const [raporDurumu, setRaporDurumu] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (brands && brands.length > 0) {
      fetchOverviewData()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brands])

  async function fetchOverviewData() {
    try {
      setLoading(true)
      setError(null)

      const monthStart = startOfMonth(new Date())
      const monthEnd = new Date()
      const previousMonthDate = subMonths(monthStart, 1)
      const prevStart = startOfMonth(previousMonthDate)
      const prevEnd = endOfMonth(previousMonthDate)

      const since = format(monthStart, 'yyyy-MM-dd')
      const until = format(monthEnd, 'yyyy-MM-dd')
      const prevSince = format(prevStart, 'yyyy-MM-dd')
      const prevUntil = format(prevEnd, 'yyyy-MM-dd')

      const brandIds = brands.map((b) => b.id)

      const [{ data: currentRows, error: curErr }, { data: previousRows, error: prevErr }, raporlarJson] = await Promise.all([
        supabase.from('daily_metrics').select('*').in('brand_id', brandIds).gte('metric_date', since).lte('metric_date', until),
        supabase.from('daily_metrics').select('*').in('brand_id', brandIds).gte('metric_date', prevSince).lte('metric_date', prevUntil),
        fetch('/api/raporlar/list')
          .then((r) => r.json())
          .catch(() => ({ aylar: [] })),
      ])

      if (curErr) throw curErr
      if (prevErr) throw prevErr

      function grupla(rows) {
        const map = {}
        for (const row of rows || []) {
          if (!map[row.brand_id]) map[row.brand_id] = { facebook: [], instagram: [] }
          map[row.brand_id][row.platform]?.push(row)
        }
        return map
      }

      const curMap = grupla(currentRows)
      const prevMap = grupla(previousRows)

      const fbBrands = brands.filter((b) => b.fb_page_id)
      const igBrands = brands.filter((b) => b.ig_account_id)

      const fbCurrent = fbBrands.map((b) => sumMetrics(curMap[b.id]?.facebook || [], 'facebook'))
      const fbPrevious = fbBrands.map((b) => sumMetrics(prevMap[b.id]?.facebook || [], 'facebook'))
      const igCurrent = igBrands.map((b) => sumMetrics(curMap[b.id]?.instagram || [], 'instagram'))
      const igPrevious = igBrands.map((b) => sumMetrics(prevMap[b.id]?.instagram || [], 'instagram'))

      setToplamlar({
        facebook: aggregateCrossBrand(fbCurrent, fbPrevious, 'facebook'),
        instagram: aggregateCrossBrand(igCurrent, igPrevious, 'instagram'),
        period: { since, until, prevSince, prevUntil },
      })

      setRaporDurumu(raporlarJson?.aylar || [])
    } catch (err) {
      setError(err.message)
      console.error('Genel bakış hatası:', err)
    } finally {
      setLoading(false)
    }
  }

  const kenarlik = koyu ? 'border-white/10' : 'border-zinc-200'
  const baslikRengi = koyu ? 'text-white' : 'text-zinc-900'
  const baslikMetni = koyu ? 'text-zinc-200' : 'text-zinc-800'

  if (!brands || brands.length === 0) return null

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <p className="text-xs text-zinc-500">Genel bakış yükleniyor...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass rounded-2xl p-5">
        <p className={`text-sm ${koyu ? 'text-red-400' : 'text-red-600'}`}>Genel bakış yüklenemedi: {error}</p>
      </div>
    )
  }

  if (!toplamlar) return null

  const raporMarkalari = Array.from(new Set(raporDurumu.flatMap((ayGrup) => ayGrup.markalar.map((m) => m.marka)))).sort((a, b) =>
    a.localeCompare(b, 'tr')
  )

  return (
    <div className="space-y-6">
      {/* Bölüm 1: Toplam Performans */}
      <div className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-5">
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${baslikMetni}`}>
            <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l6-6 4 4 8-8" />
              <path d="M14 7h7v7" />
            </svg>
            Genel Bakış — Toplam Performans
          </h3>
          <p className="text-[10px] text-zinc-500">
            {formatDateStr(toplamlar.period.since)}–{formatDateStr(toplamlar.period.until)}
            {' '}vs{' '}
            {formatDateStr(toplamlar.period.prevSince)}–{formatDateStr(toplamlar.period.prevUntil)}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PlatformOzeti baslik="Facebook" renkSinifi={koyu ? 'text-blue-300' : 'text-blue-600'} agg={toplamlar.facebook} koyu={koyu} />
          <PlatformOzeti baslik="Instagram" renkSinifi={koyu ? 'text-fuchsia-300' : 'text-fuchsia-600'} agg={toplamlar.instagram} koyu={koyu} />
        </div>
      </div>

      {/* Bölüm 2: Senkronizasyon Durumu */}
      <div className="glass rounded-2xl p-5 sm:p-6">
        <div className="mb-4">
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${baslikMetni}`}>
            <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Senkronizasyon Durumu
          </h3>
          <p className="text-[10px] text-zinc-500 mt-1">
            Otomatik senkronizasyon her gün 03:00'te (UTC) çalışır. Süreler, en son satırın "güncellenme" zaman damgasına göre hesaplanmıştır.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={`text-left border-b ${kenarlik}`}>
                <th className="pb-2 pr-3 font-medium text-zinc-500">Marka</th>
                <th className="pb-2 pr-3 font-medium text-zinc-500">Facebook</th>
                <th className="pb-2 font-medium text-zinc-500">Instagram</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id} className={`border-b last:border-0 ${kenarlik}`}>
                  <td className={`py-2 pr-3 font-medium truncate max-w-[160px] ${baslikRengi}`}>{b.name}</td>
                  <td className="py-2 pr-3">
                    <SenkronHucresi baglantiVarMi={!!b.fb_page_id} satir={metrics?.[b.id]?.facebook} koyu={koyu} />
                  </td>
                  <td className="py-2">
                    <SenkronHucresi baglantiVarMi={!!b.ig_account_id} satir={metrics?.[b.id]?.instagram} koyu={koyu} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bölüm 3: Rapor Üretim Durumu */}
      <div className="glass rounded-2xl p-5 sm:p-6">
        <div className="mb-4">
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${baslikMetni}`}>
            <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Rapor Üretim Durumu
          </h3>
          <p className="text-[10px] text-zinc-500 mt-1">
            /raporlar klasöründeki hazır PDF/PNG dosyalarına göre. Not: buradaki marka adları (SAYIN Grubu'nun rapor
            üretilen şirketleri) yukarıdaki Meta API'ye bağlı markalarla birebir eşleşmiyor — şu an ayrı iki liste,
            aralarında otomatik bir bağlantı kurulmuyor.
          </p>
        </div>

        {raporMarkalari.length === 0 ? (
          <p className="text-xs text-zinc-500">Henüz hiçbir rapor bulunamadı.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`text-left border-b ${kenarlik}`}>
                  <th className="pb-2 pr-3 font-medium text-zinc-500">Marka</th>
                  {raporDurumu.map((ayGrup) => (
                    <th key={ayGrup.ay} className="pb-2 px-2 font-medium text-zinc-500 text-center whitespace-nowrap">
                      {ayGrup.ay}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {raporMarkalari.map((marka) => (
                  <tr key={marka} className={`border-b last:border-0 ${kenarlik}`}>
                    <td className={`py-2 pr-3 font-medium truncate max-w-[180px] ${baslikRengi}`}>{marka}</td>
                    {raporDurumu.map((ayGrup) => {
                      const girdi = ayGrup.markalar.find((m) => m.marka === marka)
                      return (
                        <td key={ayGrup.ay} className="py-2 px-2 text-center">
                          {girdi ? (
                            <span title={`${girdi.dosyalar.length} dosya`} className={koyu ? 'text-emerald-400' : 'text-emerald-600'}>
                              ✓
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
