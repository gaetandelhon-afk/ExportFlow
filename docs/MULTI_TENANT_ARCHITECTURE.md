# ExportFlow - Architecture Multi-Tenant

## Vue d'Ensemble

ExportFlow utilise une architecture multi-tenant avec sous-domaines automatiques, similaire à Shopify ou Notion.

```
┌─────────────────────────────────────────────────────────────┐
│                      CLOUDFLARE DNS                         │
│                                                             │
│  exportflow.io          → Site marketing                    │
│  app.exportflow.io      → App fallback                      │
│  *.exportflow.io        → Wildcard → Tous les tenants       │
│  orders.swiftboats.com  → CNAME → proxy.exportflow.io       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      MIDDLEWARE                             │
│                                                             │
│  1. Extrait le sous-domaine du hostname                     │
│  2. Vérifie si c'est un tenant (pas réservé)               │
│  3. Injecte x-tenant-slug dans les headers                 │
│  4. Continue vers l'app                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      APP NEXT.JS                            │
│                                                             │
│  TenantContext:                                             │
│  - Charge le tenant depuis /api/tenant                      │
│  - Applique le branding (CSS variables)                     │
│  - Met à jour favicon et title                              │
│  - Expose tenant à tous les composants                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Configuration DNS (Cloudflare)

### Records DNS

```
Type    Name                Content              Proxy    TTL
────────────────────────────────────────────────────────────────
A       exportflow.io       76.76.21.21          ✅       Auto
A       app                 76.76.21.21          ✅       Auto
A       *                   76.76.21.21          ✅       Auto
A       proxy               76.76.21.21          ✅       Auto
```

Le record wildcard `*` capture automatiquement:
- `swiftboats.exportflow.io`
- `nordicmarine.exportflow.io`
- `[n'importe-quoi].exportflow.io`

### Pour les domaines custom (Cloudflare for SaaS)

Quand un client veut `orders.swiftboats.com`:
1. Client ajoute: `CNAME orders → proxy.exportflow.io`
2. Cloudflare for SaaS provisionne automatiquement le SSL
3. Notre middleware détecte le domaine custom

---

## 2. Middleware Next.js

### Fichier: `src/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

// Sous-domaines réservés (ne sont pas des tenants)
const RESERVED_SUBDOMAINS = [
  'app',      // App fallback
  'www',      // Redirect vers apex
  'api',      // API publique
  'admin',    // Admin ExportFlow (superadmin)
  'docs',     // Documentation
  'help',     // Centre d'aide
  'status',   // Page status
  'blog',     // Blog
  'mail',     // Email
]

const MAIN_DOMAIN = process.env.MAIN_DOMAIN || 'exportflow.io'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const { pathname } = request.nextUrl
  
  // Extraire le sous-domaine ou domaine custom
  const tenantIdentifier = extractTenantIdentifier(hostname)
  
  // ─────────────────────────────────────────────
  // CAS 1: Site marketing principal
  // ─────────────────────────────────────────────
  if (!tenantIdentifier || tenantIdentifier === 'www') {
    // Redirect www vers apex
    if (tenantIdentifier === 'www') {
      return NextResponse.redirect(
        new URL(request.url.replace('www.', ''))
      )
    }
    // Laisser passer vers (marketing)
    return NextResponse.next()
  }
  
  // ─────────────────────────────────────────────
  // CAS 2: Sous-domaine réservé
  // ─────────────────────────────────────────────
  if (RESERVED_SUBDOMAINS.includes(tenantIdentifier)) {
    return NextResponse.next()
  }
  
  // ─────────────────────────────────────────────
  // CAS 3: C'est un tenant !
  // ─────────────────────────────────────────────
  const response = NextResponse.next()
  
  // Injecter le tenant dans les headers
  response.headers.set('x-tenant-slug', tenantIdentifier)
  
  // Rewrite vers le groupe de routes (tenant)
  // Les routes /catalog, /dashboard, etc. seront servies
  
  return response
}

function extractTenantIdentifier(hostname: string): string | null {
  // Enlever le port (localhost:3000)
  const host = hostname.split(':')[0]
  
  // ─────────────────────────────────────────────
  // Sous-domaine de exportflow.io
  // ─────────────────────────────────────────────
  if (host.endsWith(`.${MAIN_DOMAIN}`)) {
    const subdomain = host.replace(`.${MAIN_DOMAIN}`, '')
    return subdomain
  }
  
  // ─────────────────────────────────────────────
  // Domaine apex (exportflow.io)
  // ─────────────────────────────────────────────
  if (host === MAIN_DOMAIN) {
    return null  // Site marketing
  }
  
  // ─────────────────────────────────────────────
  // Domaine custom (orders.swiftboats.com)
  // ─────────────────────────────────────────────
  if (!host.includes(MAIN_DOMAIN)) {
    // On préfixe pour indiquer que c'est un domaine custom
    return `custom:${host}`
  }
  
  // ─────────────────────────────────────────────
  // Localhost (développement)
  // ─────────────────────────────────────────────
  if (host === 'localhost') {
    // En dev, on peut forcer un tenant via query param ou cookie
    return null
  }
  
  return null
}

export const config = {
  matcher: [
    // Matcher tout sauf les assets statiques
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
```

---

## 3. API Route: Résolution du Tenant

### Fichier: `src/app/api/tenant/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  // Récupérer le slug injecté par le middleware
  const slug = request.headers.get('x-tenant-slug')
  
  if (!slug) {
    return NextResponse.json(
      { error: 'No tenant identifier' },
      { status: 400 }
    )
  }
  
  try {
    let company
    
    // ─────────────────────────────────────────────
    // Domaine custom
    // ─────────────────────────────────────────────
    if (slug.startsWith('custom:')) {
      const customDomain = slug.replace('custom:', '')
      
      company = await prisma.company.findFirst({
        where: {
          customDomain,
          customDomainVerified: true,
          isActive: true,
        },
        include: { branding: true },
      })
      
      if (!company) {
        return NextResponse.json(
          { error: 'Domain not configured or not verified' },
          { status: 404 }
        )
      }
    }
    // ─────────────────────────────────────────────
    // Sous-domaine standard
    // ─────────────────────────────────────────────
    else {
      company = await prisma.company.findUnique({
        where: { slug },
        include: { branding: true },
      })
      
      if (!company) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        )
      }
      
      if (!company.isActive) {
        return NextResponse.json(
          { error: 'Company inactive' },
          { status: 403 }
        )
      }
    }
    
    // ─────────────────────────────────────────────
    // Formater la réponse
    // ─────────────────────────────────────────────
    return NextResponse.json({
      id: company.id,
      slug: company.slug,
      name: company.name,
      plan: company.plan,
      branding: company.branding ? {
        logoUrl: company.branding.logoUrl,
        logoSmallUrl: company.branding.logoSmallUrl,
        primaryColor: company.branding.primaryColor,
        primaryHoverColor: company.branding.primaryHoverColor,
        companyName: company.branding.companyName,
        tagline: company.branding.tagline,
        supportEmail: company.branding.supportEmail,
        supportPhone: company.branding.supportPhone,
        footerText: company.branding.footerText,
        showPoweredBy: company.branding.showPoweredBy,
      } : {
        primaryColor: '#0071e3',
        primaryHoverColor: '#0077ed',
        companyName: company.name,
        showPoweredBy: true,
      },
    })
  } catch (error) {
    console.error('Error loading tenant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## 4. TenantContext

### Fichier: `src/contexts/TenantContext.tsx`

```typescript
'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface TenantBranding {
  logoUrl?: string
  logoSmallUrl?: string
  primaryColor: string
  primaryHoverColor: string
  companyName: string
  tagline?: string
  supportEmail?: string
  supportPhone?: string
  footerText?: string
  showPoweredBy: boolean
}

interface Tenant {
  id: string
  slug: string
  name: string
  plan: string
  branding: TenantBranding
}

interface TenantContextType {
  tenant: Tenant | null
  loading: boolean
  error: string | null
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  loading: true,
  error: null,
})

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    async function loadTenant() {
      try {
        const res = await fetch('/api/tenant')
        
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to load tenant')
        }
        
        const data = await res.json()
        setTenant(data)
        
        // Appliquer le branding
        applyBranding(data.branding)
        
      } catch (err: any) {
        console.error('Error loading tenant:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    loadTenant()
  }, [])
  
  return (
    <TenantContext.Provider value={{ tenant, loading, error }}>
      {children}
    </TenantContext.Provider>
  )
}

// ─────────────────────────────────────────────
// Appliquer le branding
// ─────────────────────────────────────────────

function applyBranding(branding: TenantBranding) {
  if (typeof window === 'undefined') return
  
  const root = document.documentElement
  
  // Couleurs
  root.style.setProperty('--color-brand-primary', branding.primaryColor)
  root.style.setProperty('--color-brand-hover', branding.primaryHoverColor)
  
  // Favicon
  if (branding.logoSmallUrl) {
    const existingLink = document.querySelector("link[rel*='icon']")
    if (existingLink) {
      (existingLink as HTMLLinkElement).href = branding.logoSmallUrl
    } else {
      const link = document.createElement('link')
      link.rel = 'icon'
      link.href = branding.logoSmallUrl
      document.head.appendChild(link)
    }
  }
  
  // Title
  document.title = branding.tagline
    ? `${branding.companyName} - ${branding.tagline}`
    : `${branding.companyName} - Orders`
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider')
  }
  return context
}
```

---

## 5. Signup: Création Automatique du Tenant

### Fichier: `src/app/api/signup/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyName, email, name, password } = body
    
    // Validation
    if (!companyName || !email || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findFirst({
      where: { email },
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }
    
    // Générer un slug unique
    const slug = await generateUniqueSlug(companyName)
    
    // Créer la company avec branding par défaut et user admin
    const company = await prisma.company.create({
      data: {
        name: companyName,
        slug,
        plan: 'starter',
        branding: {
          create: {
            companyName,
            primaryColor: '#0071e3',
            primaryHoverColor: '#0077ed',
            showPoweredBy: true,
          },
        },
        users: {
          create: {
            email,
            name,
            role: 'ADMIN',
          },
        },
      },
      include: {
        branding: true,
        users: true,
      },
    })
    
    // TODO: Envoyer email de bienvenue avec lien magique
    // await sendWelcomeEmail(email, company)
    
    // Le sous-domaine est actif IMMÉDIATEMENT grâce au wildcard DNS !
    const portalUrl = `https://${slug}.exportflow.io`
    
    return NextResponse.json({
      success: true,
      message: 'Company created successfully',
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
      },
      portalUrl,
      // En production, on enverrait un email au lieu de retourner ça
      loginUrl: `${portalUrl}/login`,
    })
    
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────
// Génération de slug unique
// ─────────────────────────────────────────────

async function generateUniqueSlug(companyName: string): Promise<string> {
  // Normaliser: "Swift Boats International" → "swiftboatsinternational"
  let baseSlug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')  // Garder que alphanumériques
    .substring(0, 20)           // Max 20 caractères
  
  // Si vide après normalisation, utiliser un défaut
  if (!baseSlug) {
    baseSlug = 'company'
  }
  
  // Vérifier l'unicité
  let slug = baseSlug
  let attempt = 0
  
  while (true) {
    const existing = await prisma.company.findUnique({
      where: { slug },
    })
    
    if (!existing) {
      break
    }
    
    attempt++
    slug = `${baseSlug}${attempt}`
  }
  
  return slug
}
```

---

## 6. Layout Tenant

### Fichier: `src/app/(tenant)/layout.tsx`

```typescript
import { TenantProvider } from '@/contexts/TenantContext'

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TenantProvider>
      {children}
    </TenantProvider>
  )
}
```

---

## 7. Composants Utilitaires

### TenantLogo

```typescript
// src/components/TenantLogo.tsx
'use client'

import { useTenant } from '@/contexts/TenantContext'
import Image from 'next/image'

interface TenantLogoProps {
  className?: string
  size?: 'small' | 'medium' | 'large'
}

export function TenantLogo({ className, size = 'medium' }: TenantLogoProps) {
  const { tenant, loading } = useTenant()
  
  const sizes = {
    small: { width: 32, height: 32 },
    medium: { width: 120, height: 40 },
    large: { width: 180, height: 60 },
  }
  
  if (loading) {
    return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  }
  
  if (tenant?.branding?.logoUrl) {
    return (
      <Image
        src={tenant.branding.logoUrl}
        alt={tenant.branding.companyName}
        {...sizes[size]}
        className={className}
      />
    )
  }
  
  // Fallback: texte
  return (
    <span className={`font-semibold text-lg ${className}`}>
      {tenant?.branding?.companyName || 'ExportFlow'}
    </span>
  )
}
```

### PoweredByBadge

```typescript
// src/components/PoweredByBadge.tsx
'use client'

import { useTenant } from '@/contexts/TenantContext'

export function PoweredByBadge() {
  const { tenant } = useTenant()
  
  if (!tenant?.branding?.showPoweredBy) {
    return null
  }
  
  return (
    <a
      href="https://exportflow.io"
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
    >
      Powered by ExportFlow
    </a>
  )
}
```

---

## 8. Variables d'Environnement

### `.env.example`

```bash
# Database
DATABASE_URL="postgresql://..."

# Domain
MAIN_DOMAIN="exportflow.io"
NEXT_PUBLIC_MAIN_DOMAIN="exportflow.io"

# Cloudflare (for custom domains)
CLOUDFLARE_API_TOKEN="..."
CLOUDFLARE_ZONE_ID="..."

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://exportflow.io"

# Email
RESEND_API_KEY="..."
EMAIL_FROM="noreply@exportflow.io"
```

---

## 9. Flux Utilisateur Complet

```
┌─────────────────────────────────────────────────────────────┐
│  INSCRIPTION                                                │
│                                                             │
│  1. User va sur exportflow.io/signup                        │
│  2. Remplit: Company name, Email, Name                      │
│  3. POST /api/signup                                        │
│     → Génère slug: "Swift Boats" → "swiftboats"            │
│     → Crée Company + Branding + User                        │
│     → Retourne portalUrl: swiftboats.exportflow.io         │
│  4. User reçoit email avec lien magique                     │
│  5. User clique → arrive sur swiftboats.exportflow.io      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  PREMIÈRE CONNEXION                                         │
│                                                             │
│  1. Middleware détecte "swiftboats"                         │
│  2. Injecte x-tenant-slug: swiftboats                       │
│  3. TenantContext charge le tenant via /api/tenant          │
│  4. Branding appliqué (couleur par défaut)                  │
│  5. User arrive sur le dashboard                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  PERSONNALISATION                                           │
│                                                             │
│  1. User va dans Settings > Branding                        │
│  2. Upload son logo                                         │
│  3. Choisit sa couleur primaire                             │
│  4. Sauvegarde                                              │
│  5. Le branding s'applique immédiatement                    │
│  6. Ses distributeurs voient le branding                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  DOMAINE CUSTOM (Premium)                                   │
│                                                             │
│  1. User va dans Settings > Domain                          │
│  2. Entre: orders.swiftboats.com                            │
│  3. On affiche: "Ajoutez ce CNAME:"                         │
│     orders → proxy.exportflow.io                            │
│  4. User configure chez son registrar                       │
│  5. User clique "Vérifier"                                  │
│  6. On check le DNS, si OK → activé                         │
│  7. orders.swiftboats.com fonctionne !                      │
└─────────────────────────────────────────────────────────────┘
```
