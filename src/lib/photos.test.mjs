import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OCTETS_MAX, ZOOM_MAX, deplacer, photoValide, rectangleRecadrage } from './photos.js';

const proche = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≠ ${b}`);

test('au zoom 1, le plus grand 4:3 contenu dans l\'image, centré', () => {
  const large = rectangleRecadrage(4000, 1000);          // plus large que 4:3 : toute la hauteur
  proche(large.sh, 1000); proche(large.sl, 1000 * 4 / 3); proche(large.sy, 0);
  proche(large.sx, (4000 - large.sl) / 2);
  const haute = rectangleRecadrage(3000, 4000);          // plus haute : toute la largeur
  proche(haute.sl, 3000); proche(haute.sh, 2250); proche(haute.sy, (4000 - 2250) / 2);
});

test('le rectangle reste du bon format et dans l\'image, quels que soient zoom et position', () => {
  for (const zoom of [1, 1.5, 3, ZOOM_MAX]) {
    for (const p of [0, 0.3, 1]) {
      const r = rectangleRecadrage(3024, 4032, { zoom, px: p, py: 1 - p });
      proche(r.sl / r.sh, 4 / 3);
      assert.ok(r.sx >= -1e-6 && r.sy >= -1e-6 && r.sx + r.sl <= 3024 + 1e-6 && r.sy + r.sh <= 4032 + 1e-6);
    }
  }
});

test('le zoom rétrécit le rectangle, borné entre 1 et le maximum', () => {
  const base = rectangleRecadrage(2000, 2000);
  proche(rectangleRecadrage(2000, 2000, { zoom: 2 }).sl, base.sl / 2);
  proche(rectangleRecadrage(2000, 2000, { zoom: 99 }).sl, base.sl / ZOOM_MAX);
  proche(rectangleRecadrage(2000, 2000, { zoom: 0.1 }).sl, base.sl);
});

test('des valeurs absurdes ne produisent ni NaN ni rectangle hors image', () => {
  assert.equal(rectangleRecadrage(0, 100), null);
  assert.equal(rectangleRecadrage(100, -5), null);
  assert.equal(rectangleRecadrage(Infinity, 100), null);
  const r = rectangleRecadrage(1000, 1000, { zoom: NaN, px: 'x', py: Infinity });
  assert.ok([r.sx, r.sy, r.sl, r.sh].every(Number.isFinite));
});

test('glisser déplace l\'image avec le doigt et reste dans les bornes', () => {
  const rect = rectangleRecadrage(4000, 3000, { zoom: 2 });
  const apres = deplacer({ px: 0.5, py: 0.5 }, 50, 0, 400, rect, 4000, 3000);
  assert.ok(apres.px < 0.5, 'tirer vers la droite montre la partie de gauche');
  assert.equal(apres.py, 0.5);
  assert.equal(deplacer({ px: 0.1, py: 0.5 }, 9999, 0, 400, rect, 4000, 3000).px, 0);
  assert.equal(deplacer({ px: 0.9, py: 0.5 }, -9999, 0, 400, rect, 4000, 3000).px, 1);
  assert.deepEqual(deplacer({ px: 0.4, py: 0.6 }, 10, 10, 0, rect, 4000, 3000), { px: 0.4, py: 0.6 });
});

test('sans marge (l\'image remplit déjà le rectangle), le glissé ne bouge rien', () => {
  const rect = rectangleRecadrage(4000, 3000);           // 4:3 exact, zoom 1
  assert.deepEqual(deplacer({ px: 0.5, py: 0.5 }, 80, 80, 400, rect, 4000, 3000), { px: 0.5, py: 0.5 });
});

test('photoValide : un JPEG non vide et pas trop gros, rien d\'autre', () => {
  assert.equal(photoValide({ size: 100_000, type: 'image/jpeg' }), true);
  assert.equal(photoValide({ size: 0, type: 'image/jpeg' }), false);
  assert.equal(photoValide({ size: OCTETS_MAX + 1, type: 'image/jpeg' }), false);
  assert.equal(photoValide({ size: 1000, type: 'image/png' }), false);
  assert.equal(photoValide({ size: 1000, type: 'text/html' }), false);
  for (const v of [null, undefined, 'photo', 42, {}]) assert.equal(photoValide(v), false);
});
