import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/assets?category=xxx — List all assets (global, not project-scoped)
export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  let query = supabase
    .from('assets')
    .select('*')
    .order('updated_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const { data: assets, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ assets })
}
