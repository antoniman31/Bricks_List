import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleEmplacement, memeEmplacement, ecrituresEmplacements } from './emplacements.js';

test('cleEmplacement ignore casse, accents et espaces superflus', () => {
  assert.equal(cleEmplacement('  Étagère   2 '), 'etagere 2');
  assert.equal(cleEmplacement('SALON'), cleEmplacement('Salón'));
  assert.equal(cleEmplacement(null), '');
  assert.equal(cleEmplacement(undefined), '');
});

test('memeEmplacement : vrai pour la même écriture à la casse près, faux pour le vide', () => {
  assert.equal(memeEmplacement('Salon', 'salon'), true);
  assert.equal(memeEmplacement('Salon', 'Salle'), false);
  assert.equal(memeEmplacement('', ''), false);
  assert.equal(memeEmplacement(undefined, 'Salon'), false);
});

test('ecrituresEmplacements : l\'écriture la plus fréquente, à égalité la première rencontrée', () => {
  const sets = [{ emplacement: 'salon' }, { emplacement: 'Salon' }, { emplacement: 'Salon' }, { emplacement: 'Carton A' }, { emplacement: 'carton a' }, {}];
  const m = ecrituresEmplacements(sets);
  assert.equal(m.get('salon'), 'Salon');
  assert.equal(m.get('carton a'), 'Carton A');
  assert.equal(m.size, 2);
});
