import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FILTRES_VIDES, ecrireFiltres, lireFiltres } from './filtresMemo.js';

const faux = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
};

test('par défaut : collection, sans filtre, tri par ajout', () => {
  assert.deepEqual(lireFiltres(faux()), { statut: 'possédé', filtres: FILTRES_VIDES, tri: 'ajout' });
});

test('écrire puis lire redonne onglet, filtres et tri', () => {
  const s = faux();
  const v = { statut: 'souhaité', filtres: { ...FILTRES_VIDES, theme: 'Star Wars', priorite: 'forte' }, tri: 'priorite' };
  ecrireFiltres(v, s);
  assert.deepEqual(lireFiltres(s), v);
});

test('une valeur inconnue ou mal typée est ignorée champ par champ', () => {
  const s = faux({ bl_filtres: JSON.stringify({ statut: 'autre', tri: 'zzz', filtres: { theme: 'City', etat: 3, inconnu: 'x', annee: 'y'.repeat(500) } }) });
  assert.deepEqual(lireFiltres(s), { statut: 'possédé', filtres: { ...FILTRES_VIDES, theme: 'City' }, tri: 'ajout' });
});

test('un contenu illisible ou un stockage cassé retombe sur le défaut', () => {
  const defaut = { statut: 'possédé', filtres: FILTRES_VIDES, tri: 'ajout' };
  assert.deepEqual(lireFiltres(faux({ bl_filtres: '{pas du json' })), defaut);
  assert.deepEqual(lireFiltres(faux({ bl_filtres: '[1]' })), defaut);
  assert.deepEqual(lireFiltres({ getItem: () => { throw new Error('x'); } }), defaut);
});

test('un stockage qui refuse l\'écriture ne plante pas', () => {
  ecrireFiltres({ statut: 'possédé', filtres: FILTRES_VIDES, tri: 'ajout' }, { setItem: () => { throw new Error('plein'); } });
});
