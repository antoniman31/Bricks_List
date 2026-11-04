import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireDernierAjout, ecrireDernierAjout, validerDernierAjout, LIEU_MAX } from './dernierAjout.js';

const faux = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
};

test('par défaut : rien de retenu', () => {
  assert.deepEqual(lireDernierAjout(faux()), { lieu: '', etat: '' });
});

test('écrire puis lire redonne le dernier choix', () => {
  const s = faux();
  ecrireDernierAjout({ lieu: 'Étagère 2', etat: 'scellé' }, s);
  assert.deepEqual(lireDernierAjout(s), { lieu: 'Étagère 2', etat: 'scellé' });
});

test('une valeur illisible ou invalide retombe sur le vide, sans planter', () => {
  assert.deepEqual(lireDernierAjout(faux({ bl_dernier_ajout: 'pas du json' })), { lieu: '', etat: '' });
  assert.deepEqual(lireDernierAjout(faux({ bl_dernier_ajout: '[1,2]' })), { lieu: '', etat: '' });
  assert.deepEqual(lireDernierAjout({ getItem: () => { throw new Error('x'); } }), { lieu: '', etat: '' });
});

test('validation : état inconnu écarté, lieu nettoyé et borné, types douteux ignorés', () => {
  assert.equal(validerDernierAjout({ lieu: 'x', etat: 'cassé' }).etat, '');
  assert.equal(validerDernierAjout({ lieu: '  Carton   A ', etat: 'monté' }).lieu, 'Carton A');
  assert.equal(validerDernierAjout({ lieu: 'a'.repeat(200) }).lieu.length, LIEU_MAX);
  assert.deepEqual(validerDernierAjout({ lieu: 42, etat: {} }), { lieu: '', etat: '' });
  assert.deepEqual(validerDernierAjout(null), { lieu: '', etat: '' });
});

test('un stockage qui refuse l\'écriture ne plante pas', () => {
  assert.doesNotThrow(() => ecrireDernierAjout({ lieu: 'x', etat: '' }, { setItem: () => { throw new Error('plein'); } }));
});
