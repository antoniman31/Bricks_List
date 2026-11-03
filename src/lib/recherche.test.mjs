import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrer, trier, themes, annees, normaliserTexte } from './recherche.js';

const S = [
  { id: '1', numero: '75192-1', nom: 'Faucon Millenium', theme: 'Star Wars', annee: 2017, pieces: 7541, statut: 'possédé', etat: 'scellé', dateAjout: '2026-10-01', notes: 'secret' },
  { id: '2', numero: '10294-1', nom: 'Titanic', theme: 'Icons', annee: 2021, pieces: 9090, statut: 'possédé', etat: 'monté', dateAjout: '2026-10-12', notes: '' },
  { id: '3', numero: '10316-1', nom: 'Fondcombe', theme: 'Icons', annee: 2023, pieces: 6167, statut: 'souhaité', etat: null, dateAjout: null, notes: '' },
  { id: '4', numero: '40000-1', nom: 'Écureuil créatif', theme: 'Créatif', annee: null, pieces: null, statut: 'possédé', etat: null, dateAjout: '2026-01-01', notes: '' },
];

const ids = (l) => l.map((s) => s.id);

test('normaliserTexte retire accents et casse', () => {
  assert.equal(normaliserTexte('  Créatif É '), 'creatif e');
});

test('la recherche ignore accents et casse', () => {
  assert.deepEqual(ids(filtrer(S, { texte: 'CREATIF' })), ['4']);
  assert.deepEqual(ids(filtrer(S, { texte: 'ecureuil' })), ['4']);
});

test('la recherche porte sur nom, thème et numéro', () => {
  assert.deepEqual(ids(filtrer(S, { texte: 'star' })), ['1']);
  assert.deepEqual(ids(filtrer(S, { texte: '10294' })), ['2']);
  assert.deepEqual(ids(filtrer(S, { texte: 'titan' })), ['2']);
});

test('les notes sont exclues de la recherche', () => {
  assert.deepEqual(ids(filtrer(S, { texte: 'secret' })), []);
});

test('les filtres se combinent', () => {
  assert.deepEqual(ids(filtrer(S, { statut: 'possédé', theme: 'Icons' })), ['2']);
  assert.deepEqual(ids(filtrer(S, { statut: 'possédé', etat: 'scellé' })), ['1']);
  assert.deepEqual(ids(filtrer(S, { annee: '2023' })), ['3']);
  assert.deepEqual(ids(filtrer(S, { annee: 2021, texte: 'tit' })), ['2']);
});

test('sans critère tout passe', () => {
  assert.equal(filtrer(S).length, 4);
});

test('tri par nom insensible aux accents', () => {
  assert.deepEqual(ids(trier(S, 'nom')), ['4', '1', '3', '2']);
});

test('les valeurs absentes passent en dernier', () => {
  assert.deepEqual(ids(trier(S, 'annee')), ['3', '2', '1', '4']);
  assert.deepEqual(ids(trier(S, 'pieces')), ['2', '1', '3', '4']);
  assert.deepEqual(ids(trier(S, 'ajout')), ['2', '1', '4', '3']);
});

test('trier ne modifie pas la liste d\'origine', () => {
  const avant = ids(S);
  trier(S, 'nom');
  assert.deepEqual(ids(S), avant);
});

test('thèmes et années dérivés de la collection', () => {
  assert.deepEqual(themes(S), ['Créatif', 'Icons', 'Star Wars']);
  assert.deepEqual(annees(S), [2023, 2021, 2017]);
});
