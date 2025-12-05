import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get('communityId');

  if (!communityId) {
    return NextResponse.json({ error: 'Community ID required' }, { status: 400 });
  }

  // Fetch community admin
  const { data: communityData } = await supabase
    .from('communities')
    .select(`
        admin_id,
        profiles:profiles!communities_admin_id_fkey (
            full_name,
            avatar_url
        )
    `)
    .eq('id', communityId)
    .single();

  // Fetch members
  const { data: membersData, error } = await supabase
    .from('community_members')
    .select(`
      id,
      user_id,
      profiles:profiles!community_members_user_id_fkey (
        full_name,
        avatar_url
      )
    `)
    .eq('community_id', communityId)
    .eq('status', 'approved')
    .neq('user_id', user.id); // Exclude self

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let allMembers: any[] = [];

  // Add admin if not self
  if (communityData && communityData.admin_id !== user.id) {
    const adminProfile = Array.isArray(communityData.profiles)
      ? communityData.profiles[0]
      : communityData.profiles;

    allMembers.push({
      id: 'admin',
      user_id: communityData.admin_id,
      profiles: adminProfile
    });
  }

  if (membersData) {
    allMembers = [...allMembers, ...membersData];
  }

  return NextResponse.json(allMembers);
}
