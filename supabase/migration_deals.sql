-- =============================================================
-- Migration: Add Deals table
-- Run this in Supabase SQL Editor if you already have existing tables
-- =============================================================

-- 1. Deals table
CREATE TABLE IF NOT EXISTS deals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             text NOT NULL,
  amount            numeric(12,2),
  status            text NOT NULL DEFAULT 'lead', -- lead, proposal, negotiation, won, lost
  expected_close    date,
  contact_id        uuid REFERENCES contacts(id) ON DELETE SET NULL,
  company_id        uuid REFERENCES companies(id) ON DELETE SET NULL,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_deals_user_id        ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id     ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_company_id     ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_status         ON deals(user_id, status);

-- 3. Enable RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "deals_select" ON deals
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "deals_insert" ON deals
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "deals_update" ON deals
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "deals_delete" ON deals
  FOR DELETE USING (user_id = auth.uid());

-- 5. Auto-update trigger
CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
