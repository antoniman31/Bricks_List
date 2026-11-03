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
export function filtrer(sets, { statut, texte = '', theme = '', etat = '', annee = '' } = {}) {
  const q = normaliserTexte(texte);
  return sets.filter((s) => {
    if (statut && s.statut !== statut) return false;
    if (theme && s.theme !== theme) return false;
    if (etat && s.etat !== etat) return false;
    if (annee && String(s.annee) !== String(annee)) return false;
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

export function annees(sets) {
  return [...new Set(sets.map((s) => s.annee).filter((a) => a != null))].sort((a, b) => b - a);
}
