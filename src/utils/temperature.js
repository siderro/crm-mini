/**
 * Compute temperature (freshness) from the last log date.
 * Returns { days, css, label } for use in tables and lists.
 *
 * < 7 days  → hot  (green, all good)
 * 7-30 days → warm (normal)
 * 30-60 days → cold (bold, needs attention)
 * 60+ days  → dead (bold + underline)
 * no log    → dead
 */
export function getTemperature(lastLogDate) {
  if (!lastLogDate) return { days: null, css: 'temp-dead', label: '-' };
  const days = Math.floor((Date.now() - new Date(lastLogDate).getTime()) / 86400000);
  if (days < 7) return { days, css: 'temp-hot', label: `${days}d` };
  if (days < 30) return { days, css: 'temp-warm', label: `${days}d` };
  if (days < 60) return { days, css: 'temp-cold', label: `${days}d` };
  return { days, css: 'temp-dead', label: `${days}d` };
}

