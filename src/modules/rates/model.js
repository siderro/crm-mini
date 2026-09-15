// Sazby — pojmy a čisté funkce.
//
// Odděleně od store.js: store mluví se Supabase, tohle ne. Odvození hodinovky
// z paušálu je čistý výpočet a má jít otestovat bez sítě.

export const TYPES = ['hourly', 'monthly'];

export const TYPE_LABEL = { hourly: 'Hodinová', monthly: 'Měsíční paušál' };

/** Kolik hodin za měsíc předvyplnit u paušálu, když se nic nezadá. */
export const DEFAULT_MONTHLY_HOURS = 160;

export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function num(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function hourlyOf(record) {
  if (!record) return null;
  if (record.type === 'monthly') {
    // Number(null) je 0, takže chybějící částku je potřeba odchytit zvlášť —
    // jinak by z nevyplněného paušálu vyšla sazba 0 Kč/h místo „nevíme".
    const amount = record.monthly_amount == null ? null : Number(record.monthly_amount);
    const hours = record.monthly_hours == null ? null : Number(record.monthly_hours);
    if (amount == null || hours == null) return null;
    if (!Number.isFinite(amount) || !Number.isFinite(hours) || hours <= 0) return null;
    return amount / hours;
  }
  if (record.rate == null) return null;
  const rate = Number(record.rate);
  return Number.isFinite(rate) ? rate : null;
}

export function pick(rows, email, day) {
  return rows.find((r) => r.email === email && (r.valid_from || '') <= day) || null;
}
