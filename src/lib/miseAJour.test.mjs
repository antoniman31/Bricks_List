import { test } from 'node:test';
import assert from 'node:assert/strict';
import { surveillerMisesAJour, pageObsolete } from './miseAJour.js';

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
