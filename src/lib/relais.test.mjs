import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ecrireRelais, jetonValide, lireRelais, messageRelais, recupererSortie, urlRelaisValide } from './relais.js';

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
  assert.deepEqual(await recupererSortie(RELAIS, '72051-1', fetchFn), { ok: true, trouve: true, lancement: '2027-03-01' });
  assert.equal(vu.url, 'https://bricks-relais.exemple.workers.dev/sortie?numero=72051-1');
  assert.deepEqual(vu.init.headers, {});
  await recupererSortie({ ...RELAIS, jeton: 'abcdefgh12' }, '72051-1', fetchFn);
  assert.deepEqual(vu.init.headers, { 'X-Jeton': 'abcdefgh12' });
});

test('recupererSortie : pas de date chez Brickset, ou date absurde, donne lancement null', async () => {
  assert.deepEqual(await recupererSortie(RELAIS, '72051-1', async () => json({ trouve: true, lancement: null })), { ok: true, trouve: true, lancement: null });
  assert.deepEqual(await recupererSortie(RELAIS, '72051-1', async () => json({ trouve: false, lancement: null })), { ok: true, trouve: false, lancement: null });
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
