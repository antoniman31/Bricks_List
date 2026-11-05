import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datePropre, lireBrickset, traiter } from './worker.js';

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
