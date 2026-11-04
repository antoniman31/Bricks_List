import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ajouter, ajouterPlusieurs, modifier, supprimer, acheter, fusionner, compterExemplaires, exemplairesPossedes, modifierPlusieurs, supprimerPlusieurs, apercuModification } from './collection.js';

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

// ---------- modifications en masse ----------
const base = (id, o = {}) => ({ id, numero: `${10000 + Number(id.slice(1))}-1`, nom: `Set ${id}`, theme: 'T', annee: 2020, pieces: 100, statut: 'possédé', etat: 'monté', notes: '', image: null, dateAjout: null, emplacement: '', boite: null, notice: null, ...o });
const LISTE = [base('a1'), base('a2', { emplacement: 'cave', etat: 'scellé' }), base('a3', { emplacement: 'salon', boite: 'oui' }), base('a4'), base('w1', { statut: 'souhaité', etat: null }), base('w2', { statut: 'souhaité', etat: null })];
const ids = (...l) => new Set(l);

test('modifierPlusieurs : ne touche que les fiches choisies', () => {
  const r = modifierPlusieurs(LISTE, ids('a1', 'a2'), { emplacement: 'étagère 2' });
  assert.equal(r.find((s) => s.id === 'a1').emplacement, 'étagère 2');
  assert.equal(r.find((s) => s.id === 'a2').emplacement, 'étagère 2');
  assert.equal(r.find((s) => s.id === 'a3').emplacement, 'salon');
  assert.equal(r.find((s) => s.id === 'a4').emplacement, '');
});

test('modifierPlusieurs : un champ absent des changements n\'est pas touché', () => {
  const r = modifierPlusieurs(LISTE, ids('a2'), { boite: 'non' });
  const a2 = r.find((s) => s.id === 'a2');
  assert.equal(a2.boite, 'non');
  assert.equal(a2.emplacement, 'cave');
  assert.equal(a2.etat, 'scellé');
});

test('modifierPlusieurs : plusieurs champs d\'un coup', () => {
  const r = modifierPlusieurs(LISTE, ids('a1', 'a4'), { emplacement: 'bureau', etat: 'en cours', boite: 'oui', notice: 'non' });
  for (const id of ['a1', 'a4']) {
    const s = r.find((x) => x.id === id);
    assert.deepEqual([s.emplacement, s.etat, s.boite, s.notice], ['bureau', 'en cours', 'oui', 'non']);
  }
});

test('modifierPlusieurs : effacer avec les valeurs vides', () => {
  const r = modifierPlusieurs(LISTE, ids('a2', 'a3'), { emplacement: '', boite: null });
  const [a2, a3] = ['a2', 'a3'].map((id) => r.find((s) => s.id === id));
  assert.equal(a2.emplacement, '');
  assert.equal(a3.emplacement, '');
  assert.equal(a3.boite, null);
});

test('modifierPlusieurs : le modèle s\'applique aussi en masse (rien de tel pour un souhaité)', () => {
  const r = modifierPlusieurs(LISTE, ids('w1'), { emplacement: 'salon', etat: 'scellé', boite: 'oui' });
  const w1 = r.find((s) => s.id === 'w1');
  assert.equal(w1.emplacement, '');
  assert.equal(w1.etat, null);
  assert.equal(w1.boite, null);
});

test('modifierPlusieurs : « acheté » en masse passe en possédé avec l\'état', () => {
  const r = modifierPlusieurs(LISTE, ids('w1', 'w2'), { statut: 'possédé', etat: 'scellé' });
  for (const id of ['w1', 'w2']) {
    const s = r.find((x) => x.id === id);
    assert.equal(s.statut, 'possédé');
    assert.equal(s.etat, 'scellé');
  }
});

test('modifierPlusieurs : ne modifie pas la liste d\'origine, ignore les ids inconnus', () => {
  const avant = JSON.stringify(LISTE);
  const r = modifierPlusieurs(LISTE, ids('a1', 'inconnu'), { emplacement: 'x' });
  assert.equal(JSON.stringify(LISTE), avant);
  assert.equal(r.length, LISTE.length);
  assert.equal(modifierPlusieurs(LISTE, ids(), { emplacement: 'x' }).every((s, i) => s === LISTE[i]), true);
});

test('supprimerPlusieurs : retire exactement les fiches choisies', () => {
  const r = supprimerPlusieurs(LISTE, ids('a1', 'w2', 'inconnu'));
  assert.deepEqual(r.map((s) => s.id), ['a2', 'a3', 'a4', 'w1']);
  assert.equal(LISTE.length, 6);
});

test('apercuModification : fiches modifiées, déjà à jour et écrasées', () => {
  // a1 : vide → étagère (modifié, rien d'écrasé) ; a2 : cave → étagère (écrasé) ;
  // a3 : salon → étagère (écrasé) ; a4 : déjà « étagère » (inchangé).
  const liste = LISTE.map((s) => (s.id === 'a4' ? { ...s, emplacement: 'étagère' } : s));
  const a = apercuModification(liste, ids('a1', 'a2', 'a3', 'a4'), { emplacement: 'étagère' });
  assert.deepEqual(a, { total: 4, modifies: 3, inchanges: 1, ecrases: { emplacement: 2, etat: 0, boite: 0, notice: 0 }, etiquettesRefusees: 0 });
});

test('apercuModification : plusieurs champs comptés séparément', () => {
  const a = apercuModification(LISTE, ids('a1', 'a2', 'a3'), { etat: 'monté', boite: 'oui' });
  // état : a1 et a3 sont déjà monté, a2 (scellé) est écrasé ; boîte : a3 déjà « oui », a1 et a2 vides.
  assert.equal(a.ecrases.etat, 1);
  assert.equal(a.ecrases.boite, 0);
  assert.equal(a.modifies, 2);
  assert.equal(a.inchanges, 1);
});

test('apercuModification : effacer compte comme une valeur perdue', () => {
  const a = apercuModification(LISTE, ids('a2', 'a3', 'a4'), { emplacement: '' });
  assert.equal(a.ecrases.emplacement, 2);
  assert.equal(a.modifies, 2);
});

test('apercuModification : suit la validation (rien d\'écrasé sur un souhaité)', () => {
  const a = apercuModification(LISTE, ids('w1', 'w2'), { emplacement: 'cave' });
  assert.equal(a.modifies, 0);
  assert.equal(a.inchanges, 2);
});

test('apercuModification : l\'aperçu et l\'application sont d\'accord', () => {
  const ch = { emplacement: 'étagère', etat: 'monté' };
  const choisis = ids('a1', 'a2', 'a3', 'a4');
  const a = apercuModification(LISTE, choisis, ch);
  const apres = modifierPlusieurs(LISTE, choisis, ch);
  const vraiment = LISTE.filter((s, i) => choisis.has(s.id) && JSON.stringify(s) !== JSON.stringify(apres[i])).length;
  assert.equal(a.modifies, vraiment);
});

test('acheter un set souhaité efface sa priorité', () => {
  const [s] = ajouter([], { ...BASE, statut: 'souhaité', priorite: 'forte' }).sets;
  assert.equal(s.priorite, 'forte');
  assert.equal(acheter([s], s.id, 'scellé')[0].priorite, null);
});

test('acheter note le jour de l\'achat (jour local)', () => {
  const [s] = ajouter([], { ...BASE, statut: 'souhaité' }).sets;
  const achete = acheter([s], s.id, 'scellé', new Date(2026, 10, 3, 23, 50))[0];
  assert.equal(achete.statut, 'possédé');
  assert.equal(achete.dateAchat, '2026-11-03');
});

test('exemplairesPossedes : compte par numéro les sets possédés, pas les souhaités', () => {
  const sets = [
    { numero: '75192-1', statut: 'possédé' }, { numero: '75192-1', statut: 'possédé' }, { numero: '75192-1', statut: 'souhaité' },
    { numero: '10294-1', statut: 'possédé' }, { numero: '21330-1', statut: 'souhaité' },
  ];
  const n = exemplairesPossedes(sets);
  assert.equal(n.get('75192-1'), 2);
  assert.equal(n.get('10294-1'), 1);
  assert.equal(n.has('21330-1'), false);
  assert.equal(exemplairesPossedes([]).size, 0);
});

const E = (id, etiquettes) => ({ ...base(id), etiquettes });

test('étiquettes en masse : ajout et retrait propres à chaque set, sans toucher aux autres', () => {
  const liste = [E('a1', ['cadeau']), E('a2', []), E('a3', ['à offrir', 'cadeau']), E('a4', ['x'])];
  const r = modifierPlusieurs(liste, ids('a1', 'a2', 'a3'), { etiquettes: { ajouter: ['Noël'], retirer: ['Cadeau'] } });
  assert.deepEqual(r.find((s) => s.id === 'a1').etiquettes, ['Noël']);
  assert.deepEqual(r.find((s) => s.id === 'a2').etiquettes, ['Noël']);
  assert.deepEqual(r.find((s) => s.id === 'a3').etiquettes, ['à offrir', 'Noël']);
  assert.deepEqual(r.find((s) => s.id === 'a4').etiquettes, ['x']);
});

test('étiquettes en masse : une étiquette déjà présente (casse et accents ignorés) n\'est pas dupliquée', () => {
  const r = modifierPlusieurs([E('a1', ['Noël'])], ids('a1'), { etiquettes: { ajouter: ['noel'] } });
  assert.deepEqual(r[0].etiquettes, ['Noël']);
});

test('étiquettes en masse : au-delà de 8, le set reste tel quel et le refus est compté', () => {
  const pleine = Array.from({ length: 8 }, (_, i) => `e${i}`);
  const liste = [E('a1', pleine), E('a2', ['x'])];
  const changements = { etiquettes: { ajouter: ['de trop'] } };
  const r = modifierPlusieurs(liste, ids('a1', 'a2'), changements);
  assert.deepEqual(r[0].etiquettes, pleine);
  assert.deepEqual(r[1].etiquettes, ['x', 'de trop']);
  const a = apercuModification(liste, ids('a1', 'a2'), changements);
  assert.equal(a.etiquettesRefusees, 1);
  assert.equal(a.modifies, 1);
  assert.equal(a.inchanges, 1);
});

test('apercuModification : retirer une étiquette absente ne modifie personne', () => {
  const a = apercuModification([E('a1', ['x'])], ids('a1'), { etiquettes: { retirer: ['y'] } });
  assert.equal(a.modifies, 0);
  assert.equal(a.inchanges, 1);
});
