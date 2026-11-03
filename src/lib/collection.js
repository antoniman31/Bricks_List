import { normaliserSet } from './model.js';

// Opérations pures sur la liste : chacune rend une nouvelle liste et ne touche
// ni au stockage ni à l'écran. C'est ce qui les rend testables, et ce qui
// laisse l'appelant décider quoi faire si l'écriture échoue ensuite.

export function compterExemplaires(sets, numero) {
  return sets.filter((s) => s.numero === numero).length;
}

// L'id est toujours attribué ici : un id venu de la saisie ou d'une API
// pourrait entrer en collision avec une fiche existante.
export function ajouter(sets, brut, maintenant = new Date().toISOString()) {
  const r = normaliserSet({ ...brut, id: undefined, dateAjout: maintenant });
  if (!r) return { sets, ajoute: null };
  return { sets: [...sets, r.set], ajoute: r.set };
}

// Ajoute plusieurs fiches d'un coup. Les dates d'ajout avancent d'une milliseconde
// par fiche : sans cela elles seraient toutes égales et le tri « ajout récent »
// mélangerait le lot au lieu de garder l'ordre de la liste.
export function ajouterPlusieurs(sets, bruts, maintenant = new Date()) {
  let liste = sets;
  const ajoutes = [];
  bruts.forEach((brut, i) => {
    const r = ajouter(liste, brut, new Date(maintenant.getTime() + i).toISOString());
    if (r.ajoute) {
      liste = r.sets;
      ajoutes.push(r.ajoute);
    }
  });
  return { sets: liste, ajoutes };
}

// La fiche modifiée repasse par la validation : une modification n'est pas
// plus fiable qu'une entrée venue d'un fichier. Si elle devient invalide
// (numéro vidé), la fiche d'origine est conservée plutôt que perdue.
export function modifier(sets, id, changements) {
  const i = sets.findIndex((s) => s.id === id);
  if (i < 0) return sets;
  const r = normaliserSet({ ...sets[i], ...changements, id });
  if (!r) return sets;
  return sets.map((s, j) => (j === i ? r.set : s));
}

export function supprimer(sets, id) {
  return sets.filter((s) => s.id !== id);
}

export function acheter(sets, id, etat) {
  return modifier(sets, id, { statut: 'possédé', etat: etat || null });
}

// Fusion par id : une fiche déjà présente est remplacée par celle du fichier,
// les autres sont ajoutées, et rien n'est supprimé. Réimporter son propre
// export ne crée donc pas de doublons.
export function fusionner(existants, importes) {
  const index = new Map(existants.map((s, i) => [s.id, i]));
  const sets = [...existants];
  let ajoutes = 0;
  let misAJour = 0;
  for (const s of importes) {
    if (index.has(s.id)) {
      sets[index.get(s.id)] = s;
      misAJour += 1;
    } else {
      index.set(s.id, sets.length);
      sets.push(s);
      ajoutes += 1;
    }
  }
  return { sets, ajoutes, misAJour };
}
