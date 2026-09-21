import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLES, ROLE_LABEL, ROLE_DESC, ROLE_MODULES, RANK, rankOf, matchesRole,
} from '../src/modules/access/roles.js';

// Role odpovídá na tři nezávislé otázky. Tenhle soubor testuje jen tu první
// (které moduly) a žebříček. Které řádky uvnitř modulu člověk uvidí, hlídá
// RLS — to se testuje v supabase/tests/rls.sql, ne tady.

test('každá role má štítek, popis i předlohu', () => {
  for (const r of ROLES) {
    assert.ok(ROLE_LABEL[r], `${r} nemá štítek`);
    assert.ok(ROLE_DESC[r], `${r} nemá popis`);
    assert.ok(ROLE_MODULES[r], `${r} nemá předlohu modulů`);
  }
});

test('žebříček je vzestupný a superadmin je nad ním', () => {
  assert.ok(rankOf('designer') < rankOf('manager'));
  assert.ok(rankOf('manager') < rankOf('admin'));
  assert.ok(rankOf('admin') < rankOf('superadmin'));
});

test('neznámá i chybějící role je pod nejnižším patrem, ne na něm', () => {
  // Kdyby chybějící role byla 10, dostal by se nový člověk rovnou na
  // designérskou úroveň v RLS. Musí být 0.
  assert.equal(rankOf(null), 0);
  assert.equal(rankOf(undefined), 0);
  assert.equal(rankOf('kral'), 0);
  assert.ok(rankOf(null) < rankOf('designer'));
});

test('žebříček v JS sedí s tím v migraci', () => {
  // Kdyby se rozešly, UI by schovávalo něco jiného, než pouští databáze.
  // Hodnoty jsou tady schválně natvrdo — opsané z 004_roles.sql.
  assert.deepEqual(RANK, { designer: 10, manager: 20, admin: 30, superadmin: 40 });
});

test('role nerozdávají peněžní moduly', () => {
  // Peníze zůstávají superadminovi. Kdyby je rozdala role, šlo by je získat
  // zápisem do tabulky — a to je přesně to, proti čemu je model postavený.
  const penize = ['payroll', 'finance', 'costs', 'profit', 'staff', 'perf'];
  for (const r of ROLES) {
    for (const id of penize) {
      assert.equal(ROLE_MODULES[r][id], undefined, `${r} dostal peněžní modul ${id}`);
    }
  }
});

test('designér nedostává Projekty', () => {
  // Ekonomika projektu se sčítá ze VŠECH výkazů na něm. Designérovi RLS cizí
  // výkazy odřízne, takže by viděl tiše podhodnocenou spotřebu — číslo, které
  // vypadá platně a není.
  assert.equal(ROLE_MODULES.designer.pm, undefined);
  assert.equal(ROLE_MODULES.manager.pm, 'edit');
});

test('vyšší role má aspoň to, co nižší', () => {
  const nadmnozina = (vyssi, nizsi) =>
    Object.entries(ROLE_MODULES[nizsi]).every(([id]) => ROLE_MODULES[vyssi][id] !== undefined);

  assert.ok(nadmnozina('manager', 'designer'), 'manažer nemá všechno, co designér');
  assert.ok(nadmnozina('admin', 'manager'), 'admin nemá všechno, co manažer');
});

test('matchesRole pozná, že se moduly od předlohy rozešly', () => {
  assert.equal(matchesRole('designer', ROLE_MODULES.designer), true);
  assert.equal(matchesRole('designer', { ...ROLE_MODULES.designer, crm: 'read' }), false, 'modul navíc');

  const bezJednoho = { ...ROLE_MODULES.designer };
  delete bezJednoho.todo;
  assert.equal(matchesRole('designer', bezJednoho), false, 'modul chybí');

  assert.equal(matchesRole('designer', { ...ROLE_MODULES.designer, wiki: 'edit' }), false,
    'jiná úroveň u stejného modulu je taky rozdíl');

  assert.equal(matchesRole(null, {}), false, 'bez role není s čím srovnávat');
  assert.equal(matchesRole('kral', {}), false);
});
