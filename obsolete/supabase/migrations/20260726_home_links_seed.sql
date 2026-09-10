-- Seed home_links with data from GreetingsPage links.md
-- Run AFTER creating the table.
-- Replace USER_ID with your actual auth.users id.

-- To find your user_id, run:
-- SELECT id FROM auth.users WHERE email = 'jakub@svejda-goldmann.cz';

DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'jakub@svejda-goldmann.cz';

  INSERT INTO home_links (user_id, column_index, column_title, title, url, position) VALUES
  -- Column 0: Organizace a komunikace
  (uid, 0, 'Organizace a komunikace', 'CRM Brevis (github)', 'https://siderro.github.io/crm-mini/#/', 0),
  (uid, 0, 'Organizace a komunikace', 'Kalendář (google)', 'https://calendar.google.com/calendar/u/0/r/week', 1),
  (uid, 0, 'Organizace a komunikace', 'Mail (jakub@svejda-...)', 'https://mail.google.com/mail/u/0/#inbox', 2),
  (uid, 0, 'Organizace a komunikace', 'G-Drive (jakub@svejda-...)', 'https://drive.google.com/drive/u/0/my-drive', 3),
  (uid, 0, 'Organizace a komunikace', 'To Do (starý)', 'https://docs.google.com/spreadsheets/d/1sRE85aoec39JOTWjhK5Y98Re9h2GCvBqbB-oavec5RQ/edit?gid=0#gid=0', 4),
  (uid, 0, 'Organizace a komunikace', 'Kalkulace projektu (github)', 'https://siderro.github.io/kalkulace-projektu-sg/', 5),

  -- Column 1: Marketing / Publikace
  (uid, 1, 'Marketing / Publikace', 'Drafty LinkedIn', 'https://docs.google.com/document/d/1wnMya7IqEA2xj5oDedw2Cu7VthkOhxJ2YHvVNBTocQk/edit?tab=t.0', 0),
  (uid, 1, 'Marketing / Publikace', 'Publikační kalendář (Erika)', 'https://docs.google.com/spreadsheets/d/1fBWqMOyqfxb8cSgb5fp9AQ8F8oMp7_f0RRDWHXdppAE/edit?pli=1&gid=982264373#gid=982264373', 1),
  (uid, 1, 'Marketing / Publikace', 'Marketingová taktika 2026', 'https://docs.google.com/document/d/1t5u8DLeli0fXwpXJZxzU6_HPbZ5KaE4qeBU4vdzD4n4/edit?tab=t.0#heading=h.xq40praeqihe', 2),
  (uid, 1, 'Marketing / Publikace', 'Obsahová strategie (Mája)', 'https://docs.google.com/document/d/1xoWxVe7ntPqWHzuYidNAoah5Yzi9LCVZPBUv8RaWYP0/edit?tab=t.0#heading=h.8iu4p010j2s2', 3),
  (uid, 1, 'Marketing / Publikace', 'SoC Med Obrázky', 'https://drive.google.com/drive/folders/1DxAaIhDrPieAtS3ha2iRRgO0AAGhTyFG', 4),
  (uid, 1, 'Marketing / Publikace', 'Fotky na LinkedIn', 'https://drive.google.com/drive/u/0/folders/10GoGh62FMDkrM9uvwoDmIISbGg7uU56W', 5),
  (uid, 1, 'Marketing / Publikace', 'Profi fotky 2026', 'https://drive.google.com/drive/u/0/folders/16_1zra59C1GH7dJldkPilBYmndAXJSz3', 6),

  -- Column 2: Agendy ŠG
  (uid, 2, 'Agendy ŠG', '(placeholder)', '#', 0),

  -- Column 3: Agendy personal
  (uid, 3, 'Agendy personal', 'KB Komerční Banka (cost split)', 'https://docs.google.com/spreadsheets/d/1ffLWt0S9aXThXNJWY9lYrOG4_4xzHWi9GE_xRyXTqG0/edit?gid=0#gid=0', 0),
  (uid, 3, 'Agendy personal', 'Zpevnik', '#', 1),
  (uid, 3, 'Agendy personal', 'Recepty', '#', 2),
  (uid, 3, 'Agendy personal', 'Táta', '#', 3),

  -- Column 4: Extra
  (uid, 4, 'Extra', 'GitHub (siderro)', 'https://github.com/siderro/', 0),
  (uid, 4, 'Extra', 'Supabase', 'https://supabase.com/dashboard/org/whvsqxyjnixknmqplazp', 1);
END $$;
