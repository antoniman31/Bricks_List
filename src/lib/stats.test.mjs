import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerStats } from './stats.js';
import { filtrer } from './recherche.js';

let n = 0;
const set = (o) => ({ id: `s${(n += 1)}`, numero: `${10000 + n}-1`, nom: `Set ${n}`, theme: '', annee: null, pieces: null, statut: 'possédé', etat: null, notes: '', image: null, dateAjout: null, ...o });

// Une collection volontairement tordue : données manquantes, un thème à égalité,
// des sets souhaités qui ne doivent pas entrer dans les chiffres de la collection.
const COLLECTION = [
  set({ nom: 'Faucon', theme: 'Star Wars', annee: 2017, pieces: 7541, etat: 'scellé' }),
  set({ nom: 'Titanic', theme: 'Icons', annee: 2021, pieces: 9090, etat: 'monté' }),
  set({ nom: 'Fondcombe', theme: 'Icons', annee: 2023, pieces: 6167, etat: 'monté' }),
  set({ nom: 'Ferrari', theme: 'Technic', annee: 2022, pieces: 3778, etat: 'démonté' }),
  set({ nom: 'Maman', theme: 'Ideas', annee: 2021, pieces: 3955 }),
  set({ nom: 'Sans rien' }),
  set({ nom: 'Sans pièces', theme: 'Technic', annee: 2020, etat: 'incomplet' }),
  set({ nom: 'Souhaité 1', theme: 'Icons', annee: 2023, pieces: 2000, statut: 'souhaité' }),
  set({ nom: 'Souhaité 2', theme: 'Ideas', statut: 'souhaité' }),
];
const POSSEDES = COLLECTION.filter((s) => s.statut === 'possédé');

test('les chiffres de la collection ignorent la wishlist', () => {
  const { resume } = calculerStats(COLLECTION);
  assert.equal(resume.sets, 7);
  assert.equal(resume.pieces, 7541 + 9090 + 6167 + 3778 + 3955);
  assert.equal(resume.sansPieces, 2);
});

test('plus gros set', () => {
  assert.deepEqual(calculerStats(COLLECTION).resume.plusGros, { nom: 'Titanic', pieces: 9090 });
});

test('plus gros set absent quand aucune pièce n\'est connue', () => {
  assert.equal(calculerStats([set({ nom: 'x' })]).resume.plusGros, null);
});

test('une collection vide ne plante pas', () => {
  const s = calculerStats([]);
  assert.equal(s.resume.sets, 0);
  assert.deepEqual(s.themes, []);
  assert.equal(s.aCompleter.fiches, 0);
});

// L'invariant qui compte : le chiffre d'une barre est le nombre de sets de la liste
// qu'on obtient en la touchant, et la somme des barres est le total.
for (const dimension of ['themes', 'annees', 'etats']) {
  test(`${dimension} : chaque barre égale la liste filtrée correspondante`, () => {
    for (const b of calculerStats(COLLECTION)[dimension]) {
      const liste = filtrer(COLLECTION, { statut: 'possédé', ...b.filtre });
      assert.equal(b.sets, liste.length, `${b.libelle}: nombre de sets`);
      assert.equal(b.pieces, liste.reduce((t, s) => t + (s.pieces ?? 0), 0), `${b.libelle}: pièces`);
      assert.equal(b.piecesInconnues, liste.filter((s) => s.pieces == null).length, `${b.libelle}: pièces inconnues`);
    }
  });

  test(`${dimension} : la somme des barres égale le nombre de sets`, () => {
    assert.equal(calculerStats(COLLECTION)[dimension].reduce((t, b) => t + b.sets, 0), POSSEDES.length);
  });
}

test('thèmes triés par taille puis par nom, « Non renseigné » en dernier', () => {
  const t = calculerStats(COLLECTION).themes;
  assert.deepEqual(t.map((b) => b.libelle), ['Icons', 'Technic', 'Ideas', 'Star Wars', 'Non renseigné']);
  assert.deepEqual(t.at(-1).filtre, { manque: 'theme' });
});

test('états dans l\'ordre du modèle, avec « Non renseigné » quand il en manque', () => {
  const e = calculerStats(COLLECTION).etats;
  assert.deepEqual(e.map((b) => b.libelle), ['scellé', 'monté', 'démonté', 'incomplet', 'Non renseigné']);
});

test('années dans l\'ordre du temps, par année quand l\'étalement est court', () => {
  const a = calculerStats(COLLECTION).annees;
  assert.deepEqual(a.map((b) => b.libelle), ['2017', '2020', '2021', '2022', '2023', 'Non renseigné']);
});

test('années par décennie quand la collection s\'étale', () => {
  const large = [set({ annee: 1999 }), set({ annee: 2004 }), set({ annee: 2011 }), set({ annee: 2024 }), set({ annee: 2025 })];
  const a = calculerStats(large).annees;
  assert.deepEqual(a.map((b) => b.libelle), ['1990–1999', '2000–2009', '2010–2019', '2020–2029']);
  for (const b of a) assert.equal(b.sets, filtrer(large, { statut: 'possédé', ...b.filtre }).length);
});

test('« à compléter » : les chiffres collent au filtre', () => {
  const { aCompleter } = calculerStats(COLLECTION);
  assert.equal(aCompleter.fiches, 3);
  for (const c of aCompleter.champs) {
    assert.equal(c.nombre, filtrer(COLLECTION, { statut: 'possédé', manque: c.cle }).length, c.cle);
  }
});

test('wishlist : sets et pièces à acquérir', () => {
  assert.deepEqual(calculerStats(COLLECTION).wishlist, { sets: 2, pieces: 2000, sansPieces: 1 });
});

// ---------- répartition par emplacement ----------
const rg = (o) => set({ theme: 'T', annee: 2020, pieces: 100, etat: 'monté', ...o });
const RANGE = [
  rg({ nom: 'A', emplacement: 'étagère 2', pieces: 100 }),
  rg({ nom: 'B', emplacement: 'étagère 2', pieces: null }),
  rg({ nom: 'C', emplacement: 'étagère 10' }),
  rg({ nom: 'D', emplacement: 'cave' }),
  rg({ nom: 'E', emplacement: '' }),
  rg({ nom: 'F', emplacement: '' }),
  rg({ nom: 'Souhait', statut: 'souhaité', etat: null, emplacement: '' }),
];

test('emplacements : vide tant que la fonction ne sert pas', () => {
  assert.deepEqual(calculerStats(COLLECTION).emplacements, []);
});

test('emplacements : ordre naturel puis « Non rangé » en dernier', () => {
  assert.deepEqual(calculerStats(RANGE).emplacements.map((b) => b.libelle), ['cave', 'étagère 2', 'étagère 10', 'Non rangé']);
});

test('emplacements : chaque barre égale la liste filtrée correspondante', () => {
  for (const b of calculerStats(RANGE).emplacements) {
    const liste = filtrer(RANGE, { statut: 'possédé', ...b.filtre });
    assert.equal(b.sets, liste.length, b.libelle);
    assert.equal(b.pieces, liste.reduce((t, x) => t + (x.pieces ?? 0), 0), `${b.libelle} : pièces`);
    assert.equal(b.piecesInconnues, liste.filter((x) => x.pieces == null).length, `${b.libelle} : inconnues`);
  }
});

test('emplacements : la somme des barres est le nombre de sets possédés', () => {
  assert.equal(calculerStats(RANGE).emplacements.reduce((t, b) => t + b.sets, 0), 6);
});

test('emplacements : « Non rangé » mène au filtre « sans emplacement »', () => {
  const vide = calculerStats(RANGE).emplacements.at(-1);
  assert.deepEqual(vide.filtre, { manque: 'emplacement' });
  assert.equal(vide.sets, 2);
});

test('« à compléter » compte « sans emplacement » une fois la fonction utilisée', () => {
  const { aCompleter } = calculerStats(RANGE);
  assert.deepEqual(aCompleter.champs.filter((c) => c.cle === 'emplacement').map((c) => c.nombre), [2]);
});
