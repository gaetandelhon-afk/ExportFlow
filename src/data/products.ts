import { Product } from '@/contexts/DistributorContext'

// Example product options structure for testing
const exampleOptionsWithPhotos = {
  optionGroups: [
    {
      id: 'grp_material_1',
      name: 'Material',
      description: 'Choose the material for your product',
      required: true,
      sortOrder: 0,
      options: [
        {
          id: 'opt_aluminum',
          name: 'Aluminum',
          description: 'Lightweight aluminum construction',
          images: [{ id: 'img_1', url: '/images/options/aluminum.jpg', sortOrder: 0 }],
          priceModifier: 0,
          sortOrder: 0,
          isDefault: true,
        },
        {
          id: 'opt_carbon',
          name: 'Carbon Fiber',
          description: 'Premium carbon fiber - ultra lightweight and durable',
          images: [{ id: 'img_2', url: '/images/options/carbon.jpg', sortOrder: 0 }],
          priceModifier: 150,
          sortOrder: 1,
        },
        {
          id: 'opt_titanium',
          name: 'Titanium',
          description: 'Marine-grade titanium - corrosion resistant',
          images: [{ id: 'img_3', url: '/images/options/titanium.jpg', sortOrder: 0 }],
          priceModifier: 250,
          sortOrder: 2,
        },
      ],
    },
    {
      id: 'grp_color_1',
      name: 'Color',
      description: 'Select your preferred color',
      required: false,
      sortOrder: 1,
      options: [
        {
          id: 'opt_silver',
          name: 'Silver',
          description: 'Classic silver finish',
          images: [],
          priceModifier: 0,
          sortOrder: 0,
          isDefault: true,
        },
        {
          id: 'opt_black',
          name: 'Black',
          description: 'Matte black finish',
          images: [],
          priceModifier: 25,
          sortOrder: 1,
        },
      ],
    },
  ],
}

export const mockProducts: Product[] = [
  {
    id: 'prod-001',
    ref: 'SW-001',
    nameEn: 'Bow Rail Fitting - Stainless Steel 316',
    nameCn: '船头栏杆配件 - 316不锈钢',
    descriptionEn: 'Heavy-duty bow rail fitting made from marine-grade 316 stainless steel. Perfect for sailboats and motorboats. Includes mounting hardware.',
    prices: {
      RMB: 350,
      EUR: 45,
      USD: 49,
    },
    category: 'Hardware',
    stock: 150,
    moq: 5,
    material: 'Stainless Steel 316',
    hsCode: '7326.90',
    weight: 0.45,
    // This product has options
    customFields: exampleOptionsWithPhotos,
  },
  {
    id: 'prod-002',
    ref: 'SW-002',
    nameEn: 'Stanchion Base - Round',
    nameCn: '支柱底座 - 圆形',
    descriptionEn: 'Round stanchion base for 25mm tubes. Marine-grade stainless steel construction with pre-drilled mounting holes.',
    prices: {
      RMB: 250,
      EUR: 32,
      USD: 35,
    },
    category: 'Hardware',
    stock: 200,
    moq: 10,
    material: 'Stainless Steel 316',
    hsCode: '7326.90',
    weight: 0.32,
  },
  {
    id: 'prod-003',
    ref: 'SW-003',
    nameEn: 'Cleat 6 inch - Chrome Plated',
    nameCn: '系缆桩 6英寸 - 镀铬',
    descriptionEn: 'Classic 6-inch cleat with chrome plating over brass. Traditional styling with modern durability.',
    prices: {
      RMB: 220,
      EUR: 28,
      USD: 31,
    },
    category: 'Deck',
    stock: 85,
    moq: 5,
    material: 'Chrome Plated Brass',
    hsCode: '7419.99',
    weight: 0.38,
  },
  {
    id: 'prod-004',
    ref: 'SW-004',
    nameEn: 'Deck Hinge - Flush Mount',
    nameCn: '甲板铰链 - 嵌入式',
    descriptionEn: 'Flush mount deck hinge for hatches and doors. Low profile design with 180° opening angle.',
    prices: {
      RMB: 195,
      EUR: 25,
      USD: 27,
    },
    category: 'Deck',
    stock: 120,
    moq: 10,
    material: 'Stainless Steel 304',
    hsCode: '8302.10',
    weight: 0.15,
  },
  {
    id: 'prod-005',
    ref: 'SW-005',
    nameEn: 'Anchor Roller - Self-Launching',
    nameCn: '锚辊 - 自动释放',
    descriptionEn: 'Self-launching anchor roller with built-in retainer. Fits anchors up to 15kg. Heavy-duty construction.',
    prices: {
      RMB: 520,
      EUR: 67,
      USD: 73,
    },
    category: 'Anchor',
    stock: 45,
    moq: 1,
    material: 'Stainless Steel 316',
    hsCode: '7326.90',
    weight: 1.2,
  },
  {
    id: 'prod-006',
    ref: 'SW-006',
    nameEn: 'Rope Clutch - Triple',
    nameCn: '绳索夹 - 三联',
    descriptionEn: 'Triple rope clutch for lines up to 12mm. Cam action with easy release. Deck or bulkhead mount.',
    prices: {
      RMB: 690,
      EUR: 89,
      USD: 97,
    },
    category: 'Rigging',
    stock: 30,
    moq: 1,
    material: 'Aluminum/Stainless Steel',
    hsCode: '7616.99',
    weight: 0.85,
  },
  {
    id: 'prod-007',
    ref: 'SW-007',
    nameEn: 'Winch Handle - Locking 10"',
    nameCn: '绞车手柄 - 锁定 10英寸',
    descriptionEn: '10-inch locking winch handle with ergonomic grip. Single speed with floating head design.',
    prices: {
      RMB: 430,
      EUR: 55,
      USD: 60,
    },
    category: 'Rigging',
    stock: 60,
    moq: 1,
    material: 'Aluminum',
    hsCode: '7616.99',
    weight: 0.55,
  },
  {
    id: 'prod-008',
    ref: 'SW-008',
    nameEn: 'Shackle Set - Assorted Sizes',
    nameCn: '卸扣套装 - 各种尺寸',
    descriptionEn: 'Set of 10 shackles in assorted sizes (5mm to 12mm). Stainless steel with screw pin closure.',
    prices: {
      RMB: 140,
      EUR: 18,
      USD: 20,
    },
    category: 'Hardware',
    stock: 250,
    moq: 5,
    material: 'Stainless Steel 316',
    hsCode: '7315.89',
    weight: 0.28,
  },
  {
    id: 'prod-009',
    ref: 'SW-009',
    nameEn: 'Navigation Light - LED Bow',
    nameCn: '航行灯 - LED船头灯',
    descriptionEn: 'LED bow navigation light with bi-color red/green. USCG approved. Low power consumption.',
    prices: {
      RMB: 580,
      EUR: 75,
      USD: 82,
    },
    category: 'Electronics',
    stock: 40,
    moq: 1,
    material: 'ABS/Stainless Steel',
    hsCode: '8531.80',
    weight: 0.25,
  },
  {
    id: 'prod-010',
    ref: 'SW-010',
    nameEn: 'Bilge Pump - 1100 GPH',
    nameCn: '舱底泵 - 1100加仑/小时',
    descriptionEn: 'Submersible bilge pump with 1100 GPH capacity. 12V DC operation with automatic float switch.',
    prices: {
      RMB: 330,
      EUR: 42,
      USD: 46,
    },
    category: 'Electronics',
    stock: 55,
    moq: 1,
    material: 'ABS Plastic',
    hsCode: '8413.70',
    weight: 0.65,
  },
  {
    id: 'prod-011',
    ref: 'SW-011',
    nameEn: 'Fender - Cylindrical 6x24"',
    nameCn: '护舷 - 圆柱形 6x24英寸',
    descriptionEn: 'Heavy-duty cylindrical fender. UV-resistant vinyl with reinforced ends. Includes inflation valve.',
    prices: {
      RMB: 270,
      EUR: 35,
      USD: 38,
    },
    category: 'Dock',
    stock: 100,
    moq: 4,
    material: 'PVC Vinyl',
    hsCode: '3926.90',
    weight: 0.9,
  },
  {
    id: 'prod-012',
    ref: 'SW-012',
    nameEn: 'Dock Line - 3/8" x 15ft',
    nameCn: '系泊缆 - 3/8英寸 x 15英尺',
    descriptionEn: 'Premium nylon dock line with pre-spliced eye. Double-braided for strength and flexibility.',
    prices: {
      RMB: 170,
      EUR: 22,
      USD: 24,
    },
    category: 'Dock',
    stock: 180,
    moq: 4,
    material: 'Nylon',
    hsCode: '5607.50',
    weight: 0.45,
  },
]

export const categories = ['All', 'Hardware', 'Deck', 'Anchor', 'Rigging', 'Electronics', 'Dock']

export function getProductById(id: string): Product | undefined {
  return mockProducts.find(p => p.id === id)
}

export function getProductsByCategory(category: string): Product[] {
  if (category === 'All') return mockProducts
  return mockProducts.filter(p => p.category === category)
}

export function searchProducts(query: string): Product[] {
  const lowerQuery = query.toLowerCase()
  return mockProducts.filter(p =>
    p.nameEn.toLowerCase().includes(lowerQuery) ||
    p.ref.toLowerCase().includes(lowerQuery) ||
    p.category.toLowerCase().includes(lowerQuery) ||
    (p.material && p.material.toLowerCase().includes(lowerQuery))
  )
}