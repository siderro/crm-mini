-- Migration v5: Universal activities
-- Makes activities attachable to any entity (contact, deal, company) independently.
-- Run this in Supabase SQL Editor.

-- Make contact_id nullable (was NOT NULL)
ALTER TABLE activities ALTER COLUMN contact_id DROP NOT NULL;

-- Add company_id
ALTER TABLE activities ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;

-- Index for company queries
CREATE INDEX IF NOT EXISTS idx_activities_company_id ON activities(company_id, created_at DESC);
