import { test } from 'node:test';
import assert from 'node:assert/strict';
import { charger, sauver, CLE } from './storage.js';

function faux(initial) {
  const d = new Map(initial ? [[CLE, initial]] : []);
  return { getItem: (k) => d.get(k) ?? null, setItem: (k, v) => d.set(k, v) };
}

const SET = { id: 'a', numero: '75192-1', nom: 'Faucon', statut: 'possédé' };

test('première visite : pas de données, pas d\'erreur', () => {
  const r = charger(faux());
  assert.equal(r.sets, null);
  assert.equal(r.erreur, null);
});

test('aller-retour sauver puis charger', () => {
  const s = faux();
  assert.equal(sauver([SET], s).ok, true);
  const r = charger(s);
  assert.equal(r.sets.length, 1);
  assert.equal(r.sets[0].numero, '75192-1');
});

test('un JSON illisible est signalé, pas confondu avec une première visite', () => {
  const r = charger(faux('{pas du json'));
  assert.equal(r.sets, null);
  assert.ok(r.erreur);
  assert.equal(r.illisible, true);
});

test('un JSON de mauvaise forme est signalé', () => {
  const r = charger(faux('{"sets": 3}'));
  assert.ok(r.erreur);
  assert.equal(r.illisible, true);
});

test('une liste nue est acceptée', () => {
  assert.equal(charger(faux(JSON.stringify([SET]))).sets.length, 1);
});

test('les fiches invalides sont corrigées ou rejetées au chargement', () => {
  const r = charger(faux(JSON.stringify({ version: 1, sets: [SET, { numero: 'zzz' }] })));
  assert.equal(r.sets.length, 1);
  assert.equal(r.rejetes, 1);
});

test('une écriture qui échoue renvoie le motif', () => {
  const plein = { getItem: () => null, setItem: () => { const e = new Error('plein'); e.name = 'QuotaExceededError'; throw e; } };
  const r = sauver([SET], plein);
  assert.equal(r.ok, false);
  assert.equal(r.erreur, 'Stockage plein.');
});
