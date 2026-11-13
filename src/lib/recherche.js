import { cleEmplacement, ecrituresEmplacements, memeEmplacement } from './emplacements.js';
import { PRIORITES } from './model.js';
import { aEtiquette } from './etiquettes.js';
import { comparerSorties, correspondSortie } from './sortie.js';
import { comparerPrix, correspondPrix } from './prix.js';

// Minuscules sans accents : « creatif » doit trouver « Créatif », et « Technic »
// ne doit pas dépendre de la casse tapée.
export function normaliserTexte(s) {
  return String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

export const TRIS = [
  { cle: 'ajout', libelle: 'Ajout récent' },
  { cle: 'nom', libelle: 'Nom' },
  { cle: 'annee', libelle: 'Année' },
  { cle: 'pieces', libelle: 'Pièces' },
  // Regroupe la liste par emplacement de rangement (voir grouperParEmplacement). Il n'a de
  // sens que pour la collection : un set souhaité n'est rangé nulle part.
  { cle: 'emplacement', libelle: 'Emplacement', statut: 'possédé' },
  // Du plus pressé au moins pressé ; réservé à la wishlist, où la priorité existe.
  { cle: 'priorite', libelle: 'Priorité', statut: 'souhaité' },
  { cle: 'achat', libelle: 'Date d\'achat', statut: 'possédé' },
  // La prochaine sortie d'abord : pour une wishlist, « qu'est-ce qui arrive bientôt ».
  { cle: 'sortie', libelle: 'Date de sortie' },
  // Le prix officiel n'existe que pour la wishlist ; les sets sans prix restent en dernier dans les deux sens.
  { cle: 'prix', libelle: 'Prix croissant', statut: 'souhaité' },
  { cle: 'prix-desc', libelle: 'Prix décroissant', statut: 'souhaité' },
];

// Un tri propre à un onglet n'est pas proposé dans l'autre, et la liste retombe sur
// « ajout récent » si on y change d'onglet (le choix de l'utilisateur n'est pas écrasé).
export function triPourOnglet(cle, statut) {
  const t = TRIS.find((x) => x.cle === cle);
  return t && t.statut && t.statut !== statut ? 'ajout' : cle;
}

// La recherche porte sur le nom, le thème, le numéro et l'emplacement de rangement. Les notes en sont
// exclues volontairement : un mot d'une note faisait remonter des sets sans
// rapport avec ce qu'on cherchait.
export function filtrer(sets, { statut, texte = '', theme = '', etat = '', annee = '', manque = '', emplacement = '', boite = '', notice = '', priorite = '', etiquette = '', taille = '', sortie = '', prix = '', maintenant = new Date() } = {}) {
  const q = normaliserTexte(texte);
  const champManquant = CHAMPS_A_COMPLETER.find((c) => c.cle === manque);
  return sets.filter((s) => {
    if (statut && s.statut !== statut) return false;
    if (theme && s.theme !== theme) return false;
    if (etat && s.etat !== etat) return false;
    if (emplacement && !memeEmplacement(s.emplacement, emplacement)) return false;
    if (boite && s.boite !== boite) return false;
    if (notice && s.notice !== notice) return false;
    if (priorite && s.priorite !== priorite) return false;
    if (taille && cleTaille(s.pieces) !== taille) return false;
    if (sortie && !correspondSortie(s, sortie, maintenant)) return false;
    if (prix && !correspondPrix(s, prix)) return false;
    if (etiquette && !aEtiquette(s, etiquette)) return false;
    if (annee && !correspondAnnee(s.annee, annee)) return false;
    if (champManquant && !champManquant.manque(s)) return false;
    if (!q) return true;
    return normaliserTexte(`${s.nom} ${s.theme} ${s.numero} ${s.emplacement ?? ''} ${(s.etiquettes ?? []).join(' ')}`).includes(q);
  });
}

// Les sets de l'AUTRE onglet qui correspondent au texte tapé. C'est la question
// qu'on se pose en magasin — « je l'ai déjà ? » — et elle n'a pas à dépendre de
// l'onglet affiché : un set de la wishlist tapé depuis la collection ne ressortait
// pas. Seul le texte compte ici : les filtres (thème, état, année) décrivent la
// liste affichée, pas l'autre, où un « état » n'existerait même pas.
export function rechercherAilleurs(sets, statutCourant, texte) {
  if (normaliserTexte(texte) === '') return [];
  const autre = statutCourant === 'possédé' ? 'souhaité' : 'possédé';
  return filtrer(sets, { statut: autre, texte });
}

// Les valeurs absentes passent toujours en dernier : un set sans année ne doit
// pas s'intercaler entre 2023 et 2022.
function comparerNombres(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return b - a;
}

// Ordre naturel : « étagère 2 » avant « étagère 10 », sans tenir compte de la casse ni des accents.
const comparerEmplacements = (a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base', numeric: true });
const comparerNoms = (a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });

export function trier(sets, cle, maintenant = new Date()) {
  const copie = [...sets];
  switch (cle) {
    case 'emplacement':
      // Les sets rangés d'abord, par emplacement puis par nom ; les non rangés à la fin.
      return copie.sort((a, b) => {
        if (!a.emplacement !== !b.emplacement) return a.emplacement ? -1 : 1;
        return (a.emplacement ? comparerEmplacements(a.emplacement, b.emplacement) : 0) || comparerNoms(a, b);
      });
    case 'priorite': {
      // Les sets sans priorité en dernier, comme une année absente.
      const rang = (s) => { const i = PRIORITES.indexOf(s.priorite); return i < 0 ? PRIORITES.length : i; };
      return copie.sort((a, b) => rang(a) - rang(b) || comparerNoms(a, b));
    }
    case 'achat':
      // Les plus récents d'abord ; une date absente passe en dernier, comme une année absente.
      return copie.sort((a, b) => {
        if (!a.dateAchat !== !b.dateAchat) return a.dateAchat ? -1 : 1;
        return (a.dateAchat && b.dateAchat ? (a.dateAchat < b.dateAchat ? 1 : a.dateAchat > b.dateAchat ? -1 : 0) : 0) || comparerNoms(a, b);
      });
    case 'sortie': {
      const parSortie = comparerSorties(maintenant);
      return copie.sort((a, b) => parSortie(a, b) || comparerNoms(a, b));
    }
    case 'prix':
    case 'prix-desc': {
      const parPrix = comparerPrix(cle === 'prix' ? 1 : -1);
      return copie.sort((a, b) => parPrix(a, b) || comparerNoms(a, b));
    }
    case 'nom':
      return copie.sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
    case 'annee':
      return copie.sort((a, b) => comparerNombres(a.annee, b.annee));
    case 'pieces':
      return copie.sort((a, b) => comparerNombres(a.pieces, b.pieces));
    default:
      return copie.sort((a, b) => comparerNombres(a.dateAjout ? Date.parse(a.dateAjout) : null, b.dateAjout ? Date.parse(b.dateAjout) : null));
  }
}

// Les valeurs des filtres sont dérivées de la collection : un thème nouveau
// apparaît dès qu'un set le porte, sans toucher au code.
export function themes(sets) {
  return [...new Set(sets.map((s) => s.theme).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

// Découpe une liste en groupes par emplacement : un groupe par emplacement dans l'ordre
// naturel, puis « Non rangé » en dernier (c'est là que tombe un set sans emplacement).
// « Salon » et « salon » forment un seul groupe (voir `cleEmplacement`), affiché avec l'écriture la
// plus fréquente ; le filtre sur l'emplacement suit la même règle, les deux concordent.
export const NON_RANGE = 'Non rangé';

export function grouperParEmplacement(sets) {
  const ecritures = ecrituresEmplacements(sets);
  const parLieu = new Map();
  const nonranges = [];
  for (const s of sets) {
    const cle = cleEmplacement(s.emplacement);
    if (cle === '') { nonranges.push(s); continue; }
    if (!parLieu.has(cle)) parLieu.set(cle, []);
    parLieu.get(cle).push(s);
  }
  const groupes = [...parLieu]
    .map(([cle, liste]) => ({ cle: ecritures.get(cle), libelle: ecritures.get(cle), sets: [...liste].sort(comparerNoms) }))
    .sort((a, b) => comparerEmplacements(a.libelle, b.libelle));
  if (nonranges.length > 0) groupes.push({ cle: '', libelle: NON_RANGE, sets: [...nonranges].sort(comparerNoms) });
  return groupes;
}

// Les emplacements déjà utilisés : proposés en suggestion dans le formulaire et en
// filtre. Comme les thèmes, ils viennent de la collection, pas d'une liste fermée.
export function emplacements(sets) {
  return [...ecrituresEmplacements(sets).values()].sort(comparerEmplacements);
}

// Les emplacements avec le nombre de sets rangés dedans : le décompte aide à choisir
// « l'étagère 2 » sans avoir à se rappeler ce qu'elle contient.
export function comptesEmplacements(sets) {
  const n = new Map();
  for (const s of sets) {
    const cle = cleEmplacement(s.emplacement);
    if (cle !== '') n.set(cle, (n.get(cle) ?? 0) + 1);
  }
  return emplacements(sets).map((nom) => ({ nom, n: n.get(cleEmplacement(nom)) }));
}

// La taille d'un set, d'après son nombre de pièces : quatre tranches, du petit set au très gros. Les bornes
// sont celles qu'on utilise à l'œil (moins de 500, jusqu'à 1 500, jusqu'à 3 000, au-delà). Un set sans
// nombre de pièces n'a pas de taille : il tombe dans « Non renseigné » côté stats.
export const TAILLES = [
  { cle: 'petit', libelle: 'Petits (moins de 500 pièces)', min: 0 },
  { cle: 'moyen', libelle: 'Moyens (500 à 1 499)', min: 500 },
  { cle: 'grand', libelle: 'Grands (1 500 à 2 999)', min: 1500 },
  { cle: 'tres-grand', libelle: 'Très grands (3 000 et plus)', min: 3000 },
];

export function cleTaille(pieces) {
  if (pieces == null) return null;
  let cle = null;
  for (const t of TAILLES) if (pieces >= t.min) cle = t.cle;
  return cle;
}

// Les années se regroupent par décennie dès que la collection s'étale sur plus de
// 15 ans : année par année, elle ferait des dizaines de valeurs. Le même choix
// sert au filtre et aux statistiques, sinon une barre « 2010–2019 » mènerait à
// une liste qu'on ne sait pas refaire depuis le panneau de filtres.
const ETALEMENT_MAX = 15;

export function modeAnnees(sets) {
  const annees = sets.map((s) => s.annee).filter((a) => a != null);
  if (annees.length === 0) return 'annee';
  return Math.max(...annees) - Math.min(...annees) > ETALEMENT_MAX ? 'decennie' : 'annee';
}

// « 2017 » ou « 2010s » : une clé de texte, pour tenir dans le même champ de
// filtre que l'année simple.
export function cleAnnee(annee, mode) {
  return mode === 'decennie' ? `${Math.floor(annee / 10) * 10}s` : String(annee);
}

export function libelleAnnee(cle) {
  const m = /^(\d{4})s$/.exec(cle);
  return m ? `${m[1]}–${Number(m[1]) + 9}` : cle;
}

function correspondAnnee(annee, filtre) {
  if (annee == null) return false;
  const m = /^(\d{4})s$/.exec(String(filtre));
  if (m) return annee >= Number(m[1]) && annee <= Number(m[1]) + 9;
  return String(annee) === String(filtre);
}

export function groupesAnnees(sets) {
  const mode = modeAnnees(sets);
  const cles = [...new Set(sets.filter((s) => s.annee != null).map((s) => cleAnnee(s.annee, mode)))];
  return cles.sort((a, b) => b.localeCompare(a)).map((cle) => ({ valeur: cle, libelle: libelleAnnee(cle) }));
}

// Ce qu'une fiche peut encore avoir à compléter. L'image n'en fait pas partie :
// aucun écran ne permet de l'ajouter après coup, et un appel à l'action sans
// action possible est pire qu'une absence.
export const CHAMPS_A_COMPLETER = [
  { cle: 'theme', libelle: 'Sans thème', manque: (s) => s.theme === '' },
  { cle: 'annee', libelle: 'Sans année', manque: (s) => s.annee == null },
  { cle: 'pieces', libelle: 'Sans pièces', manque: (s) => s.pieces == null },
  // L'état n'existe que pour un set possédé : un set souhaité n'en a pas à compléter.
  { cle: 'etat', libelle: 'État non précisé', manque: (s) => s.statut === 'possédé' && s.etat == null },
  // Seulement tant que la fonction sert (voir manquants) : sinon tout set « manque »
  // d'un emplacement qu'on n'a jamais eu l'idée de saisir.
  { cle: 'emplacement', libelle: 'Sans emplacement', manque: (s) => s.statut === 'possédé' && !s.emplacement, actif: (sets) => sets.some((s) => s.emplacement) },
  // Boîte et notice : seulement une fois renseignées pour au moins un set possédé, comme l'emplacement.
  { cle: 'boite', libelle: 'Boîte non précisée', manque: (s) => s.statut === 'possédé' && s.boite == null, actif: (sets) => sets.some((s) => s.statut === 'possédé' && s.boite != null) },
  { cle: 'notice', libelle: 'Notice non précisée', manque: (s) => s.statut === 'possédé' && s.notice == null, actif: (sets) => sets.some((s) => s.statut === 'possédé' && s.notice != null) },
  { cle: 'priorite', libelle: 'Priorité non précisée', manque: (s) => s.statut === 'souhaité' && !s.priorite, actif: (sets) => sets.some((s) => s.priorite) },
];

// `fiches` compte les sets concernés, pas la somme des colonnes : un même set
// peut manquer de trois choses et ne fait qu'une fiche à reprendre.
export function manquants(sets) {
  // Un champ d'une fonction récente (`actif`) n'est compté que si elle sert déjà : avant
  // cela, l'inclure annoncerait « 43 fiches à compléter » pour un champ que personne
  // n'a encore eu l'idée de remplir.
  const actifs = CHAMPS_A_COMPLETER.filter((c) => !c.actif || c.actif(sets));
  const champs = actifs
    .map((c) => ({ cle: c.cle, libelle: c.libelle, nombre: sets.filter(c.manque).length }))
    .filter((c) => c.nombre > 0);
  const fiches = sets.filter((s) => actifs.some((c) => c.manque(s))).length;
  return { champs, fiches };
}
