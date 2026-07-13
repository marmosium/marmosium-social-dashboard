import { supabaseAdmin } from '@/lib/supabaseAdmin.js'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return Response.json(
        { error: 'Email ve şifre gereklidir' },
        { status: 400 }
      )
    }

    // Kullanıcıyı email ile bul
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return Response.json(
        { error: 'Email veya şifre hatalı' },
        { status: 401 }
      )
    }

    if (!user.is_active) {
      return Response.json(
        { error: 'Bu hesap deaktif edilmiştir' },
        { status: 403 }
      )
    }

    // Şifre kontrolü
    console.log('Password hash from DB:', user.password_hash)
    console.log('Password provided:', password)
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    console.log('Password valid:', isPasswordValid)

    if (!isPasswordValid) {
      return Response.json(
        { error: 'Email veya şifre hatalı' },
        { status: 401 }
      )
    }

    // Session oluştur
    const sessionToken = crypto.getRandomValues(new Uint8Array(32))
      .reduce((acc, x) => acc + x.toString(16).padStart(2, '0'), '')

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 gün

    const { error: sessionError } = await supabaseAdmin
      .from('sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
      })

    if (sessionError) {
      return Response.json(
        { error: 'Session oluşturulamadı' },
        { status: 500 }
      )
    }

    // Last login güncelle
    await supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Audit log ekle
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'LOGIN',
        resource_type: 'AUTH',
        details: { email },
      })

    // Response'da session token'ı gönder (cookie olarak set edilecek)
    const response = Response.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          is_admin: user.is_admin,
        },
        sessionToken,
      },
      { status: 200 }
    )

    // Session token'ı HttpOnly cookie olarak set et
    response.headers.set(
      'Set-Cookie',
      `session_token=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
    )

    return response
  } catch (error) {
    console.error('Login error:', error)
    return Response.json(
      { error: 'Bir hata oluştu' },
      { status: 500 }
    )
  }
}
