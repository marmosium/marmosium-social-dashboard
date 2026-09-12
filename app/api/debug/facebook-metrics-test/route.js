// GEÇİCİ TEŞHİS ENDPOINT'İ (12 Eylül 2026) — Facebook Page Insights için hangi
// metrik adlarının BUGÜN (Meta Graph API v25.0) hâlâ geçerli olduğunu canlı
// olarak test eder.
//
// Neden var: `/raporlar`dan bağımsız olarak kullanıcı canlı dashboard'da
// Facebook verilerinin sıfır göründüğünü bildirdi. Kod incelemesi + Supabase
// sorgusu şunu KESİN olarak doğruladı: PlatformReport.js'teki 6 KPI kartından
// 4'ü (Görüntülemeler/impressions, Erişim/reach, Bağlantı Tıklamaları/
// link_clicks, Takipçiler/follower_change) Facebook için `daily_metrics`
// tablosuna HİÇBİR ZAMAN yazılmıyor — app/api/sync/route.js'teki Facebook
// bloğu yalnızca followers + engagement (page_post_engagements) +
// profile_views (page_views_total) yazıyor. Yani bu 4 kart "gerçekten sıfır"
// DEĞİL, "veri hiç gelmiyor" durumunda.
//
// Doğru düzeltme için hangi Graph API metrik adının kullanılacağını TAHMİN
// ETMİYORUZ: Meta, Page Insights metriklerini sık sık kaldırıyor (15 Kasım
// 2025 ve 15 Haziran 2026 kaldırma dalgaları belgelenmiş — ikisi de bu
// oturumun "bugünü" olan 12 Eylül 2026'dan ÖNCE), bu yüzden web'den bulunan
// aday adlar önce burada CANLI test ediliyor, hiçbiri lib/meta.js'e
// yazılmadan önce. Sonuç netleşince bu endpoint kaldırılacak.
//
// Ayrıca: Sayın Sigorta ve Pomacer'ın Facebook verisi TÜM metriklerde
// (takipçi dahil) sürekli 0 — bu iki sayfa için düz `name/followers_count/
// fan_count` alanları da çekiliyor; ya gerçekten çok küçük/pasif bir sayfa
// ya da otomatik keşifte (`listAccessiblePages`) yanlış bir Page ID
// eşleşmiş olabilir.

const API_VERSION = process.env.META_API_VERSION || 'v25.0'
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`

function getToken() {
  const token = process.env.META_SYSTEM_USER_TOKEN
  if (!token) throw new Error('META_SYSTEM_USER_TOKEN yok')
  return token
}

async function getPageAccessToken(pageId) {
  const url = new URL(`${BASE_URL}/${pageId}`)
  url.searchParams.set('access_token', getToken())
  url.searchParams.set('fields', 'access_token')
  const res = await fetch(url.toString())
  const json = await res.json()
  if (json.error) throw new Error(`page token hatası: ${json.error.message} (code ${json.error.code})`)
  if (!json.access_token) throw new Error('page access_token dönmedi')
  return json.access_token
}

async function testMetric(pageId, pageToken, metric, params = {}) {
  const url = new URL(`${BASE_URL}/${pageId}/insights`)
  url.searchParams.set('access_token', pageToken)
  url.searchParams.set('metric', metric)
  url.searchParams.set('period', params.period || 'day')
  if (params.since) url.searchParams.set('since', params.since)
  if (params.until) url.searchParams.set('until', params.until)
  if (params.metric_type) url.searchParams.set('metric_type', params.metric_type)
  try {
    const res = await fetch(url.toString())
    const json = await res.json()
    if (json.error) return { ok: false, hata: json.error.message, kod: json.error.code }
    // values dizisini kısaltıp sadece tarih+değer olarak dönüyoruz (okunabilirlik için)
    const ozet = (json.data || []).map((m) => ({
      name: m.name,
      values: (m.values || []).map((v) => ({ tarih: (v.end_time || '').slice(0, 10), deger: v.value })),
    }))
    return { ok: true, veri: ozet }
  } catch (e) {
    return { ok: false, hata: e.message }
  }
}

async function testPageFields(pageId, pageToken, fields) {
  const url = new URL(`${BASE_URL}/${pageId}`)
  url.searchParams.set('access_token', pageToken)
  url.searchParams.set('fields', fields)
  try {
    const res = await fetch(url.toString())
    const json = await res.json()
    if (json.error) return { ok: false, hata: json.error.message, kod: json.error.code }
    return { ok: true, veri: json }
  } catch (e) {
    return { ok: false, hata: e.message }
  }
}

// Bir tanesi bilinen-çalışan (gerçek etkileşim/görüntülenme verisi var),
// ikisi Supabase'te TÜM metrikleri (takipçi dahil) sürekli 0 gözüken şüpheli sayfa.
const TEST_SAYFALARI = [
  { etiket: 'SAYIN_AS_calisan_referans', pageId: '334043543406741' },
  { etiket: 'SAYIN_SIGORTA_supheli_sifir', pageId: '1056560140880332' },
  { etiket: 'POMACER_supheli_sifir', pageId: '1133101086556877' },
]

// developers.facebook.com/docs/graph-api/reference/insights/ ve Meta'nın Ağustos
// 2025 "Page Insights API Updates" duyurusundan toplanan aday adlar — hiçbiri
// canlı testten önce doğru kabul edilmiyor.
const ADAY_METRIKLER = {
  gorunumler_impressions: ['page_impressions', 'views'],
  erisim_reach: ['page_impressions_unique', 'page_impressions_nonviral', 'views'],
  takipci_degisimi: ['page_fan_adds', 'page_fan_adds_unique', 'page_fan_removes'],
  baglanti_tiklama: ['page_total_actions'],
}

const SINCE = '2026-09-01'
const UNTIL = '2026-09-11'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sonuc = {}
  for (const { etiket, pageId } of TEST_SAYFALARI) {
    sonuc[etiket] = { pageId }
    let pageToken
    try {
      pageToken = await getPageAccessToken(pageId)
    } catch (e) {
      sonuc[etiket].tokenHatasi = e.message
      continue
    }

    sonuc[etiket].sayfaAlanlari = await testPageFields(
      pageId,
      pageToken,
      'name,followers_count,fan_count,verification_status,link'
    )

    sonuc[etiket].metrikler = {}
    for (const [grup, adaylar] of Object.entries(ADAY_METRIKLER)) {
      sonuc[etiket].metrikler[grup] = {}
      for (const metric of adaylar) {
        sonuc[etiket].metrikler[grup][metric] = await testMetric(pageId, pageToken, metric, {
          period: 'day',
          since: SINCE,
          until: UNTIL,
        })
      }
    }
  }
  return Response.json(sonuc)
}
