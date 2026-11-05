// Stockage des photos personnelles, dans IndexedDB : le `localStorage` (5 Mo pour tout) ne tient
// pas des images. Une entrée par fiche, clé = identifiant du set, valeur = le JPEG recadré. Ce n'est
// pas la collection : hors export (`bl_v1` ne les contient pas) et les perdre ne coûte qu'une photo,
// le set garde sa boîte BrickLink. Couche mince : la logique est dans `photos.js`.
import { photoValide } from './photos.js';

const BASE = 'bl_photos';
const MAGASIN = 'photos';

function ouvrir() {
  return new Promise((resoudre, rejeter) => {
    if (typeof indexedDB === 'undefined') return rejeter(new Error('indisponible'));
    const r = indexedDB.open(BASE, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore(MAGASIN); };
    r.onsuccess = () => resoudre(r.result);
    r.onerror = () => rejeter(r.error ?? new Error('ouverture'));
    r.onblocked = () => rejeter(new Error('bloque'));
  });
}

// Une transaction, fermée ensuite. `action` reçoit le magasin et renvoie la requête dont on veut le résultat.
async function transaction(mode, action) {
  const db = await ouvrir();
  try {
    return await new Promise((resoudre, rejeter) => {
      const tx = db.transaction(MAGASIN, mode);
      const requete = action(tx.objectStore(MAGASIN));
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
  const blob = await transaction('readonly', (m) => m.get(id));
  return photoValide(blob) ? blob : null;
}

// Les identifiants des sets qui ont une photo : de quoi décider, sans lire les images, lesquelles afficher.
export async function idsPhotos() {
  return (await transaction('readonly', (m) => m.getAllKeys())) ?? [];
}

export async function ecrirePhoto(id, blob) {
  if (!photoValide(blob)) throw new Error('photo invalide');
  await transaction('readwrite', (m) => m.put(blob, id));
}

export async function supprimerPhoto(id) {
  await transaction('readwrite', (m) => m.delete(id));
}

// Au démarrage : retire les photos dont le set n'existe plus. Pas à chaque suppression : une
// suppression en masse s'annule juste après, et la photo doit alors revenir avec le set.
export async function purgerOrphelines(idsValides) {
  const cles = await transaction('readonly', (m) => m.getAllKeys());
  const orphelines = (cles ?? []).filter((c) => !idsValides.has(c));
  if (orphelines.length === 0) return 0;
  await transaction('readwrite', (m) => { for (const c of orphelines) m.delete(c); });
  return orphelines.length;
}
