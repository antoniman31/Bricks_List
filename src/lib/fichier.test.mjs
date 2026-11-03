import test from 'node:test';
import assert from 'node:assert/strict';
import { partageDisponible, partager } from './fichier.js';

test('partage indisponible sans navigator.share ni canShare', () => {
  assert.equal(partageDisponible({}), false);
  assert.equal(partageDisponible({ share: () => {} }), false);
  assert.equal(partageDisponible({ share: () => {}, canShare: () => false }), false);
  assert.equal(partageDisponible(undefined), false);
});

test('partage disponible si le système accepte un fichier', () => {
  assert.equal(partageDisponible({ share: () => {}, canShare: () => true }), true);
});

test('partager : envoie un fichier JSON nommé', async () => {
  let recu;
  const nav = { canShare: () => true, share: async (d) => { recu = d; } };
  assert.deepEqual(await partager('sauvegarde.json', '{"a":1}', nav), { mode: 'partage' });
  assert.equal(recu.files[0].name, 'sauvegarde.json');
  assert.equal(await recu.files[0].text(), '{"a":1}');
});

test('partager : fermer la feuille est une annulation, pas un échec', async () => {
  const nav = { canShare: () => true, share: async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); } };
  assert.deepEqual(await partager('a.json', '{}', nav), { mode: 'annule' });
});

test('partager : toute autre erreur est un échec visible', async () => {
  const nav = { canShare: () => true, share: async () => { throw new Error('boom'); } };
  assert.deepEqual(await partager('a.json', '{}', nav), { mode: 'echec' });
});

import { copierTexte } from './fichier.js';

test('copierTexte : presse-papiers en premier', async () => {
  let ecrit;
  assert.equal(await copierTexte('abc', { clipboard: { writeText: async (t) => { ecrit = t; } } }), 'copie');
  assert.equal(ecrit, 'abc');
});

test('copierTexte : presse-papiers refusé, repli sur le partage', async () => {
  let partage;
  const nav = { clipboard: { writeText: async () => { throw new Error('refusé'); } }, share: async (d) => { partage = d; } };
  assert.equal(await copierTexte('abc', nav), 'partage');
  assert.deepEqual(partage, { text: 'abc' });
});

test('copierTexte : partage fermé = annulé ; rien de disponible = échec visible', async () => {
  const ferme = { share: async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); } };
  assert.equal(await copierTexte('abc', ferme), 'annule');
  assert.equal(await copierTexte('abc', {}), 'echec');
  assert.equal(await copierTexte('abc', undefined), 'echec');
});
