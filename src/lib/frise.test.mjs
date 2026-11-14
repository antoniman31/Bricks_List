import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ecartEntre, etapesFrise } from './frise.js';

test('ecartEntre : des mots courts, au jour, à la semaine, au mois, à l\'année', () => {
  assert.equal(ecartEntre('2025-03-12', '2025-03-12'), 'le même jour');
  assert.equal(ecartEntre('2025-03-12', '2025-03-13'), '1 jour');
  assert.equal(ecartEntre('2025-03-12', '2025-03-17'), '5 jours');
  assert.equal(ecartEntre('2025-03-12', '2025-04-02'), '3 semaines');
  assert.equal(ecartEntre('2025-03-12', '2025-04-26'), '6 semaines');
  assert.equal(ecartEntre('2025-03-12', '2025-05-12'), '2 mois');
  assert.equal(ecartEntre('2025-03-12', '2025-05-11'), '1 mois');
  assert.equal(ecartEntre('2025-03-12', '2026-03-12'), '1 an');
  assert.equal(ecartEntre('2025-03-12', '2026-04-12'), '1 an 1 mois');
  assert.equal(ecartEntre('2017-10-01', '2025-03-12'), '7 ans 5 mois');
  assert.equal(ecartEntre('2017-10-01', '2027-10-01'), '10 ans');
});

test('ecartEntre : rien si une date manque, est invalide ou vient avant l\'autre', () => {
  for (const [a, b] of [[null, '2025-03-12'], ['2025-03-12', null], ['2025-03-12', '2025-03-01'], ['pas une date', '2025-03-12'], ['2025-13-40', '2025-03-12'], [undefined, undefined]]) {
    assert.equal(ecartEntre(a, b), '', `${a} -> ${b}`);
  }
});

const MAINTENANT = new Date(2026, 10, 14, 12); // 14 novembre 2026

test('etapesFrise : un set possédé a trois étapes, chacune avec l\'écart depuis la précédente', () => {
  const e = etapesFrise({ statut: 'possédé', dateSortie: '2017-10-01', dateAchat: '2025-03-12', dateMontage: '2025-04-02' }, MAINTENANT);
  assert.deepEqual(e.map((x) => [x.cle, x.libelle, x.etat, x.sous]), [
    ['dateSortie', 'Sortie', 'fait', ''],
    ['dateAchat', 'Acheté le', 'fait', '+ 7 ans 5 mois'],
    ['dateMontage', 'Monté le', 'fait', '+ 3 semaines'],
  ]);
});

test('etapesFrise : une date manquante est « vide », sans écart, et ne casse pas l\'étape suivante', () => {
  const e = etapesFrise({ statut: 'possédé', dateSortie: null, dateAchat: '2026-06-08', dateMontage: null }, MAINTENANT);
  assert.deepEqual(e.map((x) => [x.etat, x.sous]), [['vide', ''], ['fait', ''], ['vide', '']]);
});

test('etapesFrise : une sortie à venir est « futur » et dit dans combien de temps', () => {
  const e = etapesFrise({ statut: 'souhaité', dateSortie: '2027-01-01', dateAjout: '2026-11-03T09:00:00.000Z' }, MAINTENANT);
  assert.deepEqual(e.map((x) => [x.cle, x.libelle, x.etat]), [[null, 'Ajouté le', 'fait'], ['dateSortie', 'Sortie', 'futur']]);
  assert.equal(e[1].sous, 'dans 48 jours');
  assert.equal(e[0].date, '2026-11-03');
});

test('etapesFrise : un set souhaité sans date d\'ajout ni de sortie a deux étapes vides, un set possédé jamais d\'étape « Ajouté »', () => {
  const w = etapesFrise({ statut: 'souhaité' }, MAINTENANT);
  assert.deepEqual(w.map((x) => x.etat), ['vide', 'vide']);
  assert.ok(!etapesFrise({ statut: 'possédé' }, MAINTENANT).some((x) => x.libelle === 'Ajouté le'));
});

test('etapesFrise : le retrait de LEGO s\'ajoute à une wishlist quand il est connu, jamais éditable, jamais pour un set possédé', () => {
  const base = { statut: 'souhaité', dateSortie: '2020-01-01', dateAjout: '2026-11-03T09:00:00.000Z' };
  assert.equal(etapesFrise(base, MAINTENANT).length, 2);
  const futur = etapesFrise({ ...base, dateRetrait: '2027-01-01' }, MAINTENANT);
  assert.deepEqual(futur.map((e) => e.libelle), ['Ajouté le', 'Sortie', 'Retrait']);
  assert.deepEqual([futur[2].cle, futur[2].etat, futur[2].date], [null, 'futur', '2027-01-01']);
  assert.match(futur[2].sous, /^dans /);
  const passe = etapesFrise({ ...base, dateRetrait: '2026-01-01' }, MAINTENANT)[2];
  assert.deepEqual([passe.etat, passe.sous], ['fait', 'retiré']);
  assert.equal(etapesFrise({ ...base, statut: 'possédé', dateRetrait: '2027-01-01' }, MAINTENANT).some((e) => e.libelle === 'Retrait'), false);
});
