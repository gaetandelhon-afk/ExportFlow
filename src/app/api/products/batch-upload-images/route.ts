import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        photoUrl: true
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.photoUrl && !replaceExisting) {
      return NextResponse.json({
        error: 'Product already has image',
        skipped: true
      }, { status: 409 })
    }

    await ensureBucketExists()

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const safeRef = product.ref.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `${session.companyId}/products/${safeRef}_${timestamp}_${random}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: replaceExisting
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

    await prisma.product.update({
      where: { id: productId },
      data: { photoUrl: urlData.publicUrl }
    })

    return NextResponse.json({
      success: true,
      imageUrl: urlData.publicUrl,
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
