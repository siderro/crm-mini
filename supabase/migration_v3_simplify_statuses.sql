-- Migration: Simplify deal statuses to 4 values: open, frozen, won, lost
-- Old: OPP, proposal_sent, negotiation, frozen, won_wip, won_done, lost
-- New: open, frozen, won, lost

-- 1. Drop old CHECK constraint first (it blocks the updates)
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_status_check;

-- 2. Convert existing statuses
UPDATE deals SET status = 'open' WHERE status IN ('OPP', 'proposal_sent', 'negotiation');
UPDATE deals SET status = 'won' WHERE status IN ('won_wip', 'won_done');
-- frozen and lost stay as-is

-- 3. Clear previous_status (no longer needed with single open status)
UPDATE deals SET previous_status = NULL WHERE previous_status IS NOT NULL;

-- 4. Add new CHECK constraint
ALTER TABLE deals ADD CONSTRAINT deals_status_check CHECK (status IN ('open', 'frozen', 'won', 'lost'));

-- 5. Update default
ALTER TABLE deals ALTER COLUMN status SET DEFAULT 'open';

-- 6. Update column comment
COMMENT ON COLUMN deals.status IS 'open | frozen | won | lost';
