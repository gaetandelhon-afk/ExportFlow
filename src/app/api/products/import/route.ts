import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateGroupId, generateOptionId, ProductOptionGroup, ProductOption } from '@/types/product-options'

interface ImportedOption {
  groupName: string
  options: string[]
}

interface ImportedProduct {
  rowIndex: number
  ref: string
  nameEn: string
  nameCn?: string
  description?: string
  price?: number
  priceDistributor?: number
  priceWholesale?: number
  priceRmb?: number
  rrp?: number
  priceBase?: number  // Base price for tier calculations
  prices?: Record<string, number>  // Tier-specific prices: {"distributor": 150, "wholesale": 120}
  quantity?: number
  category?: string
  subcategory?: string  // Subcategory from file (stored in customFields)
  unit?: string
  weight?: number
  hsCode?: string
  material?: string
  options?: ImportedOption[]
  customFields?: Record<string, string>  // Dynamic custom fields from import
  action: 'create' | 'update' | 'skip'
  existingMatch?: {
    productId: string
  }
}

/**
 * Convert ImportedOption[] to ProductOptionGroup[] for storage
 */
function convertOptionsToProductOptionGroups(importedOptions: ImportedOption[]): ProductOptionGroup[] {
  return importedOptions.map((group, groupIndex) => ({
    id: generateGroupId(),
    name: group.groupName,
    required: false,
    sortOrder: groupIndex,
    options: group.options.map((optionName, optionIndex): ProductOption => ({
      id: generateOptionId(),
      name: optionName,
      description: '',
      images: [],
      priceModifier: 0,
      sortOrder: optionIndex,
    }))
  }))
}

interface ImportRequest {
  products: (ImportedProduct & { categoryId?: string })[]
  variantDecisions?: Record<string, 'separate' | 'combined'>
  globalCategoryId?: string  // Optional global category to apply to all products
}

// POST - Import products
export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ImportRequest = await request.json()
    const { products, variantDecisions, globalCategoryId } = body

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'No products to import' }, { status: 400 })
    }

    let created = 0
    let updated = 0
    const errors: string[] = []

    // Get or create categories and subcategories
    const categoryMap = new Map<string, string>() // categoryName -> categoryId
    const subcategoryMap = new Map<string, string>() // "parentCategory|subcategoryName" -> categoryId
    
    // First, get unique parent categories
    const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))]
    
    for (const categoryName of uniqueCategories) {
      if (!categoryName) continue
      
      // Check if category exists
      let category = await prisma.category.findFirst({
        where: { 
          nameEn: categoryName,
          companyId: session.companyId,
          parentId: null // Root category only
        }
      })
      
      if (!category) {
        // Create category
        category = await prisma.category.create({
          data: {
            nameEn: categoryName,
            companyId: session.companyId
          }
        })
      }
      
      categoryMap.set(categoryName, category.id)
    }
    
    // Then, get unique subcategories and create them under their parent
    const uniqueSubcategories = [...new Set(
      products
        .filter(p => p.subcategory && p.category)
        .map(p => `${p.category}|${p.subcategory}`)
    )]
    
    for (const key of uniqueSubcategories) {
      const [parentCategoryName, subcategoryName] = key.split('|')
      if (!subcategoryName || !parentCategoryName) continue
      
      const parentId = categoryMap.get(parentCategoryName)
      if (!parentId) continue
      
      // Check if subcategory exists under this parent
      let subcategory = await prisma.category.findFirst({
        where: {
          nameEn: subcategoryName,
          companyId: session.companyId,
          parentId: parentId
        }
      })
      
      if (!subcategory) {
        // Create subcategory
        subcategory = await prisma.category.create({
          data: {
            nameEn: subcategoryName,
            companyId: session.companyId,
            parentId: parentId
          }
        })
      }
      
      subcategoryMap.set(key, subcategory.id)
    }

    // Process each product
    for (const product of products) {
      try {
        if (product.action === 'skip') continue

        // Determine final categoryId - prefer subcategory over category
        let finalCategoryId: string | null = null
        if (product.subcategory && product.category) {
          // Use subcategory if available
          const subcatKey = `${product.category}|${product.subcategory}`
          finalCategoryId = subcategoryMap.get(subcatKey) || categoryMap.get(product.category) || null
        } else if (product.category) {
          finalCategoryId = categoryMap.get(product.category) || null
        }
        
        // Build custom fields
        const customFields: Record<string, unknown> = {}
        if (product.hsCode) customFields['hsCode'] = product.hsCode
        if (product.material) customFields['material'] = product.material
        // Note: subcategory is now a real category, no need to store in customFields
        
        // Convert and add product options
        if (product.options && product.options.length > 0) {
          const optionGroups = convertOptionsToProductOptionGroups(product.options)
          customFields['optionGroups'] = optionGroups
        }
        
        // Add dynamically imported custom fields
        if (product.customFields) {
          for (const [key, value] of Object.entries(product.customFields)) {
            if (value && value.trim()) {
              customFields[key] = value.trim()
            }
          }
        }
        
        // Build prices object - merge legacy prices with new tier-specific prices
        const allPrices: Record<string, number> = { ...(product.prices || {}) }
        if (product.price && !allPrices['default']) allPrices['default'] = product.price
        if (product.priceDistributor && !allPrices['distributor']) allPrices['distributor'] = product.priceDistributor
        if (product.priceWholesale && !allPrices['wholesale']) allPrices['wholesale'] = product.priceWholesale
        if (product.priceRmb && !allPrices['rmb']) allPrices['rmb'] = product.priceRmb
        if (product.rrp && !allPrices['rrp']) allPrices['rrp'] = product.rrp

        // Add unit and weight to customFields if provided
        if (product.unit) customFields['unit'] = product.unit
        if (product.weight) customFields['weight'] = product.weight

        if (product.action === 'create') {
          // Determine prices - use the first available price as fallback
          const primaryPrice = product.priceBase || product.price || product.priceDistributor || product.priceWholesale || 0
          const distributorPrice = product.priceDistributor ?? allPrices['distributor'] ?? product.price ?? primaryPrice
          const directPrice = product.priceWholesale ?? allPrices['wholesale'] ?? product.price ?? primaryPrice
          
          // Create new product
          await prisma.product.create({
            data: {
              ref: product.ref,
              nameEn: product.nameEn,
              nameCn: product.nameCn || null,
              description: product.description || null,
              // Legacy price fields
              priceDistributor: distributorPrice,
              priceDirect: directPrice,
              priceRmb: product.priceRmb ?? null,
              rrp: product.rrp ?? null,
              // New price system
              priceBase: product.priceBase ?? primaryPrice,
              prices: Object.keys(allPrices).length > 0 ? allPrices : undefined,
              // Use subcategory > category > product.categoryId > globalCategoryId
              categoryId: finalCategoryId || product.categoryId || globalCategoryId || null,
              companyId: session.companyId,
              isActive: true,
              customFields: Object.keys(customFields).length > 0 ? customFields as Parameters<typeof prisma.product.create>[0]['data']['customFields'] : undefined,
            }
          })
          created++
        } else if (product.action === 'update' && product.existingMatch?.productId) {
          // Update existing product
          const updateData: Record<string, unknown> = {
            nameEn: product.nameEn,
          }
          
          if (product.nameCn) updateData.nameCn = product.nameCn
          if (product.description) updateData.description = product.description
          
          // Legacy price fields
          if (product.priceDistributor) updateData.priceDistributor = product.priceDistributor
          if (product.priceWholesale) updateData.priceDirect = product.priceWholesale
          if (product.price && !product.priceDistributor) updateData.priceDistributor = product.price
          if (product.price && !product.priceWholesale) updateData.priceDirect = product.price
          
          // New price system
          if (product.priceBase) updateData.priceBase = product.priceBase
          if (Object.keys(allPrices).length > 0) updateData.prices = allPrices
          
          if (product.unit) updateData.unit = product.unit
          if (product.weight) updateData.weight = product.weight
          // Update category with subcategory support
          if (finalCategoryId) {
            updateData.categoryId = finalCategoryId
          } else if (product.category && categoryMap.has(product.category)) {
            updateData.categoryId = categoryMap.get(product.category)
          }
          if (Object.keys(customFields).length > 0) {
            updateData.customFields = customFields as Parameters<typeof prisma.product.update>[0]['data']['customFields']
          }
          
          await prisma.product.update({
            where: { id: product.existingMatch.productId },
            data: updateData as Parameters<typeof prisma.product.update>[0]['data']
          })
          updated++
        }
      } catch (err) {
        errors.push(`Row ${product.rowIndex + 1} (${product.ref}): ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      errors
    })

  } catch (error) {
    console.error('Import products error:', error)
    return NextResponse.json(
      { error: 'Failed to import products' },
      { status: 500 }
    )
  }
}
