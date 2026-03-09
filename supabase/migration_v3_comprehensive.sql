-- =============================================================
-- Migration V3: Comprehensive CRM Updates
-- - Add activities.deal_id for project assignment
-- - Create company_contacts join table for many-to-many
-- - Migrate existing company_id data
-- - Add indexes for new relationships
-- =============================================================

-- 1. Add deal_id to activities (optional project assignment)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES deals(id) ON DELETE SET NULL;

-- 2. Create company_contacts join table for many-to-many
CREATE TABLE IF NOT EXISTS company_contacts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role       text,  -- optional role (e.g., "Primary Contact", "Billing Contact")
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, contact_id)
);

-- 3. Enable RLS on company_contacts
ALTER TABLE company_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_contacts_select" ON company_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contacts c WHERE c.id = company_contacts.contact_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "company_contacts_insert" ON company_contacts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c WHERE c.id = company_contacts.contact_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "company_contacts_update" ON company_contacts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM contacts c WHERE c.id = company_contacts.contact_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "company_contacts_delete" ON company_contacts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM contacts c WHERE c.id = company_contacts.contact_id AND c.user_id = auth.uid()
    )
  );

-- 4. Migrate existing contacts.company_id data to company_contacts
INSERT INTO company_contacts (company_id, contact_id, role)
SELECT company_id, id, NULL
FROM contacts
WHERE company_id IS NOT NULL
ON CONFLICT (company_id, contact_id) DO NOTHING;

-- 5. Add indexes for efficient lookups

-- Activities with deal assignment
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON activities(deal_id, created_at DESC);

-- Company contacts join table
CREATE INDEX IF NOT EXISTS idx_company_contacts_company ON company_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_company_contacts_contact ON company_contacts(contact_id);

-- Deal contacts lookup (for showing contacts on deal detail)
CREATE INDEX IF NOT EXISTS idx_deals_contact_created ON deals(contact_id, created_at DESC);

-- Activities by contact for deal detail
CREATE INDEX IF NOT EXISTS idx_activities_contact_created ON activities(contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;

-- =============================================================
-- NOTES:
-- - contacts.company_id is kept for backward compatibility
-- - App should read from company_contacts going forward
-- - activities.deal_id is optional (NULL by default)
-- - company_contacts.role is optional
-- =============================================================
