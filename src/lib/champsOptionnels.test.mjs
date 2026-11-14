import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changementsOptionnels } from './champsOptionnels.js';

const vide = { prix: '', dateSortie: '', dateRetrait: '', sousTheme: '' };

test('rien de changé : aucun changement, les sources restent', () => {
  const d = { prix: '849,99', dateSortie: '2017-10-01', dateRetrait: '2026-12-31', sousTheme: 'UCS' };
  assert.deepEqual(changementsOptionnels(d, { ...d }, true), { changements: {} });
});

test('prix saisi : source manuelle ; effacé : source retirée ; invalide : erreur', () => {
  assert.deepEqual(changementsOptionnels(vide, { ...vide, prix: '1 299,99 €' }, true), { changements: { prix: 1299.99, prixSource: 'manuelle' } });
  assert.deepEqual(changementsOptionnels({ ...vide, prix: '70' }, { ...vide }, true), { changements: { prix: null, prixSource: null } });
  assert.match(changementsOptionnels(vide, { ...vide, prix: 'abc' }, true).erreur, /Prix invalide/);
  assert.match(changementsOptionnels(vide, { ...vide, prix: '0' }, true).erreur, /Prix invalide/);
});

test('le prix est ignoré hors wishlist', () => {
  assert.deepEqual(changementsOptionnels(vide, { ...vide, prix: '70' }, false), { changements: {} });
});

test('date de sortie : manuelle une fois saisie, source effacée avec elle, futur permis, absurde refusé', () => {
  assert.deepEqual(changementsOptionnels(vide, { ...vide, dateSortie: '2027-03-01' }, false), { changements: { dateSortie: '2027-03-01', sortieSource: 'manuelle' } });
  assert.deepEqual(changementsOptionnels({ ...vide, dateSortie: '2017-10-01' }, { ...vide }, false), { changements: { dateSortie: null, sortieSource: null } });
  assert.match(changementsOptionnels(vide, { ...vide, dateSortie: '2017-02-30' }, false).erreur, /sortie invalide/);
});

test('date de retrait et sous-thème', () => {
  assert.deepEqual(changementsOptionnels(vide, { ...vide, dateRetrait: '2026-12-31' }, false), { changements: { dateRetrait: '2026-12-31' } });
  assert.deepEqual(changementsOptionnels({ ...vide, dateRetrait: '2026-12-31' }, { ...vide }, false), { changements: { dateRetrait: null } });
  assert.match(changementsOptionnels(vide, { ...vide, dateRetrait: '31/12/2026' }, false).erreur, /retrait invalide/);
  assert.deepEqual(changementsOptionnels({ ...vide, sousTheme: 'UCS' }, { ...vide, sousTheme: '  Mario Kart ' }, false), { changements: { sousTheme: 'Mario Kart' } });
});
