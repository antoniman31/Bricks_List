import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliserNumero } from './numero.js';

test('complète la version manquante', () => {
  assert.equal(normaliserNumero('75192'), '75192-1');
});
test('garde une version explicite', () => {
  assert.equal(normaliserNumero('75192-2'), '75192-2');
});
test('ignore les espaces autour', () => {
  assert.equal(normaliserNumero('  10294 '), '10294-1');
});
test('rejette ce qui n\'est pas un numéro', () => {
  assert.equal(normaliserNumero('abc'), null);
  assert.equal(normaliserNumero(''), null);
  assert.equal(normaliserNumero(undefined), null);
});
