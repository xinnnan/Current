import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/inference/upload - Upload image and start inference pipeline
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('image') as File | null
  const assetName = (formData.get('name') as string) || 'Untitled Asset'

  if (!file) {
    return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, or WebP.' }, { status: 400 })
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 })
  }

  // Upload image to Supabase Storage
  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${user.id}/${Date.now()}.${ext}`
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('inference-input')
    .upload(fileName, file, { contentType: file.type })

  if (uploadError || !uploadData) {
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('inference-input')
    .getPublicUrl(fileName)

  const imageUrl = urlData.publicUrl

  // Create asset record
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .insert({
      name: assetName,
      category: 'other',
      source_image_url: imageUrl,
      created_by: user.id,
      physical_params: {},
      parts: [],
      group_info: {},
    })
    .select()
    .single()

  if (assetError || !asset) {
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 })
  }

  // Create inference job
  const { data: job, error: jobError } = await supabase
    .from('inference_jobs')
    .insert({
      asset_id: asset.id,
      status: 'pending',
      input_image_url: imageUrl,
      progress: 0,
      current_step: 'pending',
      output_metadata: {},
    })
    .select()
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Failed to create inference job' }, { status: 500 })
  }

  // Trigger inference pipeline asynchronously
  // In production, this would be a background job / queue
  triggerInferencePipeline(job.id, imageUrl).catch(console.error)

  return NextResponse.json({ 
    asset_id: asset.id,
    job_id: job.id,
    status: 'pending',
  }, { status: 201 })
}

async function triggerInferencePipeline(jobId: string, imageUrl: string) {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000'
  
  // Step 1: Call VLM API (智谱 GLM-4V)
  try {
    await fetch(`${baseUrl}/api/inference/vlm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, image_url: imageUrl }),
    })
  } catch (error) {
    console.error('Failed to trigger VLM inference:', error)
  }
}
