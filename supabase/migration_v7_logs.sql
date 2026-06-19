-- =============================================================
-- Migration V7: Logs table
-- - Create logs table for chronological activity log entries
-- - Each log entry can be linked to a contact, project, or both
-- - Replaces the single "notes" textarea approach
--
-- Run this in Supabase SQL Editor.
-- =============================================================

-- ─── 1. Create logs table ───────────────────────────────────

CREATE TABLE logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id  uuid REFERENCES contacts(id) ON DELETE CASCADE,
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE,
  content     text NOT NULL,
  logged_at   date NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. Indexes ─────────────────────────────────────────────

CREATE INDEX idx_logs_user      ON logs(user_id);
CREATE INDEX idx_logs_contact   ON logs(contact_id, logged_at DESC);
CREATE INDEX idx_logs_project   ON logs(project_id, logged_at DESC);
CREATE INDEX idx_logs_logged_at ON logs(user_id, logged_at DESC);

-- ─── 3. RLS ─────────────────────────────────────────────────

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logs_select" ON logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "logs_insert" ON logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "logs_update" ON logs
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "logs_delete" ON logs
  FOR DELETE USING (user_id = auth.uid());

-- ─── 4. Auto-update trigger ────────────────────────────────

CREATE TRIGGER logs_updated_at
  BEFORE UPDATE ON logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- DONE. New table: logs
-- Notes columns on contacts/projects are preserved as fallback.
-- Run scripts/migrate_notes.js to convert existing notes to logs.
-- =============================================================
