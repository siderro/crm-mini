-- Migration v4: RPC functions for dashboard and "last contacted" feature
-- Run this in Supabase SQL Editor

-- Returns last activity date for each contact (for current user)
CREATE OR REPLACE FUNCTION get_contacts_last_activity()
RETURNS TABLE(contact_id uuid, last_activity_at timestamptz) AS $$
  SELECT a.contact_id, MAX(a.created_at) as last_activity_at
  FROM activities a
  WHERE a.user_id = auth.uid()
  GROUP BY a.contact_id
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns last activity date for each deal (for current user)
CREATE OR REPLACE FUNCTION get_deals_last_activity()
RETURNS TABLE(deal_id uuid, last_activity_at timestamptz) AS $$
  SELECT a.deal_id, MAX(a.created_at) as last_activity_at
  FROM activities a
  WHERE a.user_id = auth.uid() AND a.deal_id IS NOT NULL
  GROUP BY a.deal_id
$$ LANGUAGE sql SECURITY DEFINER STABLE;
