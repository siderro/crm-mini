-- =============================================================
-- Migration V6: CRM Redesign
-- - Merge activities into contacts.notes and deals.notes
-- - Rename deals → projects
-- - Create contact_labels table
-- - Drop activities and company_contacts tables
-- - Drop obsolete RPC functions
--
-- IMPORTANT: Run AFTER backing up all data (crm-export JSON).
-- Run this in Supabase SQL Editor.
-- =============================================================

-- ─── 1. Merge activities into contact notes ─────────────────

UPDATE contacts c
SET notes = COALESCE(c.notes, '') ||
  COALESCE(
    (SELECT E'\n\n--- Activity log ---\n' ||
      string_agg(
        '[' || to_char(a.created_at, 'DD.MM.YYYY') || '] ' || a.content,
        E'\n'
        ORDER BY a.created_at ASC
      )
     FROM activities a
     WHERE a.contact_id = c.id
    ),
    ''
  )
WHERE EXISTS (SELECT 1 FROM activities a WHERE a.contact_id = c.id);

-- ─── 2. Merge activities into deal notes ────────────────────

UPDATE deals d
SET notes = COALESCE(d.notes, '') ||
  COALESCE(
    (SELECT E'\n\n--- Activity log ---\n' ||
      string_agg(
        '[' || to_char(a.created_at, 'DD.MM.YYYY') || '] ' || a.content,
        E'\n'
        ORDER BY a.created_at ASC
      )
     FROM activities a
     WHERE a.deal_id = d.id
    ),
    ''
  )
WHERE EXISTS (SELECT 1 FROM activities a WHERE a.deal_id = d.id);

-- ─── 3. Drop RPC functions (depend on activities) ──────────

DROP FUNCTION IF EXISTS get_contacts_last_activity();
DROP FUNCTION IF EXISTS get_deals_last_activity();

-- ─── 4. Drop activities table ───────────────────────────────

DROP TABLE IF EXISTS activities CASCADE;

-- ─── 5. Drop company_contacts join table ────────────────────

DROP TABLE IF EXISTS company_contacts CASCADE;

-- ─── 6. Rename deals → projects ─────────────────────────────

-- Drop existing trigger first
DROP TRIGGER IF EXISTS deals_updated_at ON deals;

-- Rename the table
ALTER TABLE deals RENAME TO projects;

-- Rename constraints (Supabase/Postgres keeps old names, rename for clarity)
ALTER TABLE projects RENAME CONSTRAINT deals_pkey TO projects_pkey;
ALTER TABLE projects RENAME CONSTRAINT deals_user_id_fkey TO projects_user_id_fkey;
ALTER TABLE projects RENAME CONSTRAINT deals_contact_id_fkey TO projects_contact_id_fkey;
ALTER TABLE projects RENAME CONSTRAINT deals_company_id_fkey TO projects_company_id_fkey;

-- Recreate trigger with new name
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Rename indexes
ALTER INDEX IF EXISTS idx_deals_user_id RENAME TO idx_projects_user_id;
ALTER INDEX IF EXISTS idx_deals_contact_id RENAME TO idx_projects_contact_id;
ALTER INDEX IF EXISTS idx_deals_company_id RENAME TO idx_projects_company_id;
ALTER INDEX IF EXISTS idx_deals_status RENAME TO idx_projects_status;
ALTER INDEX IF EXISTS idx_deals_open_deals RENAME TO idx_projects_open;
ALTER INDEX IF EXISTS idx_deals_status_updated RENAME TO idx_projects_status_updated;
ALTER INDEX IF EXISTS idx_deals_company_status RENAME TO idx_projects_company_status;
ALTER INDEX IF EXISTS idx_deals_contact_status RENAME TO idx_projects_contact_status;
ALTER INDEX IF EXISTS idx_deals_contact_created RENAME TO idx_projects_contact_created;

-- Drop old RLS policies
DROP POLICY IF EXISTS "deals_select" ON projects;
DROP POLICY IF EXISTS "deals_insert" ON projects;
DROP POLICY IF EXISTS "deals_update" ON projects;
DROP POLICY IF EXISTS "deals_delete" ON projects;

-- Create new RLS policies for projects
CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (user_id = auth.uid());

-- ─── 7. Create contact_labels table ─────────────────────────

CREATE TABLE contact_labels (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contact_id, label)
);

CREATE INDEX idx_contact_labels_contact ON contact_labels(contact_id);
CREATE INDEX idx_contact_labels_user ON contact_labels(user_id);
CREATE INDEX idx_contact_labels_label ON contact_labels(user_id, label);

ALTER TABLE contact_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_labels_select" ON contact_labels
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "contact_labels_insert" ON contact_labels
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "contact_labels_update" ON contact_labels
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "contact_labels_delete" ON contact_labels
  FOR DELETE USING (user_id = auth.uid());

-- =============================================================
-- DONE. New schema:
--   contacts        (unchanged structure, notes now contain merged activities)
--   companies       (unchanged)
--   projects        (renamed from deals)
--   contact_labels  (new)
--   inbox           (unchanged)
-- =============================================================
