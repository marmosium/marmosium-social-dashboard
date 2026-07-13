import { supabaseAdmin } from '@/lib/supabaseAdmin.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionToken = searchParams.get('token') || 
      request.headers.get('cookie')?.split('session_token=')[1]?.split(';')[0]

    if (!sessionToken) {
      return Response.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    // Session'ı kontrol et
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*, users(*)')
      .eq('session_token', sessionToken)
      .single()

    if (sessionError || !session) {
      return Response.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    // Session süresi dolmu mu?
    if (new Date(session.expires_at) < new Date()) {
      return Response.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    return Response.json(
      {
        authenticated: true,
        user: {
          id: session.users.id,
          email: session.users.email,
          name: session.users.name,
          is_admin: session.users.is_admin,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Verify error:', error)
    return Response.json(
      { authenticated: false },
      { status: 200 }
    )
  }
}
