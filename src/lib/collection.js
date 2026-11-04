import { normaliserSet } from './model.js';
import { aujourdhuiISO } from './dates.js';

// Opérations pures sur la liste : chacune rend une nouvelle liste et ne touche
// ni au stockage ni à l'écran. C'est ce qui les rend testables, et ce qui
// laisse l'appelant décider quoi faire si l'écriture échoue ensuite.

export function compterExemplaires(sets, numero) {
  return sets.filter((s) => s.numero === numero).length;
}

// Le nombre d'exemplaires possédés par numéro, d'un seul passage : la liste en a besoin pour chaque
// carte, et recompter à chaque carte ferait un parcours par ligne. Un set souhaité ne compte pas :
// vouloir un set qu'on a déjà n'est pas un doublon.
export function exemplairesPossedes(sets) {
  const n = new Map();
  for (const s of sets) if (s.statut === 'possédé') n.set(s.numero, (n.get(s.numero) ?? 0) + 1);
  return n;
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

// Le jour de l'achat est celui où on appuie sur « Acheté » : modifiable ensuite sur la fiche.
export function acheter(sets, id, etat, maintenant = new Date()) {
  return modifier(sets, id, { statut: 'possédé', etat: etat || null, dateAchat: aujourdhuiISO(maintenant) });
}

// ---- Modifications en masse -------------------------------------------------
//
// `ids` est un Set d'identifiants. Chaque fiche touchée repasse par la validation du
// modèle, comme une modification isolée : une règle du modèle (pas d'emplacement pour
// un set souhaité) s'applique donc aussi en masse, sans que l'appelant ait à la
// connaître. Une fiche qui deviendrait invalide garde son état d'origine.
//
// `changements` ne porte que les champs à changer : un champ absent n'est pas touché.
// Pour effacer, on donne la valeur « vide » du champ ('' pour l'emplacement, null pour
// l'état, la boîte et la notice).
export function modifierPlusieurs(sets, ids, changements) {
  return sets.map((s) => {
    if (!ids.has(s.id)) return s;
    const r = normaliserSet({ ...s, ...changements, id: s.id });
    return r ? r.set : s;
  });
}

export function supprimerPlusieurs(sets, ids) {
  return sets.filter((s) => !ids.has(s.id));
}

const CHAMPS_MASSE = ['emplacement', 'etat', 'boite', 'notice', 'statut'];

// Ce qu'une modification en masse va faire, AVANT de l'appliquer : combien de fiches
// seraient réellement modifiées, combien sont déjà à jour, et pour chaque champ combien
// de fiches perdraient une valeur différente (remplacée ou effacée). C'est ce chiffre
// qui permet de s'apercevoir qu'on s'apprête à écraser le rangement de trois sets.
// Il suit la même validation que `modifierPlusieurs`, donc il ne peut pas mentir.
export function apercuModification(sets, ids, changements) {
  const concernes = sets.filter((s) => ids.has(s.id));
  const ecrases = { emplacement: 0, etat: 0, boite: 0, notice: 0 };
  let modifies = 0;
  for (const s of concernes) {
    const r = normaliserSet({ ...s, ...changements, id: s.id });
    if (!r) continue;
    let touche = false;
    for (const champ of CHAMPS_MASSE) {
      if (!(champ in changements) || r.set[champ] === s[champ]) continue;
      touche = true;
      const avant = s[champ];
      if (champ in ecrases && avant !== null && avant !== undefined && avant !== '') ecrases[champ] += 1;
    }
    if (touche) modifies += 1;
  }
  return { total: concernes.length, modifies, inchanges: concernes.length - modifies, ecrases };
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
