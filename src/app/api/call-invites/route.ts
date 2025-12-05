import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('call_invites')
    .select(`
        *,
        communities (name),
        profiles:caller_id (full_name, avatar_url)
    `)
    .eq('receiver_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { id, status } = body;

  const { error } = await supabase
    .from('call_invites')
    .update({ status })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { invites } = body;

  const { data, error } = await supabase
    .from('call_invites')
    .insert(invites)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
