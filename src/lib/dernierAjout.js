import { ETATS } from './model.js';

// Le rangement et l'état du dernier set ajouté, repris au prochain ajout : on range souvent
// plusieurs sets à la suite au même endroit. Comme le choix liste/grille, c'est un confort de
// l'appareil (hors collection, hors export) : le perdre ne coûte rien, on repart de zéro.
// Lu du stockage, donc validé comme toute entrée non fiable.
const CLE = 'bl_dernier_ajout';
export const LIEU_MAX = 60;
const VIDE = { lieu: '', etat: '' };

function stockage(store) {
  try { return store ?? globalThis.localStorage ?? null; } catch { return null; }
}

export function validerDernierAjout(brut) {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return { ...VIDE };
  const lieu = typeof brut.lieu === 'string' ? brut.lieu.replace(/\s+/g, ' ').trim().slice(0, LIEU_MAX) : '';
  const etat = ETATS.includes(brut.etat) ? brut.etat : '';
  return { lieu, etat };
}

export function lireDernierAjout(store) {
  try {
    const texte = stockage(store)?.getItem(CLE);
    return texte ? validerDernierAjout(JSON.parse(texte)) : { ...VIDE };
  } catch {
    return { ...VIDE };
  }
}

export function ecrireDernierAjout(valeur, store) {
  try { stockage(store)?.setItem(CLE, JSON.stringify(validerDernierAjout(valeur))); } catch { /* sans stockage, le choix dure jusqu'au rechargement */ }
}
