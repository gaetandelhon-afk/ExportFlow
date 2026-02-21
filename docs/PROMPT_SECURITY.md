# ExportFlow - Sécurité Complète

## PROMPT CURSOR - COPIER EN ENTIER

```
Implémente toutes les mesures de sécurité pour ExportFlow.
Les données clients sont CRITIQUES et ne doivent JAMAIS fuiter.

## ============================================
## 1. ISOLATION MULTI-TENANT (CRITIQUE)
## ============================================

### Middleware de vérification tenant

Crée `src/middleware/tenantGuard.ts`:

```typescript
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

/**
 * RÈGLE D'OR: Chaque requête DB DOIT inclure companyId
 * Cette fonction vérifie que l'utilisateur a accès au tenant demandé
 */
export async function verifyTenantAccess(
  userId: string,
  companyId: string
): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      companyId: companyId,
      isActive: true
    }
  })
  
  return !!user
}

/**
 * Wrapper pour les API routes qui force la vérification tenant
 */
export function withTenantGuard<T>(
  handler: (req: NextRequest, context: { user: any; companyId: string }) => Promise<T>
) {
  return async (req: NextRequest) => {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Log pour audit
    console.log(`[TenantGuard] User ${user.id} accessing company ${user.companyId}`)
    
    return handler(req, { user, companyId: user.companyId })
  }
}
```

### Prisma Client avec tenant automatique

Crée `src/lib/prismaWithTenant.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

/**
 * Extension Prisma qui ajoute automatiquement le filtre companyId
 * EMPÊCHE les accès cross-tenant accidentels
 */
export function createTenantPrisma(companyId: string) {
  const prisma = new PrismaClient()
  
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, operation, args, query }) {
          // Ajouter companyId si le modèle l'a
          if (modelHasCompanyId(model)) {
            args.where = { ...args.where, companyId }
          }
          return query(args)
        },
        async findFirst({ model, operation, args, query }) {
          if (modelHasCompanyId(model)) {
            args.where = { ...args.where, companyId }
          }
          return query(args)
        },
        async findUnique({ model, operation, args, query }) {
          const result = await query(args)
          // Vérifier que le résultat appartient au bon tenant
          if (result && modelHasCompanyId(model) && result.companyId !== companyId) {
            throw new Error('SECURITY: Cross-tenant access attempted')
          }
          return result
        },
        async create({ model, operation, args, query }) {
          if (modelHasCompanyId(model)) {
            args.data = { ...args.data, companyId }
          }
          return query(args)
        },
        async update({ model, operation, args, query }) {
          // Vérifier l'ownership avant update
          if (modelHasCompanyId(model)) {
            const existing = await prisma[model].findUnique({ 
              where: args.where 
            })
            if (existing && existing.companyId !== companyId) {
              throw new Error('SECURITY: Cross-tenant update attempted')
            }
          }
          return query(args)
        },
        async delete({ model, operation, args, query }) {
          // Vérifier l'ownership avant delete
          if (modelHasCompanyId(model)) {
            const existing = await prisma[model].findUnique({ 
              where: args.where 
            })
            if (existing && existing.companyId !== companyId) {
              throw new Error('SECURITY: Cross-tenant delete attempted')
            }
          }
          return query(args)
        }
      }
    }
  })
}

const MODELS_WITH_COMPANY_ID = [
  'Product', 'Customer', 'Order', 'Invoice', 
  'User', 'Category', 'OrderPayment'
]

function modelHasCompanyId(model: string): boolean {
  return MODELS_WITH_COMPANY_ID.includes(model)
}
```

### Utilisation dans les API routes

```typescript
// api/products/route.ts
import { createTenantPrisma } from '@/lib/prismaWithTenant'
import { withTenantGuard } from '@/middleware/tenantGuard'

export const GET = withTenantGuard(async (req, { user, companyId }) => {
  // Prisma filtré automatiquement par companyId
  const prisma = createTenantPrisma(companyId)
  
  // Cette requête ne peut PAS retourner de produits d'autres tenants
  const products = await prisma.product.findMany()
  
  return NextResponse.json(products)
})
```

## ============================================
## 2. AUTHENTIFICATION SÉCURISÉE
## ============================================

### Configuration Auth sécurisée

Crée `src/lib/auth.ts`:

```typescript
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

// Configuration
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const TOKEN_EXPIRY = '24h'
const REFRESH_TOKEN_EXPIRY = '7d'

// IMPORTANT: Vérifier que JWT_SECRET est assez long (min 32 chars)
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters')
}

interface TokenPayload {
  userId: string
  companyId: string
  role: string
  email: string
}

/**
 * Générer un token JWT sécurisé
 */
export async function generateToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .setJti(crypto.randomUUID()) // Unique token ID
    .sign(JWT_SECRET)
}

/**
 * Vérifier et décoder un token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as TokenPayload
  } catch (error) {
    return null
  }
}

/**
 * Hash mot de passe avec bcrypt (cost factor 12)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * Vérifier mot de passe
 */
export async function verifyPassword(
  password: string, 
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * Récupérer l'utilisateur courant depuis le cookie
 */
export async function getCurrentUser() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  
  if (!token) return null
  
  const payload = await verifyToken(token)
  if (!payload) return null
  
  // Vérifier que l'utilisateur existe toujours et est actif
  const user = await prisma.user.findFirst({
    where: {
      id: payload.userId,
      companyId: payload.companyId,
      isActive: true
    },
    include: {
      company: {
        select: { id: true, name: true, slug: true, isActive: true }
      }
    }
  })
  
  // Vérifier que la company est aussi active
  if (!user || !user.company.isActive) {
    return null
  }
  
  return user
}

/**
 * Définir le cookie d'auth (HttpOnly, Secure, SameSite)
 */
export function setAuthCookie(token: string) {
  cookies().set('auth_token', token, {
    httpOnly: true,           // Pas accessible via JavaScript
    secure: process.env.NODE_ENV === 'production',  // HTTPS only en prod
    sameSite: 'lax',          // Protection CSRF
    maxAge: 60 * 60 * 24,     // 24h
    path: '/'
  })
}

/**
 * Supprimer le cookie d'auth
 */
export function clearAuthCookie() {
  cookies().delete('auth_token')
}
```

### Rate Limiting pour Login

Crée `src/lib/rateLimit.ts`:

```typescript
import { LRUCache } from 'lru-cache'

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

// Cache en mémoire pour le rate limiting
const rateLimitCache = new LRUCache<string, number[]>({
  max: 10000,
  ttl: 1000 * 60 * 15  // 15 minutes
})

/**
 * Rate limiter configurable
 */
export function rateLimit(options: {
  key: string           // Identifiant unique (IP, email, etc.)
  limit: number         // Nombre max de requêtes
  windowMs: number      // Fenêtre de temps en ms
}): RateLimitResult {
  const { key, limit, windowMs } = options
  const now = Date.now()
  
  // Récupérer les timestamps des requêtes précédentes
  const timestamps = rateLimitCache.get(key) || []
  
  // Filtrer les timestamps dans la fenêtre
  const windowStart = now - windowMs
  const recentTimestamps = timestamps.filter(ts => ts > windowStart)
  
  // Vérifier la limite
  if (recentTimestamps.length >= limit) {
    const oldestInWindow = Math.min(...recentTimestamps)
    return {
      success: false,
      remaining: 0,
      reset: oldestInWindow + windowMs
    }
  }
  
  // Ajouter le nouveau timestamp
  recentTimestamps.push(now)
  rateLimitCache.set(key, recentTimestamps)
  
  return {
    success: true,
    remaining: limit - recentTimestamps.length,
    reset: now + windowMs
  }
}

/**
 * Rate limit spécifique pour login (plus strict)
 */
export function loginRateLimit(identifier: string): RateLimitResult {
  return rateLimit({
    key: `login:${identifier}`,
    limit: 5,                    // 5 tentatives
    windowMs: 1000 * 60 * 15     // par 15 minutes
  })
}

/**
 * Rate limit pour API générale
 */
export function apiRateLimit(identifier: string): RateLimitResult {
  return rateLimit({
    key: `api:${identifier}`,
    limit: 100,                  // 100 requêtes
    windowMs: 1000 * 60          // par minute
  })
}

/**
 * Bloquer temporairement après trop d'échecs
 */
const blockedCache = new LRUCache<string, number>({
  max: 10000,
  ttl: 1000 * 60 * 60  // 1 heure
})

export function isBlocked(identifier: string): boolean {
  return blockedCache.has(`blocked:${identifier}`)
}

export function blockUser(identifier: string, durationMs: number = 1000 * 60 * 60) {
  blockedCache.set(`blocked:${identifier}`, Date.now() + durationMs, {
    ttl: durationMs
  })
}
```

### API Login sécurisée

```typescript
// api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  verifyPassword, 
  generateToken, 
  setAuthCookie 
} from '@/lib/auth'
import { loginRateLimit, isBlocked, blockUser } from '@/lib/rateLimit'
import { createAuditLog } from '@/lib/auditLog'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    // Validation basique
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      )
    }
    
    const normalizedEmail = email.toLowerCase().trim()
    
    // Vérifier si bloqué
    if (isBlocked(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Account temporarily locked. Try again later.' },
        { status: 429 }
      )
    }
    
    // Rate limiting
    const rateResult = loginRateLimit(normalizedEmail)
    if (!rateResult.success) {
      // Bloquer après trop de tentatives
      blockUser(normalizedEmail)
      
      return NextResponse.json(
        { error: 'Too many login attempts. Try again in 15 minutes.' },
        { status: 429 }
      )
    }
    
    // Chercher l'utilisateur
    const user = await prisma.user.findFirst({
      where: { 
        email: normalizedEmail,
        isActive: true
      },
      include: {
        company: {
          select: { id: true, slug: true, isActive: true }
        }
      }
    })
    
    // IMPORTANT: Même message d'erreur pour email/password incorrect
    // Évite l'énumération d'utilisateurs
    if (!user || !user.company.isActive) {
      await createAuditLog({
        companyId: 'unknown',
        action: 'LOGIN_FAILED',
        entityType: 'User',
        metadata: { email: normalizedEmail, reason: 'user_not_found' }
      })
      
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Vérifier le mot de passe
    const isValid = await verifyPassword(password, user.passwordHash)
    
    if (!isValid) {
      await createAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        metadata: { reason: 'invalid_password' }
      })
      
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Générer le token
    const token = await generateToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      email: user.email
    })
    
    // Définir le cookie sécurisé
    setAuthCookie(token)
    
    // Mettre à jour lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })
    
    // Audit log succès
    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      metadata: { 
        ip: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      }
    })
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      redirectTo: `https://${user.company.slug}.exportflow.io/dashboard`
    })
    
  } catch (error: any) {
    console.error('[Login Error]', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
```

## ============================================
## 3. PROTECTION INJECTION & XSS
## ============================================

### Validation des inputs

Crée `src/lib/validation.ts`:

```typescript
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML pour prévenir XSS
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  })
}

/**
 * Sanitize string simple (pas de HTML)
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '')  // Remove < >
    .trim()
}

/**
 * Schémas de validation Zod
 */
export const schemas = {
  email: z.string().email().max(255).transform(s => s.toLowerCase().trim()),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  
  name: z.string().min(1).max(100).transform(sanitizeString),
  
  companyName: z.string().min(1).max(200).transform(sanitizeString),
  
  productName: z.string().min(1).max(200).transform(sanitizeString),
  
  description: z.string().max(5000).transform(sanitizeHtml).optional(),
  
  price: z.number().min(0).max(999999999),
  
  quantity: z.number().int().min(0).max(999999),
  
  slug: z.string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  
  uuid: z.string().uuid(),
  
  // Pour les IDs provenant du client
  entityId: z.string().cuid().or(z.string().uuid()),
}

/**
 * Valider un objet avec un schéma
 */
export async function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors.map(e => e.message).join(', ')
      }
    }
    return { success: false, error: 'Validation failed' }
  }
}
```

### Middleware de validation automatique

```typescript
// middleware/validateInput.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (req: NextRequest, data: T) => Promise<Response>
) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json()
      const result = schema.safeParse(body)
      
      if (!result.success) {
        return NextResponse.json(
          { 
            error: 'Validation failed',
            details: result.error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          },
          { status: 400 }
        )
      }
      
      return handler(req, result.data)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
  }
}
```

## ============================================
## 4. HEADERS DE SÉCURITÉ
## ============================================

### Middleware Next.js avec headers

Modifie `src/middleware.ts`:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // ============================================
  // SECURITY HEADERS
  // ============================================
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // XSS Protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Ajuster selon besoins
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.exportflow.io",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'"
    ].join('; ')
  )
  
  // HSTS (Strict Transport Security)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }
  
  // ... reste du middleware (tenant detection, etc.)
  
  return response
}
```

### Configuration next.config.js

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  
  // Désactiver le header X-Powered-By
  poweredByHeader: false,
}
```

## ============================================
## 5. PROTECTION CSRF
## ============================================

Crée `src/lib/csrf.ts`:

```typescript
import { cookies } from 'next/headers'
import crypto from 'crypto'

const CSRF_TOKEN_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Générer un token CSRF
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Définir le token CSRF dans un cookie
 */
export function setCsrfCookie(token: string) {
  cookies().set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  })
}

/**
 * Vérifier le token CSRF
 */
export function verifyCsrfToken(request: Request): boolean {
  const cookieStore = cookies()
  const cookieToken = cookieStore.get(CSRF_TOKEN_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)
  
  if (!cookieToken || !headerToken) {
    return false
  }
  
  // Comparaison timing-safe
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  )
}

/**
 * Middleware CSRF pour les mutations
 */
export function withCsrfProtection(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request) => {
    // Skip pour GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return handler(req)
    }
    
    if (!verifyCsrfToken(req)) {
      return new Response(
        JSON.stringify({ error: 'Invalid CSRF token' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    return handler(req)
  }
}
```

## ============================================
## 6. CHIFFREMENT DES DONNÉES SENSIBLES
## ============================================

Crée `src/lib/encryption.ts`:

```typescript
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')  // 32 bytes

if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
}

interface EncryptedData {
  iv: string
  data: string
  tag: string
}

/**
 * Chiffrer une donnée sensible
 */
export function encrypt(text: string): EncryptedData {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return {
    iv: iv.toString('hex'),
    data: encrypted,
    tag: cipher.getAuthTag().toString('hex')
  }
}

/**
 * Déchiffrer une donnée
 */
export function decrypt(encryptedData: EncryptedData): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(encryptedData.iv, 'hex')
  )
  
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'))
  
  let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Chiffrer pour stockage DB (JSON string)
 */
export function encryptForDb(text: string): string {
  return JSON.stringify(encrypt(text))
}

/**
 * Déchiffrer depuis DB
 */
export function decryptFromDb(encrypted: string): string {
  return decrypt(JSON.parse(encrypted))
}
```

### Utilisation pour données sensibles

```typescript
// Exemple: stocker des infos bancaires chiffrées
const bankDetails = {
  accountNumber: '1234567890',
  bankName: 'Bank of China',
  swiftCode: 'BKCHCNBJ'
}

// Chiffrer avant stockage
const encryptedBankDetails = encryptForDb(JSON.stringify(bankDetails))

// Stocker en DB
await prisma.company.update({
  where: { id: companyId },
  data: { 
    bankDetailsEncrypted: encryptedBankDetails
  }
})

// Déchiffrer à la lecture
const decrypted = JSON.parse(decryptFromDb(company.bankDetailsEncrypted))
```

## ============================================
## 7. FILE UPLOAD SÉCURISÉ
## ============================================

Crée `src/lib/fileUpload.ts`:

```typescript
import { put, del } from '@vercel/blob'
import crypto from 'crypto'
import path from 'path'

// Types de fichiers autorisés
const ALLOWED_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf'],
  spreadsheet: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
}

const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10MB

interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Upload sécurisé de fichier
 */
export async function secureUpload(
  file: File,
  options: {
    category: 'image' | 'document' | 'spreadsheet'
    companyId: string
    maxSize?: number
  }
): Promise<UploadResult> {
  const { category, companyId, maxSize = MAX_FILE_SIZE } = options
  
  // 1. Vérifier la taille
  if (file.size > maxSize) {
    return { 
      success: false, 
      error: `File too large. Maximum: ${maxSize / 1024 / 1024}MB` 
    }
  }
  
  // 2. Vérifier le type MIME
  const allowedTypes = ALLOWED_TYPES[category]
  if (!allowedTypes.includes(file.type)) {
    return { 
      success: false, 
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` 
    }
  }
  
  // 3. Vérifier l'extension
  const ext = path.extname(file.name).toLowerCase()
  const validExtensions: Record<string, string[]> = {
    image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    document: ['.pdf'],
    spreadsheet: ['.csv', '.xlsx']
  }
  
  if (!validExtensions[category].includes(ext)) {
    return { 
      success: false, 
      error: 'File extension does not match content type' 
    }
  }
  
  // 4. Lire et vérifier les magic bytes (signature du fichier)
  const buffer = Buffer.from(await file.arrayBuffer())
  if (!verifyMagicBytes(buffer, category)) {
    return { 
      success: false, 
      error: 'File content does not match declared type' 
    }
  }
  
  // 5. Générer un nom de fichier sécurisé
  const randomName = crypto.randomBytes(16).toString('hex')
  const safeName = `${companyId}/${category}/${randomName}${ext}`
  
  // 6. Upload
  try {
    const blob = await put(safeName, buffer, {
      access: 'public',
      contentType: file.type
    })
    
    return { success: true, url: blob.url }
  } catch (error: any) {
    console.error('[Upload Error]', error)
    return { success: false, error: 'Upload failed' }
  }
}

/**
 * Vérifier les magic bytes du fichier
 */
function verifyMagicBytes(buffer: Buffer, category: string): boolean {
  const signatures: Record<string, number[][]> = {
    image: [
      [0xFF, 0xD8, 0xFF],           // JPEG
      [0x89, 0x50, 0x4E, 0x47],     // PNG
      [0x47, 0x49, 0x46],           // GIF
      [0x52, 0x49, 0x46, 0x46]      // WebP (RIFF)
    ],
    document: [
      [0x25, 0x50, 0x44, 0x46]      // PDF (%PDF)
    ],
    spreadsheet: [
      [0x50, 0x4B, 0x03, 0x04],     // XLSX (ZIP)
      // CSV n'a pas de signature spécifique
    ]
  }
  
  const sigs = signatures[category] || []
  
  // CSV exception - pas de magic bytes, vérifier que c'est du texte
  if (category === 'spreadsheet' && buffer.length > 0) {
    // Vérifier que c'est principalement du texte ASCII
    const sample = buffer.slice(0, 1000)
    const textChars = sample.filter(b => 
      (b >= 0x20 && b <= 0x7E) || b === 0x0A || b === 0x0D || b === 0x09
    )
    if (textChars.length / sample.length > 0.95) {
      return true  // Probablement un CSV
    }
  }
  
  // Vérifier les signatures
  for (const sig of sigs) {
    if (buffer.length >= sig.length) {
      let match = true
      for (let i = 0; i < sig.length; i++) {
        if (buffer[i] !== sig[i]) {
          match = false
          break
        }
      }
      if (match) return true
    }
  }
  
  return false
}

/**
 * Supprimer un fichier
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    await del(url)
  } catch (error) {
    console.error('[Delete File Error]', error)
  }
}
```

## ============================================
## 8. PROTECTION DES SECRETS
## ============================================

### Variables d'environnement requises

Crée `.env.example`:

```bash
# ============================================
# SECRETS (JAMAIS COMMITER .env)
# ============================================

# Database
DATABASE_URL="postgresql://..."

# Auth - Générer avec: openssl rand -hex 32
JWT_SECRET="your-32-character-minimum-secret-key-here"

# Encryption - Générer avec: openssl rand -hex 32
ENCRYPTION_KEY="your-64-hex-characters-32-bytes-encryption-key"

# Cron jobs
CRON_SECRET="your-random-cron-secret"

# External services
RESEND_API_KEY="re_..."
STRIPE_SECRET_KEY="sk_..."

# ============================================
# NON-SECRETS
# ============================================

NEXT_PUBLIC_APP_URL="https://exportflow.io"
NEXT_PUBLIC_MAIN_DOMAIN="exportflow.io"
```

### Script de vérification des secrets

Crée `scripts/check-secrets.ts`:

```typescript
// Vérifier que les secrets sont bien configurés au démarrage

const REQUIRED_SECRETS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'CRON_SECRET'
]

const SECRET_REQUIREMENTS = {
  JWT_SECRET: { minLength: 32 },
  ENCRYPTION_KEY: { length: 64, isHex: true },
  CRON_SECRET: { minLength: 16 }
}

export function checkSecrets() {
  const errors: string[] = []
  
  for (const secret of REQUIRED_SECRETS) {
    if (!process.env[secret]) {
      errors.push(`Missing required secret: ${secret}`)
      continue
    }
    
    const value = process.env[secret]!
    const req = SECRET_REQUIREMENTS[secret as keyof typeof SECRET_REQUIREMENTS]
    
    if (req) {
      if ('minLength' in req && value.length < req.minLength) {
        errors.push(`${secret} must be at least ${req.minLength} characters`)
      }
      if ('length' in req && value.length !== req.length) {
        errors.push(`${secret} must be exactly ${req.length} characters`)
      }
      if ('isHex' in req && req.isHex && !/^[0-9a-f]+$/i.test(value)) {
        errors.push(`${secret} must be hexadecimal`)
      }
    }
  }
  
  if (errors.length > 0) {
    console.error('❌ Security configuration errors:')
    errors.forEach(e => console.error(`  - ${e}`))
    process.exit(1)
  }
  
  console.log('✅ All secrets configured correctly')
}

// Run at startup
checkSecrets()
```

## ============================================
## 9. AUDIT LOGGING ÉTENDU
## ============================================

Étends le système d'audit pour tracer les actions de sécurité:

```typescript
// Ajoute ces actions dans auditLog.ts

type SecurityAction = 
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_COMPLETE'
  | 'PERMISSION_DENIED'
  | 'CROSS_TENANT_ATTEMPT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SUSPICIOUS_ACTIVITY'
  | 'DATA_EXPORT'
  | 'ADMIN_ACTION'

// Logger les tentatives suspectes
export async function logSecurityEvent(params: {
  companyId?: string
  userId?: string
  action: SecurityAction
  severity: 'low' | 'medium' | 'high' | 'critical'
  details: Record<string, any>
  request?: Request
}) {
  const { request, severity, ...data } = params
  
  // Log immédiat en console pour alertes critiques
  if (severity === 'critical' || severity === 'high') {
    console.error(`🚨 [SECURITY ${severity.toUpperCase()}]`, data)
  }
  
  await createAuditLog({
    ...data,
    metadata: {
      ...data.details,
      severity,
      ip: request?.headers.get('x-forwarded-for'),
      userAgent: request?.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    }
  })
  
  // TODO: Envoyer alerte email/Slack pour événements critiques
}
```

## ============================================
## 10. CHECKLIST FINALE
## ============================================

### À vérifier avant mise en production:

```markdown
## Authentification
- [ ] Mots de passe hashés avec bcrypt (cost 12+)
- [ ] JWT avec expiration courte (24h)
- [ ] Cookies HttpOnly, Secure, SameSite
- [ ] Rate limiting sur login (5 tentatives/15min)
- [ ] Blocage après échecs répétés
- [ ] Pas d'énumération utilisateurs

## Multi-tenant
- [ ] Toutes les queries filtrées par companyId
- [ ] Vérification ownership avant update/delete
- [ ] IDs non prévisibles (CUID/UUID)
- [ ] Tests de cross-tenant access

## Injection/XSS
- [ ] Validation Zod sur tous les inputs
- [ ] Sanitization HTML (DOMPurify)
- [ ] Parameterized queries (Prisma)
- [ ] CSP headers configurés

## Headers sécurité
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] HSTS activé en production
- [ ] CSP configuré

## Données
- [ ] Données sensibles chiffrées (AES-256-GCM)
- [ ] Secrets dans variables d'environnement
- [ ] Pas de secrets dans le code
- [ ] Backups Supabase activés

## Files
- [ ] Validation type MIME + magic bytes
- [ ] Limite de taille (10MB)
- [ ] Noms de fichiers randomisés
- [ ] Stockage séparé (Cloudflare R2/Vercel Blob)

## Monitoring
- [ ] Audit logs sur toutes les actions critiques
- [ ] Alertes sur événements de sécurité
- [ ] Logs centralisés (optionnel)

## Dépendances
- [ ] npm audit clean
- [ ] Dependabot activé
- [ ] Mise à jour régulière
```
```

---

## 🔐 Variables d'environnement à générer

```bash
# Générer JWT_SECRET (32+ caractères)
openssl rand -hex 32

# Générer ENCRYPTION_KEY (64 hex = 32 bytes)
openssl rand -hex 32

# Générer CRON_SECRET
openssl rand -hex 16
```
