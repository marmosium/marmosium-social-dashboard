'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { sumMetrics, computeChange, computeRatios, buildTrendNote, buildHighlights, buildAssessment } from '../../../lib/reportUtils.js'

function formatDateStr(dateStr) {
  if (!dateStr) return '–'
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}`
}

function formatNumber(value) {
  if (value === null || value === undefined) return '–'
  return value.toLocaleString('tr-TR')
}

function formatPercentBadge(percent) {
  if (percent === null) return { text: '–', className: 'text-zinc-500' }
  const rounded = Math.abs(percent).toFixed(1).replace('.', ',')
  if (percent > 0) return { text: `↑ %${rounded}`, className: 'text-emerald-400' }
  if (percent < 0) return { text: `↓ %${rounded}`, className: 'text-red-400' }
  return { text: '%0', className: 'text-zinc-400' }
}

const METRIC_CARDS = [
  {
    key: 'impressions',
    label: 'Görüntülemeler',
    color: 'text-indigo-300',
    description: 'İçeriklerinin (gönderi, Reels, hikaye) toplam kaç kez ekrana geldiği.',
  },
  {
    key: 'reach',
    label: 'Erişim',
    color: 'text-fuchsia-300',
    description: 'İçeriklerini gören tekil (birbirinden farklı) kişi sayısı.',
  },
  {
    key: 'engagement',
    label: 'İçerik Etkileşimleri',
    color: 'text-emerald-300',
    description: 'Gönderilerine yapılan beğeni, yorum, kaydetme ve paylaşımların toplamı.',
  },
  {
    key: 'link_clicks',
    label: 'Bağlantı Tıklamaları',
    color: 'text-amber-300',
    description: 'Profilindeki web sitesi linkine tıklanma sayısı.',
  },
  {
    key: 'profile_views',
    label: 'Profil Ziyaretleri',
    color: 'text-cyan-300',
    description: 'Profilinin ziyaret edilme sayısı.',
  },
  {
    key: 'follower_change',
    label: 'Takipçiler',
    color: 'text-pink-300',
    description: 'Bu dönemde kazanılan (+) veya kaybedilen (–) net takipçi sayısı — toplam takipçi değil.',
  },
]

const CHART_LINES = [
  { key: 'impressions', name: 'Görüntülemeler', color: '#818cf8' },
  { key: 'reach', name: 'Erişim', color: '#e879f9' },
  { key: 'engagement', name: 'İçerik Etkileşimleri', color: '#34d399' },
  { key: 'profile_views', name: 'Profil Ziyaretleri', color: '#22d3ee' },
  { key: 'follower_change', name: 'Takipçiler', color: '#f472b6' },
]

const HIGHLIGHT_STYLES = {
  success: 'bg-emerald-500/5 border-emerald-500/15 text-emerald-300',
  warning: 'bg-amber-500/5 border-amber-500/15 text-amber-300',
  info: 'bg-blue-500/5 border-blue-500/15 text-blue-300',
}

const HIGHLIGHT_ICONS = { success: '✓', warning: '!', info: 'i' }

export function PlatformReport({ rows, previousRows, sinceLabel, untilLabel, prevSinceLabel, prevUntilLabel }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="text-center py-14 border border-dashed border-white/15 rounded-xl bg-black/10">
        <p className="text-zinc-400 text-sm">Bu dönem için henüz yeterli veri birikmedi.</p>
        <p className="text-zinc-600 text-xs mt-1">Günlük senkronizasyon çalıştıkça veriler burada birikmeye başlayacak.</p>
      </div>
    )
  }

  const totals = sumMetrics(rows)
  const previousTotals = sumMetrics(previousRows || [])

  const changes = {}
  for (const { key } of METRIC_CARDS) {
    changes[key] = computeChange(totals[key] ?? 0, previousTotals[key] ?? 0)
  }

  const ratios = computeRatios(totals)
  const highlights = buildHighlights(totals, changes)
  const assessment = buildAssessment(changes)

  const chartData = [...rows]
    .sort((a, b) => a.metric_date.localeCompare(b.metric_date))
    .map((row) => ({
      date: formatDateStr(row.metric_date),
      impressions: row.impressions ?? 0,
      reach: row.reach ?? 0,
      engagement: row.engagement ?? 0,
      profile_views: row.profile_views ?? 0,
      follower_change: row.follower_change ?? 0,
    }))

  return (
    <div className="space-y-6">
      <p className="text-xs text-zinc-500">
        {sinceLabel} – {untilLabel} dönemi, {prevSinceLabel} – {prevUntilLabel} ile karşılaştırılmıştır.
      </p>

      {/* 1. Genel Performans Özeti */}
      <div>
        <h4 className="text-sm font-semibold text-zinc-200">Genel Performans Özeti</h4>
        <p className="text-[11px] text-zinc-500 mb-3">Bu dönemdeki performansa hızlı bir bakış. Her kartın altında o rakamın ne anlama geldiği yazıyor.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {METRIC_CARDS.map(({ key, label, color, description }) => {
            const badge = formatPercentBadge(changes[key].percent)
            return (
              <div key={key} className="premium-card rounded-xl p-3">
                <p className={`text-[10px] uppercase tracking-wide font-semibold ${color}`}>{label}</p>
                <p className="text-xl font-bold text-white mt-1">{formatNumber(totals[key])}</p>
                <p className={`text-[11px] font-medium mt-1 ${badge.className}`}>{badge.text}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">Önceki dönem: {formatNumber(previousTotals[key])}</p>
                <p className="text-[10px] text-zinc-500 mt-2 leading-snug border-t border-white/10 pt-2">{description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. Günlük Performans Trendi */}
      <div>
        <h4 className="text-sm font-semibold text-zinc-200">Günlük Performans Trendi</h4>
        <p className="text-[11px] text-zinc-500 mb-3">Yukarıdaki metriklerin gün gün nasıl değiştiğini gösterir; yükselen/düşen çizgiler o günkü hareketliliği yansıtır.</p>
        <div className="premium-card rounded-xl p-3" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {CHART_LINES.map((line) => (
                <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.color} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Karşılaştırma Tablosu */}
      <div>
        <h4 className="text-sm font-semibold text-zinc-200">Karşılaştırma Tablosu</h4>
        <p className="text-[11px] text-zinc-500 mb-3">Bu dönem, hemen öncesindeki eşit uzunluktaki dönemle karşılaştırılıyor — "iyileşti mi kötüleşti mi" sorusunun cevabı.</p>
        <div className="premium-card rounded-xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-white/10">
                <th className="p-3 font-medium">Metrik</th>
                <th className="p-3 font-medium">Önceki Dönem</th>
                <th className="p-3 font-medium">Bu Dönem</th>
                <th className="p-3 font-medium">Değişim</th>
              </tr>
            </thead>
            <tbody>
              {METRIC_CARDS.map(({ key, label }) => {
                const badge = formatPercentBadge(changes[key].percent)
                return (
                  <tr key={key} className="border-b border-white/5 last:border-0">
                    <td className="p-3 text-zinc-300">{label}</td>
                    <td className="p-3 text-zinc-400">{formatNumber(previousTotals[key])}</td>
                    <td className="p-3 text-white font-semibold">{formatNumber(totals[key])}</td>
                    <td className={`p-3 font-medium ${badge.className}`}>{badge.text}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Performans Oranları */}
      <div>
        <h4 className="text-sm font-semibold text-zinc-200">Performans Oranları</h4>
        <p className="text-[11px] text-zinc-500 mb-3">Erişilen kişilerin ne kadarının harekete geçtiğini gösteren yüzdeler — sayı büyüklüğünden bağımsız, kalite göstergesi.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              label: 'Etkileşim Oranı',
              formula: 'Etkileşim / Erişim',
              description: 'İçeriğini görenlerin yüzde kaçı beğeni, yorum, kaydetme veya paylaşımla etkileşime girmiş.',
              value: ratios.engagementRate,
            },
            {
              label: 'Profil Ziyaret Oranı',
              formula: 'Profil Ziyareti / Erişim',
              description: 'İçeriğini görenlerin yüzde kaçı profiline uğramış.',
              value: ratios.profileVisitRate,
            },
            {
              label: 'Tıklama Oranı',
              formula: 'Tıklama / Erişim',
              description: 'İçeriğini görenlerin yüzde kaçı profildeki linke tıklamış.',
              value: ratios.clickRate,
            },
          ].map((r) => (
            <div key={r.label} className="premium-card rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-zinc-500">{r.label}</p>
              <p className="text-[10px] text-zinc-600">{r.formula}</p>
              <p className="text-xl font-bold text-white mt-1">
                {r.value === null ? '–' : `%${r.value.toFixed(2).replace('.', ',')}`}
              </p>
              <p className="text-[10px] text-zinc-500 mt-2 leading-snug border-t border-white/10 pt-2">{r.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Trend Analizi */}
      <div>
        <h4 className="text-sm font-semibold text-zinc-200">Trend Analizi</h4>
        <p className="text-[11px] text-zinc-500 mb-3">Yukarıdaki tablodaki her satırın sözel özeti — hangi metrik ne kadar değişti, en hareketli gün hangisiydi.</p>
        <div className="premium-card rounded-xl p-4 space-y-2">
          {METRIC_CARDS.map(({ key }) => (
            <p key={key} className="text-xs text-zinc-400">
              <span className="text-zinc-200 font-medium">{METRIC_CARDS.find((m) => m.key === key).label}:</span>{' '}
              {buildTrendNote(key, rows, changes)}
            </p>
          ))}
        </div>
      </div>

      {/* 6. Öne Çıkan Notlar */}
      {highlights.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-zinc-200">Öne Çıkan Notlar</h4>
          <p className="text-[11px] text-zinc-500 mb-3">Bu dönemde özellikle dikkat çeken, iyi giden veya iyileştirilmesi gereken noktalar.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {highlights.map((h, idx) => (
              <div key={idx} className={`rounded-xl border p-3 flex gap-2.5 ${HIGHLIGHT_STYLES[h.type]}`}>
                <span className="shrink-0 h-5 w-5 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold">
                  {HIGHLIGHT_ICONS[h.type]}
                </span>
                <div>
                  <p className="text-xs font-semibold">{h.title}</p>
                  <p className="text-[11px] mt-0.5 opacity-80">{h.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Genel Değerlendirme */}
      <div>
        <h4 className="text-sm font-semibold text-zinc-200">Genel Değerlendirme</h4>
        <p className="text-[11px] text-zinc-500 mb-3">Tüm rapor tek cümlede: genel tablo nasıl, ne yapılmalı.</p>
        <div className="premium-card rounded-xl p-4 space-y-2">
          <p className="text-xs text-zinc-300">{assessment.summary}</p>
          <p className="text-xs text-zinc-400">
            <span className="font-semibold text-zinc-200">Aksiyon Önerisi: </span>
            {assessment.action}
          </p>
        </div>
      </div>
    </div>
  )
}
