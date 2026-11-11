import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datePropre, lireBrickset, traiter, urlImageValide } from './worker.js';

const ENV = { BRICKSET_KEY: 'cle-secrete-de-test', ORIGINE: 'https://antoniman31.github.io' };
const SUCCES = (sets) => ({ status: 'success', matches: sets.length, sets });
const FALCON = { number: '75192', numberVariant: 1, launchDate: '2017-10-01T00:00:00Z', exitDate: '2023-12-31T00:00:00Z', availability: 'Retired', name: 'Millennium Falcon', pieces: 7541 };
const reponseJson = (corps, statut = 200) => new Response(JSON.stringify(corps), { status: statut });
const appel = (chemin, { env = ENV, fetchFn, init } = {}) => traiter(new Request(`https://relais.example${chemin}`, init), env, { fetchFn });

test('datePropre : garde le jour, écarte l\'absurde', () => {
  assert.equal(datePropre('2017-10-01T00:00:00Z'), '2017-10-01');
  assert.equal(datePropre('2027-01-01'), '2027-01-01');
  for (const v of [null, undefined, 20171001, '', 'bientôt', '0001-01-01T00:00:00Z', '2017-13-01', '2017-10-32', '9999-01-01']) assert.equal(datePropre(v), null);
});

test('lireBrickset : un set trouvé donne ses dates, sans rien d\'autre', () => {
  const r = lireBrickset(SUCCES([FALCON]), '75192-1');
  assert.deepEqual(r, { ok: true, valeur: { numero: '75192-1', trouve: true, lancement: '2017-10-01', retrait: '2023-12-31', disponibilite: 'Retired' } });
  assert.ok(!('pieces' in r.valeur) && !('name' in r.valeur));
});

test('lireBrickset : set introuvable, dates absentes ou autre numéro renvoyé', () => {
  assert.equal(lireBrickset(SUCCES([]), '75192-1').valeur.trouve, false);
  assert.equal(lireBrickset(SUCCES([{ ...FALCON, number: '10294' }]), '75192-1').valeur.trouve, false);
  const sans = lireBrickset(SUCCES([{ number: '99999', numberVariant: 1 }]), '99999-1').valeur;
  assert.deepEqual([sans.trouve, sans.lancement, sans.retrait], [true, null, null]);
});

test('lireBrickset : les erreurs deviennent des codes courts, jamais le texte de Brickset', () => {
  assert.deepEqual(lireBrickset({ status: 'error', message: 'API limit exceeded' }, 'x'), { ok: false, statut: 429, code: 'limite' });
  assert.deepEqual(lireBrickset({ status: 'error', message: 'Invalid key' }, 'x'), { ok: false, statut: 502, code: 'cle' });
  assert.deepEqual(lireBrickset({ status: 'error', message: 'autre chose' }, 'x'), { ok: false, statut: 502, code: 'brickset' });
  for (const v of [null, 'texte', 42, {}, { status: 'bizarre' }]) assert.equal(lireBrickset(v, 'x').ok, false);
});

test('appel nominal : Brickset reçoit la clé en corps de formulaire, la réponse ne la contient pas', async () => {
  let vu;
  const fetchFn = async (url, init) => { vu = { url, init }; return reponseJson(SUCCES([FALCON])); };
  const r = await appel('/sortie?numero=75192-1', { fetchFn });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { numero: '75192-1', trouve: true, lancement: '2017-10-01', retrait: '2023-12-31', disponibilite: 'Retired' });
  assert.equal(vu.url, 'https://brickset.com/api/v3.asmx/getSets');
  assert.equal(vu.init.method, 'POST');
  const corps = new URLSearchParams(vu.init.body);
  assert.equal(corps.get('apiKey'), 'cle-secrete-de-test');
  assert.equal(JSON.parse(corps.get('params')).setNumber, '75192-1');
  assert.ok(!vu.url.includes('cle-secrete'), 'la clé ne doit pas être dans l\'adresse');
  assert.ok(!JSON.stringify([...r.headers]).includes('cle-secrete'));
});

test('numéro invalide : refusé sans appeler Brickset', async () => {
  let appels = 0;
  const fetchFn = async () => { appels += 1; return reponseJson(SUCCES([])); };
  for (const q of ['', '?numero=', '?numero=abc', '?numero=75192', '?numero=75192-1;DROP', '?numero=../x', '?numero=75192-1,10294-1']) {
    const r = await appel(`/sortie${q}`, { fetchFn });
    assert.equal(r.status, 400, q);
  }
  assert.equal(appels, 0);
});

test('méthode, chemin et configuration', async () => {
  const fetchFn = async () => reponseJson(SUCCES([FALCON]));
  assert.equal((await appel('/sortie?numero=75192-1', { fetchFn, init: { method: 'POST' } })).status, 405);
  assert.equal((await appel('/autre', { fetchFn })).status, 404);
  assert.equal((await appel('/sortie?numero=75192-1', { fetchFn, env: { ORIGINE: ENV.ORIGINE } })).status, 500);
});

test('configuration : sans clé, le relais cite les noms voisins (jamais les valeurs) pour repérer une faute de frappe', async () => {
  const fetchFn = async () => reponseJson(SUCCES([FALCON]));
  const jeton = { headers: { 'X-Jeton': 'secret-jeton-123' } };
  const sans = await appel('/sortie?numero=75192-1', { fetchFn, env: { ORIGINE: ENV.ORIGINE, JETON: 'secret-jeton-123' }, init: jeton });
  assert.deepEqual(await sans.json(), { erreur: 'configuration' });
  const faute = await appel('/sortie?numero=75192-1', { fetchFn, env: { BRICKSET_API_KEY: 'valeur-secrete-xyz', ' BRICKSET_KEY': 'autre-secrete-abc', JETON: 'secret-jeton-123' }, init: jeton });
  const corps = await faute.json();
  assert.equal(faute.status, 500);
  assert.deepEqual(corps.proches, ['BRICKSET_API_KEY', ' BRICKSET_KEY']);
  const brut = JSON.stringify(corps);
  assert.ok(!brut.includes('valeur-secrete') && !brut.includes('autre-secrete') && !brut.includes('secret-jeton'), 'aucune valeur ne doit sortir');
});

test('jeton facultatif : exigé seulement s\'il est défini', async () => {
  const fetchFn = async () => reponseJson(SUCCES([FALCON]));
  const env = { ...ENV, JETON: 'abc' };
  assert.equal((await appel('/sortie?numero=75192-1', { fetchFn, env })).status, 401);
  assert.equal((await appel('/sortie?numero=75192-1', { fetchFn, env, init: { headers: { 'X-Jeton': 'faux' } } })).status, 401);
  assert.equal((await appel('/sortie?numero=75192-1', { fetchFn, env, init: { headers: { 'X-Jeton': 'abc' } } })).status, 200);
  assert.equal((await appel('/sortie?numero=75192-1', { fetchFn })).status, 200);
});

test('CORS : accordé au site listé seulement, préparation (OPTIONS) comprise', async () => {
  const fetchFn = async () => reponseJson(SUCCES([FALCON]));
  const bon = await appel('/sortie?numero=75192-1', { fetchFn, init: { headers: { Origin: 'https://antoniman31.github.io' } } });
  assert.equal(bon.headers.get('Access-Control-Allow-Origin'), 'https://antoniman31.github.io');
  const mauvais = await appel('/sortie?numero=75192-1', { fetchFn, init: { headers: { Origin: 'https://autre.example' } } });
  assert.equal(mauvais.headers.get('Access-Control-Allow-Origin'), null);
  const sans = await appel('/sortie?numero=75192-1', { fetchFn });
  assert.equal(sans.headers.get('Access-Control-Allow-Origin'), null);
  const pre = await appel('/sortie', { fetchFn, init: { method: 'OPTIONS', headers: { Origin: 'https://antoniman31.github.io' } } });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), 'https://antoniman31.github.io');
  const plusieurs = await appel('/sortie?numero=75192-1', { fetchFn, env: { ...ENV, ORIGINE: 'https://a.example, http://localhost:5173' }, init: { headers: { Origin: 'http://localhost:5173' } } });
  assert.equal(plusieurs.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5173');
});

test('pannes de Brickset : codes courts, pas de plantage', async () => {
  const q = '/sortie?numero=75192-1';
  assert.deepEqual(await (await appel(q, { fetchFn: async () => reponseJson({ status: 'error', message: 'API limit exceeded' }) })).json(), { erreur: 'limite' });
  assert.equal((await appel(q, { fetchFn: async () => reponseJson({ status: 'error', message: 'API limit exceeded' }) })).status, 429);
  assert.equal((await appel(q, { fetchFn: async () => reponseJson({}, 500) })).status, 502);
  assert.equal((await appel(q, { fetchFn: async () => new Response('<html>', { status: 200 }) })).status, 502);
  assert.equal((await appel(q, { fetchFn: async () => { throw new TypeError('réseau'); } })).status, 502);
  const delai = await appel(q, { fetchFn: async () => { throw Object.assign(new Error('t'), { name: 'TimeoutError' }); } });
  assert.deepEqual([delai.status, (await delai.json()).erreur], [504, 'delai']);
});

// --- /image : proxy étroit pour les rendus Rebrickable ---
const BONNE = 'https://cdn.rebrickable.com/media/sets/75192-1.jpg';
const imageRep = (octets = new Uint8Array([1, 2, 3]), type = 'image/jpeg', extra = {}) => new Response(octets, { status: 200, headers: { 'Content-Type': type, ...extra } });
const appelImage = (url, opts = {}) => appel(`/image?url=${encodeURIComponent(url)}`, opts);

test('urlImageValide : seulement les rendus de sets du CDN Rebrickable, en https', () => {
  assert.equal(urlImageValide(BONNE), BONNE);
  assert.equal(urlImageValide('https://cdn.rebrickable.com/media/sets/75192-1/12345.jpg'), 'https://cdn.rebrickable.com/media/sets/75192-1/12345.jpg');
  for (const v of [
    'http://cdn.rebrickable.com/media/sets/75192-1.jpg',
    'https://rebrickable.com/media/sets/75192-1.jpg',
    'https://cdn.rebrickable.com.evil.test/media/sets/75192-1.jpg',
    'https://cdn.rebrickable.com@evil.test/media/sets/75192-1.jpg',
    'https://user@cdn.rebrickable.com/media/sets/75192-1.jpg',
    'https://cdn.rebrickable.com:8443/media/sets/75192-1.jpg',
    'https://cdn.rebrickable.com/media/parts/3001.jpg',
    'https://cdn.rebrickable.com/media/sets/../parts/3001.jpg',
    'https://cdn.rebrickable.com/media/sets/75192-1.jpg?x=1',
    'https://cdn.rebrickable.com/media/sets/75192-1.svg',
    'https://cdn.rebrickable.com/media/sets//75192-1.jpg',
    '', 'pas une url', null, undefined,
  ]) assert.equal(urlImageValide(v), null, String(v));
});

test('/image : renvoie les octets avec le type image et l\'autorisation CORS du site', async () => {
  let vu;
  const fetchFn = async (url, init) => { vu = { url, init }; return imageRep(new Uint8Array([9, 8, 7])); };
  const r = await appelImage(BONNE, { fetchFn, init: { headers: { Origin: 'https://antoniman31.github.io' } } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Content-Type'), 'image/jpeg');
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://antoniman31.github.io');
  assert.deepEqual([...new Uint8Array(await r.arrayBuffer())], [9, 8, 7]);
  assert.equal(vu.url, BONNE);
  assert.equal(vu.init.redirect, 'manual');
});

test('/image : une adresse hors liste blanche ne déclenche aucun appel sortant', async () => {
  let appels = 0;
  const fetchFn = async () => { appels += 1; return imageRep(); };
  for (const u of ['https://evil.test/a.jpg', 'http://cdn.rebrickable.com/media/sets/1-1.jpg', 'http://169.254.169.254/media/sets/1-1.jpg']) {
    const r = await appelImage(u, { fetchFn });
    assert.equal(r.status, 400);
    assert.deepEqual(await r.json(), { erreur: 'url' });
  }
  assert.equal((await appel('/image', { fetchFn })).status, 400);
  assert.equal(appels, 0);
});

test('/image : refuse un type qui n\'est pas une image, une redirection, une image trop grosse', async () => {
  const code = async (fetchFn) => { const r = await appelImage(BONNE, { fetchFn }); return [r.status, (await r.json()).erreur]; };
  assert.deepEqual(await code(async () => imageRep(new Uint8Array(3), 'text/html')), [502, 'type']);
  assert.deepEqual(await code(async () => imageRep(new Uint8Array(3), 'image/svg+xml')), [502, 'type']);
  assert.deepEqual(await code(async () => new Response(null, { status: 302, headers: { Location: 'https://evil.test/x.jpg' } })), [502, 'rebrickable']);
  assert.deepEqual(await code(async () => new Response('', { status: 404 })), [404, 'absente']);
  assert.deepEqual(await code(async () => imageRep(new Uint8Array(3), 'image/jpeg', { 'Content-Length': String(3 * 1024 * 1024) })), [502, 'taille']);
  // Sans Content-Length fiable : le plafond s'applique à la lecture.
  assert.deepEqual(await code(async () => imageRep(new Uint8Array(2 * 1024 * 1024 + 1))), [502, 'taille']);
  assert.deepEqual(await code(async () => { throw new Error('réseau'); }), [502, 'rebrickable']);
});

test('/image : le jeton s\'applique aussi, et /image fonctionne sans clé Brickset', async () => {
  const fetchFn = async () => imageRep();
  const env = { ORIGINE: ENV.ORIGINE, JETON: 'secret' };
  assert.equal((await appelImage(BONNE, { env, fetchFn })).status, 401);
  assert.equal((await appelImage(BONNE, { env, fetchFn, init: { headers: { 'X-Jeton': 'secret' } } })).status, 200);
});
