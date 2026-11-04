import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleEtiquette, normaliserEtiquettes, analyserSaisie, formaterSaisie, etiquettesConnues, basculerDansSaisie, aEtiquette, basculerEtiquette, ajouterEtiquettes, appliquerEtiquettes, ETIQUETTES_MAX, ETIQUETTE_LONGUEUR_MAX } from './etiquettes.js';

test('cleEtiquette ignore casse, accents et espaces de bord', () => {
  assert.equal(cleEtiquette(' Cadéau '), 'cadeau');
  assert.equal(cleEtiquette('À OFFRIR'), 'a offrir');
});

test('normaliserEtiquettes : liste propre inchangée', () => {
  assert.deepEqual(normaliserEtiquettes(['cadeau', 'à offrir']), { liste: ['cadeau', 'à offrir'], corrige: false });
  assert.deepEqual(normaliserEtiquettes(null), { liste: [], corrige: false });
  assert.deepEqual(normaliserEtiquettes([]), { liste: [], corrige: false });
});

test('normaliserEtiquettes : pas un tableau, éléments non texte, vides', () => {
  assert.deepEqual(normaliserEtiquettes('cadeau'), { liste: [], corrige: true });
  assert.deepEqual(normaliserEtiquettes({ a: 1 }), { liste: [], corrige: true });
  assert.deepEqual(normaliserEtiquettes(['a', 3, null, '  ', 'b']), { liste: ['a', 'b'], corrige: true });
});

test('normaliserEtiquettes : doublons (casse, accents), espaces, longueur, nombre', () => {
  assert.deepEqual(normaliserEtiquettes(['Cadeau', 'cadeau', 'CADÉAU']), { liste: ['Cadeau'], corrige: true });
  assert.deepEqual(normaliserEtiquettes(['  à   offrir ']).liste, ['à offrir']);
  const long = 'x'.repeat(100);
  assert.equal(normaliserEtiquettes([long]).liste[0].length, ETIQUETTE_LONGUEUR_MAX);
  const beaucoup = Array.from({ length: 20 }, (_, i) => `e${i}`);
  const r = normaliserEtiquettes(beaucoup);
  assert.equal(r.liste.length, ETIQUETTES_MAX);
  assert.equal(r.corrige, true);
});

test('analyserSaisie : virgules, points-virgules, retours à la ligne', () => {
  assert.deepEqual(analyserSaisie('cadeau, à offrir ; Noël\nlego'), ['cadeau', 'à offrir', 'Noël', 'lego']);
  assert.deepEqual(analyserSaisie(' , ,; '), []);
  assert.deepEqual(analyserSaisie(null), []);
  assert.equal(formaterSaisie(['a', 'b']), 'a, b');
});

test('etiquettesConnues : une écriture par étiquette, triées', () => {
  const sets = [{ etiquettes: ['Cadeau', 'zèbre'] }, { etiquettes: ['cadeau', 'abc'] }, {}];
  assert.deepEqual(etiquettesConnues(sets), ['abc', 'Cadeau', 'zèbre']);
});

test('basculerDansSaisie : ajoute ou retire sans tenir compte de la casse', () => {
  assert.equal(basculerDansSaisie('', 'cadeau'), 'cadeau');
  assert.equal(basculerDansSaisie('a, b', 'cadeau'), 'a, b, cadeau');
  assert.equal(basculerDansSaisie('a, Cadeau, b', 'cadeau'), 'a, b');
});

test('aEtiquette', () => {
  assert.equal(aEtiquette({ etiquettes: ['Cadeau'] }, 'cadéau'), true);
  assert.equal(aEtiquette({ etiquettes: [] }, 'x'), false);
  assert.equal(aEtiquette({}, 'x'), false);
});

import { preparerSaisie } from './etiquettes.js';

test('preparerSaisie : dédoublonne sans erreur', () => {
  assert.deepEqual(preparerSaisie('cadéau, Noël, noël, '), { liste: ['cadéau', 'Noël'], erreur: '' });
  assert.deepEqual(preparerSaisie(''), { liste: [], erreur: '' });
});

test('preparerSaisie : refuse un dépassement avec un message précis', () => {
  assert.match(preparerSaisie('x'.repeat(31)).erreur, /30 caractères/);
  assert.match(preparerSaisie(Array.from({ length: 9 }, (_, i) => `e${i}`).join(',')).erreur, /8 étiquettes au plus/);
  assert.equal(preparerSaisie(Array.from({ length: 8 }, (_, i) => `e${i}`).join(',')).erreur, '');
});

test('basculerEtiquette : retire si présente (casse et accents ignorés), ajoute sinon', () => {
  assert.deepEqual(basculerEtiquette(['Cadeau', 'Noël'], 'cadeau'), { liste: ['Noël'], erreur: '' });
  assert.deepEqual(basculerEtiquette(['Cadeau'], 'Noël'), { liste: ['Cadeau', 'Noël'], erreur: '' });
});

test('basculerEtiquette : refuse un ajout au-delà de la limite, sans toucher à la liste', () => {
  const pleine = Array.from({ length: ETIQUETTES_MAX }, (_, i) => `e${i}`);
  const r = basculerEtiquette(pleine, 'de trop');
  assert.deepEqual(r.liste, pleine);
  assert.match(r.erreur, /au plus/);
  assert.equal(basculerEtiquette(pleine, 'e0').erreur, '');
});

test('ajouterEtiquettes : fusionne sans doublon, refuse trop long et trop nombreux', () => {
  assert.deepEqual(ajouterEtiquettes(['cadeau'], 'Cadeau, à offrir'), { liste: ['cadeau', 'à offrir'], erreur: '' });
  assert.match(ajouterEtiquettes([], 'x'.repeat(ETIQUETTE_LONGUEUR_MAX + 1)).erreur, /dépasse/);
  const pleine = Array.from({ length: ETIQUETTES_MAX }, (_, i) => `e${i}`);
  const r = ajouterEtiquettes(pleine, 'nouvelle');
  assert.deepEqual(r.liste, pleine);
  assert.match(r.erreur, /au plus/);
});

test('appliquerEtiquettes : retire puis ajoute, sans doublon, dans l\'ordre', () => {
  assert.deepEqual(appliquerEtiquettes(['a', 'b'], { ajouter: ['c', 'A'], retirer: ['B'] }), { liste: ['a', 'c'], refuse: false });
  assert.deepEqual(appliquerEtiquettes([], { ajouter: ['x'] }), { liste: ['x'], refuse: false });
  assert.deepEqual(appliquerEtiquettes(['a'], {}), { liste: ['a'], refuse: false });
});

test('appliquerEtiquettes : refuse un dépassement de la limite sans rien changer', () => {
  const pleine = Array.from({ length: ETIQUETTES_MAX }, (_, i) => `e${i}`);
  assert.deepEqual(appliquerEtiquettes(pleine, { ajouter: ['de trop'] }), { liste: pleine, refuse: true });
  // retirer d'abord libère la place : l'ajout passe
  assert.equal(appliquerEtiquettes(pleine, { ajouter: ['de trop'], retirer: ['e0'] }).refuse, false);
});
