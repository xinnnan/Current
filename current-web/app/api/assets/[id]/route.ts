import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/assets/[id] — Get a single asset
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

  const { data: asset, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
  }

  return NextResponse.json({ asset })
}

// PATCH /api/assets/[id] — Update an asset
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
  if (body.category !== undefined) updates.category = body.category
  if (body.dimension_length !== undefined) updates.dimension_length = body.dimension_length
  if (body.dimension_width !== undefined) updates.dimension_width = body.dimension_width
  if (body.dimension_height !== undefined) updates.dimension_height = body.dimension_height
  if (body.physical_params !== undefined) updates.physical_params = body.physical_params
  if (body.parts !== undefined) updates.parts = body.parts
  if (body.group_info !== undefined) updates.group_info = body.group_info
  if (body.model_url !== undefined) updates.model_url = body.model_url
  if (body.thumbnail_url !== undefined) updates.thumbnail_url = body.thumbnail_url
  if (body.urdf_url !== undefined) updates.urdf_url = body.urdf_url

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: asset, error } = await supabase
    .from('assets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ asset })
}

// DELETE /api/assets/[id] — Delete an asset
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
    .from('assets')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
