import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modeSuivant, resoudreTheme, modeValide, lireMode, ecrireMode, MODES, COULEUR_BARRE } from './apparence.js';

function faux(initial) {
  const d = new Map(initial ? [['bl_theme', initial]] : []);
  return { getItem: (k) => d.get(k) ?? null, setItem: (k, v) => d.set(k, v) };
}

test('automatique suit le système', () => {
  assert.equal(resoudreTheme('auto', true), 'dark');
  assert.equal(resoudreTheme('auto', false), 'light');
});

test('clair et sombre tiennent quoi que fasse le système', () => {
  assert.equal(resoudreTheme('light', true), 'light');
  assert.equal(resoudreTheme('dark', false), 'dark');
});

test('une valeur inconnue retombe sur l\'automatique', () => {
  for (const v of ['nuit', '', null, undefined, 3, 'LIGHT']) assert.equal(modeValide(v), 'auto');
  for (const m of MODES) assert.equal(modeValide(m), m);
});

test('première visite : automatique', () => {
  assert.equal(lireMode(faux()), 'auto');
});

test('aller-retour', () => {
  const s = faux();
  assert.equal(ecrireMode('light', s).ok, true);
  assert.equal(lireMode(s), 'light');
});

test('un stockage corrompu retombe sur l\'automatique', () => {
  assert.equal(lireMode(faux('violet')), 'auto');
});

test('écriture impossible : pas de plantage', () => {
  const plein = { getItem: () => null, setItem: () => { throw new Error('plein'); } };
  assert.equal(ecrireMode('dark', plein).ok, false);
  assert.equal(lireMode({ getItem: () => { throw new Error('x'); } }), 'auto');
});

test('une valeur invalide n\'est jamais écrite telle quelle', () => {
  const s = faux();
  ecrireMode('violet', s);
  assert.equal(lireMode(s), 'auto');
});

test('la barre d\'état suit le fond de chaque thème', () => {
  assert.equal(COULEUR_BARRE.dark, '#000000');
  assert.match(COULEUR_BARRE.light, /^#[0-9a-f]{6}$/);
});

test('modeSuivant : auto, clair, sombre, puis retour à auto', () => {
  assert.equal(modeSuivant('auto'), 'light');
  assert.equal(modeSuivant('light'), 'dark');
  assert.equal(modeSuivant('dark'), 'auto');
});

test('modeSuivant : un mode inconnu repart de l\'automatique sans lever d\'erreur', () => {
  assert.equal(modeSuivant('violet'), 'auto');
  assert.equal(modeSuivant(undefined), 'auto');
  assert.equal(modeSuivant(null), 'auto');
});

test('modeSuivant : trois appuis ramènent au point de départ', () => {
  for (const m of ['auto', 'light', 'dark']) assert.equal(modeSuivant(modeSuivant(modeSuivant(m))), m);
});
