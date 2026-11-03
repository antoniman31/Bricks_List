import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireVue, ecrireVue, autreVue } from './vue.js';

const faux = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
};

test('par défaut : la liste', () => {
  assert.equal(lireVue(faux()), 'liste');
});

test('écrire puis lire redonne le choix', () => {
  const s = faux();
  ecrireVue('grille', s);
  assert.equal(lireVue(s), 'grille');
  ecrireVue('liste', s);
  assert.equal(lireVue(s), 'liste');
});

test('une valeur inconnue ou illisible retombe sur la liste', () => {
  assert.equal(lireVue(faux({ bl_vue: 'tableau' })), 'liste');
  assert.equal(lireVue(faux({ bl_vue: '{"x":1}' })), 'liste');
  assert.equal(lireVue({ getItem: () => { throw new Error('x'); } }), 'liste');
});

test('on n\'écrit pas une valeur invalide, et un stockage cassé ne plante pas', () => {
  const s = faux();
  ecrireVue('tableau', s);
  assert.equal(lireVue(s), 'liste');
  assert.doesNotThrow(() => ecrireVue('grille', { setItem: () => { throw new Error('plein'); } }));
});

test('autreVue bascule', () => {
  assert.equal(autreVue('liste'), 'grille');
  assert.equal(autreVue('grille'), 'liste');
});
