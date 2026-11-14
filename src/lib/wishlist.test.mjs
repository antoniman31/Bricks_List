import { test } from 'node:test';
import assert from 'node:assert/strict';
import { texteWishlist } from './wishlist.js';

const W = (numero, nom, o = {}) => ({ id: numero, numero, nom, statut: 'souhaité', pieces: null, priorite: null, ...o });
const n = (x) => x.toLocaleString('fr-FR');

test('rien à copier sans set souhaité', () => {
  assert.equal(texteWishlist([]), '');
  assert.equal(texteWishlist([{ ...W('1-1', 'A'), statut: 'possédé' }]), '');
});

test('les sets possédés ne sont jamais dans le texte', () => {
  const t = texteWishlist([W('1-1', 'Voulu'), { ...W('2-1', 'Déjà là'), statut: 'possédé' }]);
  assert.match(t, /Voulu/);
  assert.doesNotMatch(t, /Déjà là/);
});

test('sans priorité : liste simple, sans titre de groupe', () => {
  const t = texteWishlist([W('75192-1', 'Faucon', { pieces: 7541 })]);
  assert.equal(t, `Ma wishlist LEGO : 1 set, ${n(7541)} pièces\n\n• Faucon (75192-1), ${n(7541)} pièces\n  https://rebrickable.com/sets/75192-1/\n`);
});

test('avec priorités : groupes dans l\'ordre, « Non précisée » en dernier, sets par nom', () => {
  const t = texteWishlist([
    W('1-1', 'Zèbre', { priorite: 'pas-presse' }),
    W('2-1', 'Sans', {}),
    W('3-1', 'Beta', { priorite: 'forte' }),
    W('4-1', 'Alpha', { priorite: 'forte' }),
    W('5-1', 'Delta', { priorite: 'un-jour' }),
  ]);
  const titres = t.split('\n').filter((l) => !l.startsWith('•') && !l.startsWith('  ') && l !== '');
  assert.deepEqual(titres.slice(1), ['Prioritaire', 'Envie', 'Un jour', 'Non précisée']);
  assert.ok(t.indexOf('Alpha') < t.indexOf('Beta'));
  assert.ok(t.indexOf('Beta') < t.indexOf('Delta'));
  assert.ok(t.indexOf('Zèbre') < t.indexOf('Sans'));
});

test('un groupe vide n\'est pas écrit', () => {
  const t = texteWishlist([W('1-1', 'A', { priorite: 'forte' })]);
  assert.doesNotMatch(t, /Envie|Un jour|Non précisée/);
});

test('pièces : total des connues, signalé quand certaines manquent', () => {
  const t = texteWishlist([W('1-1', 'A', { pieces: 100 }), W('2-1', 'B')]);
  assert.match(t, new RegExp(`2 sets, 100 pièces connues`));
  assert.doesNotMatch(t.split('\n').find((l) => l.includes('(2-1)')), /pièces/);
});

test('aucune pièce connue : pas de total', () => {
  assert.equal(texteWishlist([W('1-1', 'A')]).split('\n')[0], 'Ma wishlist LEGO : 1 set');
});

test('le numéro est encodé dans le lien', () => {
  assert.match(texteWishlist([W('a b-1', 'A')]), /sets\/a%20b-1\//);
});
