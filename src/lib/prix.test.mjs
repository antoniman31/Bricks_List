import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRANCHES_PRIX, aPreRemplir, comparerPrix, correspondPrix, formaterPrix, libelleTotal, lirePrixSaisi, prixPourSaisie, prixValide, totalPrix } from './prix.js';

test('prixValide : un montant en euros raisonnable, arrondi au centime', () => {
  assert.equal(prixValide(849.99), 849.99);
  assert.equal(prixValide(19.999), 20);
  assert.equal(prixValide(10000), 10000);
  for (const v of [0, -5, 10000.01, NaN, Infinity, '12', null, undefined, {}]) assert.equal(prixValide(v), null, String(v));
});

test('lirePrixSaisi : virgule, point, espaces, symbole euro ; le reste est refusé', () => {
  assert.equal(lirePrixSaisi('849,99'), 849.99);
  assert.equal(lirePrixSaisi('849.99'), 849.99);
  assert.equal(lirePrixSaisi(' 849 € '), 849);
  assert.equal(lirePrixSaisi('1 299,99'), 1299.99);
  assert.equal(lirePrixSaisi('1 299,5'), 1299.5);
  for (const v of ['', 'abc', '12,345', '-5', '0', '1e3', '12,3,4', '99999', null, 5, '1'.repeat(30)]) assert.equal(lirePrixSaisi(v), null, String(v));
});

test('formaterPrix / prixPourSaisie', () => {
  assert.match(formaterPrix(849.99), /^849,99\s€$/);
  assert.match(formaterPrix(850), /^850\s€$/);
  assert.match(formaterPrix(89.9), /^89,90\s€$/);
  assert.equal(formaterPrix(null), '');
  assert.equal(prixPourSaisie(849.99), '849,99');
  assert.equal(prixPourSaisie(null), '');
});

test('tranches : chaque prix tombe dans une seule tranche, les bornes vont à la tranche du dessus', () => {
  const dans = (p) => TRANCHES_PRIX.filter((t) => correspondPrix({ prix: p }, t.cle)).map((t) => t.cle);
  assert.deepEqual(dans(49.99), ['moins-50']);
  assert.deepEqual(dans(50), ['50-100']);
  assert.deepEqual(dans(199.99), ['100-200']);
  assert.deepEqual(dans(200), ['200-plus']);
  assert.deepEqual(dans(1500), ['200-plus']);
  assert.deepEqual(dans(null), ['sans-prix']);
  assert.equal(correspondPrix({ prix: 10 }, ''), true);
});

test('comparerPrix : croissant ou décroissant, les sets sans prix toujours en dernier', () => {
  const sets = [{ id: 'a', prix: 100 }, { id: 'b' }, { id: 'c', prix: 30 }, { id: 'd', prix: 250 }];
  assert.deepEqual([...sets].sort(comparerPrix(1)).map((s) => s.id), ['c', 'a', 'd', 'b']);
  assert.deepEqual([...sets].sort(comparerPrix(-1)).map((s) => s.id), ['d', 'a', 'c', 'b']);
});

test('totalPrix : somme exacte au centime, avec le nombre de sets sans prix', () => {
  const t = totalPrix([{ prix: 0.1 }, { prix: 0.2 }, { prix: 849.99 }, {}, { prix: null }]);
  assert.deepEqual(t, { total: 850.29, avecPrix: 3, sansPrix: 2 });
  assert.match(libelleTotal(t), /^850,29\s€ · 2 sans prix$/);
  assert.equal(libelleTotal(totalPrix([{}, {}])), '');
  assert.match(libelleTotal(totalPrix([{ prix: 40 }])), /^40\s€$/);
});

test('aPreRemplir : la wishlist sans prix ou avec un prix DE, jamais un prix saisi à la main', () => {
  assert.equal(aPreRemplir({ statut: 'souhaité' }), true);
  assert.equal(aPreRemplir({ statut: 'souhaité', prix: 100, prixSource: 'brickset-de' }), true);
  assert.equal(aPreRemplir({ statut: 'souhaité', prix: 100, prixSource: 'manuelle' }), false);
  assert.equal(aPreRemplir({ statut: 'souhaité', prix: 100 }), false); // prix sans source : réputé saisi à la main
  assert.equal(aPreRemplir({ statut: 'possédé' }), false);
});
