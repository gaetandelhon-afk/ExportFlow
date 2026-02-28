# OrderBridge - Current State
## Last Updated: January 30, 2026

---

## 📊 Project Status Overview

| Area | Status | Completion |
|------|--------|------------|
| Distributor Portal | ✅ Functional | ~95% |
| Admin Portal | 🔄 Not Started | 0% |
| Warehouse Portal | 🔄 Not Started | 0% |
| Database (Prisma/Supabase) | ✅ Schema Ready | 100% |
| Authentication | ✅ Working | 100% |

---

## ✅ COMPLETED - Distributor Portal

### Pages & Routes

| Route | File | Description | Status |
|-------|------|-------------|--------|
| `/catalog` | `(distributor)/catalog/page.tsx` | Product catalog | ✅ |
| `/cart` | `(distributor)/cart/page.tsx` | Shopping cart | ✅ |
| `/checkout` | `(distributor)/checkout/page.tsx` | Checkout flow | ✅ |
| `/my-quotes` | `(distributor)/my-quotes/page.tsx` | Quotes list | ✅ |
| `/my-orders` | `(distributor)/my-orders/page.tsx` | Orders list | ✅ |
| `/my-orders/[id]` | `(distributor)/my-orders/[id]/page.tsx` | Order detail | ✅ |
| `/account` | `(distributor)/account/page.tsx` | Account overview | ✅ |
| `/account/addresses` | `(distributor)/account/addresses/page.tsx` | Addresses | ✅ |
| `/account/preferences` | `(distributor)/account/preferences/page.tsx` | Preferences | ✅ |

### Features Implemented

#### Catalog
- ✅ Grid and list views (4 modes: list, grid-small, grid-medium, grid-large)
- ✅ View mode persistence in localStorage
- ✅ Search by name and reference
- ✅ Category filtering
- ✅ Subcategory filtering
- ✅ Add to cart with quantity
- ✅ Stock display
- ✅ Multi-currency indicative prices display
- ✅ "Indicative only" disclaimer

#### Cart
- ✅ Cart items list with photos
- ✅ Quantity adjustment (+/-)
- ✅ Remove items
- ✅ Running subtotal
- ✅ Currency display
- ✅ Proceed to checkout

#### Checkout
- ✅ Shipping address selection
- ✅ Billing address selection (same as shipping option)
- ✅ Shipping method selection (Sea Freight, Air Freight, Customer Pickup)
- ✅ PO number input
- ✅ Requested delivery date
- ✅ Special instructions
- ✅ Order summary
- ✅ Save as Quote
- ✅ Place Order

#### My Quotes
- ✅ Quotes list with status badges
- ✅ Filter by status
- ✅ Search quotes
- ✅ Quote detail view
- ✅ Download Quote PDF
- ✅ Convert Quote to Order
- ✅ Delete Quote
- ✅ Modify Quote (redirects to cart)

#### My Orders
- ✅ Orders list with status badges
- ✅ Filter by status (all, pending, confirmed, preparing, shipped, delivered, cancelled)
- ✅ Filter by date (all time, this month, last 3 months, this year)
- ✅ Sort options (newest, oldest, highest amount, lowest amount)
- ✅ Search by order number, PO, product name
- ✅ Mock orders data (5 sample orders)
- ✅ Order cards with key info

#### Order Actions
- ✅ Reorder (adds items to cart)
- ✅ Download Invoice PDF (shipped/delivered only)
- ✅ Download Packing List PDF (shipped/delivered only)
- ✅ Track Shipment (external link)
- ✅ Cancel Order (pending only, with modal and reason)
- ✅ Contact Support (pre-filled email)
- ✅ View Details

#### Order Detail Page
- ✅ Full order information
- ✅ Status timeline with history
- ✅ Products list with prices
- ✅ Totals breakdown
- ✅ Shipping info and address
- ✅ Billing address (if different)
- ✅ Linked quote reference
- ✅ All action buttons
- ✅ Cancel modal

#### Account
- ✅ Account overview with user info
- ✅ Quick links to sections
- ✅ Recent orders preview

#### Addresses
- ✅ Addresses list
- ✅ Add new address
- ✅ Edit address
- ✅ Delete address
- ✅ Set default address
- ✅ Address types (shipping, billing, both)

#### Preferences
- ✅ Display currency selection
- ✅ Invoice currency selection
- ✅ Indicative currencies selection (multi-select)
- ✅ Save to localStorage

#### PDF Generation
- ✅ Quote PDF with company branding
- ✅ Invoice PDF with payment details
- ✅ Packing List PDF (no prices)

#### Navigation
- ✅ Top navigation bar
- ✅ Logo and company name
- ✅ Main nav links (Catalog, Cart, My Orders, My Quotes)
- ✅ Account dropdown
- ✅ Cart badge with item count
- ✅ Notifications dropdown with badge

---

## 🔄 REMAINING - Distributor Portal

### Order Modification with Diff View (CRITICAL)

This is the **#1 pain point** (10/10) and **main differentiator** of OrderBridge.

**Required Features:**
- [ ] "Modify Order" button on pending/confirmed orders
- [ ] Edit quantities of existing items
- [ ] Add new items to order
- [ ] Remove items from order
- [ ] Diff view showing changes:
  - Red highlighting for removed items/quantities
  - Green highlighting for added items/quantities
  - Yellow for modified quantities
- [ ] Automatic late surcharge calculation based on loading date
- [ ] Admin notification of modification
- [ ] Audit trail entry for every change
- [ ] Version history

---

## 🔄 TODO - Admin Portal

### Priority 1: Dashboard
- [ ] Basic stats cards (total orders, revenue, customers, products)
- [ ] Recent orders list
- [ ] Pending actions alerts
- [ ] Revenue chart (optional for MVP)

### Priority 2: Excel/CSV Import (CRITICAL)
- [ ] File upload (Excel .xlsx, .xls, CSV)
- [ ] Multi-sheet Excel support
- [ ] Column mapping interface
- [ ] Auto-detect column mappings
- [ ] Row classification (product / category header / skip)
- [ ] **Variant detection** (e.g., "T-bolt 30mm" and "T-bolt 50mm")
- [ ] **User choice for variants**: 
  - Option A: Create separate product pages
  - Option B: Create single page with size dropdown
- [ ] Preview before import
- [ ] Diff view for updates ("Price changed from €125 to €130")
- [ ] Duplicate handling options
- [ ] Incremental import support
- [ ] Rollback capability

### Priority 3: Product Management
- [ ] Products list page with table
- [ ] Search and filters
- [ ] Pagination
- [ ] Create product form
- [ ] Edit product form
- [ ] **Product variants system**:
  - Variant attributes (size, color, etc.)
  - Variant-specific prices
  - Variant-specific stock
  - Dropdown selector in catalog
- [ ] **Custom attributes** (flexible JSON fields per product)
- [ ] Photo upload (single and multiple)
- [ ] Photo gallery management
- [ ] Duplicate product function
- [ ] Soft delete (deactivate)
- [ ] Bulk select and actions
- [ ] Category assignment
- [ ] Manual sort order

### Priority 4: Category Management
- [ ] Categories list
- [ ] Create/edit category
- [ ] Two-level hierarchy (parent > child)
- [ ] Assign products to categories
- [ ] Category sort order

### Priority 5: Customer Management
- [ ] Customers list page
- [ ] Create customer form
- [ ] Edit customer form
- [ ] **Per-customer settings**:
  - Auto-invoicing ON/OFF
  - Late surcharge ON/OFF
  - Allowed invoice currencies
  - Price type (distributor/direct)
  - Payment terms (Net 30, etc.)
  - Global discount percentage
- [ ] Customer-specific product pricing
- [ ] Multiple addresses per customer
- [ ] Multiple contacts per customer
- [ ] Customer order history
- [ ] Internal notes

### Priority 6: Order Management (Admin)
- [ ] All orders list
- [ ] Advanced filters (status, customer, date range, amount)
- [ ] Order detail view
- [ ] Change order status
- [ ] **Modify order** (add/remove/edit lines)
- [ ] **Diff view** of modifications
- [ ] Audit trail display
- [ ] Late surcharge calculation
- [ ] Manual surcharge waive
- [ ] Set loading date
- [ ] Order notes (internal)
- [ ] Generate order PDF
- [ ] Create order on behalf of customer

### Priority 7: Invoice Management
- [ ] Generate invoice from order
- [ ] Invoice number auto-generation
- [ ] Add extra lines (shipping, fees, discounts)
- [ ] Incoterms selection
- [ ] Exchange rate input
- [ ] HS codes display
- [ ] Bank details configuration
- [ ] Invoice PDF generation
- [ ] Email invoice to customer
- [ ] Invoices list
- [ ] Payment status (unpaid/paid/overdue)

### Priority 8: Company Settings
- [ ] Company info (name, legal name, address)
- [ ] Logo upload
- [ ] Bank details for invoices
- [ ] Late surcharge rules configuration
- [ ] Supported currencies
- [ ] Exchange rates (manual or API)
- [ ] Email templates
- [ ] Document numbering formats
- [ ] Translation glossary (custom terms EN↔CN)

### Priority 9: User Management
- [ ] Users list
- [ ] Create user
- [ ] Edit user
- [ ] Deactivate user
- [ ] Role assignment (Admin, Commercial, Warehouse, Distributor)
- [ ] Permissions configuration
- [ ] Invite user by email
- [ ] Link distributor user to customer account

---

## 🔄 TODO - Warehouse Portal (Chinese)

- [ ] Orders list (Chinese interface)
- [ ] Order detail (products, quantities, photos)
- [ ] **NO PRICES** - critical security requirement
- [ ] Mark items as picked
- [ ] Mark order as prepared
- [ ] Warehouse notes
- [ ] Print packing list

---

## 🔄 TODO - Boat Configurations (Phase 2)

Complex product configurator for boats:
- [ ] Boat types (Sport, Fishing, Cruiser, etc.)
- [ ] Options catalog per boat type
- [ ] Option rules:
  - Some options only for certain boat types
  - Exclusive options (A OR B, not both)
  - Dependent options (X requires Y)
- [ ] Option pricing (base price + option prices)
- [ ] Visual configurator interface
- [ ] Configuration summary with total price
- [ ] Save configuration to order

---

## 📁 Key Files Reference

### State Management
- `src/contexts/DistributorContext.tsx` - All distributor state, cart, quotes, orders

### Configuration
- `src/config/features.ts` - Company config, pricing levels, document settings

### Data
- `src/data/products.ts` - Mock product catalog (12 products)

### PDF Generation
- `src/lib/generatePdf.ts` - Quote, Invoice, Packing List PDFs

### Hooks
- `src/hooks/usePreferences.ts` - Currency conversion and preferences

### Components
- `src/components/DistributorNavigation.tsx` - Main navigation
- `src/components/ProductCard.tsx` - Product grid card
- `src/components/ProductListItem.tsx` - Product list row

---

## 🔧 Technical Notes

### localStorage Keys Used
```
distributor_cart        - Cart items
distributor_quotes      - Saved quotes
distributor_orders      - Placed orders (non-mock)
distributor_addresses   - Saved addresses
user_preferences        - Currency preferences
catalog_view_mode       - List/grid view preference
```

### Mock Data IDs
- Mock orders use prefix: `ord-mock-`
- Mock addresses use prefix: `addr-`
- User orders use prefix: `ord-` + timestamp

### CSS Classes
```css
.card        - White card with shadow and border
.btn-primary - Blue primary button
.btn-secondary - Gray secondary button
.input-field - Standard text input
```

### Status Colors
```
pending    - Warning (orange)
confirmed  - Brand primary (blue)
preparing  - Brand primary (blue)
shipped    - Success (green)
delivered  - Success (green)
cancelled  - Error (red)
```

---

## 🚀 Next Steps (Recommended Order)

1. **Admin Dashboard** - Basic stats page (1 day)
2. **Admin Layout** - Navigation, sidebar structure (0.5 day)
3. **Excel Import** - Critical feature (1-2 weeks)
4. **Product CRUD** - Basic product management (1 week)
5. **Product Variants** - Size/color dropdowns (3-4 days)
6. **Customer Management** - With per-customer settings (1 week)
7. **Admin Order Management** - View and modify orders (1 week)
8. **Invoice Generation** - From orders (3-4 days)
9. **Distributor Order Modification** - Diff view (3-4 days)
10. **Warehouse Interface** - Chinese, no prices (2-3 days)
