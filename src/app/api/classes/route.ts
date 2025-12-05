import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('classes')
    .select(`
      *,
      class_enrollments(count)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Process data to match the expected format (adding enrolled_count)
  const classesWithCount = data?.map((cls: any) => ({
    ...cls,
    enrolled_count: cls.class_enrollments?.[0]?.count || 0
  }))

  return NextResponse.json(classesWithCount)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('classes')
    .insert({
      ...body,
      instructor_id: user.id
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
