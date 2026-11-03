import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extraireNumeros, chercherLot, marquerDoublons, cocheParDefaut, construireAjouts, LOT_MAX } from './lot.js';
import { ajouterPlusieurs } from './collection.js';
import { ErreurRebrickable } from './api.js';

test('extrait des numéros séparés par lignes, virgules, espaces et points-virgules', () => {
  const r = extraireNumeros('75192\n10294-1, 21330;42143   10316');
  assert.deepEqual(r.numeros, ['75192-1', '10294-1', '21330-1', '42143-1', '10316-1']);
  assert.deepEqual(r.invalides, []);
});

test('une colonne collée depuis un tableur (retours chariot Windows) passe', () => {
  assert.deepEqual(extraireNumeros('75192\r\n10294\r\n').numeros, ['75192-1', '10294-1']);
});

test('ce qui n\'est pas un numéro est rendu à part, pas perdu', () => {
  const r = extraireNumeros('75192 Faucon abc 10294');
  assert.deepEqual(r.numeros, ['75192-1', '10294-1']);
  assert.deepEqual(r.invalides, ['Faucon', 'abc']);
});

test('texte vide ou absent', () => {
  assert.deepEqual(extraireNumeros('   ').numeros, []);
  assert.deepEqual(extraireNumeros(undefined).numeros, []);
});

test('un même numéro saisi deux fois reste deux entrées', () => {
  assert.deepEqual(extraireNumeros('75192 75192').numeros, ['75192-1', '75192-1']);
});

test('plafond du lot', () => {
  const texte = Array.from({ length: LOT_MAX + 20 }, (_, i) => String(10000 + i)).join('\n');
  const r = extraireNumeros(texte);
  assert.equal(r.numeros.length, LOT_MAX);
  assert.equal(r.tronque, true);
  assert.equal(extraireNumeros('75192').tronque, false);
});

const trouve = (numero) => async () => ({ set: { numero, nom: `Nom ${numero}`, theme: 'T', annee: 2020, pieces: 100, image: null }, avertissements: [] });
const chercheurDe = (table) => async (numero) => {
  const v = table[numero];
  if (v instanceof Error) throw v;
  if (!v) throw new ErreurRebrickable('introuvable');
  return { set: { numero, nom: v, theme: 'T', annee: 2020, pieces: 100, image: null }, avertissements: [] };
};
test('chercherLot : progression et résultats dans l\'ordre', async () => {
  const progres = [];
  const { resultats, arret } = await chercherLot(['1-1', '2-1', '3-1'], chercheurDe({ '1-1': 'A', '2-1': 'B', '3-1': 'C' }), { onProgres: (f, t) => progres.push([f, t]) });
  assert.equal(arret, null);
  assert.deepEqual(resultats.map((r) => [r.numero, r.etat]), [['1-1', 'trouve'], ['2-1', 'trouve'], ['3-1', 'trouve']]);
  assert.deepEqual(progres, [[1, 3], [2, 3], [3, 3]]);
});

test('chercherLot : un introuvable au milieu n\'arrête pas les suivants', async () => {
  const { resultats } = await chercherLot(['1-1', '9-1', '3-1'], chercheurDe({ '1-1': 'A', '3-1': 'C' }));
  assert.deepEqual(resultats.map((r) => r.etat), ['trouve', 'introuvable', 'trouve']);
  assert.match(resultats[1].motif, /introuvable/);
});

test('chercherLot : une panne réseau est une ligne en erreur, pas un arrêt', async () => {
  const { resultats, arret } = await chercherLot(['1-1', '2-1'], chercheurDe({ '1-1': new ErreurRebrickable('reseau'), '2-1': 'B' }));
  assert.equal(arret, null);
  assert.deepEqual(resultats.map((r) => r.etat), ['erreur', 'trouve']);
});

test('chercherLot : une clé refusée arrête tout et garde ce qui précède', async () => {
  let appels = 0;
  const chercher = async (n) => { appels += 1; if (n === '3-1') throw new ErreurRebrickable('cle'); return trouve(n)(); };
  const { resultats, arret } = await chercherLot(['1-1', '2-1', '3-1', '4-1', '5-1'], chercher);
  assert.equal(arret, 'cle');
  assert.equal(resultats.length, 2);
  assert.equal(appels, 3);
});

test('chercherLot : une limite de débit déclenche une pause avant le suivant', async () => {
  const pauses = [];
  const { resultats } = await chercherLot(['1-1', '2-1'], chercheurDe({ '1-1': new ErreurRebrickable('limite'), '2-1': 'B' }), { attendre: async (ms) => { pauses.push(ms); } });
  assert.deepEqual(pauses, [2000]);
  assert.deepEqual(resultats.map((r) => r.etat), ['erreur', 'trouve']);
});

test('chercherLot : annulation avant le début', async () => {
  const ctrl = new AbortController();
  ctrl.abort();
  let appels = 0;
  const { resultats, arret } = await chercherLot(['1-1'], async () => { appels += 1; return trouve('1-1')(); }, { signal: ctrl.signal });
  assert.equal(arret, 'annule');
  assert.equal(appels, 0);
  assert.deepEqual(resultats, []);
});

test('chercherLot : annulation pendant une recherche, la réponse tardive est ignorée', async () => {
  const ctrl = new AbortController();
  const chercher = async (n) => { if (n === '2-1') ctrl.abort(); return trouve(n)(); };
  const { resultats, arret } = await chercherLot(['1-1', '2-1', '3-1'], chercher, { signal: ctrl.signal });
  assert.equal(arret, 'annule');
  assert.deepEqual(resultats.map((r) => r.numero), ['1-1']);
});

test('chercherLot : un numéro répété n\'est cherché qu\'une fois', async () => {
  let appels = 0;
  const { resultats } = await chercherLot(['1-1', '1-1'], async (n) => { appels += 1; return trouve(n)(); });
  assert.equal(appels, 1);
  assert.equal(resultats.length, 2);
});

test('chercherLot : sans clé, rien n\'est cherché et chaque ligne le dit', async () => {
  const { resultats } = await chercherLot(['1-1', '2-1'], null);
  assert.deepEqual(resultats.map((r) => r.etat), ['nonCherche', 'nonCherche']);
  assert.match(resultats[0].motif, /clé/);
});

test('marquerDoublons : collection et liste', () => {
  const existants = [{ numero: '1-1' }];
  const r = marquerDoublons([{ numero: '1-1' }, { numero: '2-1' }, { numero: '2-1' }, { numero: '3-1' }], existants);
  assert.deepEqual(r.map((x) => x.doublon), ['collection', null, 'liste', null]);
});

test('coché d\'office : trouvé et pas en doublon seulement', () => {
  assert.equal(cocheParDefaut({ etat: 'trouve', doublon: null }), true);
  assert.equal(cocheParDefaut({ etat: 'trouve', doublon: 'collection' }), false);
  assert.equal(cocheParDefaut({ etat: 'introuvable', doublon: null }), false);
  assert.equal(cocheParDefaut({ etat: 'nonCherche', doublon: null }), false);
});

test('construireAjouts : seules les lignes cochées, avec statut et état du lot', () => {
  const resultats = [
    { numero: '1-1', etat: 'trouve', set: { numero: '1-1', nom: 'A', theme: 'T', annee: 2020, pieces: 10, image: null } },
    { numero: '2-1', etat: 'introuvable', set: null },
    { numero: '3-1', etat: 'trouve', set: { numero: '3-1', nom: 'C', theme: 'T', annee: 2021, pieces: 20, image: null } },
  ];
  const bruts = construireAjouts(resultats, new Set([0, 1]), { statut: 'possédé', etat: 'scellé' });
  assert.equal(bruts.length, 2);
  assert.equal(bruts[0].nom, 'A');
  assert.equal(bruts[0].etat, 'scellé');
  assert.equal(bruts[1].numero, '2-1');
  assert.equal(bruts[1].nom, '');
});

test('construireAjouts : un set souhaité n\'a pas d\'état', () => {
  const r = [{ numero: '1-1', etat: 'trouve', set: { numero: '1-1', nom: 'A', theme: '', annee: null, pieces: null, image: null } }];
  assert.equal(construireAjouts(r, new Set([0]), { statut: 'souhaité', etat: 'scellé' })[0].etat, null);
});

test('un introuvable ajouté garde le numéro et prend le nom « Set N »', () => {
  const bruts = construireAjouts([{ numero: '75192-1', etat: 'introuvable', set: null }], new Set([0]), { statut: 'possédé', etat: '' });
  const { sets } = ajouterPlusieurs([], bruts);
  assert.equal(sets[0].numero, '75192-1');
  assert.equal(sets[0].nom, 'Set 75192-1');
  assert.equal(sets[0].etat, null);
});
