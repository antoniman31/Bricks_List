import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliserSet, validerSets, ETATS } from './model.js';

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
  assert.deepEqual(validerSets({ a: 1 }), { sets: [], corriges: 0, rejetes: 0, etatsRetires: 0 });
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

// ---------- dates d'achat et de montage ----------
const NOW = new Date(2026, 10, 3);
const AVEC = (o) => normaliserSet({ numero: '75192-1', nom: 'Faucon', statut: 'possédé', ...o }, { maintenant: NOW });

test('dates : gardées pour un set possédé, sans correction', () => {
  const r = AVEC({ dateAchat: '2025-12-24', dateMontage: '2026-01-02' });
  assert.equal(r.set.dateAchat, '2025-12-24');
  assert.equal(r.set.dateMontage, '2026-01-02');
  assert.equal(r.corrections, 0);
});

test('dates : absentes = null sans correction (fiches d\'avant ces champs)', () => {
  const r = AVEC({});
  assert.equal(r.set.dateAchat, null);
  assert.equal(r.corrections, 0);
});

test('dates : impossible, future ou mal formée est écartée et comptée', () => {
  for (const v of ['2026-02-30', '2099-01-01', 'hier', 12, '03/11/2026']) {
    const r = AVEC({ dateAchat: v });
    assert.equal(r.set.dateAchat, null, String(v));
    assert.equal(r.corrections, 1, String(v));
  }
});

test('dates : un set souhaité n\'en a pas, sans compter de correction', () => {
  const r = normaliserSet({ numero: '75192-1', nom: 'Faucon', statut: 'souhaité', dateAchat: '2025-12-24' }, { maintenant: NOW });
  assert.equal(r.set.dateAchat, null);
  assert.equal(r.corrections, 0);
});

// ---------- étiquettes ----------
test('étiquettes : gardées pour les deux statuts, absentes = [] sans correction', () => {
  assert.deepEqual(normaliserSet({ numero: '75192-1', nom: 'F', statut: 'possédé', etiquettes: ['à revendre'] }).set.etiquettes, ['à revendre']);
  assert.deepEqual(normaliserSet({ numero: '75192-1', nom: 'F', statut: 'souhaité', etiquettes: ['cadeau'] }).set.etiquettes, ['cadeau']);
  const r = normaliserSet({ numero: '75192-1', nom: 'F' });
  assert.deepEqual(r.set.etiquettes, []);
  assert.equal(r.corrections, 0);
});

test('étiquettes : valeur non fiable nettoyée et comptée', () => {
  const r = normaliserSet({ numero: '75192-1', nom: 'F', etiquettes: ['a', 'A', 5, ''] });
  assert.deepEqual(r.set.etiquettes, ['a']);
  assert.equal(r.corrections, 1);
  assert.deepEqual(normaliserSet({ numero: '75192-1', nom: 'F', etiquettes: 'cadeau' }).set.etiquettes, []);
});

test('états : scellé, neuf, en cours, monté, dans cet ordre', () => {
  assert.deepEqual(ETATS, ['scellé', 'neuf', 'en cours', 'monté']);
  for (const etat of ETATS) assert.equal(normaliserSet({ ...OK, etat }).set.etat, etat);
});

test('anciens états « démonté » et « incomplet » : remis à non précisé et comptés', () => {
  const r = validerSets([
    { ...OK, id: 'a', numero: '75192-1', etat: 'démonté' },
    { ...OK, id: 'b', numero: '10294-1', etat: 'incomplet' },
    { ...OK, id: 'c', numero: '21330-1', etat: 'monté' },
  ]);
  assert.equal(r.etatsRetires, 2);
  assert.deepEqual(r.sets.map((s) => s.etat), [null, null, 'monté']);
  assert.equal(r.rejetes, 0);
});

test('un état inconnu autre que les anciens n\'est pas compté comme ancien état', () => {
  const r = validerSets([{ ...OK, etat: 'cassé' }]);
  assert.equal(r.etatsRetires, 0);
  assert.equal(r.sets[0].etat, null);
});

test('un ancien état sur un set souhaité n\'est pas compté (l\'état n\'y a pas de sens)', () => {
  const r = validerSets([{ ...OK, statut: 'souhaité', etat: 'démonté' }]);
  assert.equal(r.etatsRetires, 0);
});

test('prix officiel : arrondi au centime, source par défaut « manuelle », écarté si absurde, sans source sans prix', async () => {
  const { normaliserSet } = await import('./model.js');
  const base = { numero: '75192-1', nom: 'Faucon', statut: 'souhaité' };
  const ok = normaliserSet({ ...base, prix: 849.994 });
  assert.equal(ok.set.prix, 849.99);
  assert.equal(ok.set.prixSource, 'manuelle');
  assert.equal(ok.corrections, 0);
  assert.equal(normaliserSet({ ...base, prix: 100, prixSource: 'brickset-de' }).set.prixSource, 'brickset-de');
  const mauvais = normaliserSet({ ...base, prix: -5, prixSource: 'brickset-de' });
  assert.deepEqual([mauvais.set.prix, mauvais.set.prixSource], [null, null]);
  assert.ok(mauvais.corrections >= 1);
  assert.equal(normaliserSet({ ...base, prix: 'cher' }).set.prix, null);
  assert.equal(normaliserSet({ ...base, prix: 50, prixSource: 'inconnue' }).set.prixSource, 'manuelle');
  // Le prix survit à l'achat : il n'est lié à aucun statut.
  assert.equal(normaliserSet({ ...base, statut: 'possédé', prix: 120 }).set.prix, 120);
});

test('retrait et sous-thème : validés comme toute entrée non fiable', () => {
  const base = { numero: '75192-1', nom: 'Faucon' };
  const ok = normaliserSet({ ...base, dateRetrait: '2026-12-31', sousTheme: ' Ultimate Collector Series ' });
  assert.deepEqual([ok.set.dateRetrait, ok.set.sousTheme, ok.corrections], ['2026-12-31', 'Ultimate Collector Series', 0]);
  const vide = normaliserSet(base).set;
  assert.deepEqual([vide.dateRetrait, vide.sousTheme], [null, null]);
  assert.equal(normaliserSet({ ...base, sousTheme: '' }).set.sousTheme, ''); // « Brickset n'en a pas » reste distinct de « jamais demandé »
  const mauvais = normaliserSet({ ...base, dateRetrait: 'bientôt', sousTheme: 42 });
  assert.deepEqual([mauvais.set.dateRetrait, mauvais.set.sousTheme, mauvais.corrections], [null, null, 2]);
  assert.equal(normaliserSet({ ...base, sousTheme: 'a\nb' }).set.sousTheme, 'a b');
  assert.equal(normaliserSet({ ...base, sousTheme: 'x'.repeat(200) }).set.sousTheme.length, 60);
});
