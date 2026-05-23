import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/simulations/[id] — Get a single simulation
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

  const { data: simulation, error } = await supabase
    .from('simulations')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !simulation) {
    return NextResponse.json({ error: 'Simulation not found' }, { status: 404 })
  }

  return NextResponse.json({ simulation })
}

// PATCH /api/simulations/[id] — Update a simulation
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
  if (body.status !== undefined) updates.status = body.status
  if (body.config !== undefined) updates.config = body.config
  if (body.results !== undefined) updates.results = body.results
  if (body.started_at !== undefined) updates.started_at = body.started_at
  if (body.completed_at !== undefined) updates.completed_at = body.completed_at

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: simulation, error } = await supabase
    .from('simulations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ simulation })
}

// DELETE /api/simulations/[id] — Delete a simulation
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
    .from('simulations')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
