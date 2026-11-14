import { test } from 'node:test';
import assert from 'node:assert/strict';
import { libelleCourt } from './libelle.js';

test('libelleCourt : une ligne de texte, 60 caractères au plus ; le vide reste vide, le reste est null', () => {
  assert.equal(libelleCourt('  Mario\n\tKart  '), 'Mario Kart');
  assert.equal(libelleCourt(''), '');
  assert.equal(libelleCourt('é'.repeat(100)).length, 60);
  for (const v of [null, undefined, 42, {}, []]) assert.equal(libelleCourt(v), null);
});
