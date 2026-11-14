// Les champs du formulaire d'édition qui portent une source ou viennent de Brickset (prix, date de sortie, date de retrait,
// sous-thème). On ne renvoie que ce qui a changé : un champ intact garde sa valeur ET sa source (un prix venu de Brickset
// reste « DE » tant qu'on n'y touche pas). Saisi à la main, un prix ou une date de sortie passe en source « manuelle » et n'est
// plus écrasé par une mise à jour automatique ; l'effacer rend la main à Brickset. Logique pure, testée.
import { dateSortieValide } from './dates.js';
import { PRIX_MAX, lirePrixSaisi } from './prix.js';

// `depart` et `champs` : les textes du formulaire. `souhaite` : le prix n'est proposé que pour la wishlist.
// Renvoie { changements } à fusionner dans le set, ou { erreur } à afficher.
export function changementsOptionnels(depart, champs, souhaite) {
  const changements = {};
  const change = (cle) => String(champs[cle] ?? '').trim() !== String(depart[cle] ?? '').trim();

  if (change('dateSortie')) {
    const v = champs.dateSortie.trim();
    if (v === '') Object.assign(changements, { dateSortie: null, sortieSource: null });
    else if (dateSortieValide(v) === null) return { erreur: 'Date de sortie invalide.' };
    else Object.assign(changements, { dateSortie: v, sortieSource: 'manuelle' });
  }
  if (change('dateRetrait')) {
    const v = champs.dateRetrait.trim();
    if (v === '') changements.dateRetrait = null;
    else if (dateSortieValide(v) === null) return { erreur: 'Date de retrait invalide.' };
    else changements.dateRetrait = v;
  }
  // '' veut dire « pas de sous-thème » (Brickset n'est plus interrogé), à la différence de null (jamais demandé).
  if (change('sousTheme')) changements.sousTheme = champs.sousTheme.trim();
  if (souhaite && change('prix')) {
    const v = champs.prix.trim();
    if (v === '') Object.assign(changements, { prix: null, prixSource: null });
    else {
      const prix = lirePrixSaisi(v);
      if (prix === null) return { erreur: `Prix invalide (de 0,01 à ${PRIX_MAX.toLocaleString('fr-FR')} €).` };
      Object.assign(changements, { prix, prixSource: 'manuelle' });
    }
  }
  return { changements };
}
