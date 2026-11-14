// Stockage des images, dans IndexedDB : le `localStorage` (5 Mo pour tout) ne tient pas des images. Deux
// magasins, tous deux hors de la collection (`bl_v1` ne les contient pas, hors export) :
//  - `photos` : les photos personnelles, une entrée par fiche (clé = identifiant du set), le JPEG recadré ;
//  - `boites` : les photos de boîte (BrickLink) déjà vues, une entrée par numéro de set, en JPEG. On les garde
//    pour que BrickLink en panne ou en maintenance ne fasse pas disparaître les boîtes ;
//  - `rendus` : les rendus Rebrickable, même clé et même forme. Leur CDN n'envoie pas d'en-tête CORS : la copie
//    passe par le relais (`/image`), jamais par un canvas.
// Les perdre ne coûte qu'une image (la boîte se retélécharge, la photo retombe sur la boîte). Couche mince :
// la logique est dans `photos.js` et `boite.js`.
import { photoValide } from './photos.js';

const BASE = 'bl_photos';
const VERSION = 3;
const PHOTOS = 'photos';
const BOITES = 'boites';
const RENDUS = 'rendus';

function ouvrir() {
  return new Promise((resoudre, rejeter) => {
    if (typeof indexedDB === 'undefined') return rejeter(new Error('indisponible'));
    const r = indexedDB.open(BASE, VERSION);
    // Chaque version ajoute un magasin (boîtes en 2, rendus en 3) sans toucher aux précédents.
    r.onupgradeneeded = () => { for (const nom of [PHOTOS, BOITES, RENDUS]) if (!r.result.objectStoreNames.contains(nom)) r.result.createObjectStore(nom); };
    r.onsuccess = () => resoudre(r.result);
    r.onerror = () => rejeter(r.error ?? new Error('ouverture'));
    r.onblocked = () => rejeter(new Error('bloque'));
  });
}

// Une transaction, fermée ensuite. `action` reçoit le magasin et renvoie la requête dont on veut le résultat.
async function transaction(magasin, mode, action) {
  const db = await ouvrir();
  try {
    return await new Promise((resoudre, rejeter) => {
      const tx = db.transaction(magasin, mode);
      const requete = action(tx.objectStore(magasin));
      tx.oncomplete = () => resoudre(requete?.result);
      tx.onabort = () => rejeter(tx.error ?? new Error('abandon'));
      tx.onerror = () => rejeter(tx.error ?? new Error('erreur'));
    });
  } finally {
    db.close();
  }
}

// Message pour l'écran : un stockage plein ne se dit pas comme un stockage absent.
export function messageErreur(e) {
  if (e?.name === 'QuotaExceededError') return 'Stockage plein : la photo n\'est pas enregistrée.';
  if (e?.message === 'indisponible') return 'Les photos ne sont pas disponibles sur ce navigateur.';
  return 'La photo n\'a pas pu être enregistrée.';
}

// Renvoie le JPEG, ou null s'il n'y en a pas (ou s'il n'est pas valide).
export async function lirePhoto(id) {
  const blob = await transaction(PHOTOS, 'readonly', (m) => m.get(id));
  return photoValide(blob) ? blob : null;
}

// Les identifiants des sets qui ont une photo : de quoi décider, sans lire les images, lesquelles afficher.
export async function idsPhotos() {
  return (await transaction(PHOTOS, 'readonly', (m) => m.getAllKeys())) ?? [];
}

export async function ecrirePhoto(id, blob) {
  if (!photoValide(blob)) throw new Error('photo invalide');
  await transaction(PHOTOS, 'readwrite', (m) => m.put(blob, id));
}

export async function supprimerPhoto(id) {
  await transaction(PHOTOS, 'readwrite', (m) => m.delete(id));
}

// Au démarrage : retire les photos dont le set n'existe plus. Pas à chaque suppression : une
// suppression en masse s'annule juste après, et la photo doit alors revenir avec le set.
export async function purgerOrphelines(idsValides) {
  const cles = await transaction(PHOTOS, 'readonly', (m) => m.getAllKeys());
  const orphelines = (cles ?? []).filter((c) => !idsValides.has(c));
  if (orphelines.length === 0) return 0;
  await transaction(PHOTOS, 'readwrite', (m) => { for (const c of orphelines) m.delete(c); });
  return orphelines.length;
}

// ---- Photos de boîte et rendus ---------------------------------------------------------------------------
// Même mécanique pour les deux magasins, clés = numéros de set normalisés.

const lireImageDe = async (magasin, numero) => {
  const blob = await transaction(magasin, 'readonly', (m) => m.get(numero));
  return photoValide(blob) ? blob : null; // on ne se fie pas au contenu du stockage
};
const numerosDe = async (magasin) => (await transaction(magasin, 'readonly', (m) => m.getAllKeys())) ?? [];
const ecrireImageDe = async (magasin, numero, blob) => {
  if (!photoValide(blob)) throw new Error('image invalide');
  await transaction(magasin, 'readwrite', (m) => m.put(blob, numero));
};
// Au démarrage : retire les images des numéros qui ne sont plus dans la collection (comme pour les photos).
const purgerDe = async (magasin, numerosValides) => {
  const orphelines = (await numerosDe(magasin)).filter((c) => !numerosValides.has(c));
  if (orphelines.length === 0) return 0;
  await transaction(magasin, 'readwrite', (m) => { for (const c of orphelines) m.delete(c); });
  return orphelines.length;
};

export const lireBoite = (numero) => lireImageDe(BOITES, numero);
export const numerosBoites = () => numerosDe(BOITES);
export const ecrireBoite = (numero, blob) => ecrireImageDe(BOITES, numero, blob);
export const purgerBoitesOrphelines = (valides) => purgerDe(BOITES, valides);

export const lireRendu = (numero) => lireImageDe(RENDUS, numero);
export const numerosRendus = () => numerosDe(RENDUS);
export const ecrireRendu = (numero, blob) => ecrireImageDe(RENDUS, numero, blob);
export const purgerRendusOrphelins = (valides) => purgerDe(RENDUS, valides);

// ---- Sauvegarde : tout lire, tout restaurer --------------------------------------------------------------

// Une passe de curseur par magasin : clés et valeurs lues dans la MÊME transaction, donc toujours en phase (deux
// requêtes séparées pourraient se décaler si une image est écrite entre les deux).
function toutLire(magasin) {
  return transaction(magasin, 'readonly', (m) => {
    const sortie = { result: [] };
    const curseur = m.openCursor();
    curseur.onsuccess = () => {
      const c = curseur.result;
      if (c) { sortie.result.push([c.key, c.value]); c.continue(); }
    };
    return sortie;
  });
}

// Toutes les images gardées, prêtes pour l'export : { photos: [[id, octets]], boites: [[numéro, octets]], rendus: [...] }.
// Une entrée illisible ou invalide est écartée (on n'écrit pas dans un fichier ce qu'on refuserait à l'affichage).
export async function imagesDuStock() {
  const sortie = {};
  for (const [groupe, magasin] of [['photos', PHOTOS], ['boites', BOITES], ['rendus', RENDUS]]) {
    sortie[groupe] = [];
    for (const [cle, blob] of (await toutLire(magasin)) ?? []) {
      if (typeof cle === 'string' && photoValide(blob)) sortie[groupe].push([cle, new Uint8Array(await blob.arrayBuffer())]);
    }
  }
  return sortie;
}

// Restaure les images d'un fichier, en remplaçant celles de l'appareil. `decoder(blob)` (le navigateur) a le dernier
// mot : un JPEG qui ne se décode pas n'entre pas. Une image qui échoue ne bloque pas les suivantes ; on rend le décompte.
export async function restaurerImages(images, decoder) {
  const ecrire = { photos: ecrirePhoto, boites: ecrireBoite, rendus: ecrireRendu };
  let restaurees = 0;
  let echecs = 0;
  let stockagePlein = false;
  for (const groupe of Object.keys(ecrire)) {
    for (const [cle, octets] of images[groupe] ?? []) {
      try {
        const blob = new Blob([octets], { type: 'image/jpeg' });
        if (!(await decoder(blob))) { echecs += 1; continue; }
        await ecrire[groupe](cle, blob);
        restaurees += 1;
      } catch (e) {
        echecs += 1;
        if (e?.name === 'QuotaExceededError') stockagePlein = true;
      }
    }
  }
  return { restaurees, echecs, stockagePlein };
}

// Les clés des images gardées (les identifiants de sets pour les photos, les numéros pour les boîtes et les rendus), sans lire
// les images : de quoi comparer l'appareil à un fichier de sauvegarde.
export async function clesImages() {
  const sortie = {};
  for (const [groupe, magasin] of [['photos', PHOTOS], ['boites', BOITES], ['rendus', RENDUS]]) {
    sortie[groupe] = (await numerosDe(magasin)).filter((c) => typeof c === 'string');
  }
  return sortie;
}

// La place que prennent les images gardées : la somme des tailles des blobs (on lit leur taille, pas leur contenu).
export async function tailleImages() {
  let total = 0;
  for (const magasin of [PHOTOS, BOITES, RENDUS]) {
    for (const [, blob] of (await toutLire(magasin)) ?? []) if (blob && typeof blob.size === 'number') total += blob.size;
  }
  return total;
}
