import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formaterOctets, phraseEspace } from './octets.js';

test('formaterOctets : o, Ko, Mo, Go, une décimale sous 10 unités', () => {
  assert.equal(formaterOctets(0), '0 o');
  assert.equal(formaterOctets(900), '900 o');
  assert.equal(formaterOctets(2048), '2 Ko');
  assert.equal(formaterOctets(1.5 * 1024 ** 2), '1,5 Mo');
  assert.equal(formaterOctets(38 * 1024 ** 2), '38 Mo');
  assert.equal(formaterOctets(1.2 * 1024 ** 3), '1,2 Go');
  assert.equal(formaterOctets(24 * 1024 ** 3), '24 Go');
});

test('formaterOctets : rien pour une valeur absurde', () => {
  for (const v of [-1, NaN, Infinity, '12', null, undefined]) assert.equal(formaterOctets(v), '', String(v));
});

test('phraseEspace : le total et la part des images, sans inventer ce qui manque', () => {
  const Mo = 1024 ** 2;
  assert.equal(phraseEspace({ usage: 38 * Mo, images: 31 * Mo }), '38 Mo utilisés sur cet appareil, dont 31 Mo d\'images.');
  assert.equal(phraseEspace({ usage: undefined, images: 31 * Mo }), '31 Mo d\'images gardées sur cet appareil.');
  assert.equal(phraseEspace({ usage: 20 * Mo, images: 31 * Mo }), '20 Mo utilisés sur cet appareil.');
  assert.equal(phraseEspace({ usage: undefined, images: undefined }), 'Espace utilisé : mesure indisponible sur ce navigateur.');
});
