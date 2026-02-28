-- Migration: Replace basic audit_logs with complete audit log system
-- Date: 2026-02-22

-- Drop existing basic table
DROP TABLE IF EXISTS audit_logs;

-- Create complete audit_logs table
CREATE TABLE audit_logs (
  id           TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id   TEXT         NOT NULL,

  -- Who
  user_id      TEXT,
  user_email   TEXT,
  user_role    TEXT,
  ip_address   TEXT,
  user_agent   TEXT,

  -- What
  action       TEXT         NOT NULL,
  entity_type  TEXT         NOT NULL,
  entity_id    TEXT,

  -- Details
  changes      JSONB,
  metadata     JSONB,

  -- When
  timestamp    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_company_id        ON audit_logs (company_id);
CREATE INDEX idx_audit_logs_company_entity    ON audit_logs (company_id, entity_type);
CREATE INDEX idx_audit_logs_company_user      ON audit_logs (company_id, user_id);
CREATE INDEX idx_audit_logs_company_timestamp ON audit_logs (company_id, timestamp DESC);
CREATE INDEX idx_audit_logs_entity            ON audit_logs (entity_type, entity_id);

-- RLS: Each company can only read its own logs; nobody can INSERT/UPDATE/DELETE through the app layer
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role (used by Prisma) can do everything
CREATE POLICY "service_full_access" ON audit_logs
  USING (true)
  WITH CHECK (true);

-- No authenticated user policy needed — access only via API (which filters by companyId)
