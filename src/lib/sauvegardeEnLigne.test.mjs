import { test } from 'node:test';
import assert from 'node:assert/strict';
import { envoiAutoDu, etatEnLigne, libelleCopie, lireDernierEnvoi, noterEnvoi, resumeEnLigne } from './sauvegardeEnLigne.js';

const faux = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
};
const MAINTENANT = new Date('2026-11-14T12:00:00Z');

test('le dernier envoi : noté puis relu ; illisible ou dans le futur vaut « jamais »', () => {
  const s = faux();
  assert.equal(lireDernierEnvoi(s, MAINTENANT), null);
  assert.equal(noterEnvoi(MAINTENANT, s).ok, true);
  assert.equal(lireDernierEnvoi(s, MAINTENANT), '2026-11-14T12:00:00.000Z');
  assert.equal(lireDernierEnvoi(faux({ bl_derniere_copie_en_ligne: 'bientôt' }), MAINTENANT), null);
  assert.equal(lireDernierEnvoi(faux({ bl_derniere_copie_en_ligne: '2030-01-01T00:00:00Z' }), MAINTENANT), null);
  const casse = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
  assert.equal(lireDernierEnvoi(casse, MAINTENANT), null);
  assert.equal(noterEnvoi(MAINTENANT, casse).ok, false);
});

test('libelleCopie : date, heure et taille ; rien si la date est illisible', () => {
  assert.match(libelleCopie('2026-11-14T14:30:00.000Z', 4_200_000), /2026 à \d{2}:\d{2} · /);
  assert.doesNotMatch(libelleCopie('2026-11-14T14:30:00.000Z', null), /·/);
  assert.equal(libelleCopie('n\'importe quoi', 10), '');
});

test('etatEnLigne : ce qui manque d\'abord, puis la date de la dernière copie', () => {
  const ok = { url: 'https://r.example', jeton: 'abcdefgh' };
  assert.match(etatEnLigne({ relais: { url: '', jeton: '' }, dernier: null }), /adresse/);
  assert.match(etatEnLigne({ relais: { url: ok.url, jeton: '' }, dernier: null }), /jeton/);
  assert.match(etatEnLigne({ relais: ok, dernier: null }), /Aucune copie/);
  assert.match(etatEnLigne({ relais: ok, dernier: '2026-11-14T08:00:00Z', maintenant: MAINTENANT }), /aujourd'hui/);
  assert.match(etatEnLigne({ relais: ok, dernier: '2026-11-11T08:00:00Z', maintenant: MAINTENANT }), /il y a 3 jours/);
});

test('resumeEnLigne : relais à compléter, aucune copie, ou le délai', () => {
  const ok = { url: 'https://r.example', jeton: 'abcdefgh' };
  assert.equal(resumeEnLigne({ relais: { url: ok.url, jeton: '' }, dernier: null }), 'Relais à compléter');
  assert.equal(resumeEnLigne({ relais: ok, dernier: null }), 'Aucune copie');
  assert.equal(resumeEnLigne({ relais: ok, dernier: '2026-11-14T08:00:00Z', maintenant: MAINTENANT }), 'Envoyée aujourd\'hui');
  assert.equal(resumeEnLigne({ relais: ok, dernier: '2026-11-13T08:00:00Z', maintenant: MAINTENANT }), 'Envoyée hier');
});

test('envoiAutoDu : une copie part après 7 jours, ou si aucune n\'est jamais partie', () => {
  const relais = { url: 'https://relais.example.workers.dev', jeton: 'j' };
  const maintenant = new Date('2026-11-16T10:00:00Z');
  const base = { relais, nbSets: 54, lectureSeule: false, enLigne: true, maintenant };
  assert.equal(envoiAutoDu({ ...base, dernier: null }), true);
  assert.equal(envoiAutoDu({ ...base, dernier: 'pas une date' }), true);
  assert.equal(envoiAutoDu({ ...base, dernier: '2026-11-09T10:00:00Z' }), true, 'pile 7 jours');
  assert.equal(envoiAutoDu({ ...base, dernier: '2026-11-09T10:00:01Z' }), false, 'une seconde de moins');
  assert.equal(envoiAutoDu({ ...base, dernier: '2026-11-15T10:00:00Z' }), false);
});

test('envoiAutoDu : jamais sans relais complet, hors ligne, collection vide ou illisible', () => {
  const relais = { url: 'https://relais.example.workers.dev', jeton: 'j' };
  const base = { relais, nbSets: 54, lectureSeule: false, enLigne: true, dernier: null };
  assert.equal(envoiAutoDu({ ...base, relais: { url: relais.url, jeton: '' } }), false);
  assert.equal(envoiAutoDu({ ...base, relais: { url: '', jeton: 'j' } }), false);
  assert.equal(envoiAutoDu({ ...base, relais: undefined }), false);
  assert.equal(envoiAutoDu({ ...base, enLigne: false }), false);
  assert.equal(envoiAutoDu({ ...base, nbSets: 0 }), false);
  assert.equal(envoiAutoDu({ ...base, lectureSeule: true }), false);
});
