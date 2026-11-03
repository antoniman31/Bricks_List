import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appeler, ErreurRebrickable } from './api.js';

const reponse = (status, corps, entetes = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (k) => entetes[k] ?? null },
  json: async () => { if (corps === undefined) throw new Error('pas du json'); return corps; },
});
const sansAttente = () => Promise.resolve();

test('envoie la clé dans l\'en-tête Authorization', async () => {
  let vu;
  const fetcher = async (url, opts) => { vu = { url, opts }; return reponse(200, { ok: 1 }); };
  assert.deepEqual(await appeler('/sets/75192-1/', 'ABCDEF123456', { fetcher }), { ok: 1 });
  assert.equal(vu.url, 'https://rebrickable.com/api/v3/lego/sets/75192-1/');
  assert.equal(vu.opts.headers.Authorization, 'key ABCDEF123456');
});

const code = async (promesse) => { try { await promesse; } catch (e) { return e instanceof ErreurRebrickable ? e.code : 'autre'; } return null; };

test('401 et 403 : clé refusée', async () => {
  for (const s of [401, 403]) assert.equal(await code(appeler('/x', 'k', { fetcher: async () => reponse(s, {}) })), 'cle');
});
test('404 : introuvable', async () => {
  assert.equal(await code(appeler('/x', 'k', { fetcher: async () => reponse(404, {}) })), 'introuvable');
});
test('500 : erreur serveur', async () => {
  assert.equal(await code(appeler('/x', 'k', { fetcher: async () => reponse(500, {}) })), 'serveur');
});
test('réseau coupé', async () => {
  assert.equal(await code(appeler('/x', 'k', { fetcher: async () => { throw new TypeError('Failed to fetch'); } })), 'reseau');
});
test('corps qui n\'est pas du JSON', async () => {
  assert.equal(await code(appeler('/x', 'k', { fetcher: async () => reponse(200, undefined) })), 'reponse');
});

test('un 429 est retenté une fois après l\'attente demandée', async () => {
  const appels = [];
  const attentes = [];
  const fetcher = async () => { appels.push(1); return appels.length === 1 ? reponse(429, {}, { 'Retry-After': '2' }) : reponse(200, { ok: true }); };
  const r = await appeler('/x', 'k', { fetcher, attendre: async (ms) => { attentes.push(ms); } });
  assert.deepEqual(r, { ok: true });
  assert.equal(appels.length, 2);
  assert.deepEqual(attentes, [2000]);
});

test('l\'attente est plafonnée', async () => {
  const attentes = [];
  const fetcher = async () => attentes.length === 0 ? reponse(429, {}, { 'Retry-After': '120' }) : reponse(200, {});
  await appeler('/x', 'k', { fetcher, attendre: async (ms) => { attentes.push(ms); } });
  assert.deepEqual(attentes, [3000]);
});

test('deux 429 de suite : limite atteinte, pas de boucle', async () => {
  let n = 0;
  const fetcher = async () => { n += 1; return reponse(429, {}); };
  assert.equal(await code(appeler('/x', 'k', { fetcher, attendre: sansAttente })), 'limite');
  assert.equal(n, 2);
});
