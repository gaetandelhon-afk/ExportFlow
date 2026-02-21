# ExportFlow - Preview Mode (Voir comme client)

## PROMPT CURSOR - COPIER EN ENTIER

```
Implémente une fonctionnalité "Voir comme client" pour que l'admin puisse prévisualiser
le portail exactement comme le voit un client spécifique.

## ============================================
## 1. CONCEPT
## ============================================

L'admin peut:
1. Cliquer sur "👁️ Voir comme client" dans la sidebar
2. Choisir quel client simuler (pour voir ses prix spécifiques)
3. Naviguer dans le portail client en mode preview
4. Voir une bannière permanente "Mode prévisualisation"
5. Revenir au mode admin en un clic

Ceci permet de:
- Vérifier que les prix sont corrects pour chaque price tier
- Tester l'expérience utilisateur client
- Débugger des problèmes signalés par un client
- Former les équipes commerciales

## ============================================
## 2. STRUCTURE DES ROUTES
## ============================================

```
/dashboard                    → Admin dashboard
/dashboard/preview            → Sélection du client à simuler
/dashboard/preview/shop       → Preview du catalogue client
/dashboard/preview/cart       → Preview du panier
/dashboard/preview/orders     → Preview historique commandes
/dashboard/preview/account    → Preview compte client
```

Alternative avec query param:
```
/shop?preview=true&customerId=xxx
/cart?preview=true&customerId=xxx
```

Je recommande la première approche (routes séparées) pour plus de clarté.

## ============================================
## 3. MODÈLE DE DONNÉES
## ============================================

Ajoute un modèle pour tracker les sessions preview (optionnel mais utile pour audit):

```prisma
model PreviewSession {
  id          String   @id @default(cuid())
  companyId   String
  
  // Qui fait le preview
  adminUserId String
  adminUser   User     @relation("PreviewAdmin", fields: [adminUserId], references: [id])
  
  // Quel client est simulé
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  
  // Timing
  startedAt   DateTime @default(now())
  endedAt     DateTime?
  
  // Actions effectuées (pour debug)
  actions     Json?    // [{ action: 'view_product', productId: '...', timestamp: '...' }]
  
  @@index([companyId])
  @@index([adminUserId])
}
```

## ============================================
## 4. CONTEXTE PREVIEW
## ============================================

Crée `src/contexts/PreviewContext.tsx`:

```tsx
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface PreviewCustomer {
  id: string
  name: string
  email: string
  priceTierId: string | null
  priceTierName: string | null
}

interface PreviewContextType {
  isPreviewMode: boolean
  previewCustomer: PreviewCustomer | null
  startPreview: (customer: PreviewCustomer) => void
  endPreview: () => void
  isLoading: boolean
}

const PreviewContext = createContext<PreviewContextType | undefined>(undefined)

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [previewCustomer, setPreviewCustomer] = useState<PreviewCustomer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  
  // Charger l'état depuis sessionStorage au montage
  useEffect(() => {
    const stored = sessionStorage.getItem('previewMode')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setPreviewCustomer(data.customer)
        setIsPreviewMode(true)
      } catch {}
    }
    setIsLoading(false)
  }, [])
  
  // Détecter si on est dans une route preview
  useEffect(() => {
    const inPreviewRoute = pathname?.startsWith('/dashboard/preview')
    if (inPreviewRoute && !isPreviewMode && !isLoading) {
      // Rediriger vers sélection client si pas de customer sélectionné
      if (!previewCustomer && pathname !== '/dashboard/preview') {
        router.push('/dashboard/preview')
      }
    }
  }, [pathname, isPreviewMode, previewCustomer, isLoading, router])
  
  const startPreview = async (customer: PreviewCustomer) => {
    setPreviewCustomer(customer)
    setIsPreviewMode(true)
    
    // Sauvegarder en session
    sessionStorage.setItem('previewMode', JSON.stringify({ customer }))
    
    // Logger le début de session (optionnel)
    await fetch('/api/preview/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: customer.id })
    })
    
    // Rediriger vers le shop preview
    router.push('/dashboard/preview/shop')
  }
  
  const endPreview = async () => {
    // Logger la fin de session
    await fetch('/api/preview/end', { method: 'POST' })
    
    setPreviewCustomer(null)
    setIsPreviewMode(false)
    sessionStorage.removeItem('previewMode')
    
    // Retour au dashboard admin
    router.push('/dashboard')
  }
  
  return (
    <PreviewContext.Provider value={{
      isPreviewMode,
      previewCustomer,
      startPreview,
      endPreview,
      isLoading
    }}>
      {children}
    </PreviewContext.Provider>
  )
}

export function usePreview() {
  const context = useContext(PreviewContext)
  if (!context) {
    throw new Error('usePreview must be used within PreviewProvider')
  }
  return context
}
```

## ============================================
## 5. BANNIÈRE PREVIEW
## ============================================

Crée `src/components/preview/PreviewBanner.tsx`:

```tsx
'use client'

import { usePreview } from '@/contexts/PreviewContext'
import { Eye, X, User, Tag } from 'lucide-react'

export function PreviewBanner() {
  const { isPreviewMode, previewCustomer, endPreview } = usePreview()
  
  if (!isPreviewMode || !previewCustomer) return null
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-medium">
            <Eye className="w-4 h-4" />
            Mode prévisualisation
          </div>
          
          <div className="h-4 w-px bg-amber-600" />
          
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4" />
            <span className="font-medium">{previewCustomer.name}</span>
            <span className="text-amber-700">({previewCustomer.email})</span>
          </div>
          
          {previewCustomer.priceTierName && (
            <>
              <div className="h-4 w-px bg-amber-600" />
              <div className="flex items-center gap-1 text-sm">
                <Tag className="w-4 h-4" />
                <span>Prix: {previewCustomer.priceTierName}</span>
              </div>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-amber-700">
            Vous voyez ce que voit ce client
          </span>
          <button
            onClick={endPreview}
            className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded text-sm font-medium transition"
          >
            <X className="w-4 h-4" />
            Quitter le preview
          </button>
        </div>
      </div>
    </div>
  )
}
```

## ============================================
## 6. SIDEBAR ADMIN - BOUTON PREVIEW
## ============================================

Modifie ta sidebar admin pour ajouter le bouton:

```tsx
// Dans components/dashboard/Sidebar.tsx ou similaire

import { usePreview } from '@/contexts/PreviewContext'
import { Eye } from 'lucide-react'
import Link from 'next/link'

export function Sidebar() {
  const { isPreviewMode } = usePreview()
  
  return (
    <aside className="w-64 bg-white border-r h-screen flex flex-col">
      {/* ... autres liens ... */}
      
      {/* Section preview - avant les Settings */}
      <div className="px-3 py-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Outils
        </div>
        
        <Link
          href="/dashboard/preview"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
            isPreviewMode
              ? 'bg-amber-100 text-amber-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Eye className="w-5 h-5" />
          <span>Voir comme client</span>
          {isPreviewMode && (
            <span className="ml-auto text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded">
              Actif
            </span>
          )}
        </Link>
      </div>
      
      {/* ... Settings, etc ... */}
    </aside>
  )
}
```

## ============================================
## 7. PAGE SÉLECTION CLIENT
## ============================================

Crée `src/app/(tenant)/(dashboard)/dashboard/preview/page.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { usePreview } from '@/contexts/PreviewContext'
import { Search, User, Tag, ArrowRight, Eye } from 'lucide-react'

interface Customer {
  id: string
  name: string
  email: string
  country: string | null
  priceTier: {
    id: string
    name: string
  } | null
  _count: {
    orders: number
  }
}

export default function PreviewSelectPage() {
  const { startPreview, isPreviewMode, previewCustomer } = usePreview()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedTier, setSelectedTier] = useState<string>('all')
  const [priceTiers, setPriceTiers] = useState<{ id: string; name: string }[]>([])
  
  useEffect(() => {
    loadCustomers()
    loadPriceTiers()
  }, [])
  
  async function loadCustomers() {
    setLoading(true)
    try {
      const res = await fetch('/api/customers?limit=100')
      const data = await res.json()
      setCustomers(data.customers || data)
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setLoading(false)
    }
  }
  
  async function loadPriceTiers() {
    try {
      const res = await fetch('/api/price-tiers')
      const data = await res.json()
      setPriceTiers(data)
    } catch (error) {
      console.error('Error loading price tiers:', error)
    }
  }
  
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    const matchesTier = selectedTier === 'all' || c.priceTier?.id === selectedTier
    return matchesSearch && matchesTier
  })
  
  function handleSelect(customer: Customer) {
    startPreview({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      priceTierId: customer.priceTier?.id || null,
      priceTierName: customer.priceTier?.name || null
    })
  }
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Eye className="w-6 h-6 text-amber-600" />
          </div>
          <h1 className="text-2xl font-semibold">Voir comme client</h1>
        </div>
        <p className="text-gray-500">
          Sélectionnez un client pour voir le portail exactement comme lui.
          Vous verrez ses prix, son catalogue, et son expérience utilisateur.
        </p>
      </div>
      
      {/* Info box si déjà en preview */}
      {isPreviewMode && previewCustomer && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-amber-800">
                Preview actif: {previewCustomer.name}
              </div>
              <div className="text-sm text-amber-600">
                Vous pouvez sélectionner un autre client ou continuer avec celui-ci
              </div>
            </div>
            <a
              href="/dashboard/preview/shop"
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
            >
              Continuer →
            </a>
          </div>
        </div>
      )}
      
      {/* Filtres */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        
        <select
          value={selectedTier}
          onChange={(e) => setSelectedTier(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-white"
        >
          <option value="all">Tous les niveaux de prix</option>
          {priceTiers.map(tier => (
            <option key={tier.id} value={tier.id}>{tier.name}</option>
          ))}
        </select>
      </div>
      
      {/* Liste clients */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Aucun client trouvé
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map(customer => (
            <button
              key={customer.id}
              onClick={() => handleSelect(customer)}
              className="w-full flex items-center gap-4 p-4 bg-white border rounded-lg hover:border-amber-300 hover:bg-amber-50 transition group text-left"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{customer.name}</div>
                <div className="text-sm text-gray-500 truncate">{customer.email}</div>
              </div>
              
              <div className="flex items-center gap-4">
                {customer.priceTier && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                    <Tag className="w-3 h-3" />
                    {customer.priceTier.name}
                  </div>
                )}
                
                {customer.country && (
                  <div className="text-sm text-gray-400">
                    {customer.country}
                  </div>
                )}
                
                <div className="text-sm text-gray-400">
                  {customer._count.orders} commandes
                </div>
                
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-amber-500 transition" />
              </div>
            </button>
          ))}
        </div>
      )}
      
      {/* Info */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">💡 À propos du mode prévisualisation</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Vous verrez les prix selon le niveau de prix du client</li>
          <li>• Le catalogue sera filtré comme pour ce client</li>
          <li>• Les commandes passées en preview NE sont PAS enregistrées</li>
          <li>• Une bannière jaune indique que vous êtes en mode preview</li>
        </ul>
      </div>
    </div>
  )
}
```

## ============================================
## 8. LAYOUT PREVIEW
## ============================================

Crée `src/app/(tenant)/(dashboard)/dashboard/preview/layout.tsx`:

```tsx
import { PreviewBanner } from '@/components/preview/PreviewBanner'
import { PreviewSidebar } from '@/components/preview/PreviewSidebar'

export default function PreviewLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bannière preview en haut */}
      <PreviewBanner />
      
      {/* Contenu avec padding pour la bannière */}
      <div className="pt-12">
        <div className="flex">
          {/* Sidebar client simulée */}
          <PreviewSidebar />
          
          {/* Contenu principal */}
          <main className="flex-1 min-h-screen">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
```

## ============================================
## 9. SIDEBAR PREVIEW (CÔTÉ CLIENT)
## ============================================

Crée `src/components/preview/PreviewSidebar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePreview } from '@/contexts/PreviewContext'
import { 
  ShoppingBag, ShoppingCart, Package, 
  User, FileText, ArrowLeft 
} from 'lucide-react'

const NAV_ITEMS = [
  { 
    href: '/dashboard/preview/shop', 
    label: 'Catalogue', 
    icon: ShoppingBag 
  },
  { 
    href: '/dashboard/preview/cart', 
    label: 'Panier', 
    icon: ShoppingCart 
  },
  { 
    href: '/dashboard/preview/orders', 
    label: 'Mes commandes', 
    icon: Package 
  },
  { 
    href: '/dashboard/preview/invoices', 
    label: 'Factures', 
    icon: FileText 
  },
  { 
    href: '/dashboard/preview/account', 
    label: 'Mon compte', 
    icon: User 
  },
]

export function PreviewSidebar() {
  const pathname = usePathname()
  const { endPreview, previewCustomer } = usePreview()
  
  return (
    <aside className="w-64 bg-white border-r min-h-screen p-4">
      {/* Logo / Branding preview */}
      <div className="mb-6 pb-4 border-b">
        <div className="text-lg font-semibold">Votre Boutique</div>
        <div className="text-xs text-gray-400">
          (Preview du portail client)
        </div>
      </div>
      
      {/* Navigation client */}
      <nav className="space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      
      {/* Info client simulé */}
      {previewCustomer && (
        <div className="mt-8 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Connecté en tant que:</div>
          <div className="font-medium text-sm">{previewCustomer.name}</div>
          <div className="text-xs text-gray-500">{previewCustomer.email}</div>
          {previewCustomer.priceTierName && (
            <div className="mt-2 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded inline-block">
              Prix: {previewCustomer.priceTierName}
            </div>
          )}
        </div>
      )}
      
      {/* Retour admin */}
      <div className="mt-8 pt-4 border-t">
        <button
          onClick={endPreview}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au dashboard
        </button>
      </div>
    </aside>
  )
}
```

## ============================================
## 10. PAGE SHOP PREVIEW
## ============================================

Crée `src/app/(tenant)/(dashboard)/dashboard/preview/shop/page.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { usePreview } from '@/contexts/PreviewContext'
import { ShoppingCart, Search, Grid, List } from 'lucide-react'
import Image from 'next/image'

interface Product {
  id: string
  name: string
  ref: string
  description: string | null
  imageUrl: string | null
  price: number  // Prix pour ce client spécifique
  basePrice: number
  currency: string
  stock: number | null
  category: { name: string } | null
}

export default function PreviewShopPage() {
  const { previewCustomer } = usePreview()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [cart, setCart] = useState<Map<string, number>>(new Map())
  
  useEffect(() => {
    if (previewCustomer) {
      loadProducts()
    }
  }, [previewCustomer])
  
  async function loadProducts() {
    setLoading(true)
    try {
      // API qui retourne les produits avec les prix du client spécifique
      const res = await fetch(
        `/api/preview/products?customerId=${previewCustomer?.id}`
      )
      const data = await res.json()
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.ref.toLowerCase().includes(search.toLowerCase())
  )
  
  function addToCart(productId: string) {
    const newCart = new Map(cart)
    const current = newCart.get(productId) || 0
    newCart.set(productId, current + 1)
    setCart(newCart)
  }
  
  const cartTotal = Array.from(cart.entries()).reduce((sum, [productId, qty]) => {
    const product = products.find(p => p.id === productId)
    return sum + (product?.price || 0) * qty
  }, 0)
  
  const cartCount = Array.from(cart.values()).reduce((sum, qty) => sum + qty, 0)
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Catalogue</h1>
          <p className="text-gray-500">
            {products.length} produits disponibles
          </p>
        </div>
        
        {/* Mini panier */}
        <a
          href="/dashboard/preview/cart"
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>{cartCount} articles</span>
          <span className="font-medium">
            {cartTotal.toLocaleString('fr-FR', { 
              style: 'currency', 
              currency: 'EUR' 
            })}
          </span>
        </a>
      </div>
      
      {/* Filtres */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        
        <div className="flex border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Prix info */}
      {previewCustomer?.priceTierName && (
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          💰 Les prix affichés correspondent au niveau "{previewCustomer.priceTierName}"
        </div>
      )}
      
      {/* Grille produits */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-64 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition"
            >
              {/* Image */}
              <div className="aspect-square bg-gray-100 relative">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-300">
                    Pas d'image
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="p-4">
                <div className="text-xs text-gray-400 mb-1">{product.ref}</div>
                <h3 className="font-medium mb-2 line-clamp-2">{product.name}</h3>
                
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-lg font-bold text-blue-600">
                      {product.price.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: product.currency
                      })}
                    </div>
                    {product.price !== product.basePrice && (
                      <div className="text-xs text-gray-400 line-through">
                        {product.basePrice.toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: product.currency
                        })}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => addToCart(product.id)}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </div>
                
                {product.stock !== null && product.stock <= 5 && (
                  <div className="mt-2 text-xs text-orange-600">
                    ⚠️ Stock limité ({product.stock})
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Vue liste
        <div className="space-y-2">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className="flex items-center gap-4 p-4 bg-white border rounded-lg hover:shadow-sm transition"
            >
              <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                {product.imageUrl && (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    width={64}
                    height={64}
                    className="object-cover rounded"
                  />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-400">{product.ref}</div>
                <h3 className="font-medium">{product.name}</h3>
                {product.category && (
                  <div className="text-sm text-gray-500">{product.category.name}</div>
                )}
              </div>
              
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">
                  {product.price.toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: product.currency
                  })}
                </div>
              </div>
              
              <button
                onClick={() => addToCart(product.id)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Ajouter
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

## ============================================
## 11. API ROUTES PREVIEW
## ============================================

### API pour les produits avec prix client

`src/app/api/preview/products/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Seuls les admins peuvent faire du preview
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    
    if (!customerId) {
      return NextResponse.json({ error: 'customerId required' }, { status: 400 })
    }
    
    // Récupérer le client et son price tier
    const customer = await prisma.customer.findFirst({
      where: { 
        id: customerId, 
        companyId: user.companyId 
      },
      select: { priceTierId: true }
    })
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    
    // Récupérer les produits avec les prix
    const products = await prisma.product.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
        deletedAt: null
      },
      include: {
        category: { select: { name: true } },
        prices: {
          where: customer.priceTierId 
            ? { priceTierId: customer.priceTierId }
            : { priceTierId: null }
        }
      },
      orderBy: { name: 'asc' }
    })
    
    // Formater avec le bon prix
    const formatted = products.map(p => ({
      id: p.id,
      name: p.name,
      ref: p.ref,
      description: p.description,
      imageUrl: p.imageUrl,
      basePrice: Number(p.basePrice),
      price: p.prices[0]?.price 
        ? Number(p.prices[0].price) 
        : Number(p.basePrice),
      currency: p.currency,
      stock: p.stock,
      category: p.category
    }))
    
    return NextResponse.json(formatted)
  } catch (error: any) {
    console.error('[Preview Products Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### API pour démarrer/terminer session preview

`src/app/api/preview/start/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createAuditLog } from '@/lib/auditLog'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { customerId } = await request.json()
    
    // Créer la session preview (optionnel)
    const session = await prisma.previewSession.create({
      data: {
        companyId: user.companyId,
        adminUserId: user.id,
        customerId,
        actions: []
      }
    })
    
    // Audit log
    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: 'PREVIEW_START',
      entityType: 'Customer',
      entityId: customerId,
      metadata: { sessionId: session.id }
    })
    
    return NextResponse.json({ sessionId: session.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

`src/app/api/preview/end/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createAuditLog } from '@/lib/auditLog'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fermer la dernière session active
    const session = await prisma.previewSession.findFirst({
      where: {
        adminUserId: user.id,
        endedAt: null
      },
      orderBy: { startedAt: 'desc' }
    })
    
    if (session) {
      await prisma.previewSession.update({
        where: { id: session.id },
        data: { endedAt: new Date() }
      })
      
      await createAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: 'PREVIEW_END',
        entityType: 'Customer',
        entityId: session.customerId,
        metadata: { sessionId: session.id }
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

## ============================================
## 12. INTÉGRATION DANS LE LAYOUT PRINCIPAL
## ============================================

Modifie ton layout principal pour inclure le PreviewProvider:

```tsx
// app/(tenant)/(dashboard)/layout.tsx

import { PreviewProvider } from '@/contexts/PreviewContext'
import { PreviewBanner } from '@/components/preview/PreviewBanner'

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <PreviewProvider>
      {/* La bannière s'affiche automatiquement si en preview */}
      <PreviewBanner />
      
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </PreviewProvider>
  )
}
```

## ============================================
## 13. RÉSUMÉ DES FONCTIONNALITÉS
## ============================================

### Pour l'admin
- [x] Bouton "Voir comme client" dans la sidebar
- [x] Sélection du client à simuler
- [x] Filtrage par price tier
- [x] Recherche de clients

### En mode preview
- [x] Bannière jaune permanente
- [x] Nom du client affiché
- [x] Price tier visible
- [x] Navigation client complète
- [x] Prix corrects selon le tier
- [x] Bouton "Quitter le preview"

### Sécurité
- [x] Seuls ADMIN/MANAGER peuvent faire preview
- [x] Sessions preview loggées (audit)
- [x] Isolation par companyId
- [x] Pas de vraies commandes en preview

### Pages preview
- [x] /dashboard/preview - Sélection client
- [x] /dashboard/preview/shop - Catalogue
- [x] /dashboard/preview/cart - Panier
- [x] /dashboard/preview/orders - Historique
- [x] /dashboard/preview/account - Compte
```
