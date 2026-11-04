// Onglet, filtres et tri retenus sur l'appareil : retrouver sa liste telle qu'on l'a laissée après
// un rechargement. Chaque onglet (collection, wishlist) a ses propres filtres et son propre tri :
// un état n'existe pas pour un set souhaité, une priorité n'existe pas pour un set possédé. Ce n'est
// pas une donnée de la collection (hors export) et le perdre ne coûte rien : on retombe sur la
// collection, sans filtre. La recherche texte n'est pas retenue (un mot ponctuel qui reviendrait au
// lancement ressemblerait à une liste cassée). Lu du stockage, donc validé comme toute entrée non
// fiable : on ne garde que les champs connus, de type texte.
import { TRIS } from './recherche.js';

export const FILTRES_VIDES = { theme: '', etat: '', annee: '', manque: '', emplacement: '', boite: '', notice: '', priorite: '', etiquette: '', taille: '' };
const CLE = 'bl_filtres';
export const STATUTS = ['possédé', 'souhaité'];
const LONGUEUR_MAX = 200;

const reglagesVides = () => ({
  possédé: { filtres: { ...FILTRES_VIDES }, tri: 'ajout' },
  souhaité: { filtres: { ...FILTRES_VIDES }, tri: 'ajout' },
});

function stockage(store) {
  try { return store ?? globalThis.localStorage ?? null; } catch { return null; }
}

// Les filtres et le tri d'un onglet, champ par champ. Un tri propre à l'autre onglet est écarté.
function lireOnglet(brut, statut) {
  const lu = brut && typeof brut === 'object' && !Array.isArray(brut) ? brut : {};
  const filtres = { ...FILTRES_VIDES };
  const sources = lu.filtres && typeof lu.filtres === 'object' ? lu.filtres : {};
  for (const cle of Object.keys(FILTRES_VIDES)) {
    if (typeof sources[cle] === 'string' && sources[cle].length <= LONGUEUR_MAX) filtres[cle] = sources[cle];
  }
  const tri = TRIS.some((t) => t.cle === lu.tri && (!t.statut || t.statut === statut)) ? lu.tri : 'ajout';
  return { filtres, tri };
}

export function lireFiltres(store) {
  const defaut = { statut: 'possédé', reglages: reglagesVides() };
  try {
    const brut = JSON.parse(stockage(store)?.getItem(CLE) ?? 'null');
    if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return defaut;
    const statut = STATUTS.includes(brut.statut) ? brut.statut : defaut.statut;
    const reglages = reglagesVides();
    if (brut.reglages && typeof brut.reglages === 'object') {
      for (const s of STATUTS) reglages[s] = lireOnglet(brut.reglages[s], s);
    } else {
      // Ancien format (un seul jeu de filtres, celui de l'onglet actif) : il reste à cet onglet.
      reglages[statut] = lireOnglet(brut, statut);
    }
    return { statut, reglages };
  } catch {
    return defaut;
  }
}

export function ecrireFiltres({ statut, reglages }, store) {
  try { stockage(store)?.setItem(CLE, JSON.stringify({ statut, reglages })); } catch { /* sans stockage, le choix dure jusqu'au rechargement */ }
}
