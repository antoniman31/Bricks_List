import { test } from 'node:test';
import assert from 'node:assert/strict';
import { centimesParPiece, comparerPrixPiece, formaterCentimes, niveauPrixPiece } from './prixPiece.js';

test('centimesParPiece : prix ÷ pièces, rien sans l\'un des deux', () => {
  assert.ok(Math.abs(centimesParPiece({ prix: 849.99, pieces: 7541 }) - 11.2717) < 0.001);
  assert.equal(centimesParPiece({ prix: 100, pieces: 1000 }), 10);
  for (const s of [{ prix: 100 }, { pieces: 1000 }, { prix: 100, pieces: 0 }, { prix: 100, pieces: -5 }, { prix: 100, pieces: 12.5 }, { prix: 0, pieces: 100 }, { prix: -3, pieces: 100 }, { prix: 'cher', pieces: 100 }, {}, null, undefined]) assert.equal(centimesParPiece(s), null, JSON.stringify(s));
});

test('formaterCentimes : entier à partir de 10 ct, une décimale en dessous, virgule française', () => {
  assert.equal(formaterCentimes(11.27), '11 ct/pièce');
  assert.equal(formaterCentimes(10), '10 ct/pièce');
  assert.equal(formaterCentimes(7.5), '7,5 ct/pièce');
  assert.equal(formaterCentimes(8), '8 ct/pièce');
  assert.equal(formaterCentimes(6.64), '6,6 ct/pièce');
  assert.equal(formaterCentimes(9.96), '10 ct/pièce'); // l'arrondi à 10 passe à l'entier
  assert.equal(formaterCentimes(0.04), '0 ct/pièce');
  for (const v of [null, undefined, NaN, Infinity, -1, '11']) assert.equal(formaterCentimes(v), '', String(v));
});

test('niveauPrixPiece : sous 8 bon, au-dessus de 12 cher, les bornes restent moyennes', () => {
  assert.equal(niveauPrixPiece(7.99), 'bon');
  assert.equal(niveauPrixPiece(8), 'moyen');
  assert.equal(niveauPrixPiece(12), 'moyen');
  assert.equal(niveauPrixPiece(12.01), 'cher');
  assert.equal(niveauPrixPiece(null), null);
  assert.equal(niveauPrixPiece(NaN), null);
});

test('comparerPrixPiece : le moins cher la pièce d\'abord, sans chiffre en dernier', () => {
  const sets = [{ id: 'a', prix: 100, pieces: 500 }, { id: 'b' }, { id: 'c', prix: 100, pieces: 1000 }, { id: 'd', prix: 50 }];
  assert.deepEqual([...sets].sort(comparerPrixPiece).map((s) => s.id), ['c', 'a', 'b', 'd']);
});
