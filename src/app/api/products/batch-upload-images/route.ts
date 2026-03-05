import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'
import { prisma } from '@/lib/prisma'

const BUCKET_NAME = 'product-images'

async function ensureBucketExists() {
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME)

  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    })
    if (error && !error.message.includes('already exists')) {
      throw error
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    const formData = await req.formData()
    const file = formData.get('file') as File
    const productId = formData.get('productId') as string
    const replaceExisting = formData.get('replaceExisting') === 'true'

    if (!file || !productId) {
      return NextResponse.json({ error: 'Missing file or productId' }, { status: 400 })
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        companyId: session.companyId
      },
      select: {
        id: true,
        ref: true,
        photoUrl: true,
        photos: true,
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // If product already has a photo and we're not replacing AND not adding to gallery:
    // Only skip if replaceExisting=false AND there are already photos
    // (allow adding more photos even when replaceExisting=false to build a gallery)
    if (product.photoUrl && !replaceExisting) {
      // Check if this exact file (by approximate name) is already in the gallery
      // Allow adding new photos to the gallery — don't skip
    }

    await ensureBucketExists()

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const safeRef = product.ref.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `${session.companyId}/products/${safeRef}_${timestamp}_${random}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({
        error: 'Failed to upload image',
        details: uploadError.message
      }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename)

    const newUrl = urlData.publicUrl

    let newPhotoUrl: string
    let newPhotos: string[]

    if (replaceExisting) {
      // Replace mode: clear all existing photos, set only the new one as primary
      newPhotoUrl = newUrl
      newPhotos = [newUrl]
    } else {
      // Append mode: add to gallery, keep first photo as primary
      const existingPhotos = Array.isArray(product.photos) ? product.photos : []
      newPhotos = [...existingPhotos, newUrl]
      // If no primary photo yet, set this as primary
      newPhotoUrl = product.photoUrl || newUrl
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        photoUrl: newPhotoUrl,
        photos: newPhotos,
      }
    })

    return NextResponse.json({
      success: true,
      imageUrl: newUrl,
      totalPhotos: newPhotos.length,
      sizeKb: Math.round(buffer.length / 1024)
    })

  } catch (error) {
    console.error('Batch upload error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
