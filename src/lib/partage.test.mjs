import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exporter, lireImport } from './partage.js';

const SET = { id: 'a', numero: '75192-1', nom: 'Faucon', statut: 'possédé' };

test('le nom du fichier porte la date', () => {
  assert.equal(exporter([], new Date('2026-11-03T10:00:00Z')).nom, 'bricks-list-2026-11-03.json');
});

test('l\'export ne contient que version, date et sets', () => {
  const d = JSON.parse(exporter([SET], new Date('2026-11-03T10:00:00Z')).contenu);
  assert.deepEqual(Object.keys(d).sort(), ['exporteLe', 'sets', 'version']);
});

test('aller-retour export puis import', () => {
  const r = lireImport(exporter([SET]).contenu);
  assert.equal(r.erreur, null);
  assert.equal(r.sets.length, 1);
  assert.equal(r.sets[0].id, 'a');
});

test('une liste nue est acceptée', () => {
  assert.equal(lireImport(JSON.stringify([SET])).sets.length, 1);
});

test('du texte quelconque est refusé', () => {
  assert.ok(lireImport('pas du json').erreur);
  assert.ok(lireImport('{"x":1}').erreur);
  assert.ok(lireImport(undefined).erreur);
});

test('une liste vide est refusée', () => {
  assert.ok(lireImport('[]').erreur);
});

test('un fichier sans aucun set exploitable est refusé', () => {
  assert.ok(lireImport(JSON.stringify([{ numero: 'zzz' }, 4])).erreur);
});

test('les corrections et rejets sont annoncés', () => {
  const r = lireImport(JSON.stringify([SET, { ...SET, id: 'b', annee: 'x' }, { numero: 'zzz' }]));
  assert.equal(r.erreur, null);
  assert.equal(r.sets.length, 2);
  assert.equal(r.corriges, 1);
  assert.equal(r.rejetes, 1);
});

test('un fichier trop gros est refusé', () => {
  assert.ok(lireImport('['.padEnd(6 * 1024 * 1024, ' ')).erreur);
});
