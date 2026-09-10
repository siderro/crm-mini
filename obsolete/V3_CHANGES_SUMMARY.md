# CRM Mini V3 - Quick Reference

## 🚀 Apply Changes (2 Steps)

### Step 1: Run Migration
```
1. Supabase Dashboard → SQL Editor → New Query
2. Copy: supabase/migration_v3_comprehensive.sql
3. RUN
```

### Step 2: Refresh Browser
```
Reload http://localhost:5173/ → Done!
```

---

## ✅ What's New

### 1. Contact Notes - Timestamp Button
- **Location**: Contact edit form, next to "Notes" label
- **Button**: "Add timestamp"
- **Action**: Inserts DD.MM.YYYY (e.g., 02.03.2026) at cursor
- **Format**: Standalone line, ready to type after

### 2. Activity Log - Project Assignment
**Removed:**
- ❌ Activity type select (note/call/email/meeting)

**Added:**
- ✅ "Project" dropdown (lists available deals)
- ✅ Optional: can be left empty
- ✅ Badge shows project name in activity timeline

### 3. Company Detail Page
- **URL**: `#/companies/:id`
- **Click**: Company row → opens detail
- **Shows**:
  - Company info (name, official name, email, website, ICO)
  - Linked contacts table
  - Linked deals table
- **Actions**: Edit, Delete

### 4. Deal Detail Page
- **URL**: `#/deals/:id`
- **Click**: Deal row → opens detail
- **Shows**:
  - Deal info (title, amount, status, contact, company)
  - Activities section (from deal + contact)
  - Freeze/Unfreeze actions
- **Actions**: Freeze, Edit, Delete

### 5. Contacts ↔ Companies (Many-to-Many)
- **Database**: `company_contacts` join table created
- **Migration**: Existing data auto-migrated
- **Display**: Company detail shows all linked contacts
- **Note**: Full multi-select UI deferred (see Limitations)

### 6. Freeze Button - New Style
- **Emoji**: ❄️ Freeze
- **Color**: Cyan (#55ffff) background, white text
- **Where**: Deals list + Deal detail page

---

## 📁 Files Modified/Created

### Created (3)
- `supabase/migration_v3_comprehensive.sql` ⭐
- `src/ui/companyDetail.js`
- `src/ui/dealDetail.js`

### Modified (6)
- `src/ui/contactForm.js` - Timestamp button
- `src/ui/contactDetail.js` - Project dropdown (no type)
- `src/ui/companies.js` - Clickable rows, company_contacts
- `src/ui/deals.js` - Freeze styling, clickable rows
- `src/app.js` - New routes
- `styles.css` - New button styles

---

## 🧪 Quick Test

After migration + refresh:

**Contact Form:**
- [ ] Edit contact → see "Add timestamp" button
- [ ] Click → inserts DD.MM.YYYY

**Contact Detail:**
- [ ] Activity log has "Project" dropdown (no type)
- [ ] Add activity → project badge appears

**Company:**
- [ ] Click row → opens company detail
- [ ] See contacts + deals

**Deal:**
- [ ] Click row → opens deal detail
- [ ] See activities (merged from deal + contact)
- [ ] Freeze button is cyan with ❄️

---

## ⚠️ Known Limitations

### Multi-Company Contact UI (Partial)
- ✅ Database ready (many-to-many)
- ✅ Migration done
- ❌ Contact form still single-select (not multi-select)
- ❌ Contact detail shows one company (not all)

**Workaround**: Database supports multiple companies, UI needs update later.

### Edit Forms (Placeholders)
- Company detail "Edit" → shows alert (create `companyForm.js` later)
- Deal detail "Edit" → shows alert (create `dealForm.js` later)

**Workaround**: Edit via list page inline forms for now.

---

## 📊 Database Changes

### New Table
```sql
company_contacts (
  company_id → companies.id,
  contact_id → contacts.id,
  role TEXT (optional),
  UNIQUE(company_id, contact_id)
)
```

### New Column
```sql
activities.deal_id → deals.id (NULL)
```

### New Indexes
- `idx_activities_deal_id`
- `idx_company_contacts_company`
- `idx_company_contacts_contact`
- `idx_deals_contact_created`
- `idx_activities_contact_created`

---

## 🎯 Key Decisions

1. **"Project" = Deal** - Used existing deals table (not new projects table)
2. **Activity Type Removed** - No longer used in app (column kept for compatibility)
3. **Many-to-Many DB Ready** - UI partially implemented (full multi-select deferred)
4. **Deal Activities** - Shows ALL contact activities + deal-specific (merged & deduplicated)

---

## 📖 Full Documentation

- **Technical details**: `IMPLEMENTATION_V3.md`
- **Quick start**: `V3_CHANGES_SUMMARY.md` (this file)

---

## ✨ Ready!

After running migration and refreshing:
1. Try timestamp button on contact edit
2. Assign project to activity
3. Click company/deal rows
4. See cyan Freeze button ❄️

Enjoy! 🎉
