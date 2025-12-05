import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get('communityId');

  if (!communityId) {
    return NextResponse.json({ error: 'Community ID required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('community_messages')
    .select(`
      id,
      user_id,
      content,
      created_at,
      profiles:profiles!community_messages_user_id_fkey (
        full_name,
        avatar_url
      )
    `)
    .eq('community_id', communityId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { communityId, content } = body;

  if (!communityId || !content?.trim()) {
    return NextResponse.json({ error: 'Community ID and content required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('community_messages')
    .insert({
      community_id: communityId,
      user_id: user.id,
      content: content.trim()
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch sender profile and community members for notifications
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const { data: members } = await supabase
    .from('community_members')
    .select('user_id')
    .eq('community_id', communityId)
    .eq('status', 'approved')
    .neq('user_id', user.id);

  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('id', communityId)
    .single();

  return NextResponse.json({
    message: data,
    notificationData: {
      senderName: senderProfile?.full_name || 'Member',
      communityName: community?.name || 'Community',
      receiverIds: members?.map(m => m.user_id) || [],
      messagePreview: content.trim()
    }
  });
}
