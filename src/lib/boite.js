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

// Sources d'image d'un set, de la plus souhaitée à la moins : la boîte, puis le rendu Rebrickable.
export function sourcesImage(numero, rendu) {
  return [urlBoite(numero), typeof rendu === 'string' && rendu ? rendu : null].filter(Boolean);
}
