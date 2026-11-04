// Onglet, filtres et tri retenus sur l'appareil : retrouver sa liste telle qu'on l'a laissée après
// un rechargement. Ce n'est pas une donnée de la collection (hors export) et le perdre ne coûte
// rien : on retombe sur la collection, sans filtre. La recherche texte n'est pas retenue (un mot
// ponctuel qui reviendrait au lancement ressemblerait à une liste cassée). Lu du stockage, donc
// validé comme toute entrée non fiable : on ne garde que les champs connus, de type texte.
import { TRIS } from './recherche.js';

export const FILTRES_VIDES = { theme: '', etat: '', annee: '', manque: '', emplacement: '', boite: '', notice: '', priorite: '', etiquette: '', taille: '' };
const CLE = 'bl_filtres';
const STATUTS = ['possédé', 'souhaité'];
const PAR_DEFAUT = { statut: 'possédé', filtres: FILTRES_VIDES, tri: 'ajout' };
const LONGUEUR_MAX = 200;

function stockage(store) {
  try { return store ?? globalThis.localStorage ?? null; } catch { return null; }
}

export function lireFiltres(store) {
  try {
    const brut = JSON.parse(stockage(store)?.getItem(CLE) ?? 'null');
    if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return PAR_DEFAUT;
    const filtres = { ...FILTRES_VIDES };
    const lus = brut.filtres && typeof brut.filtres === 'object' ? brut.filtres : {};
    for (const cle of Object.keys(FILTRES_VIDES)) {
      if (typeof lus[cle] === 'string' && lus[cle].length <= LONGUEUR_MAX) filtres[cle] = lus[cle];
    }
    return {
      statut: STATUTS.includes(brut.statut) ? brut.statut : PAR_DEFAUT.statut,
      filtres,
      tri: TRIS.some((t) => t.cle === brut.tri) ? brut.tri : PAR_DEFAUT.tri,
    };
  } catch {
    return PAR_DEFAUT;
  }
}

export function ecrireFiltres({ statut, filtres, tri }, store) {
  try { stockage(store)?.setItem(CLE, JSON.stringify({ statut, filtres, tri })); } catch { /* sans stockage, le choix dure jusqu'au rechargement */ }
}
