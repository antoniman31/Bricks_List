import { normaliserNumero } from './numero.js';
import { ErreurRebrickable } from './api.js';

const PROFONDEUR_MAX = 6; // les thèmes réels n'ont que 3 niveaux : le reste est un cycle

export const MESSAGES = {
  cle: 'Clé refusée (Réglages).',
  introuvable: 'Set introuvable chez Rebrickable.',
  limite: 'Trop de requêtes : réessaie.',
  reseau: 'Pas de réseau.',
  reponse: 'Réponse inattendue de Rebrickable.',
  serveur: 'Rebrickable indisponible.',
  numero: 'Numéro invalide (ex. 75192).',
  requete: 'Saisis au moins 3 caractères.',
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

// Résout le thème d'un set vers sa racine. Si le thème ne peut pas être récupéré
// (limite de débit, réseau), le set est quand même rendu avec un avertissement :
// mieux vaut une fiche à compléter qu'un échec complet. Une clé refusée, elle, est
// remontée : le reste échouerait pareil.
async function themeDe(themeId, appeler, cache) {
  if (themeId == null) return { theme: '', avertissements: [] };
  try {
    return { theme: (await themeRacine(themeId, appeler, cache)) ?? '', avertissements: [] };
  } catch (e) {
    if (e?.code === 'cle') throw e;
    return { theme: '', avertissements: ['Thème non récupéré : renseigne-le à la main.'] };
  }
}

const imageSure = (u) => (typeof u === 'string' && u.startsWith('https://') ? u : null);

// Cherche un set par son numéro et le rend sous la forme attendue par le formulaire.
export async function chercherSet(saisie, appeler, cache = {}) {
  const numero = normaliserNumero(saisie);
  if (!numero) throw new ErreurRebrickable('numero');

  const r = await appeler(`/sets/${encodeURIComponent(numero)}/`);
  if (typeof r?.name !== 'string' || r.name === '') throw new ErreurRebrickable('reponse');

  const { theme, avertissements } = await themeDe(r.theme_id, appeler, cache);
  return {
    set: {
      numero: typeof r.set_num === 'string' ? r.set_num : numero,
      nom: r.name,
      theme,
      annee: r.year ?? null,
      pieces: r.num_parts ?? null,
      image: imageSure(r.set_img_url),
    },
    avertissements,
  };
}

export const MOTS_MIN = 3;
const TAILLE_PAGE = 10;

// Cherche des sets par mots du nom (en anglais : c'est la langue du catalogue). Une
// page de dix résultats à la fois ; `suite` dit s'il y en a d'autres.
//
// Le thème n'est PAS résolu ici : un résultat sur dix n'est choisi, et résoudre dix
// thèmes par page ferait autant d'appels pour rien, sous une limite de débit.
// `completerResultat` le fait au moment du choix.
//
// Un numéro qui n'est pas de la forme « 75192-1 » (certains sets promotionnels ont
// des lettres) est écarté : l'application ne sait pas le ranger.
export async function rechercherSets(mots, appeler, { page = 1 } = {}) {
  const q = String(mots ?? '').trim();
  if (q.length < MOTS_MIN) throw new ErreurRebrickable('requete');

  const r = await appeler(`/sets/?search=${encodeURIComponent(q)}&page=${page}&page_size=${TAILLE_PAGE}`);
  if (!Array.isArray(r?.results)) throw new ErreurRebrickable('reponse');

  const resultats = r.results
    .filter((x) => typeof x?.name === 'string' && x.name !== '' && normaliserNumero(x.set_num) === x.set_num)
    .map((x) => ({
      numero: x.set_num,
      nom: x.name,
      annee: x.year ?? null,
      pieces: x.num_parts ?? null,
      image: imageSure(x.set_img_url),
      themeId: x.theme_id ?? null,
    }));
  return {
    resultats,
    total: Number.isInteger(r.count) ? r.count : resultats.length,
    suite: typeof r.next === 'string' && r.next !== '',
  };
}

// Transforme le résultat choisi en set à remplir, thème racine compris.
export async function completerResultat(resultat, appeler, cache = {}) {
  const { theme, avertissements } = await themeDe(resultat.themeId, appeler, cache);
  return {
    set: { numero: resultat.numero, nom: resultat.nom, theme, annee: resultat.annee, pieces: resultat.pieces, image: resultat.image },
    avertissements,
  };
}
