/**
 * Compute temperature (freshness) from the last log date.
 * Returns { days, css, label, block, human } for use in tables and lists.
 * `block` is a small status dot; color comes from the `css` class.
 */
const DOT = '●';        // ●  active
const DOT_EMPTY = '○';  // ○  dead / never

export function getTemperature(lastLogDate) {
  if (!lastLogDate) return { days: null, css: 'temp-dead', label: 'never', block: DOT_EMPTY, human: 'never' };
  const days = Math.floor((Date.now() - new Date(lastLogDate).getTime()) / 86400000);
  if (days === 0) return { days, css: 'temp-hot', label: 'today', block: DOT, human: 'today' };
  if (days === 1) return { days, css: 'temp-hot', label: 'yesterday', block: DOT, human: 'yesterday' };
  if (days < 7) return { days, css: 'temp-hot', label: `${days} days`, block: DOT, human: `${days} days` };
  if (days < 14) return { days, css: 'temp-warm', label: `${days} days`, block: DOT, human: `${days} days` };
  if (days < 30) return { days, css: 'temp-warm', label: `${Math.floor(days / 7)}w ago`, block: DOT, human: `${Math.floor(days / 7)} weeks` };
  if (days < 60) return { days, css: 'temp-cold', label: `${Math.floor(days / 30)}mo ago`, block: DOT, human: `${Math.floor(days / 30)} months` };
  return { days, css: 'temp-dead', label: `${Math.floor(days / 30)}mo ago`, block: DOT_EMPTY, human: `${Math.floor(days / 30)} months` };
}
