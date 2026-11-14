import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ONGLETS, ecrireOnglet, lireOnglet, ongletValide } from './statsOnglet.js';

const memoire = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); } }; };

test('quatre onglets, dans l\'ordre', () => {
  assert.deepEqual(ONGLETS.map((o) => o.cle), ['apercu', 'repartition', 'suivi', 'wishlist']);
});

test('lireOnglet : le dernier choisi, « Aperçu » sinon (rien, valeur inconnue, stockage cassé)', () => {
  const s = memoire();
  assert.equal(lireOnglet(s), 'apercu');
  ecrireOnglet('suivi', s);
  assert.equal(lireOnglet(s), 'suivi');
  s.setItem('bl_stats_onglet', 'hologramme');
  assert.equal(lireOnglet(s), 'apercu');
  s.setItem('bl_stats_onglet', '<script>');
  assert.equal(lireOnglet(s), 'apercu');
  assert.equal(lireOnglet({ getItem() { throw new Error('bloqué'); } }), 'apercu');
});

test('ecrireOnglet : refuse une valeur inconnue, ne lève pas si le stockage échoue', () => {
  const s = memoire();
  ecrireOnglet('nimporte', s);
  assert.equal(s.getItem('bl_stats_onglet'), null);
  assert.doesNotThrow(() => ecrireOnglet('wishlist', { setItem() { throw new Error('plein'); } }));
  assert.equal(ongletValide('wishlist'), true);
  assert.equal(ongletValide(null), false);
});
