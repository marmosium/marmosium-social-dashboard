const API_VERSION = process.env.META_API_VERSION || 'v25.0'
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`

function getToken() {
  const token = process.env.META_SYSTEM_USER_TOKEN
  if (!token) throw new Error('META_SYSTEM_USER_TOKEN yok')
  return token
}

async function graphGet(path, params = {}, accessToken = null) {
  const url = new URL(`${BASE_URL}${path}`)
  url.searchParams.set('access_token', accessToken || getToken())
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  const res = await fetch(url.toString())
  return res.json()
}

async function getPageToken(pageId) {
  const data = await graphGet(`/${pageId}`, { fields: 'access_token' })
  return data.access_token
}

export const dynamic = 'force-dynamic'

export async function GET() {
  const results = { timestamp: new Date().toISOString(), tests: [] }
  const igId = '17841472705184455'
  const fbPageId = '595195473680310'

  try {
    const d = await graphGet(`/${igId}/insights`, {
      metric: 'views',
      period: 'day',
      metric_type: 'total_value',
      since: '2026-09-11',
      until: '2026-09-11',
    })
    results.tests.push({ name: 'IG total_value: views ALONE', ok: !d.error, error: d.error?.message, data: d.data })
  } catch(e) { results.tests.push({ name: 'IG total_value: views ALONE', ok: false, error: e.message }) }

  try {
    const d = await graphGet(`/${igId}/insights`, {
      metric: 'profile_views,total_interactions,website_clicks',
      period: 'day',
      metric_type: 'total_value',
      since: '2026-09-11',
      until: '2026-09-11',
    })
    results.tests.push({ name: 'IG total_value: profile_views+total_interactions+website_clicks (no views)', ok: !d.error, error: d.error?.message, data: d.data })
  } catch(e) { results.tests.push({ name: 'IG total_value: profile_views+... (no views)', ok: false, error: e.message }) }

  try {
    const d = await graphGet(`/${igId}/insights`, {
      metric: 'profile_views,total_interactions,website_clicks',
      period: 'day',
      metric_type: 'total_value',
      since: '2026-09-04',
      until: '2026-09-11',
    })
    results.tests.push({ name: 'IG total_value: same 3, since=09-04 until=09-11', ok: !d.error, error: d.error?.message, data: d.data })
  } catch(e) { results.tests.push({ name: 'IG total_value wider range', ok: false, error: e.message }) }

  try {
    const pageToken = await getPageToken(fbPageId)
    const d = await graphGet(`/${fbPageId}/insights`, {
      metric: 'page_views_total',
      period: 'day',
      since: '2026-09-01',
      until: '2026-09-11',
    }, pageToken)
    results.tests.push({ name: 'FB page_views_total ALONE', ok: !d.error, error: d.error?.message, count: d.data?.length || 0, first: d.data?.[0], last: d.data?.[d.data?.length-1] })
  } catch(e) { results.tests.push({ name: 'FB page_views_total ALONE', ok: false, error: e.message }) }

  try {
    const pageToken = await getPageToken(fbPageId)
    const d = await graphGet(`/${fbPageId}/insights`, {
      metric: 'page_post_engagements,page_views_total',
      period: 'day',
      since: '2026-09-01',
      until: '2026-09-11',
    }, pageToken)
    results.tests.push({ name: 'FB page_post_engagements+page_views_total TOGETHER', ok: !d.error, error: d.error?.message, count: d.data?.length || 0, metricNames: d.data?.map(m => m.name) })
  } catch(e) { results.tests.push({ name: 'FB together', ok: false, error: e.message }) }

  return Response.json(results)
}
