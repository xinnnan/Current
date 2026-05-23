import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/asset-instances/[id] — Update an asset instance (position, rotation, scale)
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

  if (body.position_x !== undefined) updates.position_x = body.position_x
  if (body.position_y !== undefined) updates.position_y = body.position_y
  if (body.position_z !== undefined) updates.position_z = body.position_z
  if (body.rotation !== undefined) updates.rotation = body.rotation
  if (body.scale !== undefined) updates.scale = body.scale
  if (body.transform !== undefined) updates.transform = body.transform

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: instance, error } = await supabase
    .from('asset_instances')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ instance })
}

// DELETE /api/asset-instances/[id] — Delete an asset instance
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
    .from('asset_instances')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
