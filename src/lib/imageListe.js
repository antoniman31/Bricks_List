// Quelle image représente un set dans la liste : un choix par fiche (`set.imageListe`, dans la
// collection donc dans l'export) et, pour les sets sans choix, une règle de l'appareil (hors export,
// comme le thème ou la vue). Les images possibles : la boîte (BrickLink), le rendu (Rebrickable) et
// la photo personnelle (IndexedDB).

export const REGLES = [
  { cle: 'boite', libelle: 'Boîte, sinon rendu' },
  { cle: 'photo', libelle: 'Ma photo quand elle existe' },
  { cle: 'rendu', libelle: 'Rendu Rebrickable' },
];
const CLE = 'bl_image_liste';

// Une valeur inconnue (stockage corrompu) retombe sur le comportement d'origine.
export const regleValide = (v) => (REGLES.some((r) => r.cle === v) ? v : 'boite');

function stockage(store) {
  try { return store ?? globalThis.localStorage ?? null; } catch { return null; }
}

export function lireRegle(store) {
  try { return regleValide(stockage(store)?.getItem(CLE)); } catch { return 'boite'; }
}

export function ecrireRegle(regle, store) {
  if (!REGLES.some((r) => r.cle === regle)) return;
  try { stockage(store)?.setItem(CLE, regle); } catch { /* sans stockage, le choix dure jusqu'au rechargement */ }
}

// L'image à montrer pour ce set : « boite », « rendu » ou « photo ». Le choix de la fiche l'emporte
// sur la règle. Une photo voulue mais absente retombe sur la boîte, comme une boîte absente retombe
// sur le rendu (c'est l'affichage qui s'en charge).
export function choisirImage(set, regle, aPhoto) {
  const voulu = set.imageListe ?? regle;
  if (voulu === 'photo') return aPhoto ? 'photo' : 'boite';
  return voulu === 'rendu' ? 'rendu' : 'boite';
}
