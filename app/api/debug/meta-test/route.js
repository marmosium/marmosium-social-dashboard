import { getPageAccessToken } from '@/lib/meta.js'

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

export const dynamic = 'force-dynamic'

export async function GET() {
  const results = { timestamp: new Date().toISOString(), tests: [] }
  
  try {
    const igData = await graphGet('/17841472705184455/insights', {
      metric: 'reach,follower_count',
      period: 'day',
      since: '2026-09-01',
      until: '2026-09-11',
    })
    results.tests.push({
      name: 'Instagram Daily',
      ok: !igData.error,
      error: igData.error?.message,
      count: igData.data?.length || 0,
      first: igData.data?.[0],
    })
  } catch(e) { results.tests.push({ name: 'Instagram Daily', ok: false, error: e.message }) }

  try {
    const igTotal = await graphGet('/17841472705184455/insights', {
      metric: 'views,profile_views,total_interactions,website_clicks',
      period: 'day',
      metric_type: 'total_value',
      since: '2026-09-11',
      until: '2026-09-11',
    })
    results.tests.push({
      name: 'Instagram Total',
      ok: !igTotal.error,
      error: igTotal.error?.message,
      data: igTotal.data,
    })
  } catch(e) { results.tests.push({ name: 'Instagram Total', ok: false, error: e.message }) }

  try {
    const pageToken = await getPageAccessToken('595195473680310')
    const fbData = await graphGet('/595195473680310/insights', {
      metric: 'page_post_engagements,page_views_total',
      period: 'day',
      since: '2026-09-01',
      until: '2026-09-11',
    }, pageToken)
    results.tests.push({
      name: 'Facebook Daily',
      ok: !fbData.error,
      error: fbData.error?.message,
      count: fbData.data?.length || 0,
      first: fbData.data?.[0],
    })
  } catch(e) { results.tests.push({ name: 'Facebook Daily', ok: false, error: e.message }) }

  return Response.json(results)
}
