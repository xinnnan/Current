import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET /api/inference/[jobId] - Get inference job status
export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use admin client to bypass RLS for reading job status
  const admin = createAdminClient()

  const { data: job, error } = await admin
    .from('inference_jobs')
    .select('id, status, progress, current_step, error_message, output_metadata, created_at, updated_at, asset_id')
    .eq('id', jobId)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Also get the asset if available
  let asset = null
  if (job.asset_id) {
    const { data: assetData } = await admin
      .from('assets')
      .select('id, name, category, model_url, thumbnail_url, physical_params, parts')
      .eq('id', job.asset_id)
      .single()
    asset = assetData
  }

  return NextResponse.json({ job, asset })
}
