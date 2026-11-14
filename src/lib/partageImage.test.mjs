import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extensionDe, nomFichierImage } from './partageImage.js';

test('extensionDe : jpeg, png, webp seulement', () => {
  assert.equal(extensionDe('image/jpeg'), 'jpg');
  assert.equal(extensionDe('IMAGE/PNG; charset=x'), 'png');
  assert.equal(extensionDe('image/webp'), 'webp');
  for (const v of ['text/html', 'image/svg+xml', '', null, undefined]) assert.equal(extensionDe(v), null, String(v));
});

test('nomFichierImage : numéro et image, caractères sûrs, jamais de chemin', () => {
  assert.equal(nomFichierImage('75192-1', 'boite', 'image/jpeg'), '75192-1-boite.jpg');
  assert.equal(nomFichierImage('75192-1', 'photo-2', 'image/png'), '75192-1-photo-2.png');
  assert.equal(nomFichierImage('../../etc/passwd', 'x/y', 'image/jpeg'), 'etc-passwd-x-y.jpg');
  assert.equal(nomFichierImage('', '', 'image/jpeg'), 'image.jpg');
  assert.equal(nomFichierImage('75192-1', 'boite', 'text/html'), null);
  assert.ok(nomFichierImage('x'.repeat(200), 'boite', 'image/jpeg').length < 100);
});
