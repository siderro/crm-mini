/**
 * Compute temperature (freshness) from the last log date.
 * Returns { days, css, label } for use in tables and lists.
 *
 * · 3d  = hot (< 7 days, all good)
 *   8d  = warm (7-30 days)
 * * 35d = cold (30-60 days, needs attention)
 * ! 90d = dead (60+ days)
 *   -   = no log
 */
export function getTemperature(lastLogDate) {
  if (!lastLogDate) return { days: null, css: 'temp-dead', label: '! -' };
  const days = Math.floor((Date.now() - new Date(lastLogDate).getTime()) / 86400000);
  if (days < 7) return { days, css: 'temp-hot', label: `\u00B7 ${days}d` };
  if (days < 30) return { days, css: 'temp-warm', label: `${days}d` };
  if (days < 60) return { days, css: 'temp-cold', label: `* ${days}d` };
  return { days, css: 'temp-dead', label: `! ${days}d` };
}

/**
 * Render temperature legend as HTML.
 */
export function renderTempLegend() {
  return `<span class="temp-legend">\u00B7 fresh &nbsp; normal &nbsp; * cooling &nbsp; ! cold</span>`;
}
