import { test } from 'node:test';
import assert from 'node:assert/strict';
import { treemap, blocsProportionnels } from './treemap.js';

const aire = (r) => r.w * r.h;
const chevauche = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1e-6 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1e-6;

test('treemap : surfaces proportionnelles, cadre rempli, rien ne se chevauche ni ne dépasse', () => {
  const valeurs = [8, 6, 4, 3, 3];
  const r = treemap(valeurs, 100, 60);
  const total = valeurs.reduce((a, b) => a + b, 0);
  assert.equal(r.length, 5);
  r.forEach((rect, i) => assert.ok(Math.abs(aire(rect) - (valeurs[i] / total) * 6000) < 1e-6, `surface du bloc ${i}`));
  assert.ok(Math.abs(r.reduce((s, x) => s + aire(x), 0) - 6000) < 1e-6);
  for (const x of r) assert.ok(x.x >= -1e-9 && x.y >= -1e-9 && x.x + x.w <= 100 + 1e-9 && x.y + x.h <= 60 + 1e-9);
  for (let i = 0; i < r.length; i += 1) for (let j = i + 1; j < r.length; j += 1) assert.equal(chevauche(r[i], r[j]), false, `${i} et ${j}`);
});

test('treemap : l\'ordre des entrées est conservé, quel que soit leur tri', () => {
  const r = treemap([1, 9, 5], 100, 100);
  assert.ok(aire(r[1]) > aire(r[2]) && aire(r[2]) > aire(r[0]));
});

test('treemap : valeurs nulles ou vides', () => {
  assert.deepEqual(treemap([]), []);
  assert.deepEqual(treemap([0, 0]), [{ x: 0, y: 0, w: 0, h: 0 }, { x: 0, y: 0, w: 0, h: 0 }]);
  const r = treemap([4, 0], 100, 50);
  assert.equal(aire(r[1]), 0);
  assert.ok(Math.abs(aire(r[0]) - 5000) < 1e-6);
});

const barre = (cle, sets) => ({ cle, libelle: cle, sets, filtre: { theme: cle } });

test('blocsProportionnels : peu de thèmes, tous gardés, du plus gros au plus petit', () => {
  const b = blocsProportionnels([barre('A', 3), barre('B', 8), barre('C', 6)]);
  assert.deepEqual(b.map((x) => x.cle), ['B', 'C', 'A']);
  assert.equal(b.some((x) => x.autres), false);
  assert.equal(b[0].echelle, 5);
});

test('blocsProportionnels : les petits blocs sont versés dans « Autres », qui garde le compte', () => {
  const barres = [barre('Gros', 40), barre('Moyen', 25), barre('Petit', 15), ...Array.from({ length: 10 }, (_, i) => barre(`P${i}`, 2))];
  const b = blocsProportionnels(barres);
  const autres = b.find((x) => x.autres);
  assert.ok(autres, 'un bloc Autres existe');
  assert.match(autres.libelle, /^Autres \(\d+\)$/);
  assert.equal(b.reduce((s, x) => s + x.sets, 0), 100, 'aucun set perdu');
  assert.equal(b.find((x) => x.cle === 'Gros').sets, 40, 'les gros thèmes restent seuls');
  for (const x of b) assert.ok(x.rect.w >= 16 && x.rect.h >= 16, `${x.libelle} assez grand pour être touché`);
  // le nombre de thèmes derrière « Autres » est bien celui des thèmes versés
  assert.equal(autres.nb, barres.length - (b.length - 1));
});

test('blocsProportionnels : ignore les barres vides, et rend [] sans données', () => {
  assert.deepEqual(blocsProportionnels([]), []);
  assert.deepEqual(blocsProportionnels([barre('Vide', 0)]), []);
  const un = blocsProportionnels([barre('Seul', 5)]);
  assert.equal(un.length, 1);
  assert.ok(Math.abs(un[0].rect.w - 100) < 1e-9);
});
