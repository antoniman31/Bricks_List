import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliserSet, validerSets } from './model.js';

const OK = { id: 'a', numero: '75192-1', nom: 'Faucon', theme: 'Star Wars', annee: 2017, pieces: 7541, statut: 'possédé', etat: 'scellé', dateAjout: '2026-10-01' };

test('une fiche valide passe sans correction', () => {
  const r = normaliserSet(OK);
  assert.equal(r.corrections, 0);
  assert.equal(r.set.nom, 'Faucon');
  assert.equal(r.set.etat, 'scellé');
});

test('le numéro sans version est complété', () => {
  assert.equal(normaliserSet({ ...OK, numero: '75192' }).set.numero, '75192-1');
});

test('sans numéro exploitable la fiche est rejetée', () => {
  assert.equal(normaliserSet({ ...OK, numero: 'abc' }), null);
  assert.equal(normaliserSet(null), null);
  assert.equal(normaliserSet([]), null);
  assert.equal(normaliserSet('texte'), null);
});

test('une année en toutes lettres ou hors bornes devient null et se compte', () => {
  const r = normaliserSet({ ...OK, annee: 'deux mille' });
  assert.equal(r.set.annee, null);
  assert.equal(r.corrections, 1);
  assert.equal(normaliserSet({ ...OK, annee: 1800 }).set.annee, null);
  assert.equal(normaliserSet({ ...OK, annee: 3000 }).set.annee, null);
});

test('une année numérique en chaîne est acceptée', () => {
  assert.equal(normaliserSet({ ...OK, annee: '2017' }).set.annee, 2017);
});

test('des pièces négatives ou décimales sont écartées', () => {
  assert.equal(normaliserSet({ ...OK, pieces: -3 }).set.pieces, null);
  assert.equal(normaliserSet({ ...OK, pieces: 12.5 }).set.pieces, null);
});

test('un statut inconnu retombe sur possédé', () => {
  const r = normaliserSet({ ...OK, statut: 'vendu' });
  assert.equal(r.set.statut, 'possédé');
  assert.equal(r.corrections, 1);
});

test('un état inconnu est écarté', () => {
  const r = normaliserSet({ ...OK, etat: 'cassé' });
  assert.equal(r.set.etat, null);
  assert.equal(r.corrections, 1);
});

test('un set souhaité n\'a pas d\'état', () => {
  assert.equal(normaliserSet({ ...OK, statut: 'souhaité' }).set.etat, null);
});

test('une image doit être en https', () => {
  assert.equal(normaliserSet({ ...OK, image: 'http://x/y.jpg' }).set.image, null);
  assert.equal(normaliserSet({ ...OK, image: 'javascript:alert(1)' }).set.image, null);
  assert.equal(normaliserSet({ ...OK, image: 'https://cdn.rebrickable.com/a.jpg' }).set.image, 'https://cdn.rebrickable.com/a.jpg');
});

test('une date illisible devient null', () => {
  assert.equal(normaliserSet({ ...OK, dateAjout: 'hier' }).set.dateAjout, null);
});

test('un nom vide prend le numéro', () => {
  assert.equal(normaliserSet({ ...OK, nom: '  ' }).set.nom, 'Set 75192-1');
});

test('les notes sont tronquées', () => {
  assert.equal(normaliserSet({ ...OK, notes: 'x'.repeat(5000) }).set.notes.length, 2000);
});

test('validerSets compte corrigées et rejetées, et réattribue les doublons d\'id', () => {
  const r = validerSets([OK, { ...OK, numero: '10294' }, { ...OK, annee: 'x', id: 'b' }, { numero: 'zzz' }, 42]);
  assert.equal(r.sets.length, 3);
  assert.equal(r.rejetes, 2);
  assert.equal(r.corriges, 2);
  assert.equal(new Set(r.sets.map((s) => s.id)).size, 3);
});

test('validerSets ignore ce qui n\'est pas une liste', () => {
  assert.deepEqual(validerSets({ a: 1 }), { sets: [], corriges: 0, rejetes: 0 });
});

test('emplacement, boîte et notice : valeurs valides conservées pour un set possédé', () => {
  const r = normaliserSet({ ...OK, emplacement: '  Étagère 2 ', boite: 'oui', notice: 'non' });
  assert.equal(r.corrections, 0);
  assert.equal(r.set.emplacement, 'Étagère 2');
  assert.equal(r.set.boite, 'oui');
  assert.equal(r.set.notice, 'non');
});

test('une fiche d\'avant ces champs n\'est pas corrigée : non précisé', () => {
  const r = normaliserSet(OK);
  assert.equal(r.corrections, 0);
  assert.equal(r.set.emplacement, '');
  assert.equal(r.set.boite, null);
  assert.equal(r.set.notice, null);
});

test('boîte et notice invalides sont écartées et comptées', () => {
  const r = normaliserSet({ ...OK, boite: 'peut-être', notice: 3 });
  assert.equal(r.set.boite, null);
  assert.equal(r.set.notice, null);
  assert.equal(r.corrections, 2);
});

test('l\'emplacement est tronqué à 60 caractères et ignore un non-texte', () => {
  assert.equal(normaliserSet({ ...OK, emplacement: 'x'.repeat(200) }).set.emplacement.length, 60);
  assert.equal(normaliserSet({ ...OK, emplacement: 42 }).set.emplacement, '');
});

test('un set souhaité n\'a ni emplacement, ni boîte, ni notice', () => {
  const r = normaliserSet({ ...OK, statut: 'souhaité', emplacement: 'Étagère', boite: 'oui', notice: 'oui' });
  assert.equal(r.set.emplacement, '');
  assert.equal(r.set.boite, null);
  assert.equal(r.set.notice, null);
  assert.equal(r.corrections, 0);
});

test('priorité : gardée pour un set souhaité, valeur inconnue ramenée à null et comptée', () => {
  const ok = normaliserSet({ numero: '75192-1', nom: 'Faucon', statut: 'souhaité', priorite: 'forte' });
  assert.equal(ok.set.priorite, 'forte');
  assert.equal(ok.corrections, 0);
  const mauvaise = normaliserSet({ numero: '75192-1', nom: 'Faucon', statut: 'souhaité', priorite: 'urgent' });
  assert.equal(mauvaise.set.priorite, null);
  assert.equal(mauvaise.corrections, 1);
  assert.equal(normaliserSet({ numero: '75192-1', nom: 'Faucon', statut: 'souhaité' }).corrections, 0);
});

test('priorité : un set possédé n\'en a pas (acheter la fait disparaître)', () => {
  assert.equal(normaliserSet({ numero: '75192-1', statut: 'possédé', priorite: 'forte' }).set.priorite, null);
});
