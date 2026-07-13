import { supabaseAdmin } from '@/lib/supabaseAdmin.js'
import { listAccessiblePages } from '@/lib/meta.js'

async function checkSupabase() {
  try {
    const { error } = await supabaseAdmin.from('brands').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}

async function checkMeta() {
  try {
    await listAccessiblePages()
    return true
  } catch {
    return false
  }
}

export async function GET() {
  const [supabase, meta] = await Promise.all([checkSupabase(), checkMeta()])
  return Response.json({ supabase, meta })
}
