import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/route-nodes/[id] — Update a node
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

  if (body.x !== undefined) updates.x = body.x
  if (body.y !== undefined) updates.y = body.y
  if (body.node_type !== undefined) updates.node_type = body.node_type
  if (body.label !== undefined) updates.label = body.label
  if (body.properties !== undefined) updates.properties = body.properties

  // Handle logistics_config: merge into existing properties
  if (body.logistics_config !== undefined) {
    // Fetch existing node to merge properties
    const { data: existing } = await supabase
      .from('route_nodes')
      .select('properties')
      .eq('id', id)
      .single()

    const existingProps = (existing?.properties || {}) as Record<string, unknown>
    updates.properties = {
      ...existingProps,
      ...(body.properties || {}),
      logistics_config: body.logistics_config,
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: node, error } = await supabase
    .from('route_nodes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ node })
}

// DELETE /api/route-nodes/[id] — Delete a node
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
    .from('route_nodes')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
