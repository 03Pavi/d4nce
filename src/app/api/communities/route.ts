import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch all communities
  const { data: communities, error } = await supabase
    .from('communities')
    .select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let membershipStatus: Record<string, string> = {};
  let userProfile = null;

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    userProfile = profile;

    const { data: joinedData } = await supabase
      .from('community_members')
      .select('community_id, status')
      .eq('user_id', user.id);

    if (joinedData) {
      joinedData.forEach(d => {
        membershipStatus[d.community_id] = d.status;
      });
    }
  }

  return NextResponse.json({ communities, membershipStatus, userId: user?.id, userProfile });
}
