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

// ---------- recherche par nom ----------
import { rechercherSets, completerResultat, MOTS_MIN } from './rebrickable.js';

const ITEM = (set_num, name, o = {}) => ({ set_num, name, year: 2017, theme_id: 171, num_parts: 7541, set_img_url: `https://cdn.rebrickable.com/media/sets/${set_num}.jpg`, set_url: 'x', last_modified_dt: 'x', ...o });
const PAGE = (results, o = {}) => ({ count: results.length, next: null, previous: null, results, ...o });

function chemin(table) {
  const appels = [];
  const appeler = async (c) => {
    appels.push(c);
    const cle = Object.keys(table).find((k) => c.startsWith(k));
    if (!cle) throw new ErreurRebrickable('introuvable');
    if (table[cle] instanceof Error) throw table[cle];
    return table[cle];
  };
  return { appeler, appels };
}

test('rechercherSets : construit la requête (mots encodés, page, taille)', async () => {
  const { appeler, appels } = chemin({ '/sets/?search=': PAGE([ITEM('75192-1', 'Millennium Falcon')]) });
  await rechercherSets('  millennium falcon ', appeler, { page: 3 });
  assert.equal(appels[0], '/sets/?search=millennium%20falcon&page=3&page_size=10');
});

test('rechercherSets : convertit les résultats, sans résoudre les thèmes', async () => {
  const { appeler, appels } = chemin({ '/sets/?search=': PAGE([ITEM('75192-1', 'Millennium Falcon'), ITEM('10179-1', 'Millennium Falcon - UCS', { year: 2007, num_parts: 5195 })], { count: 134, next: 'https://x/?page=2' }) });
  const r = await rechercherSets('falcon', appeler);
  assert.equal(r.resultats.length, 2);
  assert.deepEqual(r.resultats[0], { numero: '75192-1', nom: 'Millennium Falcon', annee: 2017, pieces: 7541, image: 'https://cdn.rebrickable.com/media/sets/75192-1.jpg', themeId: 171 });
  assert.equal(r.total, 134);
  assert.equal(r.suite, true);
  assert.equal(appels.length, 1);
});

test('rechercherSets : dernière page, pas de suite', async () => {
  const { appeler } = chemin({ '/sets/?search=': PAGE([ITEM('1000-1', 'Abc')], { next: null }) });
  assert.equal((await rechercherSets('abc', appeler)).suite, false);
});

test('rechercherSets : moins de 3 caractères, aucun appel', async () => {
  const { appeler, appels } = chemin({ '/sets/?search=': PAGE([]) });
  assert.equal(MOTS_MIN, 3);
  for (const q of ['', '  ', 'ab', ' a ', undefined]) await assert.rejects(() => rechercherSets(q, appeler), (e) => e.code === 'requete');
  assert.equal(appels.length, 0);
});

test('rechercherSets : écarte les numéros que l\'application ne sait pas ranger et les entrées sans nom', async () => {
  const { appeler } = chemin({ '/sets/?search=': PAGE([ITEM('COMCON001-1', 'Promo à lettres'), ITEM('75192-1', 'Bon'), ITEM('10294-1', ''), { name: 'sans numéro' }, null]) });
  assert.deepEqual((await rechercherSets('promo', appeler)).resultats.map((x) => x.numero), ['75192-1']);
});

test('rechercherSets : une image non https devient null, un champ absent aussi', async () => {
  const { appeler } = chemin({ '/sets/?search=': PAGE([ITEM('75192-1', 'X', { set_img_url: 'http://x/y.jpg', year: undefined, num_parts: null, theme_id: undefined })]) });
  const [r] = (await rechercherSets('xxx', appeler)).resultats;
  assert.equal(r.image, null);
  assert.equal(r.annee, null);
  assert.equal(r.pieces, null);
  assert.equal(r.themeId, null);
});

test('rechercherSets : réponse sans liste = réponse inattendue', async () => {
  const { appeler } = chemin({ '/sets/?search=': { detail: 'autre chose' } });
  await assert.rejects(() => rechercherSets('falcon', appeler), (e) => e.code === 'reponse');
});

test('rechercherSets : la clé refusée remonte telle quelle', async () => {
  const { appeler } = chemin({ '/sets/?search=': new ErreurRebrickable('cle') });
  await assert.rejects(() => rechercherSets('falcon', appeler), (e) => e.code === 'cle');
});

test('completerResultat : résout le thème racine, avec le cache', async () => {
  const cache = {};
  const { appeler, appels } = chemin({ '/themes/171/': THEMES[171], '/themes/158/': THEMES[158] });
  const res = { numero: '75192-1', nom: 'Millennium Falcon', annee: 2017, pieces: 7541, image: null, themeId: 171 };
  const r = await completerResultat(res, appeler, cache);
  assert.equal(r.set.theme, 'Star Wars');
  assert.equal(r.set.nom, 'Millennium Falcon');
  assert.deepEqual(r.avertissements, []);
  assert.equal(appels.length, 2);
  await completerResultat(res, appeler, cache);
  assert.equal(appels.length, 2);
});

test('completerResultat : thème impossible, avertissement et set rendu quand même', async () => {
  const { appeler } = chemin({ '/themes/171/': new ErreurRebrickable('limite') });
  const r = await completerResultat({ numero: '75192-1', nom: 'X', annee: null, pieces: null, image: null, themeId: 171 }, appeler);
  assert.equal(r.set.theme, '');
  assert.equal(r.avertissements.length, 1);
});

test('completerResultat : sans thème, rien à résoudre', async () => {
  const { appeler, appels } = chemin({});
  const r = await completerResultat({ numero: '75192-1', nom: 'X', annee: null, pieces: null, image: null, themeId: null }, appeler);
  assert.equal(r.set.theme, '');
  assert.equal(appels.length, 0);
});

test('completerResultat : le résultat convient tel quel au modèle', async () => {
  const { appeler } = chemin({ '/themes/171/': THEMES[171], '/themes/158/': THEMES[158] });
  const { set } = await completerResultat({ numero: '75192-1', nom: 'Millennium Falcon', annee: 2017, pieces: 7541, image: 'https://cdn.rebrickable.com/a.jpg', themeId: 171 }, appeler);
  assert.equal(normaliserSet({ ...set, statut: 'possédé' }).corrections, 0);
});
