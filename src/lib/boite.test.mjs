import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sourcesImage, urlBoite } from './boite.js';

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
