import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/constraint-zones?map_id=xxx — List constraint zones for a map
export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const mapId = searchParams.get('map_id')

  if (!mapId) {
    return NextResponse.json({ error: 'map_id is required' }, { status: 400 })
  }

  const { data: zones, error } = await supabase
    .from('constraint_zones')
    .select('*')
    .eq('map_id', mapId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ zones })
}

// POST /api/constraint-zones — Create a new constraint zone
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { map_id, name, zone_type, polygon, rules } = body

  if (!map_id || !polygon) {
    return NextResponse.json({ error: 'map_id and polygon are required' }, { status: 400 })
  }

  const { data: zone, error } = await supabase
    .from('constraint_zones')
    .insert({
      map_id,
      name: name || null,
      zone_type: zone_type || 'obstacle',
      polygon,
      rules: rules || {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ zone }, { status: 201 })
}
