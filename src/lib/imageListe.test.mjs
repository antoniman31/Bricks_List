import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choisirImage, choixPhoto, clePhoto, diapositives, ecrireRegle, lireClePhoto, lireRegle, numeroPhotoDe, regleValide } from './imageListe.js';
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

test('plusieurs photos : clés du magasin et choix de la liste, la première garde ses noms d\'origine', () => {
  assert.equal(clePhoto('abc', 1), 'abc');
  assert.equal(clePhoto('abc', 3), 'abc#3');
  assert.equal(choixPhoto(1), 'photo');
  assert.equal(choixPhoto(4), 'photo-4');
  assert.deepEqual([numeroPhotoDe('photo'), numeroPhotoDe('photo-2'), numeroPhotoDe('photo-6')], [1, 2, 6]);
  for (const v of ['photo-1', 'photo-7', 'photo-', 'boite', null, undefined, 3]) assert.equal(numeroPhotoDe(v), null, String(v));
  assert.deepEqual(lireClePhoto('abc'), { id: 'abc', n: 1 });
  assert.deepEqual(lireClePhoto('abc#2'), { id: 'abc', n: 2 });
  assert.deepEqual(lireClePhoto('a#b#6'), { id: 'a#b', n: 6 });
  for (const v of ['abc#1', 'abc#7', 'abc#', '#2', 'abc#x', '', null, 5]) assert.equal(lireClePhoto(v), null, String(v));
});

test('choisirImage : une photo voulue (photo-3) n\'est choisie que si elle existe, sinon la boîte', () => {
  const existe = (n) => n === 3;
  assert.equal(choisirImage({ imageListe: 'photo-3' }, 'boite', existe), 'photo-3');
  assert.equal(choisirImage({ imageListe: 'photo-2' }, 'boite', existe), 'boite');
  assert.equal(choisirImage({ imageListe: 'photo' }, 'boite', existe), 'boite');
  assert.equal(choisirImage({ imageListe: null }, 'photo', (n) => n === 1), 'photo'); // la règle « Ma photo » vise la première
  assert.equal(choisirImage({ imageListe: 'photo-3' }, 'boite', true), 'boite'); // booléen : seulement la première photo
});

test('modèle : toute photo personnelle peut être l\'image de la liste', () => {
  const base = { numero: '75192-1', nom: 'Faucon' };
  for (const v of ['photo', 'photo-2', 'photo-6']) assert.equal(normaliserSet({ ...base, imageListe: v }).set.imageListe, v);
  for (const v of ['photo-7', 'photo-1', 'photo-0']) assert.equal(normaliserSet({ ...base, imageListe: v }).set.imageListe, null);
});

test('diapositives : boîte, rendu si le set en a un, photos dans l\'ordre des places, puis « ajouter » tant qu\'il reste de la place', () => {
  const set = { id: 'a', image: 'https://cdn.rebrickable.com/media/sets/x.jpg' };
  const cles = (s, photos, lecture) => diapositives(s, new Set(photos), lecture).map((d) => d.cle);
  assert.deepEqual(cles(set, []), ['boite', 'rendu', 'ajout']);
  assert.deepEqual(cles({ id: 'a' }, []), ['boite', 'ajout']);
  assert.deepEqual(cles(set, ['a', 'a#3']), ['boite', 'rendu', 'photo', 'photo-3', 'ajout']);
  assert.deepEqual(diapositives(set, new Set(['a', 'a#3'])).map((d) => d.libelle), ['Boîte', 'Rendu', 'Ma photo 1', 'Ma photo 2', 'Ajouter une photo']);
  assert.equal(diapositives(set, new Set(['a'])).find((d) => d.cle === 'photo').libelle, 'Ma photo');
  assert.deepEqual(cles(set, ['a', 'a#2', 'a#3', 'a#4', 'a#5', 'a#6']).at(-1), 'photo-6'); // six photos : plus de place
  assert.deepEqual(cles(set, ['a'], true), ['boite', 'rendu', 'photo']); // lecture seule : on ne propose pas d'ajouter
  assert.deepEqual(cles(set, ['b', 'b#2']), ['boite', 'rendu', 'ajout']); // les photos d'un autre set ne comptent pas
});

test('image de la galerie Brickset comme image de la liste : valide dans le modèle, choisie seulement si elle est gardée', () => {
  const base = { numero: '75192-1', nom: 'Faucon' };
  assert.equal(normaliserSet({ ...base, imageListe: 'extra:75192_Box1_V39.jpg' }).set.imageListe, 'extra:75192_Box1_V39.jpg');
  for (const v of ['extra:', 'extra:../a.jpg', 'extra:a.gif', 'extra:' + 'a'.repeat(100) + '.jpg']) assert.equal(normaliserSet({ ...base, imageListe: v }).set.imageListe, null, v);
  const gardee = (nom) => nom === 'a.jpg';
  assert.equal(choisirImage({ imageListe: 'extra:a.jpg' }, 'boite', () => false, gardee), 'extra:a.jpg');
  assert.equal(choisirImage({ imageListe: 'extra:b.jpg' }, 'boite', () => false, gardee), 'boite');
  assert.equal(choisirImage({ imageListe: 'extra:a.jpg' }, 'boite', false), 'boite'); // sans la fonction : rien n'est gardé
});

test('diapositives : les images Brickset suivent les photos, avant « ajouter » ; gardées seules hors ligne', () => {
  const set = { id: 'a', image: 'https://cdn.rebrickable.com/media/sets/x.jpg' };
  const g = (nom) => ({ nom, url: `https://images.brickset.com/sets/AdditionalImages/75192-1/${nom}`, miniature: null, boite: false });
  const d = diapositives(set, new Set(['a']), false, { galerie: [g('x.jpg'), g('y.jpg')], gardees: new Set(['y.jpg']) });
  assert.deepEqual(d.map((x) => x.cle), ['boite', 'rendu', 'photo', 'extra:x.jpg', 'extra:y.jpg', 'ajout']);
  assert.deepEqual(d.filter((x) => x.extra).map((x) => [x.libelle, x.gardee]), [['Brickset', false], ['Brickset', true]]);
  const horsLigne = diapositives(set, new Set(), false, { galerie: [], gardees: new Set(['y.jpg']) });
  assert.deepEqual(horsLigne.map((x) => x.cle), ['boite', 'rendu', 'extra:y.jpg', 'ajout']);
  assert.equal(horsLigne.find((x) => x.extra).extra.url, null);
});
