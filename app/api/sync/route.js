import { supabaseAdmin } from '@/lib/supabaseAdmin.js'
import { listAccessiblePages, getInstagramAccountId, fetchPageInsights, fetchInstagramInsights } from '@/lib/meta.js'
import { format, subDays } from 'date-fns'

// Graph API insights "values" dizisini tarihe göre { [date]: { metricName: value } } haline getirir
function pivotByDate(rawMetrics) {
  const byDate = {}
  for (const metric of rawMetrics) {
    for (const point of metric.values) {
      const date = point.end_time.slice(0, 10)
      if (!byDate[date]) byDate[date] = {}
      byDate[date][metric.name] = typeof point.value === 'number' ? point.value : null
    }
  }
  return byDate
}

async function runSync() {
  const until = format(new Date(), 'yyyy-MM-dd')
  const since = format(subDays(new Date(), 7), 'yyyy-MM-dd')

  // Markalar artık burada manuel eklenmiyor; Meta sistem kullanıcısının erişebildiği
  // tüm Facebook Sayfaları otomatik olarak keşfedilip brands tablosuna kaydediliyor/güncelleniyor.
  let discovered = 0
  try {
    const pages = await listAccessiblePages()
    for (const page of pages) {
      const igAccountId = await getInstagramAccountId(page.id)
      const { error } = await supabaseAdmin
        .from('brands')
        .upsert(
          { name: page.name, fb_page_id: page.id, ig_account_id: igAccountId },
          { onConflict: 'fb_page_id' }
        )
      if (!error) discovered++
    }
  } catch (error) {
    console.error('Marka keşfi hatası:', error)
    return { error: `Meta'dan marka listesi alınamadı: ${error.message}`, status: 500 }
  }

  const { data: brands, error: brandsError } = await supabaseAdmin
    .from('brands')
    .select('*')
    .eq('is_active', true)

  if (brandsError) {
    return { error: brandsError.message, status: 500 }
  }

  const results = []

  for (const brand of brands) {
    try {
      let rowsWritten = 0

      if (brand.fb_page_id) {
        const { followers, raw } = await fetchPageInsights(brand.fb_page_id, since, until)
        const byDate = pivotByDate(raw)

        for (const [metric_date, values] of Object.entries(byDate)) {
          const { error } = await supabaseAdmin.from('daily_metrics').upsert(
            {
              brand_id: brand.id,
              platform: 'facebook',
              metric_date,
              followers,
              engagement: values.page_post_engagements ?? null,
              profile_views: values.page_views_total ?? null,
              raw: values,
            },
            { onConflict: 'brand_id,platform,metric_date' }
          )
          if (error) throw error
          rowsWritten++
        }
      }

      if (brand.ig_account_id) {
        const { followers, raw, totals } = await fetchInstagramInsights(brand.ig_account_id, since, until)
        const byDate = pivotByDate(raw)

        // "views", "profile_views", "total_interactions", "website_clicks" artık günlük değil,
        // since/until aralığının tek toplamı olarak geliyor (bkz. lib/meta.js) — bu yüzden
        // aralığın son gününe (until) ekleniyor. "reach" ve "follower_count" zaten günlük geldiği
        // için normal şekilde byDate içinde yer alıyor.
        if (!byDate[until]) byDate[until] = {}
        byDate[until].views = totals.views
        byDate[until].profile_views = totals.profile_views
        byDate[until].total_interactions = totals.total_interactions
        byDate[until].website_clicks = totals.website_clicks

        for (const [metric_date, values] of Object.entries(byDate)) {
          const { error } = await supabaseAdmin.from('daily_metrics').upsert(
            {
              brand_id: brand.id,
              platform: 'instagram',
              metric_date,
              followers,
              reach: values.reach ?? null,
              impressions: values.views ?? null,
              engagement: values.total_interactions ?? null,
              profile_views: values.profile_views ?? null,
              link_clicks: values.website_clicks ?? null,
              follower_change: values.follower_count ?? null,
              raw: values,
            },
            { onConflict: 'brand_id,platform,metric_date' }
          )
          if (error) throw error
          rowsWritten++
        }
      }

      results.push({ brand: brand.name, status: 'ok', rows: rowsWritten })
    } catch (error) {
      console.error(`Sync error for brand ${brand.name}:`, error)
      results.push({ brand: brand.name, status: 'error', message: error.message })
    }
  }

  return { since, until, discovered, results, status: 200 }
}

export async function POST() {
  const result = await runSync()
  const { status, ...body } = result
  return Response.json(body, { status: status || 200 })
}

// Vercel Cron Jobs bu endpoint'i GET ile çağırır ve otomatik olarak
// "Authorization: Bearer $CRON_SECRET" header'ı ekler.
export async function GET(request) {
  const authHeader = request.headers.get('authorization')

  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const result = await runSync()
  const { status, ...body } = result
  return Response.json(body, { status: status || 200 })
}
