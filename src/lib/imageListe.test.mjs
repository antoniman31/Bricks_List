import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choisirImage, ecrireRegle, lireRegle, regleValide } from './imageListe.js';
import { normaliserSet } from './model.js';
import { modifier } from './collection.js';
import { sourcesImage } from './boite.js';

const faux = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
};

test('règle : par défaut la boîte, écrire puis lire redonne le choix, une valeur inconnue retombe sur la boîte', () => {
  assert.equal(lireRegle(faux()), 'boite');
  const s = faux();
  ecrireRegle('photo', s);
  assert.equal(lireRegle(s), 'photo');
  ecrireRegle('nimporte', s);
  assert.equal(lireRegle(s), 'photo');
  assert.equal(lireRegle(faux({ bl_image_liste: '{"x":1}' })), 'boite');
  assert.equal(lireRegle({ getItem: () => { throw new Error('x'); } }), 'boite');
  assert.equal(regleValide('rendu'), 'rendu');
  assert.equal(regleValide(null), 'boite');
});

test('le choix de la fiche l\'emporte sur la règle', () => {
  assert.equal(choisirImage({ imageListe: 'rendu' }, 'boite', true), 'rendu');
  assert.equal(choisirImage({ imageListe: 'boite' }, 'photo', true), 'boite');
  assert.equal(choisirImage({ imageListe: 'photo' }, 'boite', true), 'photo');
});

test('sans choix, c\'est la règle ; « photo » exige une photo, sinon la boîte', () => {
  assert.equal(choisirImage({ imageListe: null }, 'boite', true), 'boite');
  assert.equal(choisirImage({ imageListe: null }, 'rendu', false), 'rendu');
  assert.equal(choisirImage({ imageListe: null }, 'photo', true), 'photo');
  assert.equal(choisirImage({ imageListe: null }, 'photo', false), 'boite');
  assert.equal(choisirImage({ imageListe: 'photo' }, 'boite', false), 'boite');
  assert.equal(choisirImage({}, 'boite', false), 'boite');
});

test('modèle : un choix valide est gardé, absent ou inconnu devient « automatique » (inconnu compté)', () => {
  const base = { numero: '75192-1', nom: 'Falcon' };
  assert.equal(normaliserSet({ ...base, imageListe: 'photo' }).set.imageListe, 'photo');
  assert.equal(normaliserSet({ ...base, imageListe: 'rendu' }).set.imageListe, 'rendu');
  const absent = normaliserSet(base);
  assert.equal(absent.set.imageListe, null);
  assert.equal(absent.corrections, 0);
  const inconnu = normaliserSet({ ...base, imageListe: 'hologramme' });
  assert.equal(inconnu.set.imageListe, null);
  assert.equal(inconnu.corrections, 1);
  assert.equal(normaliserSet({ ...base, imageListe: 42 }).set.imageListe, null);
});

test('modifier : le choix se change et se retire, aussi pour un set souhaité', () => {
  const sets = [normaliserSet({ id: 'a', numero: '75192-1', nom: 'F', statut: 'souhaité' }).set];
  const avec = modifier(sets, 'a', { imageListe: 'photo' });
  assert.equal(avec[0].imageListe, 'photo');
  assert.equal(modifier(avec, 'a', { imageListe: null })[0].imageListe, null);
});

test('sources : « rendu » en premier inverse l\'ordre, sans trou', () => {
  assert.deepEqual(sourcesImage('75192-1', 'https://cdn.rebrickable.com/a.jpg', 'rendu'), [
    'https://cdn.rebrickable.com/a.jpg',
    'https://img.bricklink.com/ItemImage/ON/0/75192-1.png',
  ]);
  assert.deepEqual(sourcesImage('xx', 'https://cdn.rebrickable.com/a.jpg', 'rendu'), ['https://cdn.rebrickable.com/a.jpg']);
  assert.deepEqual(sourcesImage('75192-1', null, 'rendu'), ['https://img.bricklink.com/ItemImage/ON/0/75192-1.png']);
});
