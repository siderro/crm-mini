-- =============================================================
-- CRM-Mini: Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================================

-- 1. Companies table
CREATE TABLE IF NOT EXISTS companies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  email      text,
  ico        text,          -- Company ID number
  web        text,          -- Website URL
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name  text NOT NULL,
  email      text,
  phone      text,
  notes      text,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Activities table (activity log on contacts)
CREATE TABLE IF NOT EXISTS activities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  type       text NOT NULL DEFAULT 'note',  -- note, call, email, meeting
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- Indexes
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_companies_user_id    ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id     ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id  ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_last_name   ON contacts(user_id, last_name);
CREATE INDEX IF NOT EXISTS idx_contacts_email       ON contacts(user_id, email);
CREATE INDEX IF NOT EXISTS idx_activities_user_id   ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact   ON activities(contact_id, created_at DESC);

-- =============================================================
-- Row Level Security
-- =============================================================

ALTER TABLE companies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "companies_insert" ON companies
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "companies_update" ON companies
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "companies_delete" ON companies
  FOR DELETE USING (user_id = auth.uid());

-- Contacts policies
CREATE POLICY "contacts_select" ON contacts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "contacts_insert" ON contacts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "contacts_update" ON contacts
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "contacts_delete" ON contacts
  FOR DELETE USING (user_id = auth.uid());

-- Activities policies
CREATE POLICY "activities_select" ON activities
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "activities_insert" ON activities
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "activities_update" ON activities
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "activities_delete" ON activities
  FOR DELETE USING (user_id = auth.uid());

-- =============================================================
-- Auto-update updated_at trigger
-- =============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
