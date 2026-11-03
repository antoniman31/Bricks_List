import { normaliserNumero } from './numero.js';
import { messageErreur } from './rebrickable.js';
import { compterExemplaires } from './collection.js';

export const LOT_MAX = 100;
const PAUSE_LIMITE_MS = 2000;

const attendreReel = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Extrait les numéros d'un texte collé : une colonne de tableur, une liste
// séparée par des virgules ou des espaces. Ce qui ne ressemble pas à un numéro
// est rendu à part au lieu d'être perdu en silence, pour que la personne voie ce
// qui a été ignoré. Le plafond évite qu'un mauvais collage lance des milliers de
// requêtes.
export function extraireNumeros(texte) {
  const numeros = [];
  const invalides = [];
  for (const morceau of String(texte ?? '').split(/[\s,;]+/).filter(Boolean)) {
    const numero = normaliserNumero(morceau);
    if (numero) numeros.push(numero);
    else invalides.push(morceau);
  }
  return { numeros: numeros.slice(0, LOT_MAX), invalides, tronque: numeros.length > LOT_MAX };
}

// Cherche les sets un par un. Un numéro en échec (introuvable, réseau) n'arrête
// pas les suivants ; une clé refusée arrête tout, parce que les quatorze autres
// échoueraient pareil. Un même numéro saisi deux fois n'est cherché qu'une fois.
//
// Après une annulation, une réponse encore en vol est ignorée : elle n'est pas
// ajoutée aux résultats.
export async function chercherLot(numeros, chercher, { onProgres, signal, attendre = attendreReel } = {}) {
  const resultats = [];
  const vus = new Map();
  let arret = null;

  for (let i = 0; i < numeros.length; i += 1) {
    if (signal?.aborted) { arret = 'annule'; break; }
    const numero = numeros[i];
    let r;

    if (!chercher) {
      r = { numero, etat: 'nonCherche', set: null, motif: 'Pas de clé Rebrickable : seul le numéro sera ajouté.' };
    } else if (vus.has(numero)) {
      r = { ...vus.get(numero) };
    } else {
      try {
        const { set, avertissements } = await chercher(numero);
        r = { numero, etat: 'trouve', set, motif: avertissements.join(' ') };
      } catch (e) {
        if (e?.code === 'cle') { arret = 'cle'; break; }
        r = { numero, etat: e?.code === 'introuvable' ? 'introuvable' : 'erreur', set: null, motif: messageErreur(e) };
        // Une limite de débit se lève en quelques secondes : insister tout de suite
        // ferait échouer les suivants pour la même raison.
        if (e?.code === 'limite') await attendre(PAUSE_LIMITE_MS);
      }
      vus.set(numero, r);
    }

    if (signal?.aborted) { arret = 'annule'; break; }
    resultats.push(r);
    onProgres?.(i + 1, numeros.length);
  }
  return { resultats, arret };
}

// Un doublon est un numéro déjà dans la collection, ou déjà vu plus haut dans la
// liste. Il n'est pas refusé (on peut posséder deux exemplaires), seulement signalé.
export function marquerDoublons(resultats, existants) {
  const vus = new Set();
  return resultats.map((r) => {
    const doublon = compterExemplaires(existants, r.numero) > 0 ? 'collection' : vus.has(r.numero) ? 'liste' : null;
    vus.add(r.numero);
    return { ...r, doublon };
  });
}

// Coché d'office : ce qu'on a trouvé et qui n'existe pas déjà. Les introuvables et
// les doublons demandent un geste volontaire.
export const cocheParDefaut = (r) => r.etat === 'trouve' && !r.doublon;

// Transforme les lignes cochées en fiches à ajouter. Un set non trouvé est ajouté
// avec son seul numéro : le modèle lui donne le nom « Set 75192-1 » et il ressort
// dans « À compléter ». L'état n'a de sens que pour un set possédé.
export function construireAjouts(resultats, coches, { statut, etat }) {
  return resultats
    .filter((_, i) => coches.has(i))
    .map((r) => ({
      ...(r.set ?? { numero: r.numero, nom: '' }),
      statut,
      etat: statut === 'possédé' && etat ? etat : null,
      notes: '',
    }));
}
