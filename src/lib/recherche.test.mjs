import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrer, trier, themes, normaliserTexte, modeAnnees, cleAnnee, libelleAnnee, groupesAnnees, manquants, rechercherAilleurs, emplacements } from './recherche.js';

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

test('thèmes dérivés de la collection', () => {
  assert.deepEqual(themes(S), ['Créatif', 'Icons', 'Star Wars']);
});

test('années : par année tant que l\'étalement reste court', () => {
  assert.equal(modeAnnees(S), 'annee');
  assert.deepEqual(groupesAnnees(S), [
    { valeur: '2023', libelle: '2023' },
    { valeur: '2021', libelle: '2021' },
    { valeur: '2017', libelle: '2017' },
  ]);
});

test('années : par décennie au-delà de 15 ans d\'étalement', () => {
  const large = [{ annee: 1999 }, { annee: 2008 }, { annee: 2015 }, { annee: 2023 }, { annee: null }];
  assert.equal(modeAnnees(large), 'decennie');
  assert.deepEqual(groupesAnnees(large).map((g) => g.valeur), ['2020s', '2010s', '2000s', '1990s']);
  assert.equal(groupesAnnees(large)[1].libelle, '2010–2019');
});

test('15 ans d\'écart pile restent par année, 16 passent en décennies', () => {
  assert.equal(modeAnnees([{ annee: 2000 }, { annee: 2015 }]), 'annee');
  assert.equal(modeAnnees([{ annee: 2000 }, { annee: 2016 }]), 'decennie');
});

test('sans aucune année, le mode reste par année', () => {
  assert.equal(modeAnnees([{ annee: null }]), 'annee');
  assert.deepEqual(groupesAnnees([{ annee: null }]), []);
});

test('clé et libellé d\'année', () => {
  assert.equal(cleAnnee(2017, 'annee'), '2017');
  assert.equal(cleAnnee(2017, 'decennie'), '2010s');
  assert.equal(libelleAnnee('2010s'), '2010–2019');
  assert.equal(libelleAnnee('2017'), '2017');
});

test('le filtre d\'année accepte une décennie', () => {
  const large = [
    { id: 'a', annee: 2011, statut: 'possédé', nom: 'a', theme: '', numero: '1' },
    { id: 'b', annee: 2019, statut: 'possédé', nom: 'b', theme: '', numero: '2' },
    { id: 'c', annee: 2020, statut: 'possédé', nom: 'c', theme: '', numero: '3' },
    { id: 'd', annee: null, statut: 'possédé', nom: 'd', theme: '', numero: '4' },
  ];
  assert.deepEqual(ids(filtrer(large, { annee: '2010s' })), ['a', 'b']);
  assert.deepEqual(ids(filtrer(large, { annee: '2020s' })), ['c']);
});

test('« à compléter » : le filtre retrouve les sets qui manquent d\'un champ', () => {
  assert.deepEqual(ids(filtrer(S, { manque: 'annee' })), ['4']);
  assert.deepEqual(ids(filtrer(S, { manque: 'pieces' })), ['4']);
  assert.deepEqual(ids(filtrer(S, { manque: 'etat' })), ['4']);
  assert.deepEqual(ids(filtrer(S, { manque: 'theme' })), []);
});

test('un set souhaité n\'a jamais d\'état à compléter', () => {
  assert.deepEqual(ids(filtrer(S, { manque: 'etat' })).includes('3'), false);
});

test('manquants compte les fiches, pas la somme des colonnes', () => {
  const m = manquants(S);
  assert.equal(m.fiches, 1);
  assert.deepEqual(m.champs.map((c) => [c.cle, c.nombre]), [['annee', 1], ['pieces', 1], ['etat', 1]]);
});

test('manquants : rien à compléter, rien à afficher', () => {
  const m = manquants([S[0], S[1], S[2]]);
  assert.equal(m.fiches, 0);
  assert.deepEqual(m.champs, []);
});

test('rechercherAilleurs : trouve dans l\'autre onglet seulement', () => {
  // S contient un set souhaité (id 3, Fondcombe) et trois possédés.
  assert.deepEqual(ids(rechercherAilleurs(S, 'possédé', 'fondcombe')), ['3']);
  assert.deepEqual(ids(rechercherAilleurs(S, 'souhaité', 'titanic')), ['2']);
});

test('rechercherAilleurs : ne renvoie jamais le set de l\'onglet courant', () => {
  assert.deepEqual(ids(rechercherAilleurs(S, 'possédé', 'titanic')), []);
  assert.deepEqual(ids(rechercherAilleurs(S, 'souhaité', 'fondcombe')), []);
});

test('rechercherAilleurs : texte vide ou blanc, rien', () => {
  assert.deepEqual(rechercherAilleurs(S, 'possédé', ''), []);
  assert.deepEqual(rechercherAilleurs(S, 'possédé', '   '), []);
  assert.deepEqual(rechercherAilleurs(S, 'possédé', undefined), []);
});

test('rechercherAilleurs : insensible aux accents et trouve par numéro', () => {
  assert.deepEqual(ids(rechercherAilleurs(S, 'possédé', 'FONDCOMBE')), ['3']);
  assert.deepEqual(ids(rechercherAilleurs(S, 'possédé', '10316')), ['3']);
});

const RANGES = [
  { id: 'r1', numero: '1-1', nom: 'Alpha', theme: 'T', annee: 2020, pieces: 1, statut: 'possédé', etat: 'monté', emplacement: 'Étagère 2', boite: 'oui', notice: 'non', notes: '' },
  { id: 'r2', numero: '2-1', nom: 'Beta', theme: 'T', annee: 2020, pieces: 1, statut: 'possédé', etat: 'monté', emplacement: 'Carton A', boite: 'non', notice: 'oui', notes: '' },
  { id: 'r3', numero: '3-1', nom: 'Gamma', theme: 'T', annee: 2020, pieces: 1, statut: 'possédé', etat: 'monté', emplacement: '', boite: null, notice: null, notes: '' },
  { id: 'r4', numero: '4-1', nom: 'Delta', theme: 'T', annee: 2020, pieces: 1, statut: 'souhaité', etat: null, emplacement: '', boite: null, notice: null, notes: '' },
];

test('la recherche couvre l\'emplacement de rangement', () => {
  assert.deepEqual(ids(filtrer(RANGES, { texte: 'etagere' })), ['r1']);
  assert.deepEqual(ids(filtrer(RANGES, { texte: 'CARTON' })), ['r2']);
});

test('filtres par emplacement, boîte et notice', () => {
  assert.deepEqual(ids(filtrer(RANGES, { emplacement: 'Carton A' })), ['r2']);
  assert.deepEqual(ids(filtrer(RANGES, { boite: 'oui' })), ['r1']);
  assert.deepEqual(ids(filtrer(RANGES, { notice: 'oui' })), ['r2']);
  assert.deepEqual(ids(filtrer(RANGES, { boite: 'non', notice: 'oui' })), ['r2']);
});

test('les emplacements viennent de la collection, triés, sans doublon ni vide', () => {
  const plus = [...RANGES, { ...RANGES[0], id: 'r5', emplacement: 'Étagère 10' }, { ...RANGES[0], id: 'r6' }];
  assert.deepEqual(emplacements(plus), ['Carton A', 'Étagère 2', 'Étagère 10']);
  assert.deepEqual(emplacements([]), []);
});

test('une fiche sans les nouveaux champs reste filtrable et cherchable', () => {
  const ancien = [{ id: 'x', numero: '9-1', nom: 'Ancien', theme: '', annee: null, pieces: null, statut: 'possédé', etat: null, notes: '' }];
  assert.deepEqual(ids(filtrer(ancien, { texte: 'ancien' })), ['x']);
  assert.deepEqual(ids(filtrer(ancien, { emplacement: 'Carton A' })), []);
});
