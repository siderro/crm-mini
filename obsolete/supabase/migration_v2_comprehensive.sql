-- =============================================================
-- Migration V2: Comprehensive CRM Updates
-- - New deal statuses (OPP, proposal_sent, negotiation, frozen, won_wip, won_done, lost)
-- - Add companies.official_name
-- - Add deals.previous_status for unfreeze functionality
-- - Update indexes for grouping queries
-- =============================================================

-- 1. Add official_name to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS official_name text;

-- 2. Add previous_status to deals (for unfreeze)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS previous_status text;

-- 3. Migrate old deal statuses to new canonical set
-- Mapping:
--   'lead' -> 'OPP'
--   'proposal' -> 'proposal_sent'
--   'negotiation' -> 'negotiation' (unchanged)
--   'won' -> 'won_done'
--   'lost' -> 'lost' (unchanged)

UPDATE deals SET status = 'OPP' WHERE status = 'lead';
UPDATE deals SET status = 'proposal_sent' WHERE status = 'proposal';
UPDATE deals SET status = 'won_done' WHERE status = 'won';
-- negotiation and lost remain unchanged

-- 4. Add CHECK constraint for new status values
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_status_check;
ALTER TABLE deals ADD CONSTRAINT deals_status_check
  CHECK (status IN ('OPP', 'proposal_sent', 'negotiation', 'frozen', 'won_wip', 'won_done', 'lost'));

-- 5. Update indexes for efficient grouping and filtering

-- Index for filtering open deals (OPP, proposal_sent, negotiation)
CREATE INDEX IF NOT EXISTS idx_deals_open_deals ON deals(user_id, status)
  WHERE status IN ('OPP', 'proposal_sent', 'negotiation');

-- Index for grouping by status
CREATE INDEX IF NOT EXISTS idx_deals_status_updated ON deals(user_id, status, updated_at DESC, created_at DESC);

-- Index for companies with open deals lookup
CREATE INDEX IF NOT EXISTS idx_deals_company_status ON deals(company_id, status)
  WHERE status IN ('OPP', 'proposal_sent', 'negotiation');

-- Index for contacts with open deals lookup (via direct deal relationship)
CREATE INDEX IF NOT EXISTS idx_deals_contact_status ON deals(contact_id, status)
  WHERE status IN ('OPP', 'proposal_sent', 'negotiation');

-- Composite index for contacts via company relationship
CREATE INDEX IF NOT EXISTS idx_contacts_company_lookup ON contacts(company_id) WHERE company_id IS NOT NULL;

-- 6. Update default value for new deals
ALTER TABLE deals ALTER COLUMN status SET DEFAULT 'OPP';

-- =============================================================
-- NOTES:
-- - Old statuses mapped: lead->OPP, proposal->proposal_sent, won->won_done
-- - New statuses: OPP, proposal_sent, negotiation, frozen, won_wip, won_done, lost
-- - Open deals: OPP, proposal_sent, negotiation
-- - Freeze action stores previous status for unfreeze
-- =============================================================
