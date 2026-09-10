// Výkazy práce — datová vrstva.
//
// Záznam: { id, project_id, email, date ('YYYY-MM-DD'), hours, kind, note, created_at }
//
// `kind` říká, z jakého rozpočtu se práce platí:
//   'design' — dodaná práce, jde proti odhadu hodin projektu
//   'pm'     — project management, jde proti částce na PM a do odhadu hodin se nepočítá
// Předvyplňuje se z role na projektu, ale ukládá se natvrdo — pozdější změna
// role nesmí překlasifikovat historii (stejný důvod jako u sazeb).
//
// Sazba se k záznamu dopočítá až při zobrazení — přes rateAt() / rateResolver()
// k datu výkazu, takže zpětná změna sazby nepřepíše historii.
//
// Backend: Supabase, tabulka timesheet. RLS: zapisovat smím jen sám za sebe,
// jen do projektu, kde mám 'report', a jen dokud projekt běží. Svoje výkazy
// vidím vždycky, cizí jen na projektu, na který dosáhnu.

import { sb, unwrap } from '../../supabase.js';

const TABLE = 'timesheet';

export const KINDS = ['design', 'pm'];

export const KIND_LABEL = { design: 'Design', pm: 'Project management' };

/** Krátký štítek do hustých výpisů. */
export const KIND_SHORT = { design: 'design', pm: 'PM' };

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Hodiny přicházejí z Postgresu jako numeric (řetězec) — vrátíme je jako číslo. */
function normalize(row) {
  return { ...row, hours: num(row.hours) ?? 0 };
}

/** Výkazy, volitelně filtrované na projekt / člověka / druh. Nejnovější nahoře. */
export async function getEntries({ projectId = null, email = null, kind = null } = {}) {
  let query = sb.from(TABLE).select('*').order('date', { ascending: false });
  if (projectId !== null) query = query.eq('project_id', projectId);
  if (email !== null) query = query.eq('email', email);
  if (kind !== null) query = query.eq('kind', kind);
  return unwrap(await query).map(normalize);
}

/** Zapíše výkaz. Vrací nový záznam, nebo null při nesmyslném vstupu. */
export async function addEntry({ projectId, email, date, hours, kind = 'design', note = '' }) {
  const value = num(hours);
  if (!projectId || !email || !date || value == null || value <= 0) return null;

  const row = unwrap(await sb.from(TABLE).insert({
    project_id: projectId,
    email,
    date,
    hours: value,
    kind: KINDS.includes(kind) ? kind : 'design',
    note,
  }).select().single());
  return normalize(row);
}

/** Upraví výkaz. */
export async function updateEntry(id, patch = {}) {
  const changes = { ...patch };

  if ('hours' in changes) {
    const value = num(changes.hours);
    if (value == null || value <= 0) return null;
    changes.hours = value;
  }
  if ('kind' in changes && !KINDS.includes(changes.kind)) return null;

  const row = unwrap(await sb.from(TABLE).update(changes).eq('id', id).select().single());
  return normalize(row);
}

/** Smaže výkaz. */
export async function deleteEntry(id) {
  unwrap(await sb.from(TABLE).delete().eq('id', id));
}
