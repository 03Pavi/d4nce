import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch communities where user is a member
  const { data: memberData, error: memberError } = await supabase
    .from('community_members')
    .select(`
      community_id,
      communities (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'approved')

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  // Fetch communities where user is admin
  const { data: adminData, error: adminError } = await supabase
    .from('communities')
    .select('id, name')
    .eq('admin_id', user.id)

  if (adminError) {
    return NextResponse.json({ error: adminError.message }, { status: 500 })
  }

  const memberCommunities = memberData?.map((d: any) => d.communities) || []
  const adminCommunities = adminData || []

  // Combine and deduplicate
  const allCommunities = [...adminCommunities, ...memberCommunities].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)

  return NextResponse.json(allCommunities)
}
