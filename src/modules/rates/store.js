// Hodinové sazby — datová vrstva.
//
// Sazba je NÁKLAD: kolik nás ten člověk stojí za hodinu.
//
// Dva typy:
//   'hourly'  — { rate }                          … Kč za hodinu přímo
//   'monthly' — { monthly_amount, monthly_hours } … paušál a hodiny za měsíc,
//               hodinovka se z toho odvodí. Kdo má paušál, má stanovený počet
//               hodin, takže je to fakticky taky hodinovka — jen zadaná jinak.
//
// Sazba se nepřepisuje, přidává se nová verze s platností od data. Historie
// tak zůstává celá a výkaz práce se protne se sazbou, která platila v den,
// kdy se práce odvedla (viz rateAt()).
//
// Backend: Supabase, tabulka rates. RLS: mzdový údaj, čte ho jen jeho vlastník
// a superadmin, zapisuje jen superadmin. Kdo na cizí sazbu nedosáhne, dostane
// null — a náklad té práce se mu nikde nezobrazí.

import { sb, unwrap } from '../../supabase.js';
import { TYPES, today, num, hourlyOf, pick } from './model.js';

// Pojmy a odvození hodinovky žijí v model.js; tady se jen přeposílají.
export { TYPES, TYPE_LABEL, DEFAULT_MONTHLY_HOURS, today, hourlyOf } from './model.js';

const TABLE = 'rates';

/** Dnešní datum jako 'YYYY-MM-DD' (lokální čas). */

/**
 * Nákladová hodinovka záznamu. U paušálu se odvodí z částky a hodin.
 * Null, když se odvodit nedá (chybí hodiny nebo jsou nula).
 */

/** Verze platná k danému dni z už načteného seznamu (řazeného od nejnovější). */

/** Všechny verze sazeb jednoho člověka, nejnovější platnost nahoře. */
export async function getRates(email) {
  return unwrap(
    await sb.from(TABLE).select('*').eq('email', email).order('valid_from', { ascending: false })
  );
}

/** Kolik verzí má kdo — { email: počet }. Pro přehledovou tabulku. */
export async function countByEmail() {
  const rows = unwrap(await sb.from(TABLE).select('email'));
  const counts = {};
  for (const r of rows) counts[r.email] = (counts[r.email] || 0) + 1;
  return counts;
}

/**
 * Nákladová hodinovka platná pro daného člověka k danému dni ('YYYY-MM-DD').
 * Null, když žádná není. U paušálu vrací odvozené číslo.
 *
 * Pro jednu otázku. Když se ptáš na hodně výkazů najednou, vezmi rateResolver() —
 * tohle by z toho udělalo síťový dotaz na každý řádek.
 */
export async function rateAt(email, date) {
  const day = date || today();
  const rows = unwrap(
    await sb.from(TABLE).select('*')
      .eq('email', email).lte('valid_from', day)
      .order('valid_from', { ascending: false }).limit(1)
  );
  return hourlyOf(rows[0]);
}

/**
 * Totéž, ale i s kontextem — pro UI, které chce říct, že jde o odvozené číslo.
 * → { hourly, type, record } nebo null.
 */
export async function rateInfoAt(email, date) {
  const day = date || today();
  const rows = unwrap(
    await sb.from(TABLE).select('*')
      .eq('email', email).lte('valid_from', day)
      .order('valid_from', { ascending: false }).limit(1)
  );
  const record = rows[0];
  if (!record) return null;
  return { hourly: hourlyOf(record), type: record.type, record };
}

/**
 * Načte sazby jednou a vrátí funkci, která je páruje v paměti:
 *
 *   const rateOn = await rateResolver();
 *   rateOn('jan@x.cz', '2026-09-02')   // → 800 nebo null
 *
 * Tohle používej všude, kde se počítá náklad víc než jednoho výkazu — jinak
 * by z každého řádku byl jeden síťový dotaz.
 */
export async function rateResolver(emails = null) {
  const recordOn = await rateRecordResolver(emails);
  return (email, date) => hourlyOf(recordOn(email, date));
}

/**
 * Totéž, ale vrací celý záznam sazby — pro toho, koho zajímá i typ
 * (hodinová × paušál), ne jen výsledné číslo. Používá to modul Výplaty.
 */
export async function rateRecordResolver(emails = null) {
  let query = sb.from(TABLE).select('*').order('valid_from', { ascending: false });
  if (emails?.length) query = query.in('email', [...new Set(emails)]);
  const rows = unwrap(await query);

  return (email, date) => pick(rows, email, date || today());
}

/** Zkontroluje a dopočítá pole podle typu. Null = nesmysl, neukládat. */
function normalizePatch(patch) {
  const type = TYPES.includes(patch.type) ? patch.type : 'hourly';

  if (type === 'monthly') {
    const amount = num(patch.monthly_amount);
    const hours = num(patch.monthly_hours);
    if (amount == null || amount < 0 || hours == null || hours <= 0) return null;
    return { type, rate: null, monthly_amount: amount, monthly_hours: hours };
  }

  const rate = num(patch.rate);
  if (rate == null || rate < 0) return null;
  return { type, rate, monthly_amount: null, monthly_hours: null };
}

/** Přidá novou verzi sazby. Vrací nový záznam, nebo null při nesmyslném vstupu. */
export async function addRate(email, patch = {}) {
  if (!email) return null;
  const fields = normalizePatch(patch);
  if (!fields) return null;

  return unwrap(await sb.from(TABLE).insert({
    email, ...fields, valid_from: patch.valid_from || today(),
  }).select().single());
}

/** Upraví existující verzi (částky, typ nebo datum platnosti). */
export async function updateRate(id, patch = {}) {
  const current = unwrap(await sb.from(TABLE).select('*').eq('id', id).maybeSingle());
  if (!current) return null;

  const merged = { ...current, ...patch };
  const fields = normalizePatch(merged);
  if (!fields) return null;

  return unwrap(await sb.from(TABLE).update({
    ...fields, valid_from: merged.valid_from || today(),
  }).eq('id', id).select().single());
}

/** Smaže jednu verzi sazby. */
export async function deleteRate(id) {
  unwrap(await sb.from(TABLE).delete().eq('id', id));
}
