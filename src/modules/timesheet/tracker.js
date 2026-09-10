// Stav stopek.
//
// Tohle je jediné místo v aplikaci, kde zůstal localStorage — a schválně:
// běžící stopky nejsou data, jsou to stav tvého zařízení. Do databáze nepatří
// (rozdělaný čas by se ti pletl mezi počítači) a v paměti stránky by nepřežil
// přepnutí modulu ani obnovení.
//
// Stav: { running, startedAt, elapsedMs, stopped }
//   null                          — stopky neběží a nic se neměří
//   running: true                 — měří se, startedAt je začátek běžícího úseku
//   running: false, stopped:false — pauza, elapsedMs drží naměřené
//   running: false, stopped:true  — zastaveno, čeká se na uložení nebo zahození

const KEY = 'brevis_tracker';

export function readTracker() {
  try {
    const t = JSON.parse(localStorage.getItem(KEY));
    return t && typeof t === 'object' ? t : null;
  } catch {
    return null;
  }
}

function write(t) {
  if (t) localStorage.setItem(KEY, JSON.stringify(t));
  else localStorage.removeItem(KEY);
  return t;
}

/** Kolik je naměřeno včetně právě běžícího úseku. */
export function elapsedMs(t) {
  if (!t) return 0;
  const base = Number(t.elapsedMs) || 0;
  if (!t.running || !t.startedAt) return base;
  return base + Math.max(0, Date.now() - new Date(t.startedAt).getTime());
}

export function startTracker() {
  return write({ running: true, startedAt: new Date().toISOString(), elapsedMs: 0, stopped: false });
}

export function pauseTracker() {
  const t = readTracker();
  if (!t?.running) return t;
  return write({ running: false, startedAt: null, elapsedMs: elapsedMs(t), stopped: false });
}

export function resumeTracker() {
  const t = readTracker();
  if (!t || t.running) return t;
  return write({ ...t, running: true, startedAt: new Date().toISOString(), stopped: false });
}

/** Zastaví měření a nechá naměřené k uložení. */
export function stopTracker() {
  const t = readTracker();
  if (!t) return null;
  return write({ running: false, startedAt: null, elapsedMs: elapsedMs(t), stopped: true });
}

export function clearTracker() {
  return write(null);
}

/** Trvání jako 1:23:45. */
export function formatDuration(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${h}:${pad(m)}:${pad(s)}`;
}

/**
 * Naměřený čas na hodiny do výkazu. Dvě desetinná místa (0,01 h = 36 s).
 *
 * Cokoli změřeného se zaokrouhlí nejmíň na 0,01 h — krátké měření se nemá
 * odmítnout, jen proto že by po zaokrouhlení vyšla nula.
 */
export function toHours(ms) {
  if (ms <= 0) return 0;
  return Math.max(0.01, Math.round((ms / 3600000) * 100) / 100);
}

/** Den, na který se výkaz zapíše — ten, kdy se měřit začalo. */
export function trackedDay(t) {
  const d = t?.startedAt ? new Date(t.startedAt) : new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
