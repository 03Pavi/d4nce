import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const communityId = searchParams.get('communityId')
  const page = parseInt(searchParams.get('page') || '0')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')

  const start = page * pageSize
  const end = start + pageSize - 1

  let query = supabase
    .from('reels')
    .select(`
      *,
      profiles:profiles!reels_user_id_fkey (
        full_name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false })
    .range(start, end)

  if (communityId) {
    query = query.eq('community_id', communityId)
  } else {
    query = query.is('community_id', null)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const formattedReels = data?.map(reel => ({
    ...reel,
    user: reel.profiles?.full_name || 'Unknown User',
    user_avatar: reel.profiles?.avatar_url
  }))

  return NextResponse.json(formattedReels)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('reels')
    .insert({
      ...body,
      user_id: user.id,
      likes_count: 0,
      comments_count: 0
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
