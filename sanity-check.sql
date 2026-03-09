-- =============================================================
-- Sanity Check Script - Run after migration to verify changes
-- =============================================================

-- 1. Check deal statuses distribution
SELECT
  status,
  COUNT(*) as count,
  SUM(amount) as total_value
FROM deals
GROUP BY status
ORDER BY
  CASE status
    WHEN 'OPP' THEN 1
    WHEN 'proposal_sent' THEN 2
    WHEN 'negotiation' THEN 3
    WHEN 'frozen' THEN 4
    WHEN 'won_wip' THEN 5
    WHEN 'won_done' THEN 6
    WHEN 'lost' THEN 7
    ELSE 99
  END;

-- Expected: No old status values (lead, proposal, won)
-- Should only see: OPP, proposal_sent, negotiation, frozen, won_wip, won_done, lost

-- 2. Check for any invalid statuses (should return 0 rows)
SELECT id, title, status
FROM deals
WHERE status NOT IN ('OPP', 'proposal_sent', 'negotiation', 'frozen', 'won_wip', 'won_done', 'lost')
LIMIT 10;

-- Expected: 0 rows

-- 3. Check companies with official_name field
SELECT
  COUNT(*) as total_companies,
  COUNT(official_name) as with_official_name,
  COUNT(*) - COUNT(official_name) as without_official_name
FROM companies;

-- Expected: Column exists, most values likely NULL unless manually filled

-- 4. Check companies with open deals
SELECT
  c.name,
  c.official_name,
  COUNT(d.id) as open_deals_count,
  SUM(d.amount) as open_deals_value
FROM companies c
LEFT JOIN deals d ON d.company_id = c.id AND d.status IN ('OPP', 'proposal_sent', 'negotiation')
GROUP BY c.id, c.name, c.official_name
HAVING COUNT(d.id) > 0
ORDER BY COUNT(d.id) DESC
LIMIT 10;

-- Expected: Companies that have open deals

-- 5. Check contacts linked to open deals (direct)
SELECT
  c.first_name,
  c.last_name,
  COUNT(d.id) as open_deals_count
FROM contacts c
INNER JOIN deals d ON d.contact_id = c.id
WHERE d.status IN ('OPP', 'proposal_sent', 'negotiation')
GROUP BY c.id, c.first_name, c.last_name
ORDER BY COUNT(d.id) DESC
LIMIT 10;

-- Expected: Contacts with direct open deals

-- 6. Check contacts linked to open deals (via company)
SELECT
  c.first_name,
  c.last_name,
  co.name as company_name,
  COUNT(d.id) as company_open_deals
FROM contacts c
INNER JOIN companies co ON co.id = c.company_id
INNER JOIN deals d ON d.company_id = co.id
WHERE d.status IN ('OPP', 'proposal_sent', 'negotiation')
  AND d.contact_id IS NULL  -- indirect only (not counted in direct link)
GROUP BY c.id, c.first_name, c.last_name, co.name
ORDER BY COUNT(d.id) DESC
LIMIT 10;

-- Expected: Contacts whose companies have open deals

-- 7. Check frozen deals with previous_status
SELECT
  title,
  status,
  previous_status,
  created_at,
  updated_at
FROM deals
WHERE status = 'frozen'
ORDER BY updated_at DESC
LIMIT 10;

-- Expected: May be 0 rows if no deals frozen yet
-- If rows exist, previous_status should be OPP, proposal_sent, or negotiation

-- 8. Verify indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('deals', 'companies', 'contacts')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Expected: All new indexes should be listed:
--   idx_deals_open_deals
--   idx_deals_status_updated
--   idx_deals_company_status
--   idx_deals_contact_status
--   idx_contacts_company_lookup

-- 9. Check RLS policies still active
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename IN ('deals', 'companies', 'contacts')
ORDER BY tablename, policyname;

-- Expected: All RLS policies should still exist and be active

-- 10. Performance test - query used by deals page grouping
EXPLAIN ANALYZE
SELECT
  d.*,
  c.first_name,
  c.last_name,
  co.name as company_name
FROM deals d
LEFT JOIN contacts c ON c.id = d.contact_id
LEFT JOIN companies co ON co.id = d.company_id
WHERE d.user_id = auth.uid()
ORDER BY d.updated_at DESC, d.created_at DESC, d.title ASC;

-- Expected: Should use index scan, execution time < 50ms for typical dataset

-- =============================================================
-- Summary
-- =============================================================
-- Run all queries above and verify:
-- ✓ No old status values
-- ✓ Companies have official_name column
-- ✓ Frozen deals have previous_status
-- ✓ All indexes created
-- ✓ RLS policies active
-- ✓ Queries performant
