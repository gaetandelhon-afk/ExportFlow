# OrderBridge - Admin Tasks Specification
## Complete Development Guide

---

## 🎯 Overview

This document contains detailed specifications for all Admin portal features.
Tasks are organized by priority and include acceptance criteria.

---

## 🔴 PRIORITY 1: Excel/CSV Import System

**Why Critical:** This is the #1 friction point for user adoption. A bad import experience kills conversion.

### 1.1 File Upload Interface

**Location:** `/dashboard/products/import`

**Requirements:**
- Drag & drop zone for files
- Click to browse option
- Accept: `.xlsx`, `.xls`, `.csv`
- File size limit: 10MB
- Show file name and size after selection
- "Continue" button to proceed

**UI:**
```
┌─────────────────────────────────────────┐
│                                         │
│     📄 Drop your Excel or CSV file      │
│           here, or click to browse      │
│                                         │
│     Supported: .xlsx, .xls, .csv        │
│     Max size: 10MB                      │
│                                         │
└─────────────────────────────────────────┘
```

### 1.2 Sheet Selection (Excel only)

**Requirements:**
- List all sheets in the workbook
- Show row count per sheet
- Allow selecting one or multiple sheets
- Preview first 5 rows of selected sheet
- "Continue" button

**UI:**
```
Select sheets to import:

☑ Products (1,247 rows)
☐ Accessories (156 rows)  
☐ Discontinued (89 rows)

Preview of "Products":
┌─────┬──────────┬─────────────────┬───────┐
│ Ref │ Name     │ Description     │ Price │
├─────┼──────────┼─────────────────┼───────┤
│ A1  │ T-bolt   │ Stainless steel │ 12.50 │
│ A2  │ Cleat    │ Chrome finish   │ 45.00 │
└─────┴──────────┴─────────────────┴───────┘
```

### 1.3 Column Mapping

**Requirements:**
- Auto-detect common column names:
  - `ref`, `reference`, `sku`, `product_id`, `prod.#` → Product Reference
  - `name`, `product_name`, `description` → Product Name (EN)
  - `price`, `unit_price`, `cost` → Price
  - `category`, `cat`, `type` → Category
- Manual override for each column
- Required fields marked with *
- Unmapped columns shown as "Skip"
- Preview of mapping result

**Required Fields:**
- Reference (ref) *
- Name (English) *
- Price (at least one) *

**Optional Fields:**
- Name (Chinese)
- Description
- Category
- Subcategory
- Material
- HS Code
- Weight (kg)
- MOQ
- Stock
- Photo URL
- Custom fields...

**UI:**
```
Map your columns:

Your Column          →  Our Field
─────────────────────────────────────
Prod.# *             →  [Reference     ▼]
Product Name *       →  [Name (EN)     ▼]
Chinese Name         →  [Name (CN)     ▼]
Unit Price EUR *     →  [Price EUR     ▼]
Cat                  →  [Category      ▼]
Notes                →  [Skip          ▼]
```

### 1.4 Row Classification

**Requirements:**
- Automatically classify each row:
  - 🟢 **Product**: Has reference AND (price OR description)
  - 🔵 **Category Header**: Text in first column, ALL CAPS, rest empty
  - 🔴 **Skip**: Empty rows, totals, notes, descriptions
- Allow manual override per row
- Bulk actions: "Mark all similar as..."
- Show classification summary

**UI:**
```
Review rows (1,247 total):

Classification Summary:
🟢 Products: 1,089
🔵 Category Headers: 45
🔴 Skipped: 113

┌─────┬─────────────────────┬────────┬───────────────┐
│ Row │ Content             │ Type   │ Action        │
├─────┼─────────────────────┼────────┼───────────────┤
│ 1   │ DECK HARDWARE       │ 🔵 Cat │ [Change ▼]    │
│ 2   │ A1 | T-bolt | 12.50 │ 🟢 Prod│ [Change ▼]    │
│ 3   │ A2 | Cleat | 45.00  │ 🟢 Prod│ [Change ▼]    │
│ 4   │ (empty row)         │ 🔴 Skip│ [Change ▼]    │
│ 5   │ RAILINGS            │ 🔵 Cat │ [Change ▼]    │
└─────┴─────────────────────┴────────┴───────────────┘
```

### 1.5 Variant Detection (CRITICAL)

**Requirements:**
- Detect products that are variants of each other:
  - Same base name, different size: "T-bolt 30mm", "T-bolt 50mm"
  - Same base name, different color: "Rope Red", "Rope Blue"
  - Pattern matching: `[Name] [Size/Color]`
- Group variants together
- **User choice for each group:**
  - Option A: Create **separate product pages** (one per variant)
  - Option B: Create **single product page with dropdown** selector

**Detection Logic:**
```typescript
// Example variants to detect:
"T-bolt M8 x 30mm" → Base: "T-bolt M8", Variant: "30mm"
"T-bolt M8 x 50mm" → Base: "T-bolt M8", Variant: "50mm"
"T-bolt M8 x 75mm" → Base: "T-bolt M8", Variant: "75mm"

// Group them:
{
  baseName: "T-bolt M8",
  variantAttribute: "Size",
  variants: [
    { value: "30mm", ref: "TB-30", price: 12.50 },
    { value: "50mm", ref: "TB-50", price: 15.00 },
    { value: "75mm", ref: "TB-75", price: 18.50 }
  ]
}
```

**UI:**
```
Variant Groups Detected (12 groups):

┌─────────────────────────────────────────────────────┐
│ T-bolt M8 (3 variants detected)                     │
│                                                     │
│ Variants:                                           │
│   • TB-30 - T-bolt M8 x 30mm - €12.50              │
│   • TB-50 - T-bolt M8 x 50mm - €15.00              │
│   • TB-75 - T-bolt M8 x 75mm - €18.50              │
│                                                     │
│ How to import?                                      │
│ ○ Create 3 separate product pages                   │
│ ● Create 1 product page with size dropdown          │
│                                                     │
│ Variant attribute name: [Size ▼]                    │
└─────────────────────────────────────────────────────┘

[Apply same choice to all similar groups]
```

### 1.6 Duplicate Handling

**Requirements:**
- Match existing products by Reference (primary key)
- For each duplicate, show diff:
  - Fields that changed (highlight)
  - Old value vs New value
- **User options:**
  - Update all fields
  - Update only changed fields
  - Skip (keep existing)
  - Create as new (different ref)

**UI:**
```
Existing Products Found (234):

┌──────────────────────────────────────────────────────┐
│ TB-30 - T-bolt M8 x 30mm                             │
│                                                      │
│ Changes detected:                                    │
│   Price: €12.50 → €13.00 (changed)                  │
│   Stock: 150 → 200 (changed)                        │
│   Name: (unchanged)                                  │
│                                                      │
│ Action: ○ Update  ○ Skip  ○ Create New              │
└──────────────────────────────────────────────────────┘

Bulk actions:
[Update All Changed] [Skip All] [Review Each]
```

### 1.7 Import Preview & Confirmation

**Requirements:**
- Final summary before import
- Breakdown by action type
- Estimated time
- "Import" button with confirmation
- Progress bar during import
- Error handling with rollback option

**UI:**
```
Ready to Import

Summary:
┌────────────────────────────────────┐
│ New products to create:       856  │
│ Existing products to update:  234  │
│ Variants to create:            45  │
│ Categories to create:          12  │
│ Rows to skip:                 113  │
├────────────────────────────────────┤
│ Total changes:              1,147  │
└────────────────────────────────────┘

Estimated time: ~2 minutes

☑ I understand this will modify my product catalog

[Cancel] [← Back] [Import Now]
```

### 1.8 Import Progress & Results

**Requirements:**
- Real-time progress bar
- Current action display
- Error log (if any)
- Success summary
- Option to download error report
- Option to undo import (within 24h)

**UI:**
```
Importing... (45%)

Current: Creating product TB-234...

Progress:
████████████░░░░░░░░░░░░ 512 / 1,147

Errors: 3 (will be skipped)
- Row 234: Invalid price format "N/A"
- Row 567: Missing required field "Reference"
- Row 890: Duplicate reference "TB-001"

[View Error Details]
```

---

## 🔴 PRIORITY 2: Product Management

### 2.1 Products List Page

**Location:** `/dashboard/products`

**Requirements:**
- Table view with columns:
  - Checkbox (for bulk select)
  - Photo thumbnail
  - Reference
  - Name
  - Category
  - Price (EUR)
  - Stock
  - Status (Active/Inactive)
  - Actions
- Search bar (search ref, name)
- Filters:
  - Category dropdown
  - Status (All, Active, Inactive)
  - Has variants (Yes/No)
  - Stock (In stock, Low stock, Out of stock)
- Sort by any column
- Pagination (25, 50, 100 per page)
- Bulk actions:
  - Activate selected
  - Deactivate selected
  - Delete selected
  - Export selected

### 2.2 Product Form (Create/Edit)

**Location:** `/dashboard/products/new`, `/dashboard/products/[id]/edit`

**Sections:**

**Basic Information:**
- Reference * (unique, readonly after creation)
- Name (English) *
- Name (Chinese) - auto-translate button
- Description (rich text)
- Category *
- Subcategory

**Pricing:**
- Price RMB (cost)
- Price EUR (distributor)
- Price USD (distributor)
- Direct Price EUR (optional)
- RRP EUR (optional)

**Inventory:**
- Stock quantity
- MOQ (minimum order quantity)
- Stock location (China / Netherlands)

**Details:**
- Material
- Weight (kg)
- HS Code (for export)
- Dimensions (L x W x H)

**Photos:**
- Main photo (required)
- Gallery photos (drag to reorder)
- Upload from computer
- Paste URL

**Custom Attributes:**
- Add custom field button
- Field name + Field value pairs
- Flexible JSON storage

**Variants (if applicable):**
- Variant attribute (e.g., "Size")
- List of variants with:
  - Value (e.g., "30mm")
  - SKU suffix
  - Price adjustment (+/- or absolute)
  - Stock

**SEO & Display:**
- Sort order (manual)
- Featured (yes/no)
- Tags (for search)

### 2.3 Product Variants System

**Data Model:**
```typescript
interface Product {
  id: string
  ref: string
  name: string
  // ... other fields
  hasVariants: boolean
  variantAttribute?: string // e.g., "Size", "Color"
  variants?: ProductVariant[]
}

interface ProductVariant {
  id: string
  productId: string
  value: string        // e.g., "30mm", "Red"
  sku: string          // e.g., "TB-30"
  priceAdjustment?: number  // +5.00 or -2.00
  absolutePrice?: number    // Override base price
  stock: number
  isDefault: boolean
}
```

**Catalog Display:**
- Single product card
- Dropdown to select variant
- Price updates based on selection
- Stock updates based on selection
- Add to cart adds specific variant

### 2.4 Duplicate Product

**Requirements:**
- "Duplicate" button on product detail
- Opens form pre-filled with all data
- Reference field cleared (must enter new)
- Photos copied
- Variants copied (optional checkbox)
- Save as new product

---

## 🟠 PRIORITY 3: Customer Management

### 3.1 Customers List Page

**Location:** `/dashboard/customers`

**Requirements:**
- Table with columns:
  - Company name
  - Contact name
  - Country
  - Price type
  - Total orders
  - Total revenue
  - Status
  - Actions
- Search
- Filters: Country, Price type, Status
- Sort by any column
- Pagination

### 3.2 Customer Form

**Location:** `/dashboard/customers/new`, `/dashboard/customers/[id]/edit`

**Sections:**

**Company Information:**
- Company name *
- Legal name
- VAT number
- Country *
- Currency *
- Language (EN/CN/etc.)

**Contact:**
- Primary contact name *
- Email *
- Phone
- Additional contacts (add multiple)

**Addresses:**
- Shipping address (add multiple)
- Billing address (add multiple)
- Default shipping address
- Default billing address

**Pricing & Billing:**
- Price type * (Distributor / Direct)
- Payment terms (Net 30, Net 60, etc.)
- Credit limit
- Global discount (%)
- Auto-invoicing (ON/OFF)
- Late surcharge (ON/OFF)
- Allowed invoice currencies (multi-select)

**Customer-Specific Pricing:**
- Override prices for specific products
- Table: Product | Standard Price | Customer Price
- Search products to add overrides

**Notes:**
- Internal notes (not visible to customer)
- Account manager assignment

### 3.3 Customer Detail View

**Location:** `/dashboard/customers/[id]`

**Tabs:**
- Overview (summary, recent orders)
- Orders (full order history)
- Quotes (quote history)
- Invoices (invoice history)
- Pricing (custom prices)
- Settings (all settings)
- Notes & Activity

---

## 🟠 PRIORITY 4: Order Management (Admin)

### 4.1 Orders List Page

**Location:** `/dashboard/orders`

**Requirements:**
- Table with columns:
  - Order number
  - Customer
  - Date
  - Status
  - Items count
  - Total
  - Loading date
  - Actions
- Search (order number, PO, customer)
- Filters:
  - Status (all statuses)
  - Customer (dropdown)
  - Date range
  - Amount range
- Sort by any column
- Pagination

### 4.2 Order Detail View (Admin)

**Location:** `/dashboard/orders/[id]`

**Sections:**

**Header:**
- Order number, status badge
- Customer info (link to customer)
- Dates (ordered, loading, delivered)
- Action buttons

**Order Lines:**
- Table: Product | Ref | Qty | Unit Price | Total
- Edit quantities
- Add products
- Remove products
- **"Modify Order" button** → opens modification flow

**Pricing:**
- Subtotal
- Additional charges (list)
- Late surcharge (if applicable)
- Total

**Timeline/Audit:**
- Full history of all changes
- Who changed what, when
- Diff view for modifications

**Shipping:**
- Shipping method
- Tracking number (editable)
- Tracking URL
- Loading date (editable)

**Documents:**
- Generate/download order confirmation
- Generate invoice
- View packing list

### 4.3 Order Modification Flow (Admin)

**Requirements:**
- "Modify Order" button
- Opens modification interface
- Change quantities
- Add/remove products
- **Diff view:**
  - Red: removed items/quantities
  - Green: added items/quantities
  - Yellow: modified quantities
- Calculate late surcharge automatically
- Option to waive surcharge
- Reason field (required)
- Save creates new version
- Notification to customer

### 4.4 Create Order for Customer

**Location:** `/dashboard/orders/new`

**Requirements:**
- Select customer
- Browse/search products
- Add to order
- Set shipping details
- Review and create
- Option to send notification to customer

---

## 🟡 PRIORITY 5: Invoice Management

### 5.1 Invoices List Page

**Location:** `/dashboard/invoices`

**Requirements:**
- Table: Invoice #, Customer, Order #, Date, Amount, Status
- Filters: Status (Draft, Sent, Paid, Overdue), Date, Customer
- Search
- Pagination

### 5.2 Generate Invoice

**From:** Order detail page

**Steps:**
1. Click "Generate Invoice"
2. Review auto-populated data:
   - Lines from order
   - Customer billing info
   - Prices and totals
3. Add extra lines if needed:
   - Shipping cost
   - Late surcharge
   - Discount
   - Custom line
4. Set:
   - Invoice date
   - Due date
   - Incoterm (FOB, CIF, EXW, etc.)
   - Exchange rate (if multi-currency)
5. Preview PDF
6. Save & Send or Save as Draft

### 5.3 Invoice PDF Template

**Requirements:**
- Company header with logo
- Invoice number, dates
- Bill To address
- Ship To address (optional)
- Lines table with quantities and prices
- Subtotal, extra charges, total
- Incoterm and exchange rate
- Bank details
- Payment terms
- Notes
- Footer

---

## 🟢 PRIORITY 6: Company Settings

### 6.1 Company Information

**Location:** `/dashboard/settings/company`

- Company name
- Legal name
- Address
- Phone, Email, Website
- Logo upload
- VAT number
- Registration number

### 6.2 Bank Details

**Location:** `/dashboard/settings/bank`

- Bank name
- Account name
- Account number
- SWIFT/BIC code
- IBAN
- Bank address

### 6.3 Order Rules

**Location:** `/dashboard/settings/orders`

- Late modification rules:
  - Days before loading for each tier
  - Surcharge amount or percentage
  - Enable/disable per tier
- Default loading lead time
- Order number format
- Auto-confirm orders (ON/OFF)

### 6.4 Invoice Settings

**Location:** `/dashboard/settings/invoices`

- Invoice number format
- Default payment terms
- Default incoterm
- Auto-send on generation (ON/OFF)
- Reminder emails (ON/OFF)

### 6.5 Currencies

**Location:** `/dashboard/settings/currencies`

- Base currency (RMB)
- Supported currencies list
- Exchange rates (manual entry)
- Auto-update rates (API - optional)
- Last updated date

### 6.6 Translation Glossary

**Location:** `/dashboard/settings/glossary`

- Custom EN↔CN term pairs
- Applied before DeepL translation
- Table: English | Chinese | Actions
- Add/Edit/Delete terms

---

## 🟢 PRIORITY 7: User Management

### 7.1 Users List

**Location:** `/dashboard/settings/users`

- Table: Name, Email, Role, Status, Last login
- Filters: Role, Status
- Search

### 7.2 User Form

**Fields:**
- Name *
- Email *
- Role * (Admin, Commercial, Warehouse, Distributor)
- Language preference
- Customer link (for Distributor role)
- Active (ON/OFF)

### 7.3 Invite User

- Enter email
- Select role
- Send invitation email
- User receives link to set up account

---

## 🟢 PRIORITY 8: Warehouse Interface

### 8.1 Orders List (Chinese)

**Location:** `/warehouse/orders`

**Language:** Chinese only

**Requirements:**
- Simple list of orders to prepare
- Filter by status (Confirmed, Preparing, Ready)
- Order card shows:
  - Order number
  - Customer name
  - Number of items
  - Requested date
  - **NO PRICES**

### 8.2 Order Detail (Chinese)

**Location:** `/warehouse/orders/[id]`

**Requirements:**
- Order number and customer
- List of products:
  - Photo
  - Chinese name
  - Reference
  - Quantity
  - **NO PRICES**
- Checkboxes to mark items as picked
- "Mark as Prepared" button
- Print packing list
- Warehouse notes field

---

## 📋 Database Schema Additions

### Product Variants
```prisma
model ProductVariant {
  id              String   @id @default(cuid())
  productId       String
  product         Product  @relation(fields: [productId], references: [id])
  value           String   // "30mm", "Red"
  sku             String   // Full SKU
  priceAdjustment Float?   // +/- from base
  absolutePrice   Float?   // Override
  stock           Int      @default(0)
  isDefault       Boolean  @default(false)
  sortOrder       Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Custom Attributes
```prisma
model ProductAttribute {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  name      String   // "Certification", "Origin"
  value     String   // "ISO 9001", "China"
  sortOrder Int      @default(0)
}
```

### Customer Settings
```prisma
model CustomerSettings {
  id                  String   @id @default(cuid())
  customerId          String   @unique
  customer            Customer @relation(fields: [customerId], references: [id])
  autoInvoicing       Boolean  @default(true)
  lateSurchargeEnabled Boolean @default(true)
  allowedCurrencies   String[] // ["EUR", "USD"]
  globalDiscount      Float?   // 0.05 = 5%
  creditLimit         Float?
}
```

### Customer-Specific Pricing
```prisma
model CustomerPrice {
  id         String   @id @default(cuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
  productId  String
  product    Product  @relation(fields: [productId], references: [id])
  price      Float
  currency   String
  
  @@unique([customerId, productId])
}
```

---

## ✅ Acceptance Criteria Summary

### Import System
- [ ] Can upload Excel with multiple sheets
- [ ] Can upload CSV
- [ ] Columns auto-detected correctly >80% of time
- [ ] Can manually map any column
- [ ] Variants detected and grouped
- [ ] User can choose separate pages vs dropdown for variants
- [ ] Duplicates shown with diff
- [ ] Import completes without errors
- [ ] Can rollback failed import

### Product Management
- [ ] Can create product with all fields
- [ ] Can edit product
- [ ] Can duplicate product
- [ ] Can create product with variants
- [ ] Variants show as dropdown in catalog
- [ ] Can add custom attributes
- [ ] Can upload multiple photos
- [ ] Can bulk edit products
- [ ] Can soft delete products

### Customer Management
- [ ] Can create customer with all settings
- [ ] Per-customer settings work correctly
- [ ] Custom pricing applied in orders
- [ ] Customer order history accurate

### Order Management
- [ ] Admin can view all orders
- [ ] Admin can modify orders
- [ ] Diff view shows changes correctly
- [ ] Late surcharge calculated correctly
- [ ] Audit trail complete

### Invoices
- [ ] Can generate invoice from order
- [ ] Extra lines work
- [ ] PDF renders correctly
- [ ] Can email invoice

### Warehouse
- [ ] Chinese interface only
- [ ] NO prices visible anywhere
- [ ] Can mark orders as prepared
