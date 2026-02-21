# ExportFlow - Schéma Prisma

Ce fichier contient le schéma Prisma mis à jour pour l'architecture multi-tenant.

---

## 📁 Fichier: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// MULTI-TENANT: COMPANY (TENANT)
// ============================================

model Company {
  id          String   @id @default(cuid())
  
  // Identifiants
  name        String
  slug        String   @unique  // "swiftboats" → swiftboats.exportflow.io
  
  // Domaine custom (premium)
  customDomain         String?  @unique  // "orders.swiftboats.com"
  customDomainVerified Boolean  @default(false)
  
  // Subscription ExportFlow
  plan        String   @default("starter")  // starter, growth, pro, enterprise
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  isActive    Boolean  @default(true)
  
  // Relations
  branding    CompanyBranding?
  users       User[]
  products    Product[]
  categories  Category[]
  customers   Customer[]
  orders      Order[]
  invoices    Invoice[]
  
  @@index([slug])
  @@index([customDomain])
}

model CompanyBranding {
  id          String   @id @default(cuid())
  companyId   String   @unique
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Logos
  logoUrl         String?   // Header logo
  logoSmallUrl    String?   // Favicon / mobile
  logoDarkUrl     String?   // Pour fonds sombres
  invoiceLogoUrl  String?   // Sur les PDFs
  
  // Couleurs
  primaryColor      String   @default("#0071e3")
  primaryHoverColor String   @default("#0077ed")
  accentColor       String?
  headerBgColor     String?
  headerTextColor   String?
  
  // Contenu
  companyName     String
  tagline         String?
  supportEmail    String?
  supportPhone    String?
  websiteUrl      String?
  
  // Footer
  footerText      String?
  showPoweredBy   Boolean  @default(true)
  
  // Documents
  invoiceFooter   String?
  
  // Avancé
  customCss       String?  @db.Text
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// ============================================
// USERS & AUTH
// ============================================

model User {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  email       String
  name        String
  role        UserRole @default(COMMERCIAL)
  language    String   @default("en")  // "en", "zh", "fr"
  
  // Auth
  lastLoginAt DateTime?
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  isActive    Boolean  @default(true)
  
  // Relations
  substitutionsCreated SubstitutionRequest[] @relation("CreatedBy")
  paymentsVerified     PaymentRecord[]       @relation("VerifiedBy")
  
  @@unique([companyId, email])
  @@index([companyId])
}

enum UserRole {
  ADMIN
  COMMERCIAL
  WAREHOUSE
  FINANCE
}

// ============================================
// PRODUCTS
// ============================================

model Category {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  name        String
  nameCn      String?
  slug        String
  parentId    String?
  parent      Category?  @relation("CategoryChildren", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryChildren")
  
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  
  products    Product[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([companyId, slug])
  @@index([companyId])
}

model Product {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Identifiants
  ref         String      // SKU / Reference
  name        String
  nameCn      String?
  description String?     @db.Text
  descriptionCn String?   @db.Text
  
  // Catégorie
  categoryId  String?
  category    Category?   @relation(fields: [categoryId], references: [id])
  
  // Prix (en centimes pour éviter les erreurs de float)
  priceRmb        Int?    // Prix coût RMB
  priceEur        Int?    // Prix EUR (cents)
  priceUsd        Int?    // Prix USD (cents)
  priceDistributor Int?   // Prix distributeur (cents)
  priceDirect     Int?    // Prix direct (cents)
  priceRrp        Int?    // Prix public conseillé (cents)
  
  // Inventaire
  stock       Int      @default(0)
  moq         Int      @default(1)   // Minimum Order Quantity
  location    String?               // Emplacement entrepôt
  
  // Détails
  material    String?
  weight      Float?    // kg
  hsCode      String?   // Code douanier
  dimensions  String?   // "L x W x H cm"
  unit        String    @default("pcs")
  cartonQty   Int?      // Quantité par carton
  
  // Images
  imageUrl    String?
  images      String[]  // Gallery
  
  // Variantes
  parentId    String?
  parent      Product?  @relation("ProductVariants", fields: [parentId], references: [id])
  variants    Product[] @relation("ProductVariants")
  variantAttributes Json?  // { "size": "30mm", "color": "silver" }
  
  // Attributs custom
  customAttributes Json?
  
  // Status
  isActive    Boolean  @default(true)
  isDiscontinued Boolean @default(false)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  orderLines  OrderLine[]
  substitutionOriginal SubstitutionRequest[] @relation("OriginalProduct")
  substitutionProposed SubstitutionProposal[] @relation("ProposedProduct")
  customerPrices CustomerProductPrice[]
  
  @@unique([companyId, ref])
  @@index([companyId])
  @@index([companyId, categoryId])
}

// ============================================
// CUSTOMERS (DISTRIBUTORS)
// ============================================

model Customer {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Identifiants
  code        String?
  name        String
  email       String
  phone       String?
  
  // Contact principal
  contactName String?
  
  // Paramètres
  language    String   @default("en")
  currency    String   @default("EUR")
  
  // Pricing
  priceType   PriceType @default(DISTRIBUTOR)
  globalDiscount Float? @default(0)  // 0.05 = 5%
  
  // Paiement
  paymentTerms String?  // "30% deposit, 70% before shipment"
  creditLimit  Int?     // En centimes
  
  // Automatisation
  autoInvoicing       Boolean @default(true)
  lateSurchargeEnabled Boolean @default(true)
  
  // Status
  isActive    Boolean  @default(true)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  addresses   CustomerAddress[]
  orders      Order[]
  quotes      Quote[]
  customPrices CustomerProductPrice[]
  
  @@unique([companyId, email])
  @@index([companyId])
}

enum PriceType {
  DISTRIBUTOR
  DIRECT
  CUSTOM
}

model CustomerAddress {
  id          String   @id @default(cuid())
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  
  type        AddressType @default(SHIPPING)
  label       String?
  
  company     String?
  name        String
  street      String
  street2     String?
  city        String
  state       String?
  postalCode  String
  country     String
  phone       String?
  
  isDefault   Boolean  @default(false)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum AddressType {
  SHIPPING
  BILLING
}

model CustomerProductPrice {
  id          String   @id @default(cuid())
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  price       Int      // Prix custom en centimes
  currency    String   @default("EUR")
  moq         Int?     // MOQ custom
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([customerId, productId])
}

// ============================================
// ORDERS
// ============================================

model Order {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  
  // Identifiants
  orderNumber String
  reference   String?  // Référence client
  
  // Status
  status      OrderStatus @default(PENDING)
  
  // Dates
  orderDate   DateTime @default(now())
  loadingDate DateTime?
  shippedDate DateTime?
  deliveredDate DateTime?
  
  // Montants (centimes)
  subtotal    Int
  discount    Int      @default(0)
  surcharge   Int      @default(0)  // Late modification surcharge
  shipping    Int      @default(0)
  tax         Int      @default(0)
  total       Int
  currency    String   @default("EUR")
  
  // Adresses
  shippingAddressId String?
  billingAddressId  String?
  shippingAddress   Json?
  billingAddress    Json?
  
  // Shipping
  shippingMethod  String?
  incoterm        String?   // FOB, CIF, EXW, etc.
  trackingNumber  String?
  
  // Notes
  notes       String?  @db.Text
  internalNotes String? @db.Text
  
  // Versioning (for modifications)
  version     Int      @default(1)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  lines       OrderLine[]
  invoices    Invoice[]
  payments    OrderPayment?
  substitutions SubstitutionRequest[]
  modifications OrderModification[]
  
  @@unique([companyId, orderNumber])
  @@index([companyId])
  @@index([companyId, customerId])
  @@index([companyId, status])
}

enum OrderStatus {
  DRAFT
  PENDING
  CONFIRMED
  SUBSTITUTION_PENDING
  PREPARING
  READY
  LOADING
  SHIPPED
  DELIVERED
  CANCELLED
}

model OrderLine {
  id          String   @id @default(cuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  
  // Snapshot produit au moment de la commande
  productRef  String
  productName String
  productNameCn String?
  
  quantity    Int
  unitPrice   Int      // Centimes
  discount    Int      @default(0)
  lineTotal   Int      // Centimes
  
  // Status
  status      LineStatus @default(ACTIVE)
  
  // Notes
  notes       String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  substitutions SubstitutionRequest[]
}

enum LineStatus {
  ACTIVE
  SUBSTITUTED
  BACKORDERED
  REMOVED
}

model OrderModification {
  id          String   @id @default(cuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  version     Int
  timestamp   DateTime @default(now())
  modifiedBy  String
  reason      String
  
  changes     Json     // Array of changes
  
  surchargeApplied Int @default(0)
  previousTotal    Int
  newTotal         Int
  
  createdAt   DateTime @default(now())
}

// ============================================
// SUBSTITUTIONS
// ============================================

model SubstitutionRequest {
  id          String   @id @default(cuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderLineId String
  orderLine   OrderLine @relation(fields: [orderLineId], references: [id], onDelete: Cascade)
  
  originalProductId String
  originalProduct   Product @relation("OriginalProduct", fields: [originalProductId], references: [id])
  originalQuantity  Int
  
  reason      SubstitutionReason
  
  status      SubstitutionStatus @default(PENDING)
  
  // Réponse client
  customerDecision  SubstitutionDecision?
  selectedProposalId String?
  customerComment   String?
  respondedAt       DateTime?
  
  // Qui a créé
  createdById String
  createdBy   User     @relation("CreatedBy", fields: [createdById], references: [id])
  
  createdAt   DateTime @default(now())
  expiresAt   DateTime // Auto-reject après X heures
  
  // Relations
  proposals   SubstitutionProposal[]
}

enum SubstitutionReason {
  OUT_OF_STOCK
  DISCONTINUED
  PARTIAL_STOCK
  QUALITY_ISSUE
}

enum SubstitutionStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
}

enum SubstitutionDecision {
  ACCEPT
  REJECT
  BACKORDER
}

model SubstitutionProposal {
  id          String   @id @default(cuid())
  requestId   String
  request     SubstitutionRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  
  type        ProposalType
  
  // Pour substitute
  productId   String?
  product     Product? @relation("ProposedProduct", fields: [productId], references: [id])
  
  quantity    Int
  priceAdjustment Int  @default(0)  // +/- centimes
  
  // Pour backorder
  availableDate DateTime?
  
  note        String?
  
  createdAt   DateTime @default(now())
}

enum ProposalType {
  SUBSTITUTE
  BACKORDER
}

// ============================================
// PAYMENTS
// ============================================

model OrderPayment {
  id          String   @id @default(cuid())
  orderId     String   @unique
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  invoiceId   String?
  
  expectedAmount Int
  currency       String
  depositPercentage Int @default(30)
  
  status      PaymentStatus @default(AWAITING_DEPOSIT)
  
  // Bank details pour ce paiement
  bankDetails Json?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  records     PaymentRecord[]
}

enum PaymentStatus {
  AWAITING_DEPOSIT
  DEPOSIT_RECEIVED
  AWAITING_BALANCE
  FULLY_PAID
  OVERPAID
}

model PaymentRecord {
  id          String   @id @default(cuid())
  paymentId   String
  payment     OrderPayment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  
  type        PaymentRecordType
  amount      Int      // Centimes
  currency    String
  
  receivedDate DateTime
  paymentMethod PaymentMethod @default(TT)
  reference   String   // Bank reference
  
  proofDocument String?  // URL
  
  verifiedById String?
  verifiedBy   User?    @relation("VerifiedBy", fields: [verifiedById], references: [id])
  verifiedAt   DateTime?
  
  notes       String?
  
  createdAt   DateTime @default(now())
}

enum PaymentRecordType {
  DEPOSIT
  BALANCE
  ADJUSTMENT
  REFUND
}

enum PaymentMethod {
  TT
  LC
  PAYPAL
  STRIPE
  OTHER
}

// ============================================
// INVOICES
// ============================================

model Invoice {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  orderId     String?
  order       Order?   @relation(fields: [orderId], references: [id])
  
  invoiceNumber String
  type        InvoiceType @default(PROFORMA)
  
  // Dates
  issueDate   DateTime @default(now())
  dueDate     DateTime?
  
  // Parties
  seller      Json
  buyer       Json
  
  // Shipping
  incoterm    String?
  portOfLoading String?
  portOfDestination String?
  countryOfOrigin String?
  
  // Montants (centimes)
  subtotal    Int
  additionalCharges Json?  // [{description, amount}]
  total       Int
  currency    String
  
  // Poids / Volumes
  totalNetWeight   Float?
  totalGrossWeight Float?
  totalCartons     Int?
  totalCbm         Float?
  
  // Paiement
  paymentTerms String?
  bankDetails  Json?
  
  // Notes
  notes       String?
  
  // PDF
  pdfUrl      String?
  
  status      InvoiceStatus @default(DRAFT)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([companyId, invoiceNumber])
  @@index([companyId])
}

enum InvoiceType {
  PROFORMA
  COMMERCIAL
  CREDIT_NOTE
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  CANCELLED
}

// ============================================
// QUOTES
// ============================================

model Quote {
  id          String   @id @default(cuid())
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  
  quoteNumber String
  
  status      QuoteStatus @default(DRAFT)
  
  validUntil  DateTime?
  
  items       Json     // Array of items
  
  subtotal    Int
  total       Int
  currency    String
  
  notes       String?
  
  convertedToOrderId String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum QuoteStatus {
  DRAFT
  SENT
  ACCEPTED
  REJECTED
  EXPIRED
  CONVERTED
}
```

---

## 🔧 Migration

Pour appliquer ce schéma:

```bash
# Générer la migration
npx prisma migrate dev --name init_multitenant

# Générer le client Prisma
npx prisma generate
```

---

## 📝 Notes Importantes

1. **Tous les modèles principaux ont `companyId`** pour l'isolation multi-tenant
2. **Les prix sont en centimes** pour éviter les erreurs de float
3. **Soft delete avec `isActive`** - ne jamais DELETE
4. **Les adresses sont snapshottées dans Order** en JSON pour l'historique
5. **Les substitutions expirent** automatiquement (champ `expiresAt`)
