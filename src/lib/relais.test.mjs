import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DELAIS_AVANT_ARRET, arretRelais, ecrireRelais, envoyerSauvegarde, listerSauvegardes, telechargerSauvegarde, jetonValide, lireRelais, messageRelais, recupererGalerie, recupererImage, recupererNotices, recupererSortie, urlNoticeSure, urlRelaisValide } from './relais.js';

const faux = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
};
const json = (corps, statut = 200) => new Response(JSON.stringify(corps), { status: statut });
const RELAIS = { url: 'https://bricks-relais.exemple.workers.dev', jeton: '' };

test('adresse : https (ou http local), sans identifiants ni paramètres, nettoyée', () => {
  assert.equal(urlRelaisValide('https://bricks-relais.exemple.workers.dev'), 'https://bricks-relais.exemple.workers.dev');
  assert.equal(urlRelaisValide('  https://bricks-relais.exemple.workers.dev/  '), 'https://bricks-relais.exemple.workers.dev');
  assert.equal(urlRelaisValide('https://exemple.dev/relais/'), 'https://exemple.dev/relais');
  assert.equal(urlRelaisValide('http://localhost:8787'), 'http://localhost:8787');
  for (const v of ['http://exemple.dev', 'ftp://exemple.dev', 'javascript:alert(1)', 'https://user:mdp@exemple.dev', 'https://exemple.dev/?cle=1', 'https://exemple.dev/#x', 'pas une adresse', '', null, 42, `https://exemple.dev/${'a'.repeat(300)}`]) {
    assert.equal(urlRelaisValide(v), null, String(v));
  }
});

test('jeton : vide ou 8 à 100 caractères imprimables sans espace', () => {
  assert.equal(jetonValide(''), true);
  assert.equal(jetonValide('abcdefgh12'), true);
  for (const v of ['court', 'avec espace ici', 'accentué12345', null, 42]) assert.equal(jetonValide(v), false, String(v));
});

test('réglage : écrire puis lire, une valeur corrompue ou dangereuse retombe sur vide', () => {
  const s = faux();
  assert.deepEqual(ecrireRelais({ url: 'https://exemple.dev/', jeton: 'abcdefgh12' }, s), { ok: true, erreur: null });
  assert.deepEqual(lireRelais(s), { url: 'https://exemple.dev', jeton: 'abcdefgh12' });
  assert.deepEqual(lireRelais(faux({ bl_relais: '{pas du json' })), { url: '', jeton: '' });
  assert.deepEqual(lireRelais(faux({ bl_relais: JSON.stringify({ url: 'javascript:alert(1)', jeton: 'x' }) })), { url: '', jeton: '' });
  assert.deepEqual(lireRelais(faux({ bl_relais: JSON.stringify({ url: 'https://exemple.dev', jeton: 'avec espace' }) })), { url: 'https://exemple.dev', jeton: '' });
  ecrireRelais({ url: '', jeton: '' }, s);
  assert.deepEqual(lireRelais(s), { url: '', jeton: '' });
  assert.equal(ecrireRelais({ url: 'https://exemple.dev', jeton: '' }, { setItem: () => { throw new Error('plein'); }, removeItem() {} }).ok, false);
});

test('recupererSortie : date trouvée, jeton envoyé seulement s\'il existe', async () => {
  let vu;
  const fetchFn = async (url, init) => { vu = { url, init }; return json({ numero: '72051-1', trouve: true, lancement: '2027-03-01', retrait: null, disponibilite: 'Coming soon' }); };
  assert.deepEqual(await recupererSortie(RELAIS, '72051-1', fetchFn), { ok: true, trouve: true, lancement: '2027-03-01', retrait: null, prixDE: null, sousTheme: null });
  assert.equal(vu.url, 'https://bricks-relais.exemple.workers.dev/sortie?numero=72051-1');
  assert.deepEqual(vu.init.headers, {});
  await recupererSortie({ ...RELAIS, jeton: 'abcdefgh12' }, '72051-1', fetchFn);
  assert.deepEqual(vu.init.headers, { 'X-Jeton': 'abcdefgh12' });
});

test('recupererSortie : pas de date chez Brickset, ou date absurde, donne lancement null', async () => {
  assert.deepEqual(await recupererSortie(RELAIS, '72051-1', async () => json({ trouve: true, lancement: null })), { ok: true, trouve: true, lancement: null, retrait: null, prixDE: null, sousTheme: null });
  assert.deepEqual(await recupererSortie(RELAIS, '72051-1', async () => json({ trouve: false, lancement: null })), { ok: true, trouve: false, lancement: null, retrait: null, prixDE: null, sousTheme: null });
  assert.equal((await recupererSortie(RELAIS, '72051-1', async () => json({ trouve: true, lancement: '2999-01-01' }))).lancement, null);
  assert.equal((await recupererSortie(RELAIS, '72051-1', async () => json({ trouve: true, lancement: '<script>' }))).lancement, null);
});

test('recupererSortie : numéro ou relais invalides ne font aucun appel', async () => {
  let appels = 0;
  const fetchFn = async () => { appels += 1; return json({}); };
  assert.equal((await recupererSortie(RELAIS, 'abc', fetchFn)).code, 'numero');
  assert.equal((await recupererSortie({ url: '', jeton: '' }, '72051-1', fetchFn)).code, 'numero');
  assert.equal(appels, 0);
});

test('recupererSortie : les pannes deviennent des codes, jamais une exception', async () => {
  const code = async (fetchFn) => (await recupererSortie(RELAIS, '72051-1', fetchFn)).code;
  assert.equal(await code(async () => json({ erreur: 'limite' }, 429)), 'limite');
  assert.equal(await code(async () => json({ erreur: 'cle' }, 502)), 'cle');
  assert.equal(await code(async () => json({ erreur: 'jeton' }, 401)), 'jeton');
  assert.equal(await code(async () => json({ erreur: 'inventee' }, 500)), 'reponse');
  assert.equal(await code(async () => new Response('<html>', { status: 200 })), 'reponse');
  assert.equal(await code(async () => json({ trouve: 'oui' })), 'reponse');
  assert.equal(await code(async () => json(null)), 'reponse');
  assert.equal(await code(async () => { throw new TypeError('réseau'); }), 'reseau');
  assert.equal(await code(async () => { throw Object.assign(new Error('t'), { name: 'TimeoutError' }); }), 'delai');
  for (const c of ['cle', 'limite', 'jeton', 'reseau', 'delai', 'brickset', 'reponse', 'inconnu']) assert.ok(messageRelais(c).length > 10);
});

test('recupererImage : renvoie l\'image, ou un code sans jamais lever', async () => {
  const { recupererImage } = await import('./relais.js');
  const rel = { url: 'https://r.example', jeton: 'abcdefgh1' };
  const u = 'https://cdn.rebrickable.com/media/sets/75192-1.jpg';
  let vu;
  const ok = async (adr, init) => { vu = { adr, init }; return new Response(new Blob([new Uint8Array(5)], { type: 'image/jpeg' }), { status: 200, headers: { 'Content-Type': 'image/jpeg' } }); };
  const r = await recupererImage(rel, u, ok);
  assert.equal(r.ok, true);
  assert.equal(vu.adr, `https://r.example/image?url=${encodeURIComponent(u)}`);
  assert.equal(vu.init.headers['X-Jeton'], 'abcdefgh1');
  const code = async (f, adr = u, relais = rel) => (await recupererImage(relais, adr, f)).code;
  assert.equal(await code(ok, 'https://evil.test/a.jpg'), 'url');
  assert.equal(await code(ok, u, { url: '', jeton: '' }), 'url');
  assert.equal(await code(async () => { throw new Error('x'); }), 'reseau');
  assert.equal(await code(async () => new Response(JSON.stringify({ erreur: 'absente' }), { status: 404 })), 'absente');
  assert.equal(await code(async () => new Response('pas du json', { status: 500 })), 'reponse');
  assert.equal(await code(async () => new Response(new Blob(['<html>'], { type: 'text/html' }), { status: 200 })), 'type');
  assert.equal(await code(async () => new Response(new Blob([], { type: 'image/jpeg' }), { status: 200 })), 'taille');
  assert.equal(await code(async () => new Response(new Blob([new Uint8Array(6 * 1024 * 1024 + 1)], { type: 'image/png' }), { status: 200 })), 'taille');
});

test('recupererSortie : le prix allemand est relu (nombre raisonnable), sinon null', async () => {
  const prix = async (v) => (await recupererSortie(RELAIS, '72051-1', async () => json({ trouve: true, lancement: null, prixDE: v }))).prixDE;
  assert.equal(await prix(849.99), 849.99);
  for (const v of [0, -3, 99999, '849', null, undefined, {}]) assert.equal(await prix(v), null, String(v));
});

test('arretRelais : une image refusée n\'arrête rien, une vraie panne du relais si', () => {
  for (const code of ['absente', 'taille', 'type', 'url', 'rebrickable', 'reponse']) assert.equal(arretRelais(code), false, code);
  for (const code of ['jeton', 'reseau', 'configuration']) assert.equal(arretRelais(code), true, code);
  assert.equal(arretRelais('delai', DELAIS_AVANT_ARRET - 1), false);
  assert.equal(arretRelais('delai', DELAIS_AVANT_ARRET), true);
});

test('recupererSortie : retrait et sous-thème repris, revalidés (sous-thème vide gardé vide)', async () => {
  const lu = async (corps) => recupererSortie(RELAIS, '75192-1', async () => json({ trouve: true, lancement: null, ...corps }));
  const r = await lu({ retrait: '2026-12-31', sousTheme: 'Ultimate Collector Series' });
  assert.deepEqual([r.retrait, r.sousTheme], ['2026-12-31', 'Ultimate Collector Series']);
  assert.equal((await lu({ sousTheme: '' })).sousTheme, '');
  assert.equal((await lu({ sousTheme: 12 })).sousTheme, null);
  assert.equal((await lu({ sousTheme: 'a\nb' })).sousTheme, 'a b');
  assert.equal((await lu({ sousTheme: 'x'.repeat(200) })).sousTheme.length, 60);
  assert.equal((await lu({ retrait: '<script>' })).retrait, null);
  assert.equal((await lu({ retrait: '2999-01-01' })).retrait, null);
});

test('urlNoticeSure : https chez LEGO ou Brickset seulement', () => {
  assert.ok(urlNoticeSure('https://www.lego.com/cdn/a.pdf'));
  for (const v of ['http://www.lego.com/a.pdf', 'https://evil.example/a.pdf', 'https://lego.com.evil.example/a.pdf', 'https://u:p@www.lego.com/a.pdf', 'javascript:alert(1)', null, 42]) assert.equal(urlNoticeSure(v), null, String(v));
});

test('recupererNotices : garde les bonnes adresses, jeton envoyé seulement s\'il existe', async () => {
  let vu;
  const fetchFn = async (url, init) => { vu = { url, init }; return json({ numero: '75192-1', trouve: true, notices: [{ url: 'https://www.lego.com/a.pdf', description: 'Notice 1' }, { url: 'https://evil.example/b.pdf', description: 'x' }, { url: 'https://www.lego.com/a.pdf', description: 'doublon' }, { url: 'https://www.lego.com/c.pdf' }] }); };
  assert.deepEqual(await recupererNotices(RELAIS, '75192-1', fetchFn), { ok: true, notices: [{ url: 'https://www.lego.com/a.pdf', description: 'Notice 1' }, { url: 'https://www.lego.com/c.pdf', description: '' }] });
  assert.equal(vu.url, 'https://bricks-relais.exemple.workers.dev/notices?numero=75192-1');
  assert.deepEqual(vu.init.headers, {});
  await recupererNotices({ ...RELAIS, jeton: 'abcdefgh12' }, '75192-1', fetchFn);
  assert.deepEqual(vu.init.headers, { 'X-Jeton': 'abcdefgh12' });
});

test('recupererNotices : aucune notice n\'est une réponse valide ; pannes et entrées invalides donnent des codes', async () => {
  assert.deepEqual(await recupererNotices(RELAIS, '75192-1', async () => json({ trouve: false, notices: [] })), { ok: true, notices: [] });
  let appels = 0;
  assert.equal((await recupererNotices(RELAIS, 'abc', async () => { appels += 1; return json({}); })).code, 'numero');
  assert.equal((await recupererNotices({ url: '', jeton: '' }, '75192-1', async () => { appels += 1; return json({}); })).code, 'numero');
  assert.equal(appels, 0);
  const code = async (fetchFn) => (await recupererNotices(RELAIS, '75192-1', fetchFn)).code;
  assert.equal(await code(async () => json({ erreur: 'limite' }, 429)), 'limite');
  assert.equal(await code(async () => json({ trouve: true })), 'reponse');
  assert.equal(await code(async () => new Response('<html>', { status: 200 })), 'reponse');
  assert.equal(await code(async () => { throw new TypeError('réseau'); }), 'reseau');
  assert.equal(await code(async () => { throw Object.assign(new Error('t'), { name: 'TimeoutError' }); }), 'delai');
});

const BASE_IMG = 'https://images.brickset.com/sets/AdditionalImages/75192-1/';

test('recupererGalerie : liste filtrée, jeton envoyé seulement s\'il existe, pannes en codes', async () => {
  let vu;
  const fetchFn = async (url, init) => { vu = { url, init }; return json({ numero: '75192-1', trouve: true, images: [{ url: `${BASE_IMG}a.jpg`, miniature: `${BASE_IMG}tn_a.jpg` }, { url: 'https://evil.example/b.jpg' }] }); };
  assert.deepEqual(await recupererGalerie(RELAIS, '75192-1', fetchFn), { ok: true, images: [{ url: `${BASE_IMG}a.jpg`, miniature: `${BASE_IMG}tn_a.jpg`, nom: 'a.jpg', boite: false }] });
  assert.equal(vu.url, 'https://bricks-relais.exemple.workers.dev/galerie?numero=75192-1');
  assert.deepEqual(vu.init.headers, {});
  await recupererGalerie({ ...RELAIS, jeton: 'abcdefgh12' }, '75192-1', fetchFn);
  assert.deepEqual(vu.init.headers, { 'X-Jeton': 'abcdefgh12' });
  assert.deepEqual(await recupererGalerie(RELAIS, '75192-1', async () => json({ trouve: false, images: [] })), { ok: true, images: [] });
  let appels = 0;
  assert.equal((await recupererGalerie(RELAIS, 'abc', async () => { appels += 1; return json({}); })).code, 'numero');
  assert.equal((await recupererGalerie({ url: '', jeton: '' }, '75192-1', async () => { appels += 1; return json({}); })).code, 'numero');
  assert.equal(appels, 0);
  const code = async (f) => (await recupererGalerie(RELAIS, '75192-1', f)).code;
  assert.equal(await code(async () => json({ erreur: 'limite' }, 429)), 'limite');
  assert.equal(await code(async () => json({ trouve: true })), 'reponse');
  assert.equal(await code(async () => new Response('<html>', { status: 200 })), 'reponse');
  assert.equal(await code(async () => { throw new TypeError('réseau'); }), 'reseau');
});

test('recupererImage : accepte les images de la galerie de Brickset, refuse les autres adresses sans appel', async () => {
  let appels = 0;
  const fetchFn = async () => { appels += 1; return new Response(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }), { status: 200 }); };
  assert.equal((await recupererImage(RELAIS, `${BASE_IMG}a.jpg`, fetchFn)).ok, true);
  assert.equal(appels, 1);
  for (const u of ['https://evil.example/a.jpg', `${BASE_IMG}a.jpg?x=1`, 'https://images.brickset.com/other/a.jpg']) assert.equal((await recupererImage(RELAIS, u, fetchFn)).code, 'url', u);
  assert.equal(appels, 1);
});

// ---- Sauvegarde en ligne ------------------------------------------------------------------------------------------
const R = { url: 'https://relais.example', jeton: 'jeton-de-test-1234' };
const COPIE = 'sauvegardes/2026-11-14T143005Z.json';
const rep = (corps, statut = 200) => async () => new Response(JSON.stringify(corps), { status: statut });

test('envoyerSauvegarde : PUT du texte avec le jeton, la clé rendue est revérifiée', async () => {
  let vu;
  const fetchFn = async (url, init) => { vu = { url, init }; return new Response(JSON.stringify({ cle: COPIE, octets: 12 }), { status: 200 }); };
  const r = await envoyerSauvegarde(R, '{"sets":[]}', fetchFn);
  assert.deepEqual(r, { ok: true, cle: COPIE, octets: 12 });
  assert.equal(vu.url, 'https://relais.example/sauvegarde');
  assert.equal(vu.init.method, 'PUT');
  assert.equal(vu.init.headers['X-Jeton'], 'jeton-de-test-1234');
  assert.equal(vu.init.headers['Content-Type'], 'application/json');
  assert.equal(vu.init.body, '{"sets":[]}');
  assert.equal((await envoyerSauvegarde(R, '{}', rep({ cle: '../x', octets: 1 }))).code, 'reponse');
});

test('envoyerSauvegarde : sans jeton ou sans adresse, rien ne part ; les erreurs du relais deviennent des codes connus', async () => {
  let appels = 0;
  const f = async () => { appels += 1; return new Response('{}'); };
  assert.equal((await envoyerSauvegarde({ url: R.url, jeton: '' }, '{}', f)).code, 'jeton');
  assert.equal((await envoyerSauvegarde({ url: '', jeton: R.jeton }, '{}', f)).code, 'url');
  assert.equal((await envoyerSauvegarde(R, '', f)).code, 'url');
  assert.equal(appels, 0);
  for (const [statut, code] of [[401, 'jeton'], [403, 'protection'], [413, 'gros'], [500, 'stockage']]) {
    assert.equal((await envoyerSauvegarde(R, '{}', rep({ erreur: code }, statut))).code, code);
  }
  assert.equal((await envoyerSauvegarde(R, '{}', rep({ erreur: 'inconnue' }, 500))).code, 'reponse');
  assert.equal((await envoyerSauvegarde(R, '{}', async () => { throw new TypeError('réseau'); })).code, 'reseau');
  assert.equal((await envoyerSauvegarde(R, '{}', async () => { throw Object.assign(new Error('t'), { name: 'TimeoutError' }); })).code, 'delai');
});

test('listerSauvegardes : garde les copies valides, au plus 5, écarte le reste', async () => {
  const v = (cle, date = '2026-11-14T14:30:05.000Z', octets = 100) => ({ cle, date, octets });
  const r = await listerSauvegardes(R, rep({ versions: [v(COPIE), v('mauvaise'), v('sauvegardes/2026-11-13T100000Z.json', 'pas une date'), v('sauvegardes/2026-11-12T100000Z.json', '2026-11-12T10:00:00Z', -4), v('sauvegardes/2026-11-11T100000Z.json'), v('sauvegardes/2026-11-10T100000Z.json'), v('sauvegardes/2026-11-09T100000Z.json')] }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.versions.map((x) => x.cle), [COPIE, 'sauvegardes/2026-11-12T100000Z.json', 'sauvegardes/2026-11-11T100000Z.json']);
  assert.equal(r.versions[1].octets, null);
  assert.equal((await listerSauvegardes(R, rep({ versions: 'non' }))).code, 'reponse');
  assert.equal((await listerSauvegardes(R, rep({ erreur: 'stockage' }, 500))).code, 'stockage');
  assert.equal((await listerSauvegardes({ url: R.url, jeton: '' }, rep({}))).code, 'jeton');
});

test('telechargerSauvegarde : le texte tel quel ; clé invalide refusée avant tout appel', async () => {
  let vu;
  const f = async (url) => { vu = url; return new Response('{"sets":[]}'); };
  assert.deepEqual(await telechargerSauvegarde(R, COPIE, f), { ok: true, texte: '{"sets":[]}' });
  assert.equal(vu, `https://relais.example/sauvegarde?v=${encodeURIComponent(COPIE)}`);
  let appels = 0;
  const g = async () => { appels += 1; return new Response('x'); };
  for (const cle of ['../x', 'sauvegardes/x.json', '', null, undefined]) assert.equal((await telechargerSauvegarde(R, cle, g)).code, 'url');
  assert.equal(appels, 0);
  assert.equal((await telechargerSauvegarde(R, COPIE, rep({ erreur: 'vide' }, 404))).code, 'vide');
  assert.match(messageRelais('stockage'), /bucket/);
});
