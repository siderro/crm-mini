# Archived — old Brevis/CRM (2026-08-25)

The original vanilla-JS CRM/Brevis app, archived on a full restart. Kept for reference only.

- App code: `src/`, `index.html`, `styles.css`
- Extras: `chrome-extension/`, `dist/`, `scripts/`, `backup/`
- Design/product docs: `DESIGN_MANUAL.md`, `UX-UI-RULES.md`, `REFERENCES.md`, `PRD.md`, etc.

Reusable bits if needed for the new app:
- Supabase connection keys: `src/config.js` and `src/supabase.js`
- DB schema/migrations WERE moved here (`supabase/`) on 2026-09-08, when the live
  database was dropped and rebuilt from scratch. Data was exported first; nothing
  from the old model is being carried over. The old schema is reference only —
  `schema.sql` was already stale (it still declares `deals` and `activities`).
- Log-driven CRM concept + "temperature" logic (`src/utils/temperature.js`) worked well
  and may be worth carrying over.
