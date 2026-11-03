// Liste ou grille : un choix d'affichage de l'utilisateur, retenu sur l'appareil. Ce n'est pas
// une donnée de la collection (hors export, hors sauvegarde) et le perdre ne coûte rien : on
// retombe sur la liste. Lu du stockage, donc validé comme toute entrée non fiable.
export const VUES = ['liste', 'grille'];
const CLE = 'bl_vue';

function stockage(store) {
  try { return store ?? globalThis.localStorage ?? null; } catch { return null; }
}

export function lireVue(store) {
  try {
    const v = stockage(store)?.getItem(CLE);
    return VUES.includes(v) ? v : 'liste';
  } catch {
    return 'liste';
  }
}

export function ecrireVue(vue, store) {
  if (!VUES.includes(vue)) return;
  try { stockage(store)?.setItem(CLE, vue); } catch { /* sans stockage, le choix dure jusqu'au rechargement */ }
}

export function autreVue(vue) {
  return vue === 'grille' ? 'liste' : 'grille';
}
