import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidats, comparerSorties, correspondSortie, dateCourte, etatSortie, relatif, texteCarte } from './sortie.js';
import { dateSortieValide, joursJusque } from './dates.js';
import { normaliserSet } from './model.js';
import { filtrer, trier } from './recherche.js';
import { modifier } from './collection.js';

const AUJOURDHUI = new Date(2026, 10, 5, 15, 30); // 5 novembre 2026, l'après-midi
const set = (id, dateSortie, extra = {}) => ({ id, numero: `${10000 + id.length}-1`, nom: `Set ${id}`, statut: 'souhaité', dateSortie, sortieSource: dateSortie ? 'brickset' : null, ...extra });

test('dateSortieValide : l\'avenir est permis (dans une limite), pas l\'absurde', () => {
  assert.equal(dateSortieValide('2027-03-01', AUJOURDHUI), '2027-03-01');
  assert.equal(dateSortieValide('2017-10-01', AUJOURDHUI), '2017-10-01');
  assert.equal(dateSortieValide('2036-12-31', AUJOURDHUI), '2036-12-31');
  for (const v of ['2037-01-01', '1948-12-31', '2027-02-30', '2027-13-01', '2027-3-1', '2027-03-01T00:00:00Z', '', null, undefined, 20270301]) assert.equal(dateSortieValide(v, AUJOURDHUI), null, String(v));
});

test('joursJusque : jours calendaires, quelle que soit l\'heure', () => {
  assert.equal(joursJusque('2026-11-05', AUJOURDHUI), 0);
  assert.equal(joursJusque('2026-11-06', AUJOURDHUI), 1);
  assert.equal(joursJusque('2027-01-01', AUJOURDHUI), 57);
  assert.equal(joursJusque('2026-11-04', AUJOURDHUI), -1);
  assert.equal(joursJusque('2026-11-06', new Date(2026, 10, 5, 23, 59)), 1);
  assert.equal(joursJusque('pas une date', AUJOURDHUI), null);
});

test('texte : un ordre de grandeur quand c\'est loin, le jour quand c\'est proche', () => {
  assert.equal(relatif(0), "aujourd'hui");
  assert.equal(relatif(1), 'demain');
  assert.equal(relatif(57), 'dans 57 jours');
  assert.equal(relatif(150), 'dans 5 mois');
  assert.equal(relatif(1200), 'dans 3 ans');
  assert.equal(dateCourte('2027-01-01'), '1 janv. 2027');
  assert.equal(dateCourte('n\'importe quoi'), '');
});

test('carte : seulement pour un set pas encore sorti, version courte pour la grille', () => {
  assert.equal(texteCarte(set('a', '2027-01-01'), AUJOURDHUI), 'Sort le 1 janv. 2027 · dans 57 jours');
  assert.equal(texteCarte(set('a', '2027-01-01'), AUJOURDHUI, true), 'Sort dans 57 jours');
  assert.equal(texteCarte(set('a', '2026-01-01'), AUJOURDHUI), null);
  assert.equal(texteCarte(set('a', '2026-11-05'), AUJOURDHUI), null, 'sorti aujourd\'hui = sorti');
  assert.equal(texteCarte(set('a', null), AUJOURDHUI), null);
  assert.equal(etatSortie(set('a', null), AUJOURDHUI), null);
});

test('filtre « Sortie » : à venir, déjà sorti, date inconnue', () => {
  const sets = [set('futur', '2027-01-01'), set('passe', '2020-05-05'), set('inconnu', null)];
  const ids = (v) => filtrer(sets, { sortie: v, maintenant: AUJOURDHUI }).map((s) => s.id);
  assert.deepEqual(ids('avenir'), ['futur']);
  assert.deepEqual(ids('sorti'), ['passe']);
  assert.deepEqual(ids('inconnue'), ['inconnu']);
  assert.deepEqual(ids(''), ['futur', 'passe', 'inconnu']);
  assert.equal(correspondSortie(sets[0], 'nimporte', AUJOURDHUI), true);
});

test('tri « Date de sortie » : prochaine sortie d\'abord, puis les sortis récents, puis sans date', () => {
  const sets = [set('sans', null), set('ancien', '2019-01-01'), set('loin', '2027-12-01'), set('recent', '2026-06-01'), set('proche', '2026-12-01')];
  assert.deepEqual(trier(sets, 'sortie', AUJOURDHUI).map((s) => s.id), ['proche', 'loin', 'recent', 'ancien', 'sans']);
  assert.deepEqual(sets.map((s) => s.id), ['sans', 'ancien', 'loin', 'recent', 'proche'], 'ne modifie pas la liste d\'origine');
  assert.equal(comparerSorties(AUJOURDHUI)(set('a', null), set('b', null)), 0);
});

test('candidats : sans date ou à venir, jamais ceux saisis à la main ni les déjà sortis', () => {
  const sets = [
    set('sansdate', null),
    set('avenir', '2027-01-01'),
    set('passe', '2020-05-05'),
    set('main', '2027-02-02', { sortieSource: 'manuelle' }),
    set('mainvide', null, { sortieSource: 'manuelle' }),
  ];
  assert.deepEqual(candidats(sets, AUJOURDHUI).map((s) => s.id), ['sansdate', 'avenir']);
});

test('modèle : date et source validées, une date sans source connue est réputée manuelle', () => {
  const base = { numero: '72051-1', nom: 'DK' };
  const ok = normaliserSet({ ...base, dateSortie: '2027-03-01', sortieSource: 'brickset' });
  assert.deepEqual([ok.set.dateSortie, ok.set.sortieSource, ok.corrections], ['2027-03-01', 'brickset', 0]);
  const sansSource = normaliserSet({ ...base, dateSortie: '2027-03-01' });
  assert.deepEqual([sansSource.set.sortieSource, sansSource.corrections], ['manuelle', 0]);
  const sourceInconnue = normaliserSet({ ...base, dateSortie: '2027-03-01', sortieSource: 'devin' });
  assert.deepEqual([sourceInconnue.set.sortieSource, sourceInconnue.corrections], ['manuelle', 1]);
  const dateAbsurde = normaliserSet({ ...base, dateSortie: '2027-02-30', sortieSource: 'brickset' });
  assert.deepEqual([dateAbsurde.set.dateSortie, dateAbsurde.set.sortieSource, dateAbsurde.corrections], [null, null, 1]);
  const vide = normaliserSet(base);
  assert.deepEqual([vide.set.dateSortie, vide.set.sortieSource, vide.corrections], [null, null, 0]);
  assert.equal(normaliserSet({ ...base, dateSortie: 42 }).set.dateSortie, null);
});

test('modifier : la date de sortie se pose et se retire, pour la wishlist comme pour la collection', () => {
  const sets = [normaliserSet({ id: 'a', numero: '72051-1', nom: 'DK', statut: 'souhaité' }).set];
  const avec = modifier(sets, 'a', { dateSortie: '2027-03-01', sortieSource: 'manuelle' });
  assert.deepEqual([avec[0].dateSortie, avec[0].sortieSource], ['2027-03-01', 'manuelle']);
  const sans = modifier(avec, 'a', { dateSortie: null, sortieSource: null });
  assert.deepEqual([sans[0].dateSortie, sans[0].sortieSource], [null, null]);
});
