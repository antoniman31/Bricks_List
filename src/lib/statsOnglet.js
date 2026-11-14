// Les sous-onglets de l'écran Stats : lesquels, et lequel on avait laissé ouvert. Le choix est retenu sur l'appareil (hors collection et hors
// export, comme les filtres) ; il est lu du stockage, donc validé : une valeur inconnue retombe sur « Aperçu ».
export const ONGLETS = [
  { cle: 'apercu', libelle: 'Aperçu' },
  { cle: 'repartition', libelle: 'Répartition' },
  { cle: 'suivi', libelle: 'Suivi' },
  { cle: 'wishlist', libelle: 'Wishlist' },
];
const CLE = 'bl_stats_onglet';

export const ongletValide = (v) => ONGLETS.some((o) => o.cle === v);

function stockage(store) {
  try { return store ?? globalThis.localStorage ?? null; } catch { return null; }
}

export function lireOnglet(store) {
  try {
    const v = stockage(store)?.getItem(CLE);
    return ongletValide(v) ? v : 'apercu';
  } catch {
    return 'apercu';
  }
}

export function ecrireOnglet(cle, store) {
  if (!ongletValide(cle)) return;
  try { stockage(store)?.setItem(CLE, cle); } catch { /* sans stockage, le choix dure jusqu'au rechargement */ }
}
