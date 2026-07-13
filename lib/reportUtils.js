// lib/reportUtils.js
// Rapor sayfası için saf hesaplama fonksiyonları — UI'dan bağımsız, test edilebilir.

const FLOW_METRICS = ['reach', 'impressions', 'engagement', 'profile_views', 'link_clicks', 'follower_change']

/**
 * Bir dönemdeki daily_metrics satırlarını toplar.
 * "followers" toplanmaz, dönemin son günündeki (en güncel) değeri alınır.
 */
export function sumMetrics(rows) {
  const totals = { reach: 0, impressions: 0, engagement: 0, profile_views: 0, link_clicks: 0, follower_change: 0 }

  for (const row of rows) {
    for (const key of FLOW_METRICS) {
      totals[key] += row[key] ?? 0
    }
  }

  const sorted = [...rows].sort((a, b) => a.metric_date.localeCompare(b.metric_date))
  totals.followers = sorted.length ? sorted[sorted.length - 1].followers ?? null : null

  return totals
}

/**
 * current/previous arasındaki değişimi hesaplar.
 * previous 0 ve current 0 ise %0, previous 0 ve current > 0 ise yüzde hesaplanamaz (null).
 */
export function computeChange(current, previous) {
  const diff = current - previous
  let percent = null

  if (previous === 0) {
    percent = current === 0 ? 0 : null
  } else {
    percent = (diff / Math.abs(previous)) * 100
  }

  return {
    current,
    previous,
    diff,
    percent,
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
  }
}

/** Erişime oranla etkileşim / profil ziyareti / tıklama oranlarını hesaplar. */
export function computeRatios(totals) {
  const safeRate = (numerator) => (totals.reach > 0 ? (numerator / totals.reach) * 100 : null)

  return {
    engagementRate: safeRate(totals.engagement),
    profileVisitRate: safeRate(totals.profile_views),
    clickRate: safeRate(totals.link_clicks),
  }
}

const METRIC_LABELS = {
  impressions: 'Görüntülemeler',
  reach: 'Erişim',
  engagement: 'İçerik Etkileşimleri',
  link_clicks: 'Bağlantı Tıklamaları',
  profile_views: 'Profil Ziyaretleri',
  follower_change: 'Takipçiler',
}

function formatPercent(percent) {
  if (percent === null) return 'değişim oranı hesaplanamadı'
  const rounded = Math.abs(percent).toFixed(1).replace('.', ',')
  return percent >= 0 ? `%${rounded} artarak` : `%${rounded} azalarak`
}

/** Bir metrik için günlük seriden zirve günü bulup şablon bir trend cümlesi üretir. */
export function buildTrendNote(key, rows, changes) {
  const label = METRIC_LABELS[key] || key
  const change = changes[key]
  const sorted = [...rows].sort((a, b) => a.metric_date.localeCompare(b.metric_date))
  const withValue = sorted.filter((r) => (r[key] ?? 0) > 0)

  let peakSentence = 'Dönem boyunca düzenli/durağan bir seyir izlenmiştir.'
  if (withValue.length > 0) {
    const peak = withValue.reduce((max, r) => ((r[key] ?? 0) > (max[key] ?? 0) ? r : max), withValue[0])
    const [, m, d] = peak.metric_date.split('-')
    peakSentence = `${d}.${m} civarında bir hareketlilik gözlemlenmiştir.`
  }

  return `${label} ${formatPercent(change.percent)} ${change.current} seviyesine ulaşmıştır. ${peakSentence}`
}

/** Eşik tabanlı öne çıkan notlar üretir. */
export function buildHighlights(totals, changes) {
  const highlights = []

  if (changes.profile_views.percent !== null && changes.profile_views.percent >= 20) {
    highlights.push({
      type: 'success',
      title: 'Profil Ziyaretlerinde Artış',
      text: 'Kullanıcılar profili daha fazla ziyaret etmiş. İçerik merakı oluşmuş olabilir.',
    })
  }

  const downCount = ['impressions', 'reach', 'engagement'].filter(
    (k) => changes[k].percent !== null && changes[k].percent < 0
  ).length
  if (downCount >= 2) {
    highlights.push({
      type: 'info',
      title: 'Genel Performansta Düşüş',
      text: 'Görüntüleme, erişim ve etkileşimde belirgin bir düşüş yaşanmış.',
    })
  }

  if (totals.link_clicks === 0) {
    highlights.push({
      type: 'warning',
      title: 'Bağlantı Tıklaması Yok',
      text: 'Herhangi bir bağlantı tıklaması alınmamış. Harekete geçirici içerik eksik olabilir.',
    })
  }

  if (totals.follower_change < 0) {
    highlights.push({
      type: 'warning',
      title: 'Takipçi Kaybı',
      text: 'Takipçi sayısı azalmış. Mevcut kitleyi korumaya yönelik aksiyonlar alınmalı.',
    })
  } else if (totals.follower_change > 0) {
    highlights.push({
      type: 'success',
      title: 'Takipçi Kazanımı',
      text: 'Dönem boyunca net takipçi kazanımı sağlanmış.',
    })
  }

  return highlights
}

/** Genel değerlendirme paragrafı + aksiyon önerisi üretir. */
export function buildAssessment(changes) {
  const keys = ['impressions', 'reach', 'engagement', 'profile_views']
  const downCount = keys.filter((k) => changes[k].percent !== null && changes[k].percent < 0).length
  const upCount = keys.filter((k) => changes[k].percent !== null && changes[k].percent > 0).length

  const overall =
    downCount > upCount
      ? 'Bu dönemde genel olarak düşüş trendi yaşanmıştır. Özellikle görüntüleme, erişim ve etkileşimdeki azalma dikkat çekicidir.'
      : upCount > downCount
      ? 'Bu dönemde genel olarak olumlu bir trend yaşanmıştır. Görüntüleme, erişim ve etkileşimdeki artış olumlu bir sinyaldir.'
      : 'Bu dönemde metrikler karışık bir seyir izlemiştir; bazı alanlarda artış, bazılarında düşüş görülmüştür.'

  const actions = []
  if (changes.link_clicks && changes.link_clicks.current === 0) {
    actions.push('profilde ve içeriklerde harekete geçirici (CTA) ifadeler kullanılabilir')
  }
  if (changes.follower_change && changes.follower_change.current < 0) {
    actions.push('mevcut takipçi kitlesini korumaya yönelik etkileşim odaklı içerikler paylaşılabilir')
  }
  if (changes.engagement && changes.engagement.percent !== null && changes.engagement.percent < 0) {
    actions.push('düzenli ve kaliteli içerik paylaşımı, etkileşimi artıracak yaratıcı içerikler, Reels ve hikaye kullanımı artırılarak erişim ve etkileşim iyileştirilebilir')
  }
  if (actions.length === 0) {
    actions.push('mevcut içerik stratejisi sürdürülüp performans yakından takip edilebilir')
  }

  return {
    summary: overall,
    action: actions.join('; ') + '.',
  }
}
