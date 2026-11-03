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
  assert.deepEqual(await partager('sauvegarde.json', '{"a":1}', nav), { mode: 'partage', nom: 'sauvegarde.json' });
  assert.equal(recu.files[0].name, 'sauvegarde.json');
  assert.equal(await recu.files[0].text(), '{"a":1}');
});

test('partager : fermer la feuille est une annulation, pas un échec', async () => {
  const nav = { canShare: () => true, share: async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); } };
  assert.deepEqual(await partager('a.json', '{}', nav), { mode: 'annule' });
});

test('partager : toute autre erreur est un échec visible', async () => {
  const nav = { canShare: () => true, share: async () => { throw new Error('boom'); } };
  assert.deepEqual(await partager('a.json', '{}', nav), { mode: 'echec', erreur: 'Error : boom' });
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

test('partager en texte : fichier .txt de type text/plain, contenu identique', async () => {
  let recu;
  const nav = { canShare: () => true, share: async (d) => { recu = d; } };
  const r = await partager('sauvegarde.json', '{"a":1}', nav, { texte: true });
  assert.deepEqual(r, { mode: 'partage', nom: 'sauvegarde.txt' });
  assert.equal(recu.files[0].name, 'sauvegarde.txt');
  assert.equal(recu.files[0].type, 'text/plain');
  assert.equal(await recu.files[0].text(), '{"a":1}');
});

test('partager : l\'échec rend le nom et le message de l\'erreur du navigateur', async () => {
  const nav = { canShare: () => true, share: async () => { throw Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }); } };
  assert.deepEqual(await partager('a.json', '{}', nav), { mode: 'echec', erreur: 'NotAllowedError : Permission denied' });
});

test('partageDisponible : le test porte sur le type réellement envoyé', () => {
  const nav = { share: () => {}, canShare: ({ files }) => files[0].type === 'text/plain' };
  assert.equal(partageDisponible(nav), false);
  assert.equal(partageDisponible(nav, { texte: true }), true);
});
