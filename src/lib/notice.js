// Lien vers la notice officielle d'un set, sur lego.com. LEGO n'a pas d'API publique pour cela : l'adresse se déduit du
// numéro (format constaté sur des dizaines de pages de notices indexées : « …/service/building-instructions/<numéro> »,
// avec un tiret, et SANS le suffixe de version « -1 »). Ce n'est pas un engagement de LEGO : s'il change ses adresses, le
// lien mènera à une page vide, sans rien casser dans l'appli. Rien n'est stocké ni exporté, tout se déduit du numéro.
import { normaliserNumero } from './numero.js';

const BASE = 'https://www.lego.com/fr-fr/service/building-instructions/';

export function urlNotice(numero) {
  const n = normaliserNumero(numero);
  return n ? `${BASE}${n.split('-')[0]}` : null;
}
