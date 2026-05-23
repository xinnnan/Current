import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/simulations?project_id=xxx — List simulations for a project
export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')

  if (!projectId) {
    return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
  }

  const { data: simulations, error } = await supabase
    .from('simulations')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ simulations })
}

// POST /api/simulations — Create a new simulation
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { project_id, name, config, status } = body

  if (!project_id || !name?.trim()) {
    return NextResponse.json({ error: 'project_id and name are required' }, { status: 400 })
  }

  const { data: simulation, error } = await supabase
    .from('simulations')
    .insert({
      project_id,
      name: name.trim(),
      config: config || {},
      results: {},
      status: status || 'draft',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ simulation }, { status: 201 })
}
