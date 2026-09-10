// Small shared helpers. One definition, used everywhere — no per-file copies.

/** Escape text for safe insertion into HTML. */
export function esc(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Format an ISO date/timestamp as DD.MM.YYYY (cs). Empty string if falsy. */
export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Zkrácené peníze do těsných míst: "8 500 Kč", "300k Kč", "1,2M Kč".
 * Pod deset tisíc se nezkracuje — tam by se ztratila přesnost, kterou čekáš.
 */
export function formatMoneyShort(value) {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (Number.isNaN(n)) return '';

  const abs = Math.abs(n);
  if (abs < 10000) return formatMoney(Math.round(n));
  if (abs < 1000000) return `${Math.round(n / 1000)}k Kč`;
  return `${(Math.round(n / 100000) / 10).toLocaleString('cs-CZ')}M Kč`;
}

/** ISO timestamp as "09.09.2026 14:32". Empty string if falsy. */
export function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d)) return '';
  return d.toLocaleString('cs-CZ', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Kompaktní stáří: pod den v hodinách ("5 h"), jinak ve dnech ("3 d"). */
export function ageShort(value) {
  if (!value) return '';
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms)) return '';
  const hours = Math.max(0, Math.floor(ms / 3600000));
  return hours < 24 ? `${hours} h` : `${Math.floor(hours / 24)} d`;
}

/** Number as "1 250 000 Kč". Empty string for null/'' — ale 0 je platná hodnota. */
export function formatMoney(value) {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('cs-CZ') + ' Kč';
}

/** "před 3 dny" style relative label from a date. */
export function timeAgo(value) {
  if (!value) return 'nikdy';
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return 'dnes';
  if (days === 1) return 'včera';
  if (days < 7) return `před ${days} dny`;
  if (days < 30) return `před ${Math.floor(days / 7)} týdny`;
  if (days < 365) return `před ${Math.floor(days / 30)} měs.`;
  return `před ${Math.floor(days / 365)} lety`;
}
