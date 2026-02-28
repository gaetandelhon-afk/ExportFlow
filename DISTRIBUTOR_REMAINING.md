# OrderBridge - Distributor Remaining Task

## Order Modification with Diff View

**Priority:** CRITICAL (Pain point #1, main differentiator)

---

## Overview

This is the **#1 feature** that differentiates OrderBridge from competitors. Currently, when a distributor wants to modify an order, they have to do LINE-BY-LINE comparison of Excel files (30-60 minutes per modification).

OrderBridge should provide:
- Easy modification interface
- Visual diff view (what changed)
- Automatic late surcharge calculation
- Audit trail

---

## User Flow

### 1. Access Modification

**From:** My Orders page or Order Detail page

**Condition:** Order status is `pending` or `confirmed`

**Button:** "Modify Order" (appears only for modifiable orders)

---

### 2. Modification Interface

**Page:** `/my-orders/[id]/modify`

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Modify Order ORD-20250125                               │
│ ← Back to Order                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Current Items                          Add Products     │
│ ┌─────────────────────────────────┐   ┌──────────────┐ │
│ │ Product | Qty | Price | Actions │   │ Search...    │ │
│ │─────────────────────────────────│   │              │ │
│ │ T-bolt  | [5] | €12.50 | 🗑️    │   │ Product list │ │
│ │ Cleat   | [2] | €45.00 | 🗑️    │   │ to add...    │ │
│ │ Hinge   | [3] | €28.00 | 🗑️    │   │              │ │
│ └─────────────────────────────────┘   └──────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Summary                                             │ │
│ │ Original Total: €234.50                             │ │
│ │ New Total: €289.00                                  │ │
│ │ Difference: +€54.50                                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [Cancel] [Preview Changes]                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Edit quantities inline (input field)
- Remove items (trash icon)
- Add new products (search panel on right)
- Running total calculation
- Show difference from original

---

### 3. Diff View (Preview Changes)

**Modal or Page:** Shows exact changes before confirmation

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Review Changes                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Changes Summary:                                        │
│ • 2 items modified                                      │
│ • 1 item removed                                        │
│ • 1 item added                                          │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ MODIFIED                                            │ │
│ │ T-bolt 30mm                                         │ │
│ │   Quantity: 5 → 8 (+3)                    🟡        │ │
│ │   Line total: €62.50 → €100.00                      │ │
│ │                                                     │ │
│ │ Cleat Chrome                                        │ │
│ │   Quantity: 2 → 1 (-1)                    🟡        │ │
│ │   Line total: €90.00 → €45.00                       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ REMOVED                                   🔴        │ │
│ │ Hinge Stainless                                     │ │
│ │   Was: 3 × €28.00 = €84.00                          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ADDED                                     🟢        │ │
│ │ Rope Cleat Mini                                     │ │
│ │   New: 4 × €15.00 = €60.00                          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ PRICING                                             │ │
│ │ Original Total:    €234.50                          │ │
│ │ New Subtotal:      €205.00                          │ │
│ │ Late Surcharge:    €50.00 (order is 12 days before  │ │
│ │                    loading)                         │ │
│ │ ─────────────────────────────                       │ │
│ │ NEW TOTAL:         €255.00                          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Reason for modification: [Required field            ]   │
│                                                         │
│ [← Back to Edit] [Confirm Modification]                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Color Coding:**
- 🟢 Green: Added items
- 🔴 Red: Removed items
- 🟡 Yellow/Orange: Modified quantities

---

### 4. Late Surcharge Calculation

**Business Rules:**

| Days Before Loading | Surcharge |
|---------------------|-----------|
| > 30 days | €0 (free) |
| 15-30 days | €0 (warning shown) |
| 7-14 days | €50 or 2% of order |
| < 7 days | €100 or 5% of order |
| After loading | Modification blocked |

**Implementation:**
```typescript
function calculateLateSurcharge(order: Order): { amount: number; message: string } {
  const loadingDate = new Date(order.loadingDate)
  const today = new Date()
  const daysUntilLoading = Math.ceil((loadingDate - today) / (1000 * 60 * 60 * 24))
  
  if (daysUntilLoading <= 0) {
    return { amount: -1, message: "Order cannot be modified after loading" }
  }
  if (daysUntilLoading < 7) {
    const surcharge = Math.max(100, order.subtotal * 0.05)
    return { amount: surcharge, message: `Urgent modification fee (${daysUntilLoading} days before loading)` }
  }
  if (daysUntilLoading < 15) {
    const surcharge = Math.max(50, order.subtotal * 0.02)
    return { amount: surcharge, message: `Late modification fee (${daysUntilLoading} days before loading)` }
  }
  if (daysUntilLoading < 30) {
    return { amount: 0, message: "Modification allowed (15-30 days before loading)" }
  }
  return { amount: 0, message: "Free modification (>30 days before loading)" }
}
```

---

### 5. Confirmation & Audit

**After Confirmation:**
1. Order updated with new items/quantities
2. Order version incremented
3. Status history entry added:
   ```typescript
   {
     status: "modified",
     date: new Date().toISOString(),
     note: "Order modified by customer. Reason: [user input]. Changes: 2 modified, 1 removed, 1 added."
   }
   ```
4. Notification created
5. (Future) Email sent to admin
6. Redirect to order detail with success message

**Audit Trail Storage:**
```typescript
interface OrderModification {
  id: string
  orderId: string
  version: number
  timestamp: string
  modifiedBy: string
  reason: string
  changes: {
    type: "added" | "removed" | "modified"
    productId: string
    productName: string
    oldQuantity?: number
    newQuantity?: number
    oldLineTotal?: number
    newLineTotal?: number
  }[]
  surchargeApplied: number
  previousTotal: number
  newTotal: number
}
```

---

## Data Model Updates

### Order Type (add fields)
```typescript
interface Order {
  // ... existing fields
  version: number              // Increment on each modification
  loadingDate?: string         // Required for surcharge calculation
  modifications: OrderModification[]  // History of modifications
}
```

### DistributorContext Updates

Add method:
```typescript
modifyOrder(
  orderId: string, 
  newItems: OrderItem[], 
  reason: string
): { success: boolean; surcharge: number }
```

---

## Files to Create/Modify

### New Files:
1. `src/app/(distributor)/my-orders/[id]/modify/page.tsx` - Modification interface
2. `src/components/OrderDiffView.tsx` - Diff view component
3. `src/lib/orderModification.ts` - Surcharge calculation logic

### Modify:
1. `src/contexts/DistributorContext.tsx` - Add `modifyOrder` method
2. `src/app/(distributor)/my-orders/[id]/page.tsx` - Add "Modify Order" button
3. `src/app/(distributor)/my-orders/page.tsx` - Add "Modify" action to order cards

---

## UI Components Needed

### DiffBadge
```tsx
function DiffBadge({ type }: { type: "added" | "removed" | "modified" }) {
  const config = {
    added: { label: "Added", color: "var(--color-success)", bg: "rgba(52, 199, 89, 0.1)" },
    removed: { label: "Removed", color: "var(--color-error)", bg: "rgba(255, 59, 48, 0.1)" },
    modified: { label: "Modified", color: "var(--color-warning)", bg: "rgba(255, 149, 0, 0.1)" }
  }
  // ... render
}
```

### QuantityChange
```tsx
function QuantityChange({ from, to }: { from: number; to: number }) {
  const diff = to - from
  const color = diff > 0 ? "var(--color-success)" : "var(--color-error)"
  return (
    <span>
      {from} → {to} 
      <span style={{ color }}>({diff > 0 ? "+" : ""}{diff})</span>
    </span>
  )
}
```

---

## Estimated Time: 3-4 days

- Day 1: Modification interface (edit quantities, add/remove products)
- Day 2: Diff view component and preview
- Day 3: Surcharge calculation, audit trail, context updates
- Day 4: Testing, edge cases, polish
