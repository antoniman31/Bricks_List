import { test } from 'node:test';
import assert from 'node:assert/strict';
import { surveillerMisesAJour, pageObsolete, verifierMiseAJour } from './miseAJour.js';

// Faux service worker : un EventTarget avec un `controller` et un `ready` dont `update` est espionné.
function fauxSw({ controller = null, updateRefuse = false } = {}) {
  const sw = new EventTarget();
  sw.controller = controller;
  sw.appels = 0;
  sw.ready = Promise.resolve({ update: async () => { sw.appels += 1; if (updateRefuse) throw new Error('hors ligne'); } });
  return sw;
}
function fauxDoc(etat = 'visible') {
  const d = new EventTarget();
  d.visibilityState = etat;
  return d;
}
const attendre = () => new Promise((r) => setTimeout(r, 0));

const toujoursObsolete = async () => true;

test('un nouveau worker qui prend la main prévient la page, s\'il y en avait déjà un', async () => {
  const sw = fauxSw({ controller: {} });
  let appels = 0;
  surveillerMisesAJour({ quandPrete: () => { appels += 1; }, sw, doc: fauxDoc(), verifier: toujoursObsolete });
  sw.dispatchEvent(new Event('controllerchange'));
  await attendre();
  assert.equal(appels, 1);
});

test('pas d\'annonce si la page affichée est déjà la dernière version', async () => {
  const sw = fauxSw({ controller: {} });
  let appels = 0;
  surveillerMisesAJour({ quandPrete: () => { appels += 1; }, sw, doc: fauxDoc(), verifier: async () => false });
  sw.dispatchEvent(new Event('controllerchange'));
  await attendre();
  assert.equal(appels, 0);
});

test('la toute première installation n\'annonce rien', async () => {
  const sw = fauxSw({ controller: null });
  let appels = 0;
  surveillerMisesAJour({ quandPrete: () => { appels += 1; }, sw, doc: fauxDoc(), verifier: toujoursObsolete });
  sw.dispatchEvent(new Event('controllerchange'));
  await attendre();
  assert.equal(appels, 0);
});

test('au retour au premier plan, on cherche une mise à jour', async () => {
  const sw = fauxSw({ controller: {} });
  const doc = fauxDoc('visible');
  surveillerMisesAJour({ quandPrete: () => {}, sw, doc });
  doc.dispatchEvent(new Event('visibilitychange'));
  await attendre();
  assert.equal(sw.appels, 1);
});

test('en passant en arrière-plan, on ne cherche rien', async () => {
  const sw = fauxSw({ controller: {} });
  const doc = fauxDoc('hidden');
  surveillerMisesAJour({ quandPrete: () => {}, sw, doc });
  doc.dispatchEvent(new Event('visibilitychange'));
  await attendre();
  assert.equal(sw.appels, 0);
});

test('au plus une recherche par minute', async () => {
  const sw = fauxSw({ controller: {} });
  const doc = fauxDoc('visible');
  let t = 1_000_000;
  surveillerMisesAJour({ quandPrete: () => {}, sw, doc, maintenant: () => t });
  doc.dispatchEvent(new Event('visibilitychange')); await attendre();
  t += 30_000;
  doc.dispatchEvent(new Event('visibilitychange')); await attendre();
  assert.equal(sw.appels, 1);
  t += 31_000;
  doc.dispatchEvent(new Event('visibilitychange')); await attendre();
  assert.equal(sw.appels, 2);
});

test('hors ligne : la vérification échoue en silence', async () => {
  const sw = fauxSw({ controller: {}, updateRefuse: true });
  const doc = fauxDoc('visible');
  surveillerMisesAJour({ quandPrete: () => {}, sw, doc });
  doc.dispatchEvent(new Event('visibilitychange'));
  await attendre();
  assert.equal(sw.appels, 1);
});

test('sans service worker (navigateur qui n\'en a pas) : rien ne plante, rien ne s\'écoute', () => {
  const arret = surveillerMisesAJour({ quandPrete: () => {}, sw: undefined, doc: fauxDoc() });
  assert.equal(typeof arret, 'function');
  assert.doesNotThrow(arret);
});

test('la fonction rendue arrête la surveillance', async () => {
  const sw = fauxSw({ controller: {} });
  const doc = fauxDoc('visible');
  let appels = 0;
  const arret = surveillerMisesAJour({ quandPrete: () => { appels += 1; }, sw, doc });
  arret();
  sw.dispatchEvent(new Event('controllerchange'));
  doc.dispatchEvent(new Event('visibilitychange'));
  await attendre();
  assert.equal(appels, 0);
  assert.equal(sw.appels, 0);
});

// ---------- pageObsolete : comparaison du fichier de code chargé et de celui du serveur ----------
const docAvec = (src) => ({ querySelector: () => ({ getAttribute: () => src }) });
const serveurAvec = (html, ok = true) => async () => { if (!ok) throw new Error('hors ligne'); return { text: async () => html }; };

test('pageObsolete : même fichier de code chez le serveur et dans la page = à jour', async () => {
  const r = await pageObsolete({ doc: docAvec('/Bricks_List/assets/index-AAA.js'), chercher: serveurAvec('<script src="/Bricks_List/assets/index-AAA.js">'), adresse: '/Bricks_List/' });
  assert.equal(r, false);
});

test('pageObsolete : un autre nom chez le serveur = nouvelle version', async () => {
  const r = await pageObsolete({ doc: docAvec('/Bricks_List/assets/index-AAA.js'), chercher: serveurAvec('<script src="/Bricks_List/assets/index-BBB.js">'), adresse: '/Bricks_List/' });
  assert.equal(r, true);
});

test('pageObsolete : serveur illisible ou réponse sans fichier de code = on propose le rechargement', async () => {
  assert.equal(await pageObsolete({ doc: docAvec('/Bricks_List/assets/index-AAA.js'), chercher: serveurAvec('', false), adresse: '/' }), true);
  assert.equal(await pageObsolete({ doc: docAvec('/Bricks_List/assets/index-AAA.js'), chercher: serveurAvec('<html>rien</html>'), adresse: '/' }), false);
  assert.equal(await pageObsolete({ doc: { querySelector: () => null }, chercher: serveurAvec('x'), adresse: '/' }), true);
});

// ---------- verifierMiseAJour : le bouton « Vérifier les mises à jour » ----------
const reponseOk = (html) => async () => ({ ok: true, text: async () => html });
const swAvec = (update) => ({ getRegistration: async () => ({ update }) });

test('verifierMiseAJour : même fichier de code = à jour, et on demande un nouveau worker', async () => {
  let maj = 0;
  const r = await verifierMiseAJour({ sw: swAvec(async () => { maj += 1; }), doc: docAvec('/B/assets/index-AAA.js'), chercher: reponseOk('<script src="/B/assets/index-AAA.js">'), adresse: '/B/' });
  assert.equal(r, 'a-jour');
  assert.equal(maj, 1);
});

test('verifierMiseAJour : un autre fichier de code chez le serveur = nouvelle version', async () => {
  const r = await verifierMiseAJour({ sw: swAvec(async () => {}), doc: docAvec('/B/assets/index-AAA.js'), chercher: reponseOk('<script src="/B/assets/index-BBB.js">'), adresse: '/B/' });
  assert.equal(r, 'obsolete');
});

test('verifierMiseAJour : réseau coupé ou worker qui refuse = hors ligne, pas « à jour »', async () => {
  const coupe = async () => { throw new TypeError('Failed to fetch'); };
  assert.equal(await verifierMiseAJour({ sw: swAvec(async () => {}), doc: docAvec('/B/assets/index-AAA.js'), chercher: coupe, adresse: '/B/' }), 'hors-ligne');
  assert.equal(await verifierMiseAJour({ sw: swAvec(coupe), doc: docAvec('/B/assets/index-AAA.js'), chercher: reponseOk('<script src="/B/assets/index-AAA.js">'), adresse: '/B/' }), 'hors-ligne');
});

test('verifierMiseAJour : réponse en erreur (404, 500) = hors ligne', async () => {
  const erreur = async () => ({ ok: false, text: async () => 'erreur' });
  assert.equal(await verifierMiseAJour({ sw: swAvec(async () => {}), doc: docAvec('/B/assets/index-AAA.js'), chercher: erreur, adresse: '/B/' }), 'hors-ligne');
});

test('verifierMiseAJour : rien à comparer (mode développement) = inconnu', async () => {
  assert.equal(await verifierMiseAJour({ sw: swAvec(async () => {}), doc: { querySelector: () => null }, chercher: reponseOk('<script src="/B/assets/index-AAA.js">'), adresse: '/B/' }), 'inconnu');
  assert.equal(await verifierMiseAJour({ sw: swAvec(async () => {}), doc: docAvec('/B/assets/index-AAA.js'), chercher: reponseOk('<html>rien</html>'), adresse: '/B/' }), 'inconnu');
});

test('verifierMiseAJour : sans service worker, on compare quand même la page', async () => {
  const r = await verifierMiseAJour({ sw: undefined, doc: docAvec('/B/assets/index-AAA.js'), chercher: reponseOk('<script src="/B/assets/index-BBB.js">'), adresse: '/B/' });
  assert.equal(r, 'obsolete');
});
