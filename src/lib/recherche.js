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
];

// La recherche porte sur le nom, le thème et le numéro. Les notes en sont
// exclues volontairement : un mot d'une note faisait remonter des sets sans
// rapport avec ce qu'on cherchait.
export function filtrer(sets, { statut, texte = '', theme = '', etat = '', annee = '', manque = '' } = {}) {
  const q = normaliserTexte(texte);
  const champManquant = CHAMPS_A_COMPLETER.find((c) => c.cle === manque);
  return sets.filter((s) => {
    if (statut && s.statut !== statut) return false;
    if (theme && s.theme !== theme) return false;
    if (etat && s.etat !== etat) return false;
    if (annee && !correspondAnnee(s.annee, annee)) return false;
    if (champManquant && !champManquant.manque(s)) return false;
    if (!q) return true;
    return normaliserTexte(`${s.nom} ${s.theme} ${s.numero}`).includes(q);
  });
}

// Les valeurs absentes passent toujours en dernier : un set sans année ne doit
// pas s'intercaler entre 2023 et 2022.
function comparerNombres(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return b - a;
}

export function trier(sets, cle) {
  const copie = [...sets];
  switch (cle) {
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
];

// `fiches` compte les sets concernés, pas la somme des colonnes : un même set
// peut manquer de trois choses et ne fait qu'une fiche à reprendre.
export function manquants(sets) {
  const champs = CHAMPS_A_COMPLETER
    .map((c) => ({ cle: c.cle, libelle: c.libelle, nombre: sets.filter(c.manque).length }))
    .filter((c) => c.nombre > 0);
  const fiches = sets.filter((s) => CHAMPS_A_COMPLETER.some((c) => c.manque(s))).length;
  return { champs, fiches };
}
