// Testovací data — datová vrstva.
//
// Většinu dělají funkce v databázi. Z prohlížeče to nejde: RLS správně
// zakazuje zapsat výkaz za někoho jiného a generátor musí vykázat práci
// pěti vymyšleným lidem. Funkce jsou `security definer`, ale samy si ověří,
// že je volá superadmin — viz supabase/migrations/002_dummy_data.sql
// a 005_dummy_costs.sql.
//
// Jedna věc se schválně dělá až tady: **snapshoty uzavřených projektů.**
// Šly by dopočítat v SQL, ale znamenalo by to přepsat `compute()` z
// projects/model.js do Postgresu — a dvě verze pravidel o penězích se dřív
// nebo později rozejdou. Pak by testovací data „dokazovala" něco jiného, než
// co dělá aplikace. Používá se proto tatáž cesta jako při opravdovém uzavření.

import { sb, unwrap } from '../../supabase.js';
import { getProjects, saveSnapshot } from '../projects/store.js';
import { compute, marginOf } from '../projects/model.js';
import { getEntries } from '../timesheet/store.js';
import { rateResolver } from '../rates/store.js';

/** Kolik testovacích dat je v systému. → { lide, projekty, vykazy, naklady, … } */
export async function stats() {
  return unwrap(await sb.rpc('dummy_data_stats'));
}

/**
 * Vygeneruje kompletní testovací sadu. Nejdřív smaže tu stávající, takže
 * opakované spuštění nenadělá duplikáty. Vrací počty toho, co vzniklo.
 */
export async function generate() {
  const counts = await sb.rpc('generate_dummy_data').then(unwrap);
  const snapshots = await fillSnapshots();
  return { ...counts, snapshoty: snapshots };
}

/** Smaže testovací data. Opravdových lidí a jejich dat se to nedotkne. */
export async function wipe() {
  return unwrap(await sb.rpc('delete_dummy_data'));
}

/**
 * Doplní `final` uzavřeným projektům, které ho nemají.
 *
 * Bez toho se zisk dummy projektů dopočítává živě a nejde na nich ověřit to
 * nejdůležitější pravidlo o penězích: že se uzavřením čísla zmrazí.
 *
 * Čtení jsou tři dohromady, bez ohledu na počet projektů — ptát se na výkazy
 * u každého zvlášť by bylo N+1. Zápis je jeden na projekt; jinak to nejde,
 * každý má jiná čísla. Uzavřených dummy projektů jsou tři.
 */
async function fillSnapshots() {
  // `is_dummy` je tu stejně důležité jako u mazání: generátor nesmí sáhnout na
  // opravdový projekt o nic víc než mazání. Uzavřený opravdový projekt už
  // snapshot má — a kdyby náhodou neměl, dopočítat mu ho potichu dnešními
  // sazbami by bylo přepsání historie.
  const closed = (await getProjects({ onlyClosed: true })).filter((p) => p.is_dummy && !p.final);
  if (!closed.length) return 0;

  const entries = await getEntries();
  const rateOn = await rateResolver(entries.map((e) => e.email));

  const byProject = new Map();
  for (const e of entries) {
    if (!byProject.has(e.project_id)) byProject.set(e.project_id, []);
    byProject.get(e.project_id).push(e);
  }

  for (const p of closed) {
    // Stejný výpočet jako při uzavření: běžící projekt, pak se zmrazí.
    const stats = compute({ ...p, status: 'active', final: null }, byProject.get(p.id) || [], rateOn);
    const revenue = p.final_price != null ? Number(p.final_price) : (Number(p.est_price) || 0);
    const snapshot = { ...stats, closed: true, margin: marginOf(p, revenue, stats.total.cost) };

    // Jen `final`; `closed_at` zůstane, kdy projekt opravdu skončil.
    await saveSnapshot(p.id, snapshot);
  }

  return closed.length;
}
