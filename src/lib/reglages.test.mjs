import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleValide, lireCle, ecrireCle, lireThemes, ecrireThemes } from './reglages.js';

function faux() {
  const d = new Map();
  return { getItem: (k) => d.get(k) ?? null, setItem: (k, v) => d.set(k, v), removeItem: (k) => d.delete(k), _d: d };
}

test('forme de clé acceptée ou refusée', () => {
  assert.equal(cleValide('0123456789abcdef0123456789abcdef'), true);
  assert.equal(cleValide('  0123456789abcdef  '), true);
  assert.equal(cleValide('court'), false);
  assert.equal(cleValide('avec espace dans la clé'), false);
  assert.equal(cleValide('clé-accentuée-123456'), false);
  assert.equal(cleValide('abc\ndef12345'), false);
  assert.equal(cleValide(undefined), false);
});

test('la clé est enregistrée sans espaces et peut être effacée', () => {
  const s = faux();
  assert.equal(lireCle(s), '');
  assert.equal(ecrireCle('  0123456789abcdef ', s).ok, true);
  assert.equal(lireCle(s), '0123456789abcdef');
  assert.equal(ecrireCle('', s).ok, true);
  assert.equal(lireCle(s), '');
});

test('la clé n\'est pas stockée avec la collection', () => {
  const s = faux();
  ecrireCle('0123456789abcdef', s);
  assert.equal(s._d.has('bl_v1'), false);
  assert.deepEqual([...s._d.keys()], ['bl_rebrickable']);
});

test('écriture impossible : motif rendu', () => {
  const plein = { getItem: () => null, setItem: () => { throw new Error('plein'); }, removeItem: () => {} };
  assert.equal(ecrireCle('0123456789abcdef', plein).ok, false);
});

test('cache de thèmes : aller-retour', () => {
  const s = faux();
  ecrireThemes({ 158: { name: 'Star Wars', parent_id: null } }, s);
  assert.deepEqual(lireThemes(s), { 158: { name: 'Star Wars', parent_id: null } });
});

test('cache de thèmes : entrées invalides écartées, JSON cassé ignoré', () => {
  const s = faux();
  s.setItem('bl_themes', JSON.stringify({ 1: { name: 'OK', parent_id: null }, 2: { name: '', parent_id: null }, 3: { name: 'X', parent_id: 'abc' }, 4: 'texte' }));
  assert.deepEqual(lireThemes(s), { 1: { name: 'OK', parent_id: null } });
  s.setItem('bl_themes', '{cassé');
  assert.deepEqual(lireThemes(s), {});
});

test('résumés des Réglages : une ligne d\'état par section', async () => {
  const { resumeCle, resumeImages, resumeRelais, resumeSauvegarde } = await import('./reglages.js');
  assert.equal(resumeCle('abcdefgh1234'), 'Clé enregistrée (…1234)');
  assert.equal(resumeCle(''), 'Pas de clé');
  assert.equal(resumeRelais('https://r.example'), 'Adresse enregistrée');
  assert.equal(resumeRelais(''), 'Non configuré');
  assert.equal(resumeImages(51, 8), '51 boîtes · 8 rendus');
  assert.equal(resumeImages(1, 1), '1 boîte · 1 rendu');
  assert.equal(resumeImages(0, 0), 'Aucune image gardée');
  assert.equal(resumeSauvegarde('hier', 'protege'), 'Dernière : hier · stockage protégé');
  assert.equal(resumeSauvegarde('jamais', 'non-garanti'), 'Dernière : jamais · stockage non garanti');
  assert.equal(resumeSauvegarde('hier', 'n\'importe quoi'), 'Dernière : hier · protection inconnue');
});
