import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chercherSet, themeRacine, messageErreur } from './rebrickable.js';
import { ErreurRebrickable } from './api.js';
import { normaliserSet } from './model.js';

// Forme des réponses relevée sur les données publiques de Rebrickable : le set
// 75192-1 est dans le thème 171, dont le parent est 158.
const FAUCON = { set_num: '75192-1', name: 'Millennium Falcon', year: 2017, theme_id: 171, num_parts: 7541, set_img_url: 'https://cdn.rebrickable.com/media/sets/75192-1.jpg' };
const THEMES = { 171: { id: 171, name: 'Ultimate Collector Series', parent_id: 158 }, 158: { id: 158, name: 'Star Wars', parent_id: null } };

function faux(table = {}) {
  const appels = [];
  const appeler = async (chemin) => {
    appels.push(chemin);
    if (table[chemin] instanceof Error) throw table[chemin];
    if (!(chemin in table)) throw new ErreurRebrickable('introuvable');
    return table[chemin];
  };
  return { appeler, appels };
}
const tout = { '/sets/75192-1/': FAUCON, '/themes/171/': THEMES[171], '/themes/158/': THEMES[158] };

test('trouve un set et remonte au thème racine', async () => {
  const { appeler } = faux(tout);
  const r = await chercherSet('75192', appeler);
  assert.equal(r.set.numero, '75192-1');
  assert.equal(r.set.nom, 'Millennium Falcon');
  assert.equal(r.set.theme, 'Star Wars');
  assert.equal(r.set.annee, 2017);
  assert.equal(r.set.pieces, 7541);
  assert.equal(r.set.image, 'https://cdn.rebrickable.com/media/sets/75192-1.jpg');
  assert.deepEqual(r.avertissements, []);
});

test('le résultat est accepté tel quel par le modèle, sans correction', () => {
  return chercherSet('75192', faux(tout).appeler).then(({ set }) => {
    const v = normaliserSet({ ...set, statut: 'possédé' });
    assert.equal(v.corrections, 0);
  });
});

test('un numéro invalide échoue avant tout appel', async () => {
  const { appeler, appels } = faux(tout);
  await assert.rejects(() => chercherSet('abc', appeler), (e) => e.code === 'numero');
  assert.equal(appels.length, 0);
});

test('le cache évite de redemander les thèmes', async () => {
  const cache = {};
  const a = faux(tout);
  await chercherSet('75192', a.appeler, cache);
  assert.equal(a.appels.length, 3);
  assert.deepEqual(Object.keys(cache).sort(), ['158', '171']);
  const b = faux(tout);
  await chercherSet('75192', b.appeler, cache);
  assert.deepEqual(b.appels, ['/sets/75192-1/']);
});

test('un set introuvable remonte l\'erreur', async () => {
  await assert.rejects(() => chercherSet('99999', faux({}).appeler), (e) => e.code === 'introuvable');
});

test('thème impossible à récupérer : le set est rendu avec un avertissement', async () => {
  const { appeler } = faux({ '/sets/75192-1/': FAUCON, '/themes/171/': new ErreurRebrickable('limite') });
  const r = await chercherSet('75192', appeler);
  assert.equal(r.set.nom, 'Millennium Falcon');
  assert.equal(r.set.theme, '');
  assert.equal(r.avertissements.length, 1);
});

test('une clé refusée en cours de route n\'est pas masquée en avertissement', async () => {
  const { appeler } = faux({ '/sets/75192-1/': FAUCON, '/themes/171/': new ErreurRebrickable('cle') });
  await assert.rejects(() => chercherSet('75192', appeler), (e) => e.code === 'cle');
});

test('un set sans thème_id donne un thème vide', async () => {
  const { appeler } = faux({ '/sets/75192-1/': { ...FAUCON, theme_id: null } });
  assert.equal((await chercherSet('75192', appeler)).set.theme, '');
});

test('une réponse sans nom est rejetée', async () => {
  await assert.rejects(() => chercherSet('75192', faux({ '/sets/75192-1/': { set_num: '75192-1' } }).appeler), (e) => e.code === 'reponse');
});

test('un champ numérique absent devient null, une image non texte aussi', async () => {
  const { appeler } = faux({ '/sets/75192-1/': { set_num: '75192-1', name: 'X', set_img_url: 42 } });
  const { set } = await chercherSet('75192', appeler);
  assert.equal(set.annee, null);
  assert.equal(set.pieces, null);
  assert.equal(set.image, null);
});

test('un cycle dans les thèmes ne boucle pas', async () => {
  const { appeler } = faux({ '/themes/1/': { name: 'A', parent_id: 2 }, '/themes/2/': { name: 'B', parent_id: 1 } });
  assert.equal(await themeRacine(1, appeler, {}), 'B');
});

test('messages d\'erreur lisibles', () => {
  assert.match(messageErreur({ code: 'cle' }), /Clé/);
  assert.match(messageErreur({ code: 'reseau' }), /réseau/);
  assert.equal(messageErreur(new Error('x')), 'Recherche impossible.');
});
