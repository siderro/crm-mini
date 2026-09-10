-- Migration V8: Add starred_at to contacts
-- Star a contact to pin it to your attention. Auto-expires after 7 days or after logging.
-- Run in Supabase SQL Editor.

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS starred_at timestamptz;
