import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DELAIS_AVANT_ARRET, arretRelais, ecrireRelais, jetonValide, lireRelais, messageRelais, recupererNotices, recupererSortie, urlNoticeSure, urlRelaisValide } from './relais.js';

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
