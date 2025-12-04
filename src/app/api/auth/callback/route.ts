import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    if (data.user) {
      const isNewUser = data.user.created_at === data.user.last_sign_in_at

      const cookies = request.headers.get('cookie')
      let pendingRole = 'student'

      if (cookies) {
        const roleMatch = cookies.match(/pending_role=([^;]+)/)
        if (roleMatch) {
          pendingRole = roleMatch[1]
        }
      }

      if (isNewUser && !data.user.user_metadata?.role) {
        await supabase.auth.updateUser({
          data: {
            role: pendingRole,
            full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0],
          },
        })
      }

      const role = data.user.user_metadata?.role || pendingRole

      const response = NextResponse.redirect(
        role === 'admin' ? `${origin}/admin` : `${origin}/student`
      )
      response.cookies.delete('pending_role')

      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
