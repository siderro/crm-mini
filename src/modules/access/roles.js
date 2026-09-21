// Role — předlohy práv.
//
// Role odpovídá na tři nezávislé otázky najednou, ale každá se vynucuje jinde:
//
//   které moduly vidím  → tenhle soubor. Výběr role **zapíše** mapu modulů do
//                         `app_users.modules`. Materializuje se schválně: živé
//                         pravidlo by znamenalo seznam „role → moduly" dvakrát
//                         (tady i v SQL pro RLS), a dvě kopie téže pravdy se
//                         dřív nebo později rozejdou.
//
//   které řádky vidím   → RLS (`my_rank()` v migraci 004). Bezpečnostní
//                         hranice musí platit okamžitě, ne až po překliknutí.
//
//   smím mazat          → RLS, restriktivní politiky. Ne čtvrtá role.
//
// Cena materializace: změna předlohy se nepropíše zpětně. Proto Lidé u člověka,
// jehož mapa se od předlohy liší, píšou „(upraveno)" a nabídnou srovnání.
// Viditelné, ne kouzelné.
//
// Peněžní moduly (Výplaty, Finance výhled, Náklady, Ziskovost, Výkon) tu
// schválně nejsou v žádné roli. Zůstávají superadminovi — je to jediné právo,
// které nejde získat zápisem do databáze, a rolí by se to zředilo.

export const ROLES = ['designer', 'manager', 'admin'];

export const ROLE_LABEL = {
  designer: 'Designér',
  manager: 'Manažer',
  admin: 'Admin',
};

export const ROLE_DESC = {
  designer: 'Vykazuje na své projekty. Ve výkazu vidí jen sebe.',
  manager: 'Vidí všechny projekty a výkazy všech. Řídí zakázky.',
  admin: 'Všechno krom peněz a krom mazání projektů, lidí a wiki.',
};

/**
 * Mapa modulů, kterou role zapíše. Moduly s penězi tu nejsou a nebudou.
 *
 * Designér schválně nedostává `pm`. Ne kvůli tajemství — ekonomika projektu se
 * sčítá ze **všech** výkazů na něm, a když mu RLS cizí výkazy odřízne, viděl by
 * tiše podhodnocenou spotřebu. Číslo, které vypadá platně a není, je horší než
 * žádné. Svoje projekty vidí i tak, přes přiřazení.
 */
export const ROLE_MODULES = {
  designer: {
    timesheet: 'edit',
    todo: 'edit',
    wiki: 'read',
  },
  manager: {
    timesheet: 'edit',
    todo: 'edit',
    wiki: 'edit',
    pm: 'edit',
    crm: 'edit',
    'project-access': 'edit',
  },
  admin: {
    timesheet: 'edit',
    todo: 'edit',
    wiki: 'edit',
    pm: 'edit',
    crm: 'edit',
    'project-access': 'edit',
    notes: 'edit',
  },
};

export const RANK = { designer: 10, manager: 20, admin: 30, superadmin: 40 };

/** Hodnost role. Neznámá i chybějící je 0 — pod nejnižším patrem, ne na něm. */
export function rankOf(role) {
  return RANK[role] || 0;
}

/** Sedí mapa modulů s předlohou role? Porovnává se přesně, včetně úrovní. */
export function matchesRole(role, modules) {
  const preset = ROLE_MODULES[role];
  if (!preset) return false;

  const keys = Object.keys(modules || {});
  if (keys.length !== Object.keys(preset).length) return false;
  return keys.every((id) => modules[id] === preset[id]);
}
