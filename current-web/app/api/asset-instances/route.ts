import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/asset-instances?map_id=xxx — List asset instances for a map
export async function GET(request: NextRequest) {
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

  const { data: instances, error } = await supabase
    .from('asset_instances')
    .select('*')
    .eq('map_id', mapId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ instances })
}

// POST /api/asset-instances — Create a new asset instance
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { project_id, asset_id, map_id, position_x, position_y, position_z, rotation, scale, transform } = body

    if (!asset_id || !map_id || !project_id) {
      return NextResponse.json(
        { error: 'Missing required fields: asset_id, map_id, project_id' },
        { status: 400 }
      )
    }

    const { data: instance, error } = await supabase
      .from('asset_instances')
      .insert({
        project_id,
        asset_id,
        map_id,
        position_x: position_x ?? 0,
        position_y: position_y ?? 0,
        position_z: position_z ?? 0,
        rotation: rotation ?? 0,
        scale: scale ?? 1,
        transform: transform || {},
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ instance }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
