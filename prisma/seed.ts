import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create test company
  const company = await prisma.company.upsert({
    where: { id: 'test-company' },
    update: {},
    create: {
      id: 'test-company',
      name: 'Swift Boats',
      slug: 'swiftboats',
      currency: 'EUR',
    },
  })

  console.log('✓ Company created:', company.name)

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      name: 'Admin',
      role: 'ADMIN',
      companyId: company.id,
    },
  })

  console.log('✓ Admin user created:', admin.email)

  // Create a category
  const category = await prisma.category.upsert({
    where: { id: 'cat-deck-hardware' },
    update: {},
    create: {
      id: 'cat-deck-hardware',
      nameEn: 'Deck Hardware',
      nameCn: '甲板五金',
      companyId: company.id,
    },
  })

  console.log('✓ Category created:', category.nameEn)

  // Create test products
  const products = [
    { 
      ref: 'SW-001', 
      nameEn: 'Bow Rail Fitting', 
      nameCn: '船头栏杆配件', 
      priceRmb: 125, 
      priceDistributor: 45 
    },
    { 
      ref: 'SW-002', 
      nameEn: 'Stanchion Base', 
      nameCn: '支柱底座', 
      priceRmb: 85, 
      priceDistributor: 30 
    },
    { 
      ref: 'SW-003', 
      nameEn: 'Cleat 6 inch', 
      nameCn: '6英寸系缆桩', 
      priceRmb: 45, 
      priceDistributor: 15 
    },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { 
        companyId_ref: { 
          companyId: company.id, 
          ref: p.ref 
        } 
      },
      update: {},
      create: {
        ref: p.ref,
        nameEn: p.nameEn,
        nameCn: p.nameCn,
        priceRmb: p.priceRmb,
        priceDistributor: p.priceDistributor,
        companyId: company.id,
        categoryId: category.id,
        isActive: true,
      },
    })
    console.log('✓ Product created:', p.ref, '-', p.nameEn)
  }

  console.log('')
  console.log('════════════════════════════════════════')
  console.log('✅ Seed completed!')
  console.log('')
  console.log('You can now login with:')
  console.log('📧 Email: admin@test.com')
  console.log('════════════════════════════════════════')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })