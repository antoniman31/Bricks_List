import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comparerSauvegarde } from './verifSauvegarde.js';

const set = (id, nom, extra = {}) => ({ id, numero: `${id}-1`, nom, statut: 'possédé', ...extra });
const octets = new Uint8Array([0xff, 0xd8, 0xff, 1]);
const images = (o = {}) => ({ photos: [], boites: [], rendus: [], refusees: 0, ...o });
const base = () => ({ fichier: { sets: [set('1', 'Faucon'), set('2', 'Titanic')], corriges: 0, rejetes: 0, images: images({ boites: [['1-1', octets], ['2-1', octets]] }) }, actuels: [set('1', 'Faucon'), set('2', 'Titanic')], cles: { photos: [], boites: ['1-1', '2-1'], rendus: [] } });

test('un fichier identique à la collection : correspond, sans rien à signaler', () => {
  const r = comparerSauvegarde(base());
  assert.equal(r.identique, true);
  assert.equal(r.titre, 'Ce fichier correspond à ta collection.');
  assert.deepEqual(r.lignes, ['2 sets dans le fichier, 2 sur l\'appareil.', '2 images dans le fichier, 2 sur l\'appareil.']);
});

test('l\'ordre des champs d\'une fiche ne compte pas', () => {
  const b = base();
  b.fichier.sets[0] = { statut: 'possédé', nom: 'Faucon', numero: '1-1', id: '1' };
  assert.equal(comparerSauvegarde(b).identique, true);
});

test('des sets absents du fichier, absents de l\'appareil ou modifiés sont nommés', () => {
  const b = base();
  b.fichier.sets = [set('1', 'Faucon', { prix: 849.99 }), set('3', 'Mario Kart')];
  const r = comparerSauvegarde(b);
  assert.equal(r.identique, false);
  assert.ok(r.lignes.some((l) => /1 set de l'appareil manque dans le fichier : Titanic \(2-1\)/.test(l)));
  assert.ok(r.lignes.some((l) => /1 set du fichier est absent de l'appareil : Mario Kart \(3-1\)/.test(l)));
  assert.ok(r.lignes.some((l) => /1 set diffère .* : Faucon \(1-1\)/.test(l)));
});

test('une liste longue est résumée à cinq noms', () => {
  const b = base();
  b.actuels = [...b.actuels, ...['3', '4', '5', '6', '7', '8'].map((i) => set(i, `S${i}`))];
  const l = comparerSauvegarde(b).lignes.find((x) => /manquent dans le fichier/.test(x));
  assert.match(l, /^6 sets de l'appareil manquent dans le fichier : .*…\.$/);
  assert.equal(l.split(',').length, 5);
});

test('les images de l\'appareil doivent toutes être dans le fichier', () => {
  const b = base();
  b.cles.rendus = ['1-1'];
  b.cles.photos = ['1'];
  const r = comparerSauvegarde(b);
  assert.equal(r.identique, false);
  assert.ok(r.lignes.some((l) => /2 images de l'appareil manquent dans le fichier/.test(l)));
});

test('un fichier sans images, des images illisibles ou des images de l\'appareil illisibles ne passent pas pour identiques', () => {
  const sans = base(); sans.fichier.images = null;
  const r1 = comparerSauvegarde(sans);
  assert.equal(r1.identique, false);
  assert.ok(r1.lignes.includes('Ce fichier ne contient pas d\'images.'));
  const vide = base(); vide.fichier.images = null; vide.cles = { photos: [], boites: [], rendus: [] };
  assert.equal(comparerSauvegarde(vide).identique, true); // rien à retrouver, rien à manquer
  const illisibles = base(); illisibles.fichier.images.refusees = 2;
  assert.equal(comparerSauvegarde(illisibles).identique, false);
  const sansCles = base(); sansCles.cles = null;
  const r4 = comparerSauvegarde(sansCles);
  assert.equal(r4.identique, false);
  assert.ok(r4.lignes.some((l) => /n'ont pas pu être lues/.test(l)));
});

test('des fiches corrigées ou rejetées à la lecture sont signalées', () => {
  const b = base(); b.fichier.corriges = 2; b.fichier.rejetes = 1;
  const r = comparerSauvegarde(b);
  assert.equal(r.identique, false);
  assert.ok(r.lignes.some((l) => /2 fiches du fichier ont été corrigées/.test(l)));
  assert.ok(r.lignes.some((l) => /1 fiche du fichier est inutilisable/.test(l)));
});
