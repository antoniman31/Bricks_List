import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ECHECS_AVANT_ARRET, brickLinkInjoignable, numerosABoites, sourcesImage, urlBoite } from './boite.js';

test('l\'adresse de la boîte se déduit du numéro, avec ou sans version', () => {
  assert.equal(urlBoite('75192-1'), 'https://img.bricklink.com/ItemImage/ON/0/75192-1.png');
  assert.equal(urlBoite('75192'), 'https://img.bricklink.com/ItemImage/ON/0/75192-1.png');
  assert.equal(urlBoite('10294-2'), 'https://img.bricklink.com/ItemImage/ON/0/10294-2.png');
});

test('un numéro invalide ou vide n\'a pas d\'adresse (rien d\'injecté dans l\'URL)', () => {
  for (const v of ['', null, undefined, 'abc', '75192/../x', '12', '75192-1?x=1']) assert.equal(urlBoite(v), null);
});

test('sources : la boîte d\'abord, puis le rendu, sans trou', () => {
  assert.deepEqual(sourcesImage('75192-1', 'https://cdn.rebrickable.com/a.jpg'), [
    'https://img.bricklink.com/ItemImage/ON/0/75192-1.png',
    'https://cdn.rebrickable.com/a.jpg',
  ]);
  assert.deepEqual(sourcesImage('75192-1', null), ['https://img.bricklink.com/ItemImage/ON/0/75192-1.png']);
  assert.deepEqual(sourcesImage('xx', 'https://cdn.rebrickable.com/a.jpg'), ['https://cdn.rebrickable.com/a.jpg']);
  assert.deepEqual(sourcesImage('xx', null), []);
});

test('numerosABoites : des numéros distincts et normalisés, sans ceux déjà gardés, wishlist comprise', () => {
  const sets = [
    { numero: '75192-1', statut: 'possédé' }, { numero: '75192-1', statut: 'possédé' }, // deux exemplaires : un seul numéro
    { numero: '10294-1', statut: 'souhaité' }, { numero: '21357-1', statut: 'possédé' },
    { numero: 'zzz', statut: 'possédé' }, { numero: '', statut: 'possédé' }, null,
  ];
  assert.deepEqual(numerosABoites(sets), ['75192-1', '10294-1', '21357-1']);
  assert.deepEqual(numerosABoites(sets, new Set(['75192-1', '21357-1'])), ['10294-1']);
  assert.deepEqual(numerosABoites([], new Set()), []);
});

test('BrickLink injoignable : seulement après plusieurs échecs de suite et aucune réussite', () => {
  assert.equal(brickLinkInjoignable(ECHECS_AVANT_ARRET - 1, 0), false);
  assert.equal(brickLinkInjoignable(ECHECS_AVANT_ARRET, 0), true);
  assert.equal(brickLinkInjoignable(ECHECS_AVANT_ARRET + 5, 1), false, 'une boîte déjà récupérée prouve que BrickLink répond');
  assert.equal(brickLinkInjoignable(0, 0), false);
});

test('urlRenduValide / rendusACopier : seuls les rendus que le relais accepte, un par numéro, sans ceux déjà gardés', async () => {
  const { rendusACopier, urlRenduValide } = await import('./boite.js');
  const ok = 'https://cdn.rebrickable.com/media/sets/75192-1.jpg';
  assert.equal(urlRenduValide(ok), true);
  for (const v of [null, '', 'http://cdn.rebrickable.com/media/sets/1-1.jpg', 'https://evil.test/media/sets/1-1.jpg', 'https://cdn.rebrickable.com/media/parts/1.jpg', 'https://cdn.rebrickable.com/media/sets/../x.jpg']) assert.equal(urlRenduValide(v), false, String(v));
  const sets = [
    { numero: '75192', image: ok },
    { numero: '75192-1', image: ok },
    { numero: '10294', image: 'https://cdn.rebrickable.com/media/sets/10294-1.jpg' },
    { numero: '21357', image: null },
    { numero: '42100', image: 'https://evil.test/a.jpg' },
  ];
  assert.deepEqual(rendusACopier(sets).map((r) => r.numero), ['75192-1', '10294-1']);
  assert.deepEqual(rendusACopier(sets, new Set(['75192-1'])).map((r) => r.numero), ['10294-1']);
});
