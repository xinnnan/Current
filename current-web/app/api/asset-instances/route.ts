import { NextRequest, NextResponse } from 'next/server'

// Placeholder: Asset Instance CRUD
// In production, this would use Supabase client

// GET /api/asset-instances?map_id=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mapId = searchParams.get('map_id')

  // Placeholder: return demo instances
  const instances = mapId ? [
    {
      id: 'inst_1',
      asset_id: 'agv_1',
      map_id: mapId,
      position_x: 5.0,
      position_y: 5.0,
      position_z: 0,
      rotation: 0,
      scale: 1,
      created_at: new Date().toISOString(),
    },
  ] : []

  return NextResponse.json({ instances })
}

// POST /api/asset-instances
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { asset_id, map_id, position_x, position_y, position_z, rotation, scale } = body

    if (!asset_id || !map_id) {
      return NextResponse.json(
        { error: 'Missing required fields: asset_id, map_id' },
        { status: 400 }
      )
    }

    // Placeholder: create instance
    const instance = {
      id: `inst_${Date.now()}`,
      asset_id,
      map_id,
      position_x: position_x ?? 0,
      position_y: position_y ?? 0,
      position_z: position_z ?? 0,
      rotation: rotation ?? 0,
      scale: scale ?? 1,
      created_at: new Date().toISOString(),
    }

    return NextResponse.json({ instance }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
