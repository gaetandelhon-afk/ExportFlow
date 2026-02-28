# OrderBridge Platform Audit
## Complete Feature and Integration Audit

Generated: 2026-02-12

---

## 1. SUMMARY OF FIXES APPLIED

### A. Currency Consistency (FIXED)
Created centralized `useLocalization` hook that reads admin currency settings from `orderbridge_localization_settings` localStorage key.

**Files Created:**
- `/src/hooks/useLocalization.ts` - Central hook for localization settings
- `/src/components/CurrencyDisplay.tsx` - Client component for server-rendered pages

**Files Updated for Currency:**
| File | Change |
|------|--------|
| `/src/app/(dashboard)/orders/new/page.tsx` | Replaced hardcoded `€` with `currencySymbol` |
| `/src/app/(dashboard)/orders/page.tsx` | Uses `CurrencyDisplay` component |
| `/src/app/(dashboard)/orders/[id]/page.tsx` | Uses `currencySymbol` from hook |
| `/src/app/(dashboard)/products/page.tsx` | Uses `currencySymbol` from hook |
| `/src/app/(dashboard)/products/new/page.tsx` | Uses `currencySymbol` from hook |
| `/src/app/(dashboard)/products/[id]/page.tsx` | Uses `currencySymbol` from hook |
| `/src/app/(dashboard)/invoices/page.tsx` | Uses `currencySymbol` + `getCurrencySymbol` |
| `/src/app/(dashboard)/invoices/[id]/page.tsx` | Uses `CURRENCY_SYMBOLS` mapping |
| `/src/app/(dashboard)/customers/[id]/page.tsx` | Uses `currencySymbol` from hook |
| `/src/app/(dashboard)/dashboard/page.tsx` | Uses `CurrencyDisplay` component |
| `/src/components/DashboardRevenue.tsx` | Uses `useLocalization` for default currency |
| `/src/contexts/DistributorContext.tsx` | Uses `getDefaultCurrency()` for fallback |

### B. Product Options (WORKING)
Product options are now fully integrated across the platform:

- **Admin - Create product**: Full options editor with groups and choices
- **Admin - Edit product**: Full options editing
- **Admin - Create order**: Options modal when adding products with variants
- **Distributor - Catalog**: Options badge indicator on products
- **Distributor - Product detail**: Full options selection modal
- **Distributor - Cart**: Shows selected options
- **Distributor - Checkout**: Shows selected options
- **Distributor - Order detail**: Shows selected options

**Known Limitation:** OrderLine database model does not have a `selectedOptions` field. Options are passed to order creation but cannot be persisted per line item. This requires a database migration to fix.

### C. Categories/Subcategories (WORKING)
Hierarchical categories are fully integrated:

- **Admin - Settings**: Full CRUD with parent/child relationships
- **Admin - Products list**: Hierarchical filter with parent/subcategory rows
- **Admin - Product forms**: Hierarchical dropdown with optgroups
- **Distributor - Catalog**: Hierarchical filter with parent/subcategory rows
- **API**: Automatic inclusion of subcategories when filtering by parent

---

## 2. ADMIN PORTAL PAGES

### Dashboard (`/dashboard`)
- [x] Display order statistics
- [x] Display revenue metrics (with currency conversion)
- [x] Recent orders list
- [x] Quick actions
- [x] **FIXED**: Revenue currency now reads from localization settings

### Products (`/products`)
- [x] List all products
- [x] Search products
- [x] Filter by category (hierarchical)
- [x] Multiple view modes (list, grid)
- [x] Product count per category
- [x] Link to add new product
- [x] **FIXED**: Currency from localization settings

### Products - New (`/products/new`)
- [x] Basic info (ref, name, description)
- [x] Category selection (hierarchical dropdown)
- [x] Pricing by tier
- [x] Product details (material, weight, etc.)
- [x] **Product Options** (with multiple choices per option)
- [x] Custom fields
- [x] Image upload
- [x] **FIXED**: Currency from localization settings

### Products - Edit (`/products/[id]`)
- [x] Load existing product data
- [x] Edit all fields
- [x] Product options editing
- [x] Image management
- [x] **FIXED**: Currency from localization settings

### Orders (`/orders`)
- [x] List all orders
- [x] Order status badges
- [x] Search orders
- [x] Filter by status
- [x] **FIXED**: Currency from localization settings

### Orders - New (`/orders/new`)
- [x] Select customer
- [x] Select products
- [x] **Product options selection** (modal for products with options)
- [x] Quantity management
- [x] Display selected options in cart
- [x] Order notes
- [x] **FIXED**: Currency from localization settings

### Orders - Detail (`/orders/[id]`)
- [x] Order information display
- [x] Customer details
- [x] Order items list
- [x] Order status management
- [x] Generate invoice/packing list
- [x] **FIXED**: Currency from localization settings
- [ ] **TODO**: Display selected options in order items (requires DB schema update)

### Customers (`/customers`)
- [x] List customers
- [x] Search customers
- [x] Customer status

### Customers - Detail (`/customers/[id]`)
- [x] Customer information
- [x] Order history
- [x] **FIXED**: Currency from localization settings

### Invoices (`/invoices`)
- [x] List invoices
- [x] Invoice status
- [x] **FIXED**: Currency from localization settings

### Invoices - Detail (`/invoices/[id]`)
- [x] Invoice details
- [x] PDF generation
- [x] **FIXED**: Currency mapping from CURRENCY_SYMBOLS

### Settings - Localization (`/settings/localization`)
- [x] Language settings
- [x] Currency settings (default currency selection)
- [x] Date/time format
- [x] Number formatting
- [x] Regional settings
- [x] **NOW**: Settings are read by all pages via `useLocalization` hook

---

## 3. DISTRIBUTOR PORTAL PAGES

### Catalog (`/catalog`)
- [x] List products
- [x] Search products
- [x] Filter by category (hierarchical)
- [x] Multiple view modes
- [x] Favorite products
- [x] Product options indicator
- [x] **FIXED**: Uses admin default currency when user has no preference

### Catalog - Detail (`/catalog/[id]`)
- [x] Product details
- [x] Product images
- [x] **Product options selection**
- [x] Add to cart with options
- [x] Related products

### Cart (`/cart`)
- [x] List cart items
- [x] Show selected options
- [x] Quantity management
- [x] Remove items
- [x] Subtotal calculation

### Checkout (`/checkout`)
- [x] Address selection
- [x] Shipping method
- [x] Order notes
- [x] Order summary
- [x] **Selected options displayed**

### My Orders (`/my-orders`)
- [x] List orders
- [x] Order status
- [x] Reorder functionality (with options)

### My Orders - Detail (`/my-orders/[id]`)
- [x] Order details
- [x] Order items with **selected options displayed**
- [x] Reorder with options

---

## 4. SHARED COMPONENTS

### ProductOptionsEditor (Admin)
- [x] Add option groups
- [x] Add choices per option
- [x] Price modifier per choice
- [x] SKU suffix
- [x] Description
- [x] Image upload
- [x] Default selection
- [x] All buttons have `type="button"` (prevents form submission)

### ProductOptionSelector (Distributor)
- [x] Option group display
- [x] Option selection
- [x] Price modifier display
- [x] Total price calculation
- [x] Validation for required options

### CurrencyDisplay (NEW)
- [x] Client component for displaying prices
- [x] Reads from localization settings
- [x] Works in both client and server components

---

## 5. KNOWN ISSUES & LIMITATIONS

### Database Schema
1. **OrderLine.selectedOptions** - Missing field to store selected options per line item
   - Impact: Options are shown during order creation but not persisted
   - Fix: Add `selectedOptions Json?` to OrderLine model and run migration

2. **substitution_requests table** - Does not exist
   - Impact: Substitutions feature won't work
   - Fix: Add model to schema and run migration

### Settings Persistence
- All settings are stored in localStorage (client-side only)
- Settings are not synced across devices/browsers
- Future improvement: Store settings in database per company

### PDF Generation
- Document settings (header/footer customization) not yet applied to PDFs
- Product options not included in PDF line items

---

## 6. HOW TO USE CURRENCY SETTINGS

### Admin: Set Default Currency
1. Go to Settings > Localization
2. Enable the desired currency
3. Click "Set default" on your preferred currency
4. Click "Save Changes"

### How It Works Now
- All admin pages read from `orderbridge_localization_settings`
- Distributor portal uses admin currency as fallback
- If user has specific currency preference, it overrides admin default
- Dashboard revenue auto-converts to configured currency

---

## 7. FILES REFERENCE

### New Files
```
/src/hooks/useLocalization.ts       - Centralized localization hook
/src/components/CurrencyDisplay.tsx - Currency display component
```

### Key Modified Files
```
/src/contexts/DistributorContext.tsx - Uses admin default currency
/src/components/DashboardRevenue.tsx - Uses localization hook
/src/app/(dashboard)/orders/new/page.tsx - Product options + currency
/src/app/(dashboard)/products/page.tsx - Hierarchical categories + currency
```

---

## 7. SHIPMENTS & GROUPED DOCUMENTS (NEW)

### A. Shipments (Container Grouping)
**Purpose:** Group multiple orders (same or different customers) for combined shipping in containers.

**New Database Models:**
- `Shipment` - Container/shipment details (container number, B/L, vessel, ports, dates)
- `ShipmentOrder` - Join table linking orders to shipments
- `PackingList` - Extended to support two types (EXPORT/FACTORY)
- `GroupedInvoice` - Combined invoice for multiple orders

**Admin Pages:**
| Page | Path | Features |
|------|------|----------|
| Shipments List | `/shipments` | View all shipments, filter by status |
| New Shipment | `/shipments/new` | Select orders to group, set container details |
| Shipment Detail | `/shipments/[id]` | View orders, generate packing lists, change status |

**Features:**
- Group orders from same or different customers
- Generate Export Packing List (for customer/customs)
- Generate Factory Packing List (for preparation, in Chinese)
- Generate Combined Invoice (keeping original invoices intact)
- Track shipment status: DRAFT → PREPARING → LOADING → SHIPPED → DELIVERED

### B. Two Types of Packing Lists
**Export Packing List:**
- For customer and customs
- Contains carton numbers, weights, CBM
- Professional format with company branding

**Factory Packing List:**
- For factory preparation
- Configurable language (English, Chinese, or bilingual)
- Shows product images and Chinese names
- Can be sent directly to factory email

**Settings (Documents → Packing Lists):**
- Export: Title, logo, prices, weight, barcode options
- Factory: Title, language, email address, images, Chinese names

### C. Order Page Integration
- **Add to Shipment** button on order detail page
- Pre-selects order when creating new shipment from order page

---

*This audit was generated automatically. Review and update as fixes are implemented.*
*Last updated: 2026-02-12*
