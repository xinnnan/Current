import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/map-layers?map_id=xxx — List layers for a map
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

  const { data: layers, error } = await supabase
    .from('map_layers')
    .select('*')
    .eq('map_id', mapId)
    .order('z_index', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ layers })
}

// POST /api/map-layers — Create a new layer
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { map_id, name, type, z_index, visible, locked, opacity, data } = body

  if (!map_id || !name?.trim()) {
    return NextResponse.json({ error: 'map_id and name are required' }, { status: 400 })
  }

  const { data: layer, error } = await supabase
    .from('map_layers')
    .insert({
      map_id,
      name: name.trim(),
      type: type || 'custom',
      z_index: z_index ?? 0,
      visible: visible ?? true,
      locked: locked ?? false,
      opacity: opacity ?? 1.0,
      data: data || {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ layer }, { status: 201 })
}
