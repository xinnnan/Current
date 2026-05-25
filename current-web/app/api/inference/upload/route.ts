import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const STORAGE_BUCKET = 'inference-input'

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

  // Use admin client for storage operations (bypasses RLS)
  let adminClient
  try {
    adminClient = createAdminClient()
  } catch (err) {
    console.error('Failed to create admin client:', err)
    return NextResponse.json({
      error: 'Server configuration error: SUPABASE_SECRET_KEY not set. Please add it to .env.local',
    }, { status: 500 })
  }

  // Ensure storage bucket exists
  const { data: buckets } = await adminClient.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === STORAGE_BUCKET)
  
  if (!bucketExists) {
    console.log(`Creating storage bucket: ${STORAGE_BUCKET}`)
    const { error: createError } = await adminClient.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: '10MB',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    })
    if (createError) {
      console.error('Failed to create bucket:', createError)
      return NextResponse.json({
        error: `Failed to create storage bucket: ${createError.message}`,
      }, { status: 500 })
    }
  }

  // Upload image to Supabase Storage
  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${user.id}/${Date.now()}.${ext}`
  
  const { data: uploadData, error: uploadError } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, { contentType: file.type })

  if (uploadError || !uploadData) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({
      error: `Failed to upload image: ${uploadError?.message || 'Unknown error'}`,
    }, { status: 500 })
  }

  // Get public URL
  const { data: urlData } = adminClient.storage
    .from(STORAGE_BUCKET)
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
    console.error('Asset creation error:', assetError)
    return NextResponse.json({
      error: `Failed to create asset: ${assetError?.message || 'Unknown error'}`,
    }, { status: 500 })
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
    console.error('Job creation error:', jobError)
    return NextResponse.json({
      error: `Failed to create inference job: ${jobError?.message || 'Unknown error'}`,
    }, { status: 500 })
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
  
  // Step 1: Call VLM API (MiniMax M2.7-highspeed)
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
