import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const PHYSICAL_PROMPT = `请分析给定图片中的物体，输出结构化描述（严格按照以下格式）：
Name: <物体名称>
Category: <物体类别，如料车/工作台/货架/AGV/传送带>
Dimension: <物理尺寸，单位cm，格式：长*宽*高>
Parts:
l_0: <部件名>, <材料>, <密度 kg/m3>, <杨氏模量 GPa>, <泊松比>, <描述>
l_1: <部件名>, <材料>, <密度 kg/m3>, <杨氏模量 GPa>, <泊松比>, <描述>
...
Group_info:
group_0: [l_0, l_1, ...] (child); Type: E; Params: N/A
group_1: [l_2, ...] (child); Type: C relative to group_0 (parent); Params: direction: [x,y,z], axis position: [x,y,z], revolute range (degree): [min,max]
...
Note: 运动类型 A(自由), B(滑动), C(旋转), D(铰接), CB(旋转+滑动), E(固定)`

// POST /api/inference/vlm - Call MiniMax M2.7-highspeed for physical property inference
export async function POST(request: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { job_id, image_url } = await request.json()

  if (!job_id || !image_url) {
    return NextResponse.json({ error: 'job_id and image_url are required' }, { status: 400 })
  }

  // Check if MINIMAX_API_KEY is configured
  if (!process.env.MINIMAX_API_KEY) {
    console.error('MINIMAX_API_KEY not configured')
    await admin
      .from('inference_jobs')
      .update({
        status: 'failed',
        error_message: 'MINIMAX_API_KEY not configured. Please add it to .env.local to enable VLM inference.',
      })
      .eq('id', job_id)

    return NextResponse.json({ error: 'MINIMAX_API_KEY not configured' }, { status: 500 })
  }

  // Update job status (use admin to bypass RLS)
  await admin
    .from('inference_jobs')
    .update({ status: 'vlm_processing', current_step: 'vlm_processing', progress: 0.1 })
    .eq('id', job_id)

  try {
    // Call MiniMax M2.7-highspeed API (OpenAI-compatible multimodal endpoint)
    const minimaxResponse = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'M2.7-highspeed',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: image_url } },
            { type: 'text', text: PHYSICAL_PROMPT },
          ],
        }],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    })

    if (!minimaxResponse.ok) {
      const errorText = await minimaxResponse.text()
      console.error('MiniMax API error:', errorText)
      throw new Error(`MiniMax API error (${minimaxResponse.status}): ${errorText.slice(0, 200)}`)
    }

    const minimaxData = await minimaxResponse.json()
    const vlmOutput = minimaxData.choices?.[0]?.message?.content || ''

    // Parse VLM output into structured data
    const parsedData = parseVLMOutput(vlmOutput)

    // Update job with VLM results
    const { data: job } = await admin
      .from('inference_jobs')
      .select('asset_id')
      .eq('id', job_id)
      .single()

    if (job?.asset_id) {
      const dims = parsedData.dimensions as number[] | null
      await admin
        .from('assets')
        .update({
          name: (parsedData.name as string) || 'Unnamed',
          category: mapCategory((parsedData.category as string) || ''),
          dimension_length: dims?.[0] || null,
          dimension_width: dims?.[1] || null,
          dimension_height: dims?.[2] || null,
          physical_params: (parsedData.physical_params as Record<string, unknown>) || {},
          parts: (parsedData.parts as unknown[]) || [],
          group_info: (parsedData.group_info as Record<string, unknown>) || {},
        })
        .eq('id', job.asset_id)
    }

    // Update job progress
    await admin
      .from('inference_jobs')
      .update({
        status: 'generating_3d',
        current_step: 'generating_3d',
        progress: 0.3,
        output_metadata: { vlm_output: vlmOutput, parsed: parsedData },
      })
      .eq('id', job_id)

    // Trigger next step: 3D generation
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
    
    fetch(`${baseUrl}/api/inference/generate-3d`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id, image_url }),
    }).catch(console.error)

    return NextResponse.json({ 
      success: true, 
      parsed: parsedData,
      raw_output: vlmOutput,
    })

  } catch (error) {
    console.error('VLM inference error:', error)
    await admin
      .from('inference_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'VLM inference failed',
      })
      .eq('id', job_id)

    return NextResponse.json({ error: 'VLM inference failed' }, { status: 500 })
  }
}

function parseVLMOutput(text: string) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  
  const result: Record<string, unknown> = {
    name: '',
    category: '',
    dimensions: null,
    parts: [],
    group_info: {},
    physical_params: {},
  }

  for (const line of lines) {
    if (line.startsWith('Name:')) {
      result.name = line.replace('Name:', '').trim()
    } else if (line.startsWith('Category:')) {
      result.category = line.replace('Category:', '').trim()
    } else if (line.startsWith('Dimension:')) {
      const dimStr = line.replace('Dimension:', '').trim()
      const dims = dimStr.split('*').map(d => parseFloat(d.trim())).filter(n => !isNaN(n))
      if (dims.length >= 3) result.dimensions = dims
    }
  }

  return result
}

function mapCategory(category: string): string {
  const mapping: Record<string, string> = {
    '料车': 'other',
    '工作台': 'workstation',
    '货架': 'shelf',
    'AGV': 'agv_lmr',
    '传送带': 'conveyor',
    '机械臂': 'robot_arm',
    '托盘': 'pallet',
    '充电桩': 'charger',
  }
  return mapping[category] || 'other'
}
