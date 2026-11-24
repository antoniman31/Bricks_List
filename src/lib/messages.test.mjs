// Un message d'erreur dit ce qui s'est passé ET comment corriger (règle commune « Design », revue du 24/11/2026).
//
// Pourquoi : la revue a trouvé des messages qui s'arrêtaient au constat (« Écriture impossible. », « Date invalide. »,
// « Pas de réseau. »). La forme retenue est « constat : action », une phrase. Ce test vérifie la forme sur chaque
// message que l'appli affiche tel quel ; il ne juge pas le sens, qui se relit dans la PR.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STOCKAGE_BLOQUE, STOCKAGE_PLEIN, ECRITURE_IMPOSSIBLE } from './messages.js';
import { ecrireCle } from './reglages.js';
import { ecrireRelais, messageRelais } from './relais.js';
import { noterSauvegarde } from './sauvegarde.js';
import { noterEnvoi } from './sauvegardeEnLigne.js';
import { sauver, charger } from './storage.js';
import { MESSAGES, messageErreur } from './rebrickable.js';
import { changementsOptionnels } from './champsOptionnels.js';

const ACTION = /\S : \S/;
const ditQuoiFaire = (quoi, m) => assert.match(m ?? '', ACTION, `${quoi} : « ${m} » ne dit pas quoi faire`);

const plein = { getItem: () => null, setItem: () => { throw Object.assign(new Error('x'), { name: 'QuotaExceededError' }); }, removeItem() {} };
const casse = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } };

test('les trois messages de stockage disent quoi faire', () => {
  for (const [nom, m] of Object.entries({ STOCKAGE_BLOQUE, STOCKAGE_PLEIN, ECRITURE_IMPOSSIBLE })) ditQuoiFaire(nom, m);
});

test("chaque écriture dans le stockage qui échoue dit quoi faire", () => {
  ditQuoiFaire('clé Rebrickable', ecrireCle('abc', casse).erreur);
  ditQuoiFaire('relais', ecrireRelais({ url: 'https://exemple.org', jeton: '' }, casse).erreur);
  ditQuoiFaire('date de sauvegarde', noterSauvegarde(new Date(), casse).erreur);
  ditQuoiFaire("date d'envoi", noterEnvoi(new Date(), casse).erreur);
  ditQuoiFaire('collection, stockage plein', sauver([], plein).erreur);
  ditQuoiFaire('collection, écriture refusée', sauver([], casse).erreur);
  ditQuoiFaire('collection, lecture refusée', charger(casse).erreur);
});

test('les erreurs de Rebrickable et du relais que l\'appli affiche seules disent quoi faire', () => {
  for (const c of ['cle', 'introuvable', 'limite', 'reseau', 'reponse', 'serveur']) ditQuoiFaire(`rebrickable.${c}`, MESSAGES[c]);
  ditQuoiFaire('rebrickable, erreur inconnue', messageErreur(new Error('x')));
  for (const c of ['cle', 'limite', 'jeton', 'delai', 'numero', 'reseau', 'brickset', 'reponse', 'rebrickable', 'inconnu'])
    ditQuoiFaire(`relais.${c}`, messageRelais(c));
});

test('une date refusée dit quelle date est acceptée', () => {
  const vide = { prix: '', dateSortie: '', dateRetrait: '' };
  ditQuoiFaire('date de sortie', changementsOptionnels(vide, { ...vide, dateSortie: '1900-01-01' }, false).erreur);
  ditQuoiFaire('date de retrait', changementsOptionnels(vide, { ...vide, dateRetrait: '1900-01-01' }, false).erreur);
});

test('le contrôle voit un message sans action', () => {
  // Le contrôle du contrôle : sans lui, une expression trop large donnerait du vert partout.
  assert.doesNotMatch('Écriture impossible.', ACTION);
  assert.doesNotMatch('Erreur: 404', ACTION);
  assert.match('Stockage plein : libère de la place.', ACTION);
});
