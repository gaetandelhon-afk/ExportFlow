-- ============================================
-- Sync missing tables from Prisma schema
-- Safe to re-run: uses IF NOT EXISTS everywhere
-- ============================================

-- Enums (IF NOT EXISTS)
DO $$ BEGIN CREATE TYPE "SubstitutionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'BALANCE', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'PREPARING', 'LOADING', 'SHIPPED', 'DELIVERED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TransportMethod" AS ENUM ('SEA_FREIGHT', 'AIR_FREIGHT', 'RAIL_FREIGHT', 'ROAD_FREIGHT', 'EXPRESS_COURIER', 'FACTORY_PICKUP', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PackingListType" AS ENUM ('EXPORT', 'FACTORY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PackingListStatus" AS ENUM ('DRAFT', 'GENERATED', 'SENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LedgerEntryType" AS ENUM ('OPENING_BALANCE', 'INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'ADJUSTMENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- shipping_agents
CREATE TABLE IF NOT EXISTS "shipping_agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT NOT NULL,
    CONSTRAINT "shipping_agents_pkey" PRIMARY KEY ("id")
);

-- substitution_requests
CREATE TABLE IF NOT EXISTS "substitution_requests" (
    "id" TEXT NOT NULL,
    "status" "SubstitutionStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalQty" INTEGER NOT NULL,
    "substituteQty" INTEGER,
    "adminNotes" TEXT,
    "customerResponse" TEXT,
    "respondedAt" TIMESTAMP(3),
    "orderId" TEXT NOT NULL,
    "orderLineId" TEXT,
    "originalProductId" TEXT NOT NULL,
    "substituteProductId" TEXT,
    CONSTRAINT "substitution_requests_pkey" PRIMARY KEY ("id")
);

-- order_payments
CREATE TABLE IF NOT EXISTS "order_payments" (
    "id" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "depositRequired" DECIMAL(65,30),
    "depositPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "balanceRequired" DECIMAL(65,30),
    "balancePaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "depositDueDate" TIMESTAMP(3),
    "balanceDueDate" TIMESTAMP(3),
    "orderId" TEXT NOT NULL,
    CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id")
);

-- payment_records
CREATE TABLE IF NOT EXISTS "payment_records" (
    "id" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "reference" TEXT,
    "method" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderPaymentId" TEXT NOT NULL,
    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- packing_lists
CREATE TABLE IF NOT EXISTS "packing_lists" (
    "id" TEXT NOT NULL,
    "packingListNumber" TEXT NOT NULL,
    "type" "PackingListType" NOT NULL DEFAULT 'EXPORT',
    "status" "PackingListStatus" NOT NULL DEFAULT 'DRAFT',
    "language" TEXT NOT NULL DEFAULT 'en',
    "mode" TEXT NOT NULL DEFAULT 'simple',
    "pdfUrl" TEXT,
    "orderId" TEXT,
    "shipmentId" TEXT,
    "totalPackages" INTEGER,
    "totalNetWeight" DECIMAL(65,30),
    "totalGrossWeight" DECIMAL(65,30),
    "totalWeight" DECIMAL(65,30),
    "totalCbm" DECIMAL(65,30),
    "totalCartons" INTEGER,
    "groupByHsCode" BOOLEAN NOT NULL DEFAULT false,
    "shipper" TEXT,
    "shipperTaxId" TEXT,
    "consignee" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "shippingPort" TEXT,
    "destinationPort" TEXT,
    "headerText" TEXT,
    "footerText" TEXT,
    "customNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "sentTo" TEXT,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "packing_lists_pkey" PRIMARY KEY ("id")
);

-- packing_list_lines
CREATE TABLE IF NOT EXISTS "packing_list_lines" (
    "id" TEXT NOT NULL,
    "packingListId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT,
    "hsCode" TEXT,
    "specification" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "packages" INTEGER NOT NULL DEFAULT 1,
    "packageNumber" INTEGER,
    "netWeight" DECIMAL(65,30),
    "grossWeight" DECIMAL(65,30),
    "cbm" DECIMAL(65,30),
    "groupedProductIds" TEXT,
    "isGrouped" BOOLEAN NOT NULL DEFAULT false,
    "groupName" TEXT,
    "lineNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "packing_list_lines_pkey" PRIMARY KEY ("id")
);

-- grouped_invoices
CREATE TABLE IF NOT EXISTS "grouped_invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "pdfUrl" TEXT,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "grouped_invoices_pkey" PRIMARY KEY ("id")
);

-- grouped_invoice_orders
CREATE TABLE IF NOT EXISTS "grouped_invoice_orders" (
    "id" TEXT NOT NULL,
    "groupedInvoiceId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "grouped_invoice_orders_pkey" PRIMARY KEY ("id")
);

-- customer_ledger_entries
CREATE TABLE IF NOT EXISTS "customer_ledger_entries" (
    "id" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "invoiceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "customerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "customer_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- Unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "order_payments_orderId_key" ON "order_payments"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "shipment_orders_shipmentId_orderId_key" ON "shipment_orders"("shipmentId", "orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "packing_lists_companyId_packingListNumber_key" ON "packing_lists"("companyId", "packingListNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "grouped_invoices_companyId_invoiceNumber_key" ON "grouped_invoices"("companyId", "invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "grouped_invoice_orders_groupedInvoiceId_orderId_key" ON "grouped_invoice_orders"("groupedInvoiceId", "orderId");
CREATE INDEX IF NOT EXISTS "customer_ledger_entries_customerId_date_idx" ON "customer_ledger_entries"("customerId", "date");
CREATE INDEX IF NOT EXISTS "customer_ledger_entries_companyId_customerId_idx" ON "customer_ledger_entries"("companyId", "customerId");

-- Foreign keys (use DO block to skip if already exists)
DO $$ BEGIN
  ALTER TABLE "shipping_agents" ADD CONSTRAINT "shipping_agents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "substitution_requests" ADD CONSTRAINT "substitution_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "substitution_requests" ADD CONSTRAINT "substitution_requests_originalProductId_fkey" FOREIGN KEY ("originalProductId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "substitution_requests" ADD CONSTRAINT "substitution_requests_substituteProductId_fkey" FOREIGN KEY ("substituteProductId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_orderPaymentId_fkey" FOREIGN KEY ("orderPaymentId") REFERENCES "order_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "packing_lists" ADD CONSTRAINT "packing_lists_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "packing_list_lines" ADD CONSTRAINT "packing_list_lines_packingListId_fkey" FOREIGN KEY ("packingListId") REFERENCES "packing_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "grouped_invoice_orders" ADD CONSTRAINT "grouped_invoice_orders_groupedInvoiceId_fkey" FOREIGN KEY ("groupedInvoiceId") REFERENCES "grouped_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "customer_ledger_entries" ADD CONSTRAINT "customer_ledger_entries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Verify all tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
