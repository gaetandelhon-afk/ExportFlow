import { NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateBody, isValidationError, createCategorySchema } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await validateBody(request, createCategorySchema)
    if (isValidationError(body)) return body
    const { nameEn, nameCn, parentId } = body

    const category = await prisma.category.create({
      data: {
        nameEn,
        nameCn: nameCn || null,
        parentId: parentId || null,
        companyId: session.companyId,
      },
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Failed to create category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
