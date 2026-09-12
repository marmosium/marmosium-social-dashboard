// Geçici: Instagram total_value metriklerinin (profile_views, total_interactions, website_clicks)
// GERÇEK aylık toplamlarını tek çağrıda çeker (günlük satırlar geçmişte bu alanlar için hep boştu).
const API_VERSION = process.env.META_API_VERSION || 'v25.0'
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`

function getToken() {
  const token = process.env.META_SYSTEM_USER_TOKEN
  if (!token) throw new Error('META_SYSTEM_USER_TOKEN yok')
  return token
}

async function graphGet(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`)
  url.searchParams.set('access_token', getToken())
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  const res = await fetch(url.toString())
  return res.json()
}

const BRANDS = [
  { name: 'Sayın A.Ş.', ig: '17841406181582474' },
  { name: 'Sayın Gayrimenkul', ig: '17841466095995212' },
  { name: 'Sayın Sigorta', ig: '17841477506905444' },
  { name: 'Fabrikevim', ig: '17841480723366314' },
  { name: 'Mabella Marble', ig: '17841407274898038' },
  { name: 'Sayın Vakfı', ig: '17841460868716199' },
  { name: 'The S Cafe Bistro', ig: '17841468178594887' },
]

// Meta total_value: since/until arasında en fazla 30 gün olabilir (#100 hatası).
// 31 günlük Ağustos'u iki parçaya bölüp topluyoruz.
const PERIODS = [
  { key: 'agustos_1', since: '2026-08-01', until: '2026-08-17' },
  { key: 'agustos_2', since: '2026-08-17', until: '2026-09-01' },
  { key: 'eylul_1_10', since: '2026-09-01', until: '2026-09-11' },
]

export const dynamic = 'force-dynamic'

export async function GET() {
  const out = {}
  for (const brand of BRANDS) {
    out[brand.name] = {}
    for (const period of PERIODS) {
      try {
        const d = await graphGet(`/${brand.ig}/insights`, {
          metric: 'profile_views,total_interactions,website_clicks',
          period: 'day',
          metric_type: 'total_value',
          since: period.since,
          until: period.until,
        })
        if (d.error) {
          out[brand.name][period.key] = { error: d.error.message }
          continue
        }
        const totals = { profile_views: 0, total_interactions: 0, website_clicks: 0 }
        for (const m of d.data || []) totals[m.name] = m.total_value?.value ?? 0
        out[brand.name][period.key] = totals
      } catch (e) {
        out[brand.name][period.key] = { error: e.message }
      }
    }
  }
  // agustos_1 + agustos_2 toplamını "agustos" olarak ekle
  for (const brand of BRANDS) {
    const a1 = out[brand.name].agustos_1
    const a2 = out[brand.name].agustos_2
    if (a1 && !a1.error && a2 && !a2.error) {
      out[brand.name].agustos = {
        profile_views: a1.profile_views + a2.profile_views,
        total_interactions: a1.total_interactions + a2.total_interactions,
        website_clicks: a1.website_clicks + a2.website_clicks,
      }
    }
  }
  return Response.json(out)
}
