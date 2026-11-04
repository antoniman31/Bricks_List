import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FILTRES_VIDES, ecrireFiltres, lireFiltres } from './filtresMemo.js';

const faux = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
};
const vide = { filtres: FILTRES_VIDES, tri: 'ajout' };
const defaut = { statut: 'possédé', reglages: { possédé: vide, souhaité: vide } };

test('par défaut : collection, sans filtre, tri par ajout, dans les deux onglets', () => {
  assert.deepEqual(lireFiltres(faux()), defaut);
});

test('chaque onglet garde ses filtres et son tri', () => {
  const s = faux();
  const v = {
    statut: 'souhaité',
    reglages: {
      possédé: { filtres: { ...FILTRES_VIDES, theme: 'City', etat: 'monté' }, tri: 'pieces' },
      souhaité: { filtres: { ...FILTRES_VIDES, priorite: 'forte' }, tri: 'priorite' },
    },
  };
  ecrireFiltres(v, s);
  assert.deepEqual(lireFiltres(s), v);
});

test('un tri propre à l\'autre onglet est écarté', () => {
  const s = faux({ bl_filtres: JSON.stringify({ statut: 'possédé', reglages: { possédé: { tri: 'priorite' }, souhaité: { tri: 'emplacement' } } }) });
  assert.deepEqual(lireFiltres(s), defaut);
});

test('l\'ancien format (un seul jeu) reste à l\'onglet qui était actif', () => {
  const s = faux({ bl_filtres: JSON.stringify({ statut: 'souhaité', filtres: { priorite: 'forte' }, tri: 'priorite' }) });
  assert.deepEqual(lireFiltres(s), {
    statut: 'souhaité',
    reglages: { possédé: vide, souhaité: { filtres: { ...FILTRES_VIDES, priorite: 'forte' }, tri: 'priorite' } },
  });
});

test('une valeur inconnue ou mal typée est ignorée champ par champ', () => {
  const s = faux({ bl_filtres: JSON.stringify({ statut: 'autre', reglages: { possédé: { tri: 'zzz', filtres: { theme: 'City', etat: 3, inconnu: 'x', annee: 'y'.repeat(500) } }, souhaité: 'oups' } }) });
  assert.deepEqual(lireFiltres(s), { ...defaut, reglages: { possédé: { filtres: { ...FILTRES_VIDES, theme: 'City' }, tri: 'ajout' }, souhaité: vide } });
});

test('un contenu illisible ou un stockage cassé retombe sur le défaut', () => {
  assert.deepEqual(lireFiltres(faux({ bl_filtres: '{pas du json' })), defaut);
  assert.deepEqual(lireFiltres(faux({ bl_filtres: '[1]' })), defaut);
  assert.deepEqual(lireFiltres({ getItem: () => { throw new Error('x'); } }), defaut);
});

test('un stockage qui refuse l\'écriture ne plante pas', () => {
  ecrireFiltres(defaut, { setItem: () => { throw new Error('plein'); } });
});
