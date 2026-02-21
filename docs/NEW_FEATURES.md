# ExportFlow - Nouvelles Fonctionnalités à Implémenter

---

## 📋 Résumé

| # | Fonctionnalité | Priorité | Complexité | Estimé |
|---|----------------|----------|------------|--------|
| 1 | Multi-tenant + Sous-domaines auto | 🔴 Critique | Élevée | 1 semaine |
| 2 | Import Excel super-tolérant | 🔴 Critique | Élevée | 1-2 sem |
| 3 | Workflow Substitution/Rupture | 🔴 Critique | Moyenne | 4 jours |
| 4 | Suivi Paiements T/T | 🔴 Critique | Moyenne | 3 jours |
| 5 | Branding personnalisable | 🟠 Haute | Moyenne | 3 jours |
| 6 | Domaine custom (premium) | 🟠 Haute | Moyenne | 2 jours |
| 7 | Modification Commande + Diff | 🟠 Haute | Moyenne | 3-4 jours |
| 8 | Site marketing | 🟡 Moyenne | Moyenne | 1 semaine |

---

## 🔴 1. Architecture Multi-Tenant + Sous-Domaines Automatiques

### Concept

Chaque client qui s'inscrit obtient automatiquement son propre sous-domaine:

```
Inscription: "Swift Boats International"
     ↓
Slug généré: "swiftboats"
     ↓
URL active: swiftboats.exportflow.io ✅
```

### Composants à créer

#### 1.1 Middleware (`src/middleware.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'

const RESERVED_SUBDOMAINS = ['app', 'www', 'api', 'admin', 'docs', 'help', 'status', 'blog', 'mail']
const MAIN_DOMAIN = 'exportflow.io'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const subdomain = extractSubdomain(hostname)
  
  // Site marketing principal
  if (!subdomain || subdomain === 'www') {
    return NextResponse.next()
  }
  
  // Sous-domaines réservés
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return NextResponse.next()
  }
  
  // C'est un tenant ! Injecter le slug
  const response = NextResponse.next()
  response.headers.set('x-tenant-slug', subdomain)
  return response
}

function extractSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0]
  
  if (host.endsWith(`.${MAIN_DOMAIN}`)) {
    return host.replace(`.${MAIN_DOMAIN}`, '')
  }
  
  // Domaine custom
  if (!host.includes(MAIN_DOMAIN) && host !== 'localhost') {
    return `custom:${host}`
  }
  
  return null
}
```

#### 1.2 TenantContext (`src/contexts/TenantContext.tsx`)

```typescript
'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface Tenant {
  id: string
  slug: string
  name: string
  plan: string
  branding: {
    logoUrl?: string
    logoSmallUrl?: string
    primaryColor: string
    primaryHoverColor: string
    companyName: string
    tagline?: string
    supportEmail?: string
    showPoweredBy: boolean
  }
}

interface TenantContextType {
  tenant: Tenant | null
  loading: boolean
  error: string | null
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  loading: true,
  error: null
})

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    async function loadTenant() {
      try {
        const res = await fetch('/api/tenant')
        if (!res.ok) throw new Error('Tenant not found')
        const data = await res.json()
        setTenant(data)
        applyBranding(data.branding)
      } catch (err: any) {
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

function applyBranding(branding: Tenant['branding']) {
  if (!branding) return
  
  const root = document.documentElement
  root.style.setProperty('--color-brand-primary', branding.primaryColor)
  root.style.setProperty('--color-brand-hover', branding.primaryHoverColor)
  
  // Favicon
  if (branding.logoSmallUrl) {
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement
    if (link) link.href = branding.logoSmallUrl
  }
  
  // Title
  document.title = `${branding.companyName} - Orders`
}

export const useTenant = () => useContext(TenantContext)
```

#### 1.3 API Route (`src/app/api/tenant/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const slug = request.headers.get('x-tenant-slug')
  
  if (!slug) {
    return NextResponse.json({ error: 'No tenant' }, { status: 400 })
  }
  
  // Domaine custom ?
  if (slug.startsWith('custom:')) {
    const customDomain = slug.replace('custom:', '')
    const company = await prisma.company.findFirst({
      where: { customDomain, customDomainVerified: true },
      include: { branding: true }
    })
    if (!company) {
      return NextResponse.json({ error: 'Unknown domain' }, { status: 404 })
    }
    return NextResponse.json(formatTenant(company))
  }
  
  // Sous-domaine standard
  const company = await prisma.company.findUnique({
    where: { slug },
    include: { branding: true }
  })
  
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }
  
  return NextResponse.json(formatTenant(company))
}
```

#### 1.4 Signup avec création auto (`src/app/api/signup/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const { companyName, email, name } = await request.json()
  
  // Générer slug unique
  const slug = await generateUniqueSlug(companyName)
  
  // Créer company + branding + user admin
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
          showPoweredBy: true
        }
      },
      users: {
        create: {
          email,
          name,
          role: 'ADMIN'
        }
      }
    }
  })
  
  // Sous-domaine actif immédiatement grâce au wildcard DNS !
  
  return NextResponse.json({
    success: true,
    portalUrl: `https://${slug}.exportflow.io`,
    company: { id: company.id, name: company.name, slug: company.slug }
  })
}

async function generateUniqueSlug(name: string): Promise<string> {
  let slug = name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)
  let attempt = 0
  let finalSlug = slug
  
  while (await prisma.company.findUnique({ where: { slug: finalSlug } })) {
    attempt++
    finalSlug = `${slug}${attempt}`
  }
  
  return finalSlug
}
```

---

## 🔴 2. Import Excel Super-Tolérant

### Fonctionnalités

| Feature | Description |
|---------|-------------|
| **Fuzzy SKU** | "TB030" matche "TB-030" |
| **Unités** | "pcs", "PCS", "pieces" → "pcs" |
| **Nombres** | "1,234.56" ou "1.234,56" |
| **Header auto** | Trouve l'en-tête même si pas ligne 1 |
| **Variantes** | Détecte "T-bolt 30mm" + "T-bolt 50mm" |
| **Choix user** | Pages séparées OU dropdown |

### Wizard 7 étapes

1. Upload fichier
2. Sélection feuilles (Excel)
3. Mapping colonnes
4. Classification lignes
5. Détection variantes
6. Validation & corrections
7. Confirmation & import

### Fichiers à créer

```
src/app/(tenant)/(dashboard)/products/import/
├── page.tsx                    # Wizard principal
├── components/
│   ├── FileUpload.tsx
│   ├── SheetSelector.tsx
│   ├── ColumnMapper.tsx
│   ├── RowClassifier.tsx
│   ├── VariantDetector.tsx
│   ├── ValidationReview.tsx
│   └── ImportConfirmation.tsx
└── lib/
    ├── parseExcel.ts
    ├── fuzzyMatch.ts
    ├── normalizeUnits.ts
    └── detectVariants.ts
```

---

## 🔴 3. Workflow Substitution/Rupture

### Flux

```
Admin: Article indisponible
    ↓
Propose substitut ou backorder
    ↓
Notification client (email)
    ↓
Client: Accepte / Refuse / Attend
    ↓
Commande mise à jour auto
```

### Pages à créer

**Admin:**
- Modal dans `/orders/[id]` pour créer substitution
- Liste des substitutions pending dans `/orders`

**Distributeur:**
- `/approvals` - Liste des demandes
- Page d'approbation avec options

---

## 🔴 4. Suivi Paiements T/T

### Statuts

```
AWAITING_DEPOSIT → DEPOSIT_RECEIVED → AWAITING_BALANCE → FULLY_PAID
```

### Pages à créer

- `/dashboard/payments` - Dashboard paiements
- Onglet Paiements dans `/orders/[id]`
- Composant `PaymentRecordForm`

---

## 🟠 5. Branding Personnalisable

### Éléments

| Élément | Description |
|---------|-------------|
| **Logo principal** | Header |
| **Logo petit** | Favicon, mobile |
| **Logo factures** | PDFs |
| **Couleur primaire** | Boutons, liens |
| **Couleur hover** | États hover |
| **Infos contact** | Support email/tel |
| **Footer** | Texte + "Powered by" |

### Page admin

`/dashboard/settings/branding`

```
┌─────────────────────────────────────────────────────────┐
│  Personnalisation                                       │
│                                                         │
│  LOGO                                                   │
│  Logo principal: [Upload] [URL: ________]              │
│  Aperçu: [logo]                                         │
│                                                         │
│  COULEURS                                               │
│  Couleur primaire: [#0071e3] [Aperçu]                  │
│                                                         │
│  INFORMATIONS                                           │
│  Nom: [Swift Boats International]                       │
│  Email support: [support@swiftboats.com]               │
│                                                         │
│  FOOTER                                                 │
│  ☑ Afficher "Powered by ExportFlow"                    │
│                                                         │
│  [Prévisualiser]                    [Enregistrer]       │
└─────────────────────────────────────────────────────────┘
```

---

## 🟠 6. Domaine Custom (Premium)

### Processus

1. Client entre son domaine: `orders.swiftboats.com`
2. Système affiche instructions DNS:
   ```
   CNAME  orders  →  proxy.exportflow.io
   ```
3. Client configure chez son registrar
4. Bouton "Vérifier" → check DNS
5. Si OK → domaine actif avec SSL auto

### Page admin

`/dashboard/settings/domain`

---

## 🟠 7. Modification Commande + Diff View

### Flux Distributeur

1. Ouvre commande pending/confirmed
2. Clique "Modifier"
3. Édite quantités, ajoute/supprime
4. Preview avec diff:
   - 🟢 Ajouté
   - 🔴 Supprimé
   - 🟡 Modifié
5. Late surcharge si applicable
6. Confirme

### Page

`/my-orders/[id]/modify`

---

## 🟡 8. Site Marketing

### Pages

| URL | Contenu |
|-----|---------|
| `exportflow.io` | Homepage avec hero, features, CTA |
| `/features` | Détail des fonctionnalités |
| `/pricing` | Plans Starter/Growth/Pro |
| `/contact` | Formulaire contact |
| `/login` | Connexion |
| `/signup` | Inscription (crée tenant) |

### Structure

```
src/app/(marketing)/
├── page.tsx              # Homepage
├── features/page.tsx
├── pricing/page.tsx
├── contact/page.tsx
└── layout.tsx            # Header/footer marketing
```

---

## 📁 Structure Fichiers Complète

```
src/
├── middleware.ts                    # Détection tenant
│
├── app/
│   ├── (marketing)/                 # Site public
│   │   ├── page.tsx
│   │   ├── features/
│   │   ├── pricing/
│   │   └── contact/
│   │
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/                  # Crée tenant + sous-domaine
│   │
│   ├── (tenant)/                    # App multi-tenant
│   │   ├── layout.tsx               # TenantProvider
│   │   │
│   │   ├── (distributor)/
│   │   │   ├── catalog/
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   ├── my-orders/
│   │   │   │   └── [id]/
│   │   │   │       └── modify/      # Modification + diff
│   │   │   ├── my-quotes/
│   │   │   ├── approvals/           # Substitutions
│   │   │   └── account/
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   │   └── import/          # Import Excel
│   │   │   ├── customers/
│   │   │   ├── orders/
│   │   │   ├── invoices/
│   │   │   ├── payments/            # Paiements T/T
│   │   │   └── settings/
│   │   │       ├── branding/        # Logo, couleurs
│   │   │       ├── domain/          # Domaine custom
│   │   │       └── billing/
│   │   │
│   │   └── (warehouse)/
│   │       └── orders/
│   │
│   └── api/
│       ├── tenant/
│       ├── signup/
│       ├── branding/
│       └── verify-domain/
│
├── contexts/
│   ├── TenantContext.tsx
│   └── DistributorContext.tsx
│
├── components/
│   ├── TenantLogo.tsx
│   ├── PoweredByBadge.tsx
│   ├── BrandingPreview.tsx
│   ├── OrderDiffView.tsx
│   ├── SubstitutionModal.tsx
│   ├── PaymentStatusBadge.tsx
│   └── ExcelImport/
│       ├── FileUpload.tsx
│       ├── ColumnMapper.tsx
│       └── VariantDetector.tsx
│
└── lib/
    ├── prisma.ts
    ├── excelImport.ts
    ├── fuzzyMatch.ts
    └── verifyDomain.ts
```
