# CRM Mini

A lightweight CRM web app built with Vanilla JavaScript and Supabase. Manage contacts, companies, and activity logs with Google OAuth authentication and per-user data isolation.

**Live:** https://siderro.github.io/crm-mini/

## Quick Start

### 1. Set Up Supabase Database

1. Open your Supabase project: https://supabase.com/dashboard
2. Go to **SQL Editor** → **New Query**
3. Paste the contents of `supabase/schema.sql` and run it
4. This creates tables (contacts, companies, activities) with RLS policies

### 2. Enable Google OAuth

1. In Supabase Dashboard → **Authentication** → **Providers**
2. Enable **Google** provider
3. Set up Google Cloud credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 credentials (Web application)
   - Set authorized redirect URI to: `https://juquttlvkairdgdkzpke.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client Secret** into Supabase Google provider settings
5. In Supabase → **Authentication** → **URL Configuration**, add these redirect URLs:
   - `http://localhost:5173/` (local development)
   - `https://siderro.github.io/crm-mini/` (production)

### 3. Frontend Configuration

The Supabase connection is configured in `src/config.js`:

```js
export const SUPABASE_URL = 'https://juquttlvkairdgdkzpke.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_tKbsPXd1ZbT5E0Am7oAA6w_GMjeM1Is';
```

The anon key is safe to commit — it only grants access allowed by RLS policies.

### 4. Run Locally

Any static file server works. For example:

```bash
# Using Python
python3 -m http.server 5173

# Or using Node.js
npx serve -l 5173
```

Open http://localhost:5173/

### 5. Deploy to GitHub Pages

1. Push all code to the `main` branch of https://github.com/siderro/crm-mini
2. Go to repo **Settings** → **Pages**
3. Set Source to **Deploy from a branch** → `main` → `/ (root)`
4. Save — the site will be live at https://siderro.github.io/crm-mini/

## Project Structure

```
index.html              Main HTML entry point
styles.css              All styles
src/
  config.js             Supabase URL + anon key
  supabase.js           Supabase client init + auth helpers
  app.js                Hash router + app initialization
  ui/
    auth.js             Login screen (Google OAuth)
    contacts.js         Contacts list view
    contactDetail.js    Contact detail + activity log
    contactForm.js      Create / edit contact form
    companies.js        Companies list + inline CRUD
  utils/
    csv.js              CSV export utility
    debounce.js         Debounce helper
    time.js             Relative time formatter
supabase/
  schema.sql            DB schema + RLS policies
DEMO/                   Original PHP demo (reference)
REPORT.md               Feature comparison report
```

## Hash Routes

| Route | Screen |
|-------|--------|
| `#/` or `#/contacts` | Contacts list |
| `#/contacts/new` | Create contact |
| `#/contacts/:id` | Contact detail + activity log |
| `#/contacts/:id/edit` | Edit contact |
| `#/companies` | Companies list |

## Tech Stack

- **Frontend:** Vanilla JavaScript (ES modules), plain CSS
- **Database:** Supabase (PostgreSQL)
- **Auth:** Google OAuth via Supabase Auth
- **Security:** Row Level Security — each user sees only their own data
- **Hosting:** GitHub Pages (static, no server required)
