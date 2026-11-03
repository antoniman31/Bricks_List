import test from 'node:test';
import assert from 'node:assert/strict';
import { lireDerniereSauvegarde, noterSauvegarde, joursDepuis, etatSauvegarde, libelleDelai, demanderPersistance } from './sauvegarde.js';

const MAINTENANT = new Date('2026-11-03T12:00:00.000Z');
const il_y_a = (jours) => new Date(MAINTENANT.getTime() - jours * 86400000).toISOString();
const faux = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), m };
};

test('noter puis lire redonne la date', () => {
  const s = faux();
  assert.deepEqual(noterSauvegarde(MAINTENANT, s), { ok: true, erreur: null });
  assert.equal(lireDerniereSauvegarde(s, MAINTENANT), MAINTENANT.toISOString());
});

test('une date illisible, absente ou future vaut « jamais »', () => {
  assert.equal(lireDerniereSauvegarde(faux(), MAINTENANT), null);
  assert.equal(lireDerniereSauvegarde(faux({ bl_derniere_sauvegarde: 'hier' }), MAINTENANT), null);
  assert.equal(lireDerniereSauvegarde(faux({ bl_derniere_sauvegarde: '{"a":1}' }), MAINTENANT), null);
  assert.equal(lireDerniereSauvegarde(faux({ bl_derniere_sauvegarde: il_y_a(-10) }), MAINTENANT), null);
});

test('un décalage de moins d\'un jour dans le futur est toléré et compte pour 0 jour', () => {
  const presque = new Date(MAINTENANT.getTime() + 3600000).toISOString();
  assert.equal(joursDepuis(presque, MAINTENANT), 0);
});

test('stockage qui échoue : l\'erreur est rendue, rien ne plante', () => {
  const plein = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  assert.equal(noterSauvegarde(MAINTENANT, plein).ok, false);
  const casse = { getItem: () => { throw new Error('x'); } };
  assert.equal(lireDerniereSauvegarde(casse, MAINTENANT), null);
});

test('joursDepuis compte les jours entiers', () => {
  assert.equal(joursDepuis(il_y_a(0), MAINTENANT), 0);
  assert.equal(joursDepuis(il_y_a(29), MAINTENANT), 29);
  assert.equal(joursDepuis(il_y_a(30), MAINTENANT), 30);
  assert.equal(joursDepuis(null, MAINTENANT), null);
});

test('rappel : seulement si la collection n\'est pas vide', () => {
  assert.equal(etatSauvegarde({ nbSets: 0, derniere: null, maintenant: MAINTENANT }).rappel, false);
  assert.equal(etatSauvegarde({ nbSets: 5, derniere: null, maintenant: MAINTENANT }).rappel, true);
});

test('rappel : à partir du seuil de 30 jours, pas avant', () => {
  assert.equal(etatSauvegarde({ nbSets: 5, derniere: il_y_a(29), maintenant: MAINTENANT }).rappel, false);
  assert.equal(etatSauvegarde({ nbSets: 5, derniere: il_y_a(30), maintenant: MAINTENANT }).rappel, true);
  assert.equal(etatSauvegarde({ nbSets: 5, derniere: il_y_a(10), maintenant: MAINTENANT, seuil: 7 }).rappel, true);
});

test('libellés de délai', () => {
  assert.equal(libelleDelai(null), 'jamais');
  assert.equal(libelleDelai(0), 'aujourd\'hui');
  assert.equal(libelleDelai(1), 'hier');
  assert.equal(libelleDelai(12), 'il y a 12 jours');
});

test('persistance : déjà protégé, accordé, refusé, indisponible, erreur', async () => {
  assert.equal(await demanderPersistance({ persisted: async () => true }), 'protege');
  assert.equal(await demanderPersistance({ persisted: async () => false, persist: async () => true }), 'protege');
  assert.equal(await demanderPersistance({ persisted: async () => false, persist: async () => false }), 'non-garanti');
  assert.equal(await demanderPersistance(undefined), 'inconnu');
  assert.equal(await demanderPersistance({ persisted: async () => { throw new Error('x'); } }), 'inconnu');
});

import { lirePartageTexte, ecrirePartageTexte } from './sauvegarde.js';

test('partage en texte : retenu, puis effacé ; stockage cassé sans effet', () => {
  const s = (() => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; })();
  assert.equal(lirePartageTexte(s), false);
  ecrirePartageTexte(true, s);
  assert.equal(lirePartageTexte(s), true);
  ecrirePartageTexte(false, s);
  assert.equal(lirePartageTexte(s), false);
  const casse = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } };
  assert.equal(lirePartageTexte(casse), false);
  assert.doesNotThrow(() => ecrirePartageTexte(true, casse));
});
