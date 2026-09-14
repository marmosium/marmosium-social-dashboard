// lib/dashboardUtils.js
// Ana sayfadaki "Genel Bakış" paneli için markalar-arası (cross-brand) toplama
// fonksiyonu. reportUtils.js'teki sumMetrics()/computeChange() marka bazlı
// çalışır; bu dosya onların ÇIKTISINI birden fazla marka için tek bir toplama
// indirger. UI'dan bağımsız, saf fonksiyon — reportUtils.js ile aynı desende.

import { PLATFORM_METRIC_DESTEGI } from './reportUtils.js'

const FLOW_METRICS = ['reach', 'impressions', 'engagement', 'profile_views', 'link_clicks']

/**
 * Aynı platform için birden fazla markanın sumMetrics(rows, platform) çıktısını
 * (güncel dönem + önceki dönem, marka sırası ikisinde de aynı olmalı) tek bir
 * "genel toplam"a indirger.
 *
 * Akış metrikleri (reach/impressions/engagement/profile_views/link_clicks):
 * platformda hiç desteklenmiyorsa (PLATFORM_METRIC_DESTEGI[platform]) toplam da
 * null kalır; destekleniyorsa markalar arası basitçe toplanır. Bir markanın o
 * dönem hiç satırı yoksa sumMetrics zaten 0 döner (gerçekten 0 üretim demektir),
 * bu yüzden toplamı bozmadan doğrudan eklenebilir.
 *
 * "followers" (o dönemin sonundaki toplam takipçi) farklı: markalar arası
 * TOPLANIR (her markanın kendi güncel takipçisi eklenir) ama SADECE hem güncel
 * hem önceki dönemde geçerli (null olmayan) veriye sahip markalar dahil edilir.
 * Aksi halde o ay hiç verisi senkronize olmamış ya da yeni eklenmiş bir marka,
 * toplamı yapay şekilde küçültür/büyütür (sanki 0 takipçiden başlamış gibi).
 * Kaç markanın dahil edildiği `dahilMarkaSayisi`/`toplamMarkaSayisi` ile ayrıca
 * döndürülür ki arayüzde bu kapsam şeffaf şekilde gösterilebilsin.
 */
export function aggregateCrossBrand(currentTotalsList, previousTotalsList, platform) {
  const destek = PLATFORM_METRIC_DESTEGI[platform] || PLATFORM_METRIC_DESTEGI.instagram
  const n = currentTotalsList.length

  const current = {}
  const previous = {}

  for (const key of FLOW_METRICS) {
    if (destek[key] === false) {
      current[key] = null
      previous[key] = null
    } else {
      current[key] = currentTotalsList.reduce((t, b) => t + (b[key] ?? 0), 0)
      previous[key] = previousTotalsList.reduce((t, b) => t + (b[key] ?? 0), 0)
    }
  }

  let dahilMarkaSayisi = 0
  let takipciGuncel = 0
  let takipciOnceki = 0

  for (let i = 0; i < n; i++) {
    const g = currentTotalsList[i]?.followers
    const o = previousTotalsList[i]?.followers
    if (g !== null && g !== undefined && o !== null && o !== undefined) {
      dahilMarkaSayisi++
      takipciGuncel += g
      takipciOnceki += o
    }
  }

  current.followers = dahilMarkaSayisi > 0 ? takipciGuncel : null
  previous.followers = dahilMarkaSayisi > 0 ? takipciOnceki : null

  return {
    current,
    previous,
    dahilMarkaSayisi,
    toplamMarkaSayisi: n,
  }
}
