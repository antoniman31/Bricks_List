import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evenementsAVenir, reperesDate } from './avenir.js';

const AUJOURDHUI = new Date(2026, 10, 14, 10, 0); // 14 novembre 2026
const set = (id, nom, extra = {}) => ({ id, nom, numero: '10000-1', statut: 'souhaité', ...extra });

test('reperesDate : mois en toutes lettres, jour, mois court ; une date fausse donne null', () => {
  assert.deepEqual(reperesDate('2027-03-18'), { cle: '2027-03', libelle: 'Mars 2027', jour: 18, moisCourt: 'mars' });
  assert.equal(reperesDate('2026-12-31').libelle, 'Décembre 2026');
  assert.equal(reperesDate('2026-08-01').moisCourt, 'août');
  for (const v of ['2027-13-01', '2027-00-10', '2027-3-1', '', null, undefined, 20270318]) assert.equal(reperesDate(v), null, String(v));
});

test('evenementsAVenir : retraits et sorties à venir de la wishlist, groupés par mois, par date', () => {
  const sets = [
    set('a', 'Faucon', { dateRetrait: '2026-12-31', dateSortie: '2017-10-01', prix: 849.99, priorite: 'forte' }),
    set('b', 'Mario Kart', { dateSortie: '2027-03-18' }),
    set('c', 'Bowser', { dateRetrait: '2027-03-30' }),
    set('d', 'Orchidée', { dateSortie: '2027-03-01', prix: 49.99 }),
    set('e', 'Titanic', { dateRetrait: '2027-02-15' }),
  ];
  const mois = evenementsAVenir(sets, AUJOURDHUI);
  assert.deepEqual(mois.map((m) => [m.libelle, m.evenements.map((e) => `${e.jour} ${e.type} ${e.nom}`)]), [
    ['Décembre 2026', ['31 retrait Faucon']],
    ['Février 2027', ['15 retrait Titanic']],
    ['Mars 2027', ['1 sortie Orchidée', '18 sortie Mario Kart', '30 retrait Bowser']],
  ]);
  const faucon = mois[0].evenements[0];
  assert.deepEqual([faucon.prix, faucon.priorite, faucon.jours, faucon.id], [849.99, 'forte', 47, 'a']);
});

test('evenementsAVenir : rien pour un set possédé, déjà sorti, déjà retiré ou sans date ; aujourd\'hui : retrait oui, sortie non', () => {
  const sets = [
    set('a', 'Possédé', { statut: 'possédé', dateRetrait: '2027-01-01' }),
    set('b', 'Déjà retiré', { dateRetrait: '2026-11-13' }),
    set('c', 'Déjà sorti', { dateSortie: '2026-11-14' }),
    set('d', 'Sans date'),
    set('e', 'Dernier jour', { dateRetrait: '2026-11-14' }),
    set('f', 'Date fausse', { dateRetrait: 'bientôt', dateSortie: '2027-13-01' }),
  ];
  const evts = evenementsAVenir(sets, AUJOURDHUI).flatMap((m) => m.evenements);
  assert.deepEqual(evts.map((e) => e.nom), ['Dernier jour']);
});

test('evenementsAVenir : un set annoncé a deux événements, le retrait avant la sortie le même jour, puis par nom', () => {
  const sets = [
    set('a', 'Zèbre', { dateSortie: '2027-02-01' }),
    set('b', 'Abeille', { dateSortie: '2027-02-01' }),
    set('c', 'Retrait du jour', { dateRetrait: '2027-02-01' }),
    set('d', 'Deux dates', { dateSortie: '2027-01-10', dateRetrait: '2027-02-20' }),
  ];
  const e = evenementsAVenir(sets, AUJOURDHUI);
  assert.deepEqual(e.map((m) => m.cle), ['2027-01', '2027-02']);
  assert.deepEqual(e[1].evenements.map((x) => `${x.type}:${x.nom}`), ['retrait:Retrait du jour', 'sortie:Abeille', 'sortie:Zèbre', 'retrait:Deux dates']);
  assert.deepEqual(evenementsAVenir([], AUJOURDHUI), []);
});
