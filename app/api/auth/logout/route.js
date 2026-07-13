import { supabaseAdmin } from '@/lib/supabaseAdmin.js'

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionToken = searchParams.get('token') || 
      request.headers.get('cookie')?.split('session_token=')[1]?.split(';')[0]

    if (!sessionToken) {
      return Response.json(
        { error: 'Session token bulunamadı' },
        { status: 401 }
      )
    }

    // Session'ı sil
    const { error } = await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('session_token', sessionToken)

    if (error) {
      return Response.json(
        { error: 'Logout başarısız' },
        { status: 500 }
      )
    }

    // Response'da cookie'i temizle
    const response = Response.json(
      { success: true },
      { status: 200 }
    )

    response.headers.set(
      'Set-Cookie',
      'session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC;'
    )

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return Response.json(
      { error: 'Bir hata oluştu' },
      { status: 500 }
    )
  }
}
