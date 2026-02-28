# OrderBridge - Cursor Initial Prompt

Copy this entire prompt when starting a new Cursor session for OrderBridge development.

---

## 🚀 PROJECT CONTEXT

I'm building **OrderBridge**, a B2B ordering portal for Western brands sourcing from China. 

**Key differentiators:**
- Automatic EN↔CN translation
- Visual product catalog with mandatory photos
- Order modification tracking with diff view
- Separate Chinese warehouse interface (no prices)
- Late order surcharge management

**Tech Stack:**
- Next.js 16+ (App Router, Turbopack)
- TypeScript (strict)
- Tailwind CSS with CSS variables (Apple-style design)
- PostgreSQL via Supabase
- Prisma 5.x ORM
- jsPDF for PDF generation

**Current State:**
- ✅ Distributor portal is ~95% complete (catalog, cart, checkout, quotes, orders)
- 🔄 Admin portal needs to be built from scratch
- 🔄 Warehouse portal not started

---

## 📁 KEY FILES TO READ

Before making changes, please read these files for context:

1. **`.cursorrules`** - Complete project rules and conventions
2. **`docs/CURRENT_STATE.md`** - What's built and what's remaining
3. **`docs/ADMIN_TASKS.md`** - Detailed admin feature specifications
4. **`src/contexts/DistributorContext.tsx`** - State management patterns
5. **`src/config/features.ts`** - Company configuration
6. **`src/app/globals.css`** - CSS variables and base styles

---

## 🎨 DESIGN RULES (CRITICAL)

**DO:**
- Use CSS variables: `var(--color-text-primary)`, `var(--color-brand-primary)`, etc.
- Use existing classes: `.card`, `.btn-primary`, `.btn-secondary`, `.input-field`
- Keep interfaces minimal and clean (Apple-style)
- Use generous whitespace
- Provide complete files, not partial changes

**DON'T:**
- Use emojis in UI
- Use bullet points in UI text
- Use dark backgrounds
- Use gradients
- Use hardcoded colors (always use CSS variables)
- Use shadcn or other UI libraries (we use custom components)

---

## 🔴 CURRENT TASK: Admin Portal

### Recommended Development Order:

1. **Admin Layout & Navigation** (first)
   - Create `(dashboard)/layout.tsx` with sidebar
   - Navigation: Dashboard, Products, Customers, Orders, Invoices, Settings
   - User dropdown with logout

2. **Dashboard Page**
   - Stats cards: Total products, customers, orders, revenue
   - Recent orders list
   - Pending actions

3. **Excel/CSV Import** (CRITICAL)
   - Multi-sheet Excel support
   - Column mapping interface
   - Variant detection ("T-bolt 30mm" + "T-bolt 50mm")
   - User choice: separate pages OR single page with dropdown
   - Preview before import
   - Duplicate handling with diff

4. **Product Management**
   - Products list with search, filters, pagination
   - Product CRUD
   - **Product variants system** (size, color dropdowns)
   - Custom attributes (flexible fields)
   - Photo upload

5. **Customer Management**
   - Customer list
   - Customer CRUD
   - **Per-customer settings:**
     - Auto-invoicing ON/OFF
     - Late surcharge ON/OFF
     - Allowed currencies
     - Price type
     - Payment terms
     - Global discount

6. **Order Management (Admin)**
   - All orders list
   - Order detail view
   - Modify order with diff view
   - Audit trail

7. **Invoice Management**
   - Generate from order
   - Extra lines (shipping, fees)
   - PDF generation

---

## 📝 SPECIFIC REQUIREMENTS

### Product Variants
When importing or creating products, variants should work like this:
- "T-bolt 30mm", "T-bolt 50mm", "T-bolt 75mm" can be:
  - **Option A:** 3 separate product pages
  - **Option B:** 1 product page with "Size" dropdown
- User chooses during import
- In catalog, variant products show dropdown selector
- Price can vary per variant

### Customer Settings
Each customer can have individual settings:
```typescript
{
  autoInvoicing: boolean,      // Generate invoice automatically
  lateSurchargeEnabled: boolean, // Apply late fees
  allowedCurrencies: string[], // ["EUR", "USD"]
  priceType: "distributor" | "direct",
  paymentTerms: string,        // "Net 30"
  globalDiscount: number       // 0.05 = 5%
}
```

### Warehouse Interface
- **Chinese language only**
- **NO PRICES visible** (critical security requirement)
- Shows only: products, quantities, photos
- Can mark orders as prepared

---

## 🏃 LET'S START

Please begin by:

1. Reading the key files mentioned above
2. Creating the admin layout with navigation
3. Creating a basic dashboard page

When creating files:
- Provide **complete files**, not partial snippets
- Use the established patterns from DistributorContext
- Follow the CSS variable system
- Match the Apple-style design

Let me know when you're ready and I'll provide more specific guidance!

---

## 📚 REFERENCE: CSS Variables

```css
/* Backgrounds */
--color-bg-primary: #f5f5f7;
--color-bg-secondary: #ffffff;
--color-bg-tertiary: #f0f0f2;

/* Text */
--color-text-primary: #1d1d1f;
--color-text-secondary: #86868b;
--color-text-tertiary: #aeaeb2;

/* Brand */
--color-brand-primary: #0071e3;
--color-brand-hover: #0077ed;

/* Status */
--color-success: #34c759;
--color-warning: #ff9500;
--color-error: #ff3b30;

/* Border */
--color-border: rgba(210, 210, 215, 0.3);
```

## 📚 REFERENCE: Component Classes

```css
.card {
  background: var(--color-bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--color-border);
  padding: 24px;
}

.btn-primary {
  background: var(--color-brand-primary);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 500;
}

.btn-secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 500;
}

.input-field {
  background: var(--color-bg-tertiary);
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  width: 100%;
}
```
