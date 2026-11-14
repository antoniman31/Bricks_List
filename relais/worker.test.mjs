import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datePropre, libellePropre, lireBrickset, lireNotices, prixPropre, traiter, urlImageValide, urlNoticeValide } from './worker.js';

const ENV = { BRICKSET_KEY: 'cle-secrete-de-test', ORIGINE: 'https://antoniman31.github.io' };
const SUCCES = (sets) => ({ status: 'success', matches: sets.length, sets });
const FALCON = { number: '75192', numberVariant: 1, launchDate: '2017-10-01T00:00:00Z', exitDate: '2023-12-31T00:00:00Z', availability: 'Retired', subtheme: 'Ultimate Collector Series', name: 'Millennium Falcon', pieces: 7541, LEGOCom: { US: { retailPrice: 799.99 }, DE: { retailPrice: 849.99 } } };
const reponseJson = (corps, statut = 200) => new Response(JSON.stringify(corps), { status: statut });
const appel = (chemin, { env = ENV, fetchFn, init } = {}) => traiter(new Request(`https://relais.example${chemin}`, init), env, { fetchFn });

test('datePropre : garde le jour, écarte l\'absurde', () => {
  assert.equal(datePropre('2017-10-01T00:00:00Z'), '2017-10-01');
  assert.equal(datePropre('2027-01-01'), '2027-01-01');
  for (const v of [null, undefined, 20171001, '', 'bientôt', '0001-01-01T00:00:00Z', '2017-13-01', '2017-10-32', '9999-01-01']) assert.equal(datePropre(v), null);
});

test('lireBrickset : un set trouvé donne ses dates, sans rien d\'autre', () => {
  const r = lireBrickset(SUCCES([FALCON]), '75192-1');
  assert.deepEqual(r, { ok: true, valeur: { numero: '75192-1', trouve: true, lancement: '2017-10-01', retrait: '2023-12-31', disponibilite: 'Retired', prixDE: 849.99, sousTheme: 'Ultimate Collector Series' } });
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
  assert.deepEqual(await r.json(), { numero: '75192-1', trouve: true, lancement: '2017-10-01', retrait: '2023-12-31', disponibilite: 'Retired', prixDE: 849.99, sousTheme: 'Ultimate Collector Series' });
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
  assert.deepEqual(await code(async () => imageRep(new Uint8Array(3), 'image/jpeg', { 'Content-Length': String(7 * 1024 * 1024) })), [502, 'taille']);
  // Sans Content-Length fiable : le plafond s'applique à la lecture.
  assert.deepEqual(await code(async () => imageRep(new Uint8Array(6 * 1024 * 1024 + 1))), [502, 'taille']);
  assert.deepEqual(await code(async () => { throw new Error('réseau'); }), [502, 'rebrickable']);
});

test('/image : le jeton s\'applique aussi, et /image fonctionne sans clé Brickset', async () => {
  const fetchFn = async () => imageRep();
  const env = { ORIGINE: ENV.ORIGINE, JETON: 'secret' };
  assert.equal((await appelImage(BONNE, { env, fetchFn })).status, 401);
  assert.equal((await appelImage(BONNE, { env, fetchFn, init: { headers: { 'X-Jeton': 'secret' } } })).status, 200);
});

test('prixPropre : le prix allemand, seulement s\'il est raisonnable ; la lecture ignore les autres régions', () => {
  assert.equal(prixPropre(849.99), 849.99);
  assert.equal(prixPropre(19.999), 20);
  for (const v of [0, -1, 10001, NaN, '849.99', null, undefined, {}]) assert.equal(prixPropre(v), null, String(v));
  const sansDE = lireBrickset(SUCCES([{ ...FALCON, LEGOCom: { US: { retailPrice: 799.99 } } }]), '75192-1').valeur;
  assert.equal(sansDE.prixDE, null);
  assert.equal(lireBrickset(SUCCES([{ ...FALCON, LEGOCom: null }]), '75192-1').valeur.prixDE, null);
  assert.equal(lireBrickset(SUCCES([{ ...FALCON, LEGOCom: { DE: { retailPrice: 'beaucoup' } } }]), '75192-1').valeur.prixDE, null);
  assert.equal(lireBrickset(SUCCES([]), '75192-1').valeur.prixDE, null);
});

test('/image : une image de 3 Mo (refusée avec l\'ancien plafond de 2 Mo) passe', async () => {
  const r = await appelImage(BONNE, { fetchFn: async () => imageRep(new Uint8Array(3 * 1024 * 1024)) });
  assert.equal(r.status, 200);
  assert.equal((await r.arrayBuffer()).byteLength, 3 * 1024 * 1024);
});

test('libellePropre : texte court sans retour à la ligne ; vide reste vide, autre chose est null', () => {
  assert.equal(libellePropre('Ultimate Collector Series'), 'Ultimate Collector Series');
  assert.equal(libellePropre('  Mario\n\tKart  '), 'Mario Kart');
  assert.equal(libellePropre(''), '');
  assert.equal(libellePropre('x'.repeat(200)).length, 60);
  for (const v of [null, undefined, 12, {}, []]) assert.equal(libellePropre(v), null);
});

test('lireBrickset : sous-thème renvoyé, vide si Brickset n\'en a pas, null si le champ manque', () => {
  assert.equal(lireBrickset(SUCCES([FALCON]), '75192-1').valeur.sousTheme, 'Ultimate Collector Series');
  assert.equal(lireBrickset(SUCCES([{ ...FALCON, subtheme: '' }]), '75192-1').valeur.sousTheme, '');
  assert.equal(lireBrickset(SUCCES([{ ...FALCON, subtheme: undefined }]), '75192-1').valeur.sousTheme, null);
  assert.equal(lireBrickset(SUCCES([]), '75192-1').valeur.sousTheme, null);
});

test('urlNoticeValide : https chez LEGO ou Brickset seulement', () => {
  assert.ok(urlNoticeValide('https://www.lego.com/cdn/product-assets/product.bi.core.pdf/6339446.pdf'));
  assert.ok(urlNoticeValide('https://brickset.com/instructions/x.pdf'));
  for (const v of ['http://www.lego.com/a.pdf', 'https://evil.example/a.pdf', 'https://lego.com.evil.example/a.pdf', 'https://user:mdp@www.lego.com/a.pdf', 'https://www.lego.com:8443/a.pdf', 'javascript:alert(1)', '', null, 42, `https://www.lego.com/${'a'.repeat(400)}`]) assert.equal(urlNoticeValide(v), null, String(v));
});

test('lireNotices : garde les bonnes adresses, sans doublon, avec une description courte', () => {
  const ok = { status: 'success', matches: 3, instructions: [
    { URL: 'https://www.lego.com/a.pdf', description: 'Notice 1' },
    { URL: 'https://www.lego.com/a.pdf', description: 'doublon' },
    { URL: 'https://evil.example/b.pdf', description: 'refusée' },
    { url: 'https://www.lego.com/c.pdf' },
  ] };
  assert.deepEqual(lireNotices(ok, '75192-1'), { ok: true, valeur: { numero: '75192-1', trouve: true, notices: [{ url: 'https://www.lego.com/a.pdf', description: 'Notice 1' }, { url: 'https://www.lego.com/c.pdf', description: '' }] } });
  assert.deepEqual(lireNotices({ status: 'success', instructions: [] }, 'x').valeur, { numero: 'x', trouve: false, notices: [] });
  assert.equal(lireNotices({ status: 'error', message: 'API limit exceeded' }, 'x').code, 'limite');
  for (const v of [null, 'texte', 42]) assert.equal(lireNotices(v, 'x').ok, false);
  const beaucoup = { status: 'success', instructions: Array.from({ length: 50 }, (_, i) => ({ URL: `https://www.lego.com/${i}.pdf` })) };
  assert.equal(lireNotices(beaucoup, 'x').valeur.notices.length, 12);
});

test('/notices : appelle getInstructions2 avec la clé en corps de formulaire, mêmes protections que /sortie', async () => {
  let vu;
  const fetchFn = async (url, init) => { vu = { url, init }; return reponseJson({ status: 'success', instructions: [{ URL: 'https://www.lego.com/a.pdf', description: 'Notice 1' }] }); };
  const r = await appel('/notices?numero=75192-1', { fetchFn });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { numero: '75192-1', trouve: true, notices: [{ url: 'https://www.lego.com/a.pdf', description: 'Notice 1' }] });
  assert.equal(vu.url, 'https://brickset.com/api/v3.asmx/getInstructions2');
  const corps = new URLSearchParams(vu.init.body);
  assert.equal(corps.get('apiKey'), 'cle-secrete-de-test');
  assert.equal(corps.get('setNumber'), '75192-1');
  assert.ok(!vu.url.includes('cle-secrete'));
  assert.equal((await appel('/notices?numero=abc', { fetchFn })).status, 400);
  assert.equal((await appel('/notices?numero=75192-1', { fetchFn, env: { ORIGINE: ENV.ORIGINE } })).status, 500);
  assert.equal((await appel('/notices?numero=75192-1', { fetchFn, env: { ...ENV, JETON: 'secret-jeton-123' } })).status, 401);
  assert.equal((await appel('/notices?numero=75192-1', { fetchFn, init: { method: 'POST' } })).status, 405);
  assert.equal((await appel('/notices?numero=75192-1', { fetchFn: async () => reponseJson({ status: 'error', message: 'API limit exceeded' }) })).status, 429);
});
