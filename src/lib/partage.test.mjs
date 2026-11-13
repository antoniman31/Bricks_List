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

test('les prix officiels voyagent dans l\'export et reviennent à l\'import, source comprise', async () => {
  const sets = [
    { id: 'w0', numero: '75192-1', nom: 'Faucon', statut: 'souhaité', prix: 849.99, prixSource: 'manuelle' },
    { id: 'w1', numero: '10294-1', nom: 'Titanic', statut: 'souhaité', prix: 629.99, prixSource: 'brickset-de' },
    { id: 'w2', numero: '21357-1', nom: 'Sans prix', statut: 'souhaité' },
    { id: 'p0', numero: '10307-1', nom: 'Possédé', statut: 'possédé', prix: 499.99, prixSource: 'manuelle' },
  ];
  const { exporter, lireImport } = await import('./partage.js');
  const r = lireImport(exporter(sets).contenu);
  assert.equal(r.erreur, null);
  assert.equal(r.corriges, 0);
  const lu = (id) => r.sets.find((s) => s.id === id);
  assert.deepEqual([lu('w0').prix, lu('w0').prixSource], [849.99, 'manuelle']);
  assert.deepEqual([lu('w1').prix, lu('w1').prixSource], [629.99, 'brickset-de']);
  assert.deepEqual([lu('w2').prix, lu('w2').prixSource], [null, null]);
  assert.deepEqual([lu('p0').prix, lu('p0').prixSource], [499.99, 'manuelle']);
  // Avec les images aussi, et un prix absurde dans un fichier est écarté (et compté) à l'import.
  const avec = lireImport(exporter(sets, new Date(), { photos: [], boites: [], rendus: [] }).contenu);
  assert.equal(avec.sets.find((s) => s.id === 'w0').prix, 849.99);
  const mauvais = lireImport(JSON.stringify({ sets: [{ id: 'x', numero: '75192-1', nom: 'X', statut: 'souhaité', prix: -5 }] }));
  assert.equal(mauvais.sets[0].prix, null);
  assert.ok(mauvais.corriges >= 1);
});
