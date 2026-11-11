// Photo de la boîte d'un set, chez BrickLink. L'adresse se déduit du numéro : rien à stocker, rien à
// exporter, et un set déjà enregistré en profite sans migration. Ce n'est pas une API officielle
// (BrickLink peut changer ses adresses) ni une garantie qu'une photo existe pour chaque set : l'appelant
// retombe sur le rendu Rebrickable, puis sur le numéro, quand l'image ne charge pas.
import { normaliserNumero } from './numero.js';

const BASE = 'https://img.bricklink.com/ItemImage/ON/0/';

export function urlBoite(numero) {
  const n = normaliserNumero(numero);
  return n ? `${BASE}${n}.png` : null;
}

// Sources d'image d'un set, de la plus souhaitée à la moins : la boîte, puis le rendu Rebrickable,
// ou l'inverse quand `premier` vaut « rendu » (choix de l'image de la liste).
export function sourcesImage(numero, rendu, premier = 'boite') {
  const boite = urlBoite(numero);
  const r = typeof rendu === 'string' && rendu ? rendu : null;
  return (premier === 'rendu' ? [r, boite] : [boite, r]).filter(Boolean);
}

// Les numéros (distincts, normalisés) dont la boîte n'est pas encore gardée sur l'appareil : ce que « Sauvegarder
// toutes les boîtes » doit aller chercher. Les deux statuts comptent : on voit les boîtes de la wishlist aussi.
export function numerosABoites(sets, deja = new Set()) {
  const vus = new Set();
  for (const s of sets) {
    const n = normaliserNumero(s?.numero);
    if (n && !deja.has(n)) vus.add(n);
  }
  return [...vus];
}

// BrickLink en panne ou en maintenance : plusieurs échecs de suite sans une seule réussite. On arrête alors la
// sauvegarde au lieu de demander des dizaines d'images qui n'arriveront pas.
export const ECHECS_AVANT_ARRET = 3;
export function brickLinkInjoignable(echecsDeSuite, reussies) {
  return reussies === 0 && echecsDeSuite >= ECHECS_AVANT_ARRET;
}
