import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/inference/generate-3d - Call Tripo3D API to generate 3D model
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { job_id, image_url } = await request.json()

  if (!job_id || !image_url) {
    return NextResponse.json({ error: 'job_id and image_url are required' }, { status: 400 })
  }

  try {
    // Step 1: Submit task to Tripo3D
    const submitResponse = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TRIPO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'image_to_model',
        content: { image: image_url },
      }),
    })

    if (!submitResponse.ok) {
      throw new Error(`Tripo3D submit error: ${submitResponse.status}`)
    }

    const submitData = await submitResponse.json()
    const tripoTaskId = submitData.data?.task_id

    if (!tripoTaskId) {
      throw new Error('No task_id returned from Tripo3D')
    }

    // Step 2: Poll for completion (with timeout)
    let modelUrl: string | null = null
    const maxAttempts = 60 // 2 minutes max
    let attempts = 0

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2s between polls
      
      const statusResponse = await fetch(
        `https://api.tripo3d.ai/v2/openapi/task/${tripoTaskId}`,
        {
          headers: { 'Authorization': `Bearer ${process.env.TRIPO_API_KEY}` },
        }
      )

      if (!statusResponse.ok) {
        throw new Error(`Tripo3D status error: ${statusResponse.status}`)
      }

      const statusData = await statusResponse.json()
      const status = statusData.data?.status
      const progress = statusData.data?.progress || 0

      // Update job progress
      await supabase
        .from('inference_jobs')
        .update({
          progress: 0.3 + progress * 0.5,
          current_step: 'generating_3d',
        })
        .eq('id', job_id)

      if (status === 'success') {
        modelUrl = statusData.data?.output?.model
        break
      } else if (status === 'failed') {
        throw new Error('Tripo3D generation failed')
      }

      attempts++
    }

    if (!modelUrl) {
      throw new Error('Tripo3D generation timed out')
    }

    // Step 3: Download model and upload to Supabase Storage
    const modelResponse = await fetch(modelUrl)
    const modelBuffer = await modelResponse.arrayBuffer()

    const { data: job } = await supabase
      .from('inference_jobs')
      .select('asset_id')
      .eq('id', job_id)
      .single()

    const storagePath = `${user.id}/${job_id}/model.glb`
    await supabase.storage
      .from('assets-models')
      .upload(storagePath, modelBuffer, { contentType: 'model/gltf-binary' })

    const { data: urlData } = supabase.storage
      .from('assets-models')
      .getPublicUrl(storagePath)

    // Update asset with model URL
    if (job?.asset_id) {
      await supabase
        .from('assets')
        .update({ model_url: urlData.publicUrl, format: 'glb' })
        .eq('id', job.asset_id)
    }

    // Update job status
    await supabase
      .from('inference_jobs')
      .update({
        status: 'completed',
        current_step: 'completed',
        progress: 1.0,
        output_metadata: { tripo_task_id: tripoTaskId, model_url: urlData.publicUrl },
      })
      .eq('id', job_id)

    return NextResponse.json({ success: true, model_url: urlData.publicUrl })

  } catch (error) {
    await supabase
      .from('inference_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : '3D generation failed',
      })
      .eq('id', job_id)

    return NextResponse.json({ error: '3D generation failed' }, { status: 500 })
  }
}
