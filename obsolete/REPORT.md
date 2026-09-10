# CRM Mini — Feature Comparison Report

## What Matches the DEMO 1:1

### Contacts
- **CRUD**: Full create, read, update, delete — matches DEMO contacts.php + contact_detail.php
- **Fields**: first_name, last_name, email, phone, notes, company association — all present
- **Validation**: Required first/last name, email format validation — matches DEMO
- **Company link**: Contacts can be assigned to a company (dropdown) — matches firma_id in DEMO
- **Detail view**: Shows all contact info + related company — matches contact_detail.php layout

### Companies
- **CRUD**: Full create, read, update, delete — matches DEMO companies.php
- **Fields**: name, email, ico (company ID), web (website), notes — all present
- **Contact count**: Shows number of contacts per company — matches DEMO sidebar stats
- **Inline form**: Add/edit company on the same page — matches DEMO toggle form pattern

### Activity Log (Notes equivalent)
- **Quick add**: Add entries from contact detail — matches DEMO note form on deal_detail.php
- **Types**: note, call, email, meeting — extends DEMO's plain notes with categorization
- **Timeline**: Ordered by created_at DESC — matches DEMO ordering
- **Delete**: Can remove individual entries — matches DEMO delete note
- **Relative time**: "5m ago", "3d ago" format — matches DEMO's time display

### Search & Filter
- **Search**: ilike/contains over first_name, last_name, email, notes — matches DEMO scope
- **Filters**: All contacts, with email, with phone, with company — matches DEMO sidebar stats concept
- **Sorting**: Click column headers to sort by name, email, phone, created date — matches DEMO order behavior
- **Debounced search**: 350ms debounce — similar to DEMO's page-reload approach but smoother

### CSV Export
- **Export**: Currently filtered contacts list to CSV — matches DEMO Extras.php export
- **Format**: UTF-8 BOM, comma-separated, proper escaping — matches DEMO's CSV approach
- **Fields**: Name, email, phone, company, notes, created date — maps to DEMO export fields

### UI Patterns
- **Stats sidebar**: Quick stats on contacts page — matches DEMO sidebar pattern
- **Responsive**: Works on mobile — improvement over DEMO
- **Navigation**: Top nav with active state — matches DEMO header.php

## What Differs and Why

| Feature | DEMO | CRM Mini | Reason |
|---------|------|----------|--------|
| **Primary entity** | Deals (business cases) | Contacts | As specified in requirements |
| **Auth** | Hard-coded PHP credentials | Google OAuth + Supabase | Security, multi-user requirement |
| **Multi-user** | Single-user (shared DB) | Per-user isolation via RLS | Requirement |
| **Routing** | PHP page URLs (?id=...) | Hash routing (#/contacts/:id) | GitHub Pages compatibility |
| **Language** | Czech (UI labels, field names) | English | Requirement |
| **Activity log** | Notes on deals | Activities on contacts (with types) | Contact is primary entity |
| **Inline editing** | JS toggle on deal list | Separate edit page for contacts | Cleaner UX for form validation |
| **Companies page** | Inline edit | Inline add/edit (same page form) | Matches DEMO pattern |
| **DB field names** | Czech (jmeno, prijmeni, popis) | English (first_name, last_name) | English codebase |

## What's Missing + Next Steps

### Not Implemented (from DEMO)
1. **Deals / Business Cases** — DEMO's primary entity; not in scope since Contact is the primary entity
2. **Deal statuses & workflow** (Opp → Won/Frozen/Lost) — deal-specific
3. **Won & Lost reporting** (won_lost.php) — deal-specific
4. **Advisory / AI analysis** (Advisory.php) — DEMO feature, not in scope
5. **Markdown export** — only CSV export implemented (per requirements)
6. **Percentage bar charts** — deal value visualization, not applicable to contacts
7. **Deal-contact junction (M:N)** — deals not implemented
8. **Public API / stats JSON** — DEMO's api.php, not in scope

### Potential Next Steps
1. **Deals module** — add deals with status workflow, linked to contacts and companies
2. **Bulk actions** — select multiple contacts for delete/export
3. **Import CSV** — reverse of export
4. **Contact merging** — detect and merge duplicate contacts
5. **Dashboard** — summary stats, recent activity across all contacts
6. **Custom fields** — user-defined fields on contacts
7. **Tags / labels** — categorize contacts
8. **Email templates** — quick-send from contact detail
9. **Dark mode** — theme toggle
10. **Offline support** — service worker + local cache
