import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/maps/[id]/upload-image — Upload base map image to Storage
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('image') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, or WebP.' }, { status: 400 })
  }

  // Validate file size (max 20MB for base maps)
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Max 20MB.' }, { status: 400 })
  }

  // Upload to Storage
  const ext = file.name.split('.').pop() || 'png'
  const storagePath = `${user.id}/${id}/base-image.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('maps-base-images')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: true, // Overwrite if exists
    })

  if (uploadError) {
    return NextResponse.json({ error: 'Failed to upload image: ' + uploadError.message }, { status: 500 })
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('maps-base-images')
    .getPublicUrl(storagePath)

  const imageUrl = urlData.publicUrl

  // Get image dimensions from form data (client provides them)
  const width = formData.get('width') ? parseFloat(formData.get('width') as string) : null
  const height = formData.get('height') ? parseFloat(formData.get('height') as string) : null

  // Update map record with image URL
  const updates: Record<string, unknown> = {
    base_image_url: imageUrl,
  }
  if (width) updates.base_image_width = width
  if (height) updates.base_image_height = height

  const { data: map, error: updateError } = await supabase
    .from('maps')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ map, image_url: imageUrl })
}
