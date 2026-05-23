import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/maps/[id] — Get a single map
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: map, error } = await supabase
    .from('maps')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !map) {
    return NextResponse.json({ error: 'Map not found' }, { status: 404 })
  }

  return NextResponse.json({ map })
}

// PATCH /api/maps/[id] — Update a map
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if (body.name !== undefined) updates.name = body.name
  if (body.base_image_url !== undefined) updates.base_image_url = body.base_image_url
  if (body.base_image_width !== undefined) updates.base_image_width = body.base_image_width
  if (body.base_image_height !== undefined) updates.base_image_height = body.base_image_height
  if (body.calibration !== undefined) updates.calibration = body.calibration
  if (body.scale_ratio !== undefined) updates.scale_ratio = body.scale_ratio

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: map, error } = await supabase
    .from('maps')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ map })
}

// DELETE /api/maps/[id] — Delete a map
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('maps')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
