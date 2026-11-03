import { normaliserNumero } from './numero.js';
import { ErreurRebrickable } from './api.js';

const PROFONDEUR_MAX = 6; // les thèmes réels n'ont que 3 niveaux : le reste est un cycle

export const MESSAGES = {
  cle: 'Clé Rebrickable refusée. Vérifie-la dans les Réglages.',
  introuvable: 'Set introuvable chez Rebrickable.',
  limite: 'Trop de requêtes. Réessaie dans quelques secondes.',
  reseau: 'Pas de réseau.',
  reponse: 'Réponse inattendue de Rebrickable.',
  serveur: 'Rebrickable ne répond pas correctement.',
  numero: 'Numéro invalide : saisis par exemple 75192 ou 75192-1.',
};

export function messageErreur(e) {
  return MESSAGES[e?.code] ?? 'Recherche impossible.';
}

// Un thème Rebrickable est hiérarchique : le Faucon Millenium est dans
// « Ultimate Collector Series », lui-même sous « Star Wars ». On garde la racine :
// elle regroupe les sets comme on les range, alors que le thème exact ferait des
// dizaines de valeurs dans le filtre.
//
// `cache` est un objet { id: { name, parent_id } } rempli au fil des appels : un
// thème déjà vu ne coûte plus aucune requête. Il est modifié sur place et rendu
// à l'appelant pour qu'il le conserve.
export async function themeRacine(id, appeler, cache) {
  let courant = id;
  let nom = null;
  const vus = new Set();
  for (let i = 0; i < PROFONDEUR_MAX && courant != null; i += 1) {
    if (vus.has(courant)) break;
    vus.add(courant);
    let t = cache[courant];
    if (!t) {
      const r = await appeler(`/themes/${encodeURIComponent(courant)}/`);
      if (typeof r?.name !== 'string' || r.name === '') throw new ErreurRebrickable('reponse');
      t = { name: r.name, parent_id: r.parent_id ?? null };
      cache[courant] = t;
    }
    nom = t.name;
    courant = t.parent_id;
  }
  return nom;
}

// Cherche un set et le rend sous la forme attendue par le formulaire. Si le thème
// ne peut pas être résolu (limite de débit, réseau), le set est quand même rendu
// avec un avertissement : mieux vaut une fiche à compléter qu'un échec complet.
export async function chercherSet(saisie, appeler, cache = {}) {
  const numero = normaliserNumero(saisie);
  if (!numero) throw new ErreurRebrickable('numero');

  const r = await appeler(`/sets/${encodeURIComponent(numero)}/`);
  if (typeof r?.name !== 'string' || r.name === '') throw new ErreurRebrickable('reponse');

  const avertissements = [];
  let theme = '';
  if (r.theme_id != null) {
    try {
      theme = (await themeRacine(r.theme_id, appeler, cache)) ?? '';
    } catch (e) {
      if (e?.code === 'cle') throw e;
      avertissements.push('Thème non récupéré : renseigne-le à la main.');
    }
  }

  return {
    set: {
      numero: typeof r.set_num === 'string' ? r.set_num : numero,
      nom: r.name,
      theme,
      annee: r.year ?? null,
      pieces: r.num_parts ?? null,
      image: typeof r.set_img_url === 'string' ? r.set_img_url : null,
    },
    avertissements,
  };
}
