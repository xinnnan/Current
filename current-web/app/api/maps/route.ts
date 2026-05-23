import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/maps?project_id=xxx — List maps for a project
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

  const { data: maps, error } = await supabase
    .from('maps')
    .select('*')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ maps })
}

// POST /api/maps — Create a new map
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { project_id, name, base_image_url, base_image_width, base_image_height, calibration, scale_ratio } = body

  if (!project_id || !name?.trim()) {
    return NextResponse.json({ error: 'project_id and name are required' }, { status: 400 })
  }

  const { data: map, error } = await supabase
    .from('maps')
    .insert({
      project_id,
      name: name.trim(),
      base_image_url: base_image_url || null,
      base_image_width: base_image_width || null,
      base_image_height: base_image_height || null,
      calibration: calibration || {},
      scale_ratio: scale_ratio || 1.0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ map }, { status: 201 })
}
