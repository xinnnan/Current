import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/route-nodes?map_id=xxx — List nodes for a map
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

  const { data: nodes, error } = await supabase
    .from('route_nodes')
    .select('*')
    .eq('map_id', mapId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ nodes })
}

// POST /api/route-nodes — Create a new node
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { map_id, x, y, node_type, label, properties } = body

  if (!map_id || x === undefined || y === undefined) {
    return NextResponse.json({ error: 'map_id, x, y are required' }, { status: 400 })
  }

  const { data: node, error } = await supabase
    .from('route_nodes')
    .insert({
      map_id,
      x,
      y,
      node_type: node_type || 'waypoint',
      label: label || null,
      properties: properties || {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ node }, { status: 201 })
}
