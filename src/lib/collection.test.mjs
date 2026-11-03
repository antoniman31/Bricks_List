import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ajouter, ajouterPlusieurs, modifier, supprimer, acheter, fusionner, compterExemplaires } from './collection.js';

const BASE = { numero: '75192-1', nom: 'Faucon', theme: 'Star Wars', annee: 2017, pieces: 7541, statut: 'possédé', etat: 'scellé' };

test('ajouter attribue un id et une date, et ignore l\'id fourni', () => {
  const { sets, ajoute } = ajouter([], { ...BASE, id: 'impose' }, '2026-11-03T10:00:00.000Z');
  assert.equal(sets.length, 1);
  assert.notEqual(ajoute.id, 'impose');
  assert.equal(ajoute.dateAjout, '2026-11-03T10:00:00.000Z');
});

test('ajouter refuse un numéro invalide sans toucher la liste', () => {
  const avant = [];
  const r = ajouter(avant, { ...BASE, numero: 'zzz' });
  assert.equal(r.ajoute, null);
  assert.equal(r.sets, avant);
});

test('deux exemplaires du même set sont deux fiches', () => {
  let { sets } = ajouter([], BASE);
  ({ sets } = ajouter(sets, BASE));
  assert.equal(sets.length, 2);
  assert.equal(compterExemplaires(sets, '75192-1'), 2);
  assert.equal(compterExemplaires(sets, '10294-1'), 0);
});

test('modifier change la fiche voulue et pas les autres', () => {
  let { sets } = ajouter([], BASE);
  ({ sets } = ajouter(sets, { ...BASE, numero: '10294-1', nom: 'Titanic' }));
  const id = sets[0].id;
  const apres = modifier(sets, id, { etat: 'monté', notes: 'sur l\'étagère' });
  assert.equal(apres[0].etat, 'monté');
  assert.equal(apres[0].notes, 'sur l\'étagère');
  assert.equal(apres[1].etat, 'scellé');
});

test('modifier repasse par la validation', () => {
  const { sets } = ajouter([], BASE);
  const apres = modifier(sets, sets[0].id, { annee: 'hier', etat: 'cassé' });
  assert.equal(apres[0].annee, null);
  assert.equal(apres[0].etat, null);
});

test('modifier garde la fiche d\'origine si elle deviendrait invalide', () => {
  const { sets } = ajouter([], BASE);
  assert.equal(modifier(sets, sets[0].id, { numero: '' })[0].numero, '75192-1');
});

test('modifier un id inconnu ne change rien', () => {
  const { sets } = ajouter([], BASE);
  assert.equal(modifier(sets, 'absent', { nom: 'x' }), sets);
});

test('un set souhaité n\'a pas d\'état', () => {
  const { sets } = ajouter([], BASE);
  assert.equal(modifier(sets, sets[0].id, { statut: 'souhaité' })[0].etat, null);
});

test('acheter passe un set souhaité en possédé avec son état', () => {
  const { sets } = ajouter([], { ...BASE, statut: 'souhaité', etat: null });
  const apres = acheter(sets, sets[0].id, 'scellé');
  assert.equal(apres[0].statut, 'possédé');
  assert.equal(apres[0].etat, 'scellé');
});

test('acheter sans état le laisse non précisé', () => {
  const { sets } = ajouter([], { ...BASE, statut: 'souhaité', etat: null });
  assert.equal(acheter(sets, sets[0].id, '')[0].etat, null);
});

test('supprimer retire une seule fiche', () => {
  let { sets } = ajouter([], BASE);
  ({ sets } = ajouter(sets, BASE));
  assert.equal(supprimer(sets, sets[0].id).length, 1);
});

test('fusionner ajoute les nouvelles, remplace les connues, ne supprime rien', () => {
  const a = { ...BASE, id: 'a' };
  const b = { ...BASE, id: 'b', numero: '10294-1', nom: 'Titanic' };
  const existants = [a, b];
  const importes = [{ ...a, nom: 'Faucon modifié' }, { ...BASE, id: 'c', numero: '21330-1', nom: 'Maman' }];
  const r = fusionner(existants, importes);
  assert.equal(r.sets.length, 3);
  assert.equal(r.ajoutes, 1);
  assert.equal(r.misAJour, 1);
  assert.equal(r.sets[0].nom, 'Faucon modifié');
  assert.equal(r.sets.find((s) => s.id === 'b').nom, 'Titanic');
  assert.equal(existants[0].nom, 'Faucon');
});

test('réimporter son propre export ne crée pas de doublons', () => {
  const a = { ...BASE, id: 'a' };
  const r = fusionner([a], [a]);
  assert.equal(r.sets.length, 1);
  assert.equal(r.ajoutes, 0);
});

test('ajouterPlusieurs garde l\'ordre de la liste, avec des ids distincts', () => {
  const bruts = ['75192', '10294', '21330'].map((numero) => ({ ...BASE, numero, nom: `Set ${numero}` }));
  const { sets, ajoutes } = ajouterPlusieurs([], bruts, new Date('2026-11-03T10:00:00.000Z'));
  assert.equal(sets.length, 3);
  assert.equal(ajoutes.length, 3);
  assert.equal(new Set(sets.map((s) => s.id)).size, 3);
  const dates = sets.map((s) => Date.parse(s.dateAjout));
  assert.ok(dates[0] < dates[1] && dates[1] < dates[2]);
});

test('ajouterPlusieurs ignore une fiche invalide sans bloquer les autres', () => {
  const { sets, ajoutes } = ajouterPlusieurs([], [BASE, { ...BASE, numero: 'zzz' }, { ...BASE, numero: '10294' }]);
  assert.equal(sets.length, 2);
  assert.equal(ajoutes.length, 2);
});

test('ajouterPlusieurs ajoute à la suite des fiches existantes', () => {
  const { sets: avant } = ajouter([], BASE);
  const { sets } = ajouterPlusieurs(avant, [{ ...BASE, numero: '10294' }]);
  assert.equal(sets.length, 2);
  assert.equal(sets[0].id, avant[0].id);
});
