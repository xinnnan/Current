import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/route-edges?map_id=xxx — List edges for a map
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

  const { data: edges, error } = await supabase
    .from('route_edges')
    .select('*')
    .eq('map_id', mapId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ edges })
}

// POST /api/route-edges — Create a new edge
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { map_id, from_node_id, to_node_id, length, speed_limit, direction, geometry, constraints } = body

  if (!map_id || !from_node_id || !to_node_id) {
    return NextResponse.json({ error: 'map_id, from_node_id, to_node_id are required' }, { status: 400 })
  }

  const { data: edge, error } = await supabase
    .from('route_edges')
    .insert({
      map_id,
      from_node_id,
      to_node_id,
      length: length || null,
      speed_limit: speed_limit ?? 1.5,
      direction: direction || 'bidirectional',
      geometry: geometry || {},
      constraints: constraints || {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ edge }, { status: 201 })
}
